using SBay.Backend.APIs.Records;
using SBay.Backend.Exceptions;
using SBay.Backend.Services;
using SBay.Backend.Utils;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using System.Text.Json;

namespace SBay.Backend.Messaging;

public sealed class ChatService : IChatService
{
    private const int MaxMessageLength = 2000;
    private const int RateLimitCount = 5;
    private static readonly TimeSpan RateWindow = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan EditWindow = TimeSpan.FromMinutes(15);

    private readonly IChatRepository _chats;
    private readonly IMessageRepository _messages;
    private readonly ITextSanitizer _sanitizer;
    private readonly IClock _clock;
    private readonly IUserOwnership _ownership;
    private readonly IChatEvents _events;
    private readonly IUnitOfWork _uow;
    private readonly IUserBlockRepository _blocks;
    private readonly IListingRepository _listings;
    private readonly INotificationRepository _notifications;
    private readonly IUserRepository? _users;
    private readonly INotificationPreferenceRepository? _preferences;
    private readonly IPushNotificationService? _push;
    private readonly IEmailSender? _emailSender;

    public ChatService(
        IChatRepository chats,
        IMessageRepository messages,
        ITextSanitizer sanitizer,
        IClock clock,
        IUserOwnership ownership,
        IChatEvents events,
        IUnitOfWork uow,
        IUserBlockRepository blocks,
        IListingRepository listings,
        INotificationRepository notifications,
        IUserRepository? users = null,
        INotificationPreferenceRepository? preferences = null,
        IPushNotificationService? push = null,
        IEmailSender? emailSender = null)
    {
        _chats = chats;
        _messages = messages;
        _sanitizer = sanitizer;
        _clock = clock;
        _ownership = ownership;
        _events = events;
        _uow = uow;
        _blocks = blocks;
        _listings = listings;
        _notifications = notifications;
        _users = users;
        _preferences = preferences;
        _push = push;
        _emailSender = emailSender;
    }

    public async Task<Chat> OpenOrGetAsync(Guid me, Guid otherUserId, Guid? listingId, CancellationToken ct = default)
    {
        Guid buyerId;
        Guid sellerId;

        if (listingId.HasValue)
        {
            var meOwner = await _ownership.IsOwnerOfListingAsync(me, listingId.Value, ct);
            var otherOwner = await _ownership.IsOwnerOfListingAsync(otherUserId, listingId.Value, ct);

            if (meOwner == otherOwner)
                throw new InvalidOperationException("Invalid participants for listing-scoped chat.");

            buyerId = meOwner ? otherUserId : me;
            sellerId = meOwner ? me : otherUserId;
        }
        else
        {
            buyerId = me;
            sellerId = otherUserId;
        }

        if (await IsBlockedAsync(buyerId, sellerId, ct))
            throw new ForbiddenException("Blocked");
        if (await HasInactiveParticipantAsync(buyerId, sellerId, ct))
            throw new ForbiddenException("Inactive account");

        var chat = await _chats.FindByParticipantsAsync(buyerId, sellerId, listingId, ct);
        if (chat is not null)
        {
            var changed = false;
            if (me == chat.BuyerId && chat.BuyerArchived)
            {
                chat.BuyerArchived = false;
                changed = true;
            }
            if (me == chat.SellerId && chat.SellerArchived)
            {
                chat.SellerArchived = false;
                changed = true;
            }
            if (changed)
            {
                await _chats.UpdateAsync(chat, ct);
                await _uow.SaveChangesAsync(ct);
            }
            return chat;
        }

        chat = new Chat { Id = Guid.NewGuid(), BuyerId = buyerId, SellerId = sellerId, ListingId = listingId };
        await _chats.AddAsync(chat, ct);
        await _uow.SaveChangesAsync(ct);
        return chat;
    }

    public async Task<Message> SendAsync(Guid chatId, Guid senderId, string content, CancellationToken ct = default)
    {

        var trimmed = content?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmed)) throw new InvalidOperationException("Empty message");
        if (trimmed.Length > MaxMessageLength) throw new InvalidOperationException("Message too long");

        var now = _clock.UtcNow;
        var windowStart = now - RateWindow;
        var sent = await _messages.CountSentSinceAsync(senderId, windowStart, ct);
        if (sent >= RateLimitCount) throw new InvalidOperationException("Rate limited");

        var chat = await _chats.GetByIdAsync(chatId, ct)
                   ?? throw new InvalidOperationException("Chat not found");
        if (senderId != chat.BuyerId && senderId != chat.SellerId) throw new InvalidOperationException("Forbidden");

        var receiverId = senderId == chat.BuyerId ? chat.SellerId : chat.BuyerId;
        if (await IsBlockedAsync(senderId, receiverId, ct))
            throw new ForbiddenException("Blocked");
        if (await HasInactiveParticipantAsync(senderId, receiverId, ct))
            throw new ForbiddenException("Inactive account");
        var clean = _sanitizer.Sanitize(trimmed);

        var msg = new Message(chat.Id, clean, senderId, receiverId, chat.ListingId) { CreatedAt = now };
        await _messages.AddAsync(msg, ct);
        await _chats.UpdateLastMessageTimestampAsync(chatId, now, ct);
        await _uow.SaveChangesAsync(ct);
        await _events.MessageNewAsync(msg, ct);
        return msg;
    }

    public async Task<Message> SendOfferAsync(Guid chatId, Guid senderId, decimal amount, string? currency, CancellationToken ct = default)
    {
        if (amount <= 0) throw new InvalidOperationException("Offer must be greater than zero");
        var chat = await GetParticipantChatAsync(chatId, senderId, ct);
        if (!chat.ListingId.HasValue) throw new InvalidOperationException("Offers require a listing chat");
        var receiverId = senderId == chat.BuyerId ? chat.SellerId : chat.BuyerId;
        await EnsureParticipantsCanUseOffersAsync(senderId, receiverId, ct);

        var listing = await _listings.GetByIdForManagementAsync(chat.ListingId.Value, ct)
                      ?? throw new InvalidOperationException("Listing not found");
        EnsureListingCanReceiveOffers(listing);

        if (senderId == chat.SellerId) throw new InvalidOperationException("Seller should send a counter offer");

        var payload = new OfferPayload(
            OfferId: Guid.NewGuid(),
            ListingId: chat.ListingId.Value,
            Amount: amount,
            Currency: NormalizeCurrency(currency, listing.Price.Currency),
            Status: "pending",
            ParentOfferId: null,
            ExpiresAt: null);
        var message = await AddOfferMessageAsync(chat, senderId, receiverId, payload, ct);

        var body = $"{payload.Amount:0.##} {payload.Currency} offer for {listing.Title}";
        var href = $"/messages/{chat.Id}";
        var data = new { type = "offer_received", chatId = chat.Id, messageId = message.Id, listingId = chat.ListingId, amount = payload.Amount, currency = payload.Currency, href };

        await _notifications.AddAsync(new UserNotification
        {
            UserId = receiverId,
            Type = "offer_received",
            Title = "New offer received",
            Body = body,
            Href = href,
            DataJson = JsonSerializer.Serialize(data),
            CreatedAt = DateTimeOffset.UtcNow
        }, ct);
        await _uow.SaveChangesAsync(ct);
        await SendPreferenceNotificationAsync(
            receiverId,
            "New offer received",
            body,
            data,
            p => p.PushNewBids,
            p => p.EmailNewBids,
            ct);
        return message;
    }

    public async Task<Message> AcceptOfferAsync(Guid chatId, Guid messageId, Guid responderId, CancellationToken ct = default)
    {
        var (chat, offerMessage, payload) = await GetPendingOfferAsync(chatId, messageId, responderId, ct);
        await EnsureParticipantsCanUseOffersAsync(responderId, offerMessage.SenderId, ct);
        var listing = await _listings.GetByIdForManagementAsync(payload.ListingId, ct)
                      ?? throw new InvalidOperationException("Listing not found");
        EnsureListingCanReceiveOffers(listing);

        payload = payload with { Status = "accepted" };
        offerMessage.DataJson = JsonSerializer.Serialize(payload);
        offerMessage.Content = FormatOfferContent(payload);
        await _messages.UpdateAsync(offerMessage, ct);

        listing.MarkSoldUntil(_clock.UtcNow.AddDays(15));
        await _listings.UpdateAsync(listing, ct);

        var acceptedData = new { type = "offer_accepted", chatId = chat.Id, messageId = offerMessage.Id, listingId = listing.Id, href = $"/messages/{chat.Id}" };
        await AddSystemMessageAsync(chat, responderId, offerMessage.SenderId, $"Offer accepted: {payload.Amount:0.##} {payload.Currency}", ct);
        await _notifications.AddAsync(new UserNotification
        {
            UserId = offerMessage.SenderId,
            Type = "offer_accepted",
            Title = "Offer accepted",
            Body = $"Your offer for {listing.Title} was accepted.",
            Href = $"/messages/{chat.Id}",
            DataJson = JsonSerializer.Serialize(acceptedData),
            CreatedAt = DateTimeOffset.UtcNow
        }, ct);
        await _uow.SaveChangesAsync(ct);
        await _events.MessageUpdatedAsync(offerMessage, ct);
        await SendPreferenceNotificationAsync(
            offerMessage.SenderId,
            "Offer accepted",
            $"Your offer for {listing.Title} was accepted.",
            acceptedData,
            p => p.PushWonAuctions,
            p => p.EmailWonAuctions,
            ct);
        return offerMessage;
    }

    public async Task<Message> RejectOfferAsync(Guid chatId, Guid messageId, Guid responderId, CancellationToken ct = default)
    {
        var (_, offerMessage, payload) = await GetPendingOfferAsync(chatId, messageId, responderId, ct);
        await EnsureParticipantsCanUseOffersAsync(responderId, offerMessage.SenderId, ct);
        payload = payload with { Status = "rejected" };
        offerMessage.DataJson = JsonSerializer.Serialize(payload);
        offerMessage.Content = FormatOfferContent(payload);
        await _messages.UpdateAsync(offerMessage, ct);
        await _uow.SaveChangesAsync(ct);
        await _events.MessageUpdatedAsync(offerMessage, ct);
        return offerMessage;
    }

    public async Task<Message> CounterOfferAsync(Guid chatId, Guid messageId, Guid responderId, decimal amount, string? currency, CancellationToken ct = default)
    {
        if (amount <= 0) throw new InvalidOperationException("Offer must be greater than zero");
        var (chat, offerMessage, payload) = await GetPendingOfferAsync(chatId, messageId, responderId, ct);
        await EnsureParticipantsCanUseOffersAsync(responderId, offerMessage.SenderId, ct);
        var listing = await _listings.GetByIdForManagementAsync(payload.ListingId, ct)
                      ?? throw new InvalidOperationException("Listing not found");
        EnsureListingCanReceiveOffers(listing);

        payload = payload with { Status = "countered" };
        offerMessage.DataJson = JsonSerializer.Serialize(payload);
        offerMessage.Content = FormatOfferContent(payload);
        await _messages.UpdateAsync(offerMessage, ct);

        var counterPayload = new OfferPayload(
            OfferId: Guid.NewGuid(),
            ListingId: payload.ListingId,
            Amount: amount,
            Currency: NormalizeCurrency(currency, listing.Price.Currency),
            Status: "pending",
            ParentOfferId: payload.OfferId,
            ExpiresAt: null);
        var counter = await AddOfferMessageAsync(chat, responderId, offerMessage.SenderId, counterPayload, ct);
        var counterBody = $"Counter offer: {counterPayload.Amount:0.##} {counterPayload.Currency} for {listing.Title}";
        var counterData = new { type = "counter_offer", chatId = chat.Id, messageId = counter.Id, listingId = listing.Id, href = $"/messages/{chat.Id}" };
        await _notifications.AddAsync(new UserNotification
        {
            UserId = offerMessage.SenderId,
            Type = "counter_offer",
            Title = "Counter offer received",
            Body = counterBody,
            Href = $"/messages/{chat.Id}",
            DataJson = JsonSerializer.Serialize(counterData),
            CreatedAt = DateTimeOffset.UtcNow
        }, ct);
        await _uow.SaveChangesAsync(ct);
        await _events.MessageUpdatedAsync(offerMessage, ct);
        await SendPreferenceNotificationAsync(
            offerMessage.SenderId,
            "Counter offer received",
            counterBody,
            counterData,
            p => p.PushOutbidAlerts,
            p => p.EmailOutbidAlerts,
            ct);
        return counter;
    }

    public async Task<IReadOnlyList<Message>> GetMessagesAsync(Guid chatId, int take = 50, DateTime? before = null, CancellationToken ct = default)
    {
        var normalizedTake = take < 1 ? 50 : Math.Min(take, 100);
        return await _messages.GetMessagesAsync(chatId, normalizedTake, before, ct);
    }

    public async Task<int> MarkReadAsync(Guid chatId, Guid readerId, DateTime upTo, CancellationToken ct = default)
    {
        var chat = await _chats.GetByIdAsync(chatId, ct)
                   ?? throw new InvalidOperationException("Chat not found");
        if (readerId != chat.BuyerId && readerId != chat.SellerId)
            throw new InvalidOperationException("Forbidden");

        var affectedRows = await _messages.MarkReadUpToAsync(chatId, readerId, upTo, ct);
        var otherUserId = readerId == chat.BuyerId ? chat.SellerId : chat.BuyerId;
        await _events.MessagesReadAsync(chatId, readerId, otherUserId, ct);
        return affectedRows;
    }

    public async Task<Message> UpdateMessageAsync(Guid messageId, Guid editorId, string content, CancellationToken ct = default)
    {
        var message = await _messages.GetByIdAsync(messageId, ct)
                      ?? throw new InvalidOperationException("Message not found");
        if (message.Type != "text") throw new InvalidOperationException("Only text messages can be edited");
        if (message.SenderId != editorId) throw new InvalidOperationException("Forbidden");
        if (_clock.UtcNow - message.CreatedAt > EditWindow) throw new InvalidOperationException("Edit window expired");

        var trimmed = content?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmed)) throw new InvalidOperationException("Empty message");
        if (trimmed.Length > MaxMessageLength) throw new InvalidOperationException("Message too long");

        message.Content = _sanitizer.Sanitize(trimmed);
        await _messages.UpdateAsync(message, ct);
        await _uow.SaveChangesAsync(ct);
        await _events.MessageUpdatedAsync(message, ct);
        return message;
    }

    public async Task DeleteMessageAsync(Guid messageId, Guid requesterId, CancellationToken ct = default)
    {
        var message = await _messages.GetByIdAsync(messageId, ct)
                      ?? throw new InvalidOperationException("Message not found");
        if (message.Type != "text") throw new InvalidOperationException("Only text messages can be deleted");
        if (message.SenderId != requesterId) throw new InvalidOperationException("Forbidden");
        if (_clock.UtcNow - message.CreatedAt > EditWindow) throw new InvalidOperationException("Delete window expired");

        var chatId = message.ChatId;
        await _messages.RemoveAsync(message, ct);
        await _uow.SaveChangesAsync(ct);

        var latest = await _messages.GetMessagesAsync(chatId, 1, null, ct);
        var chat = await _chats.GetByIdAsync(chatId, ct);
        var timestamp = latest.FirstOrDefault()?.CreatedAt ?? chat?.CreatedAt ?? _clock.UtcNow;
        await _chats.UpdateLastMessageTimestampAsync(chatId, timestamp, ct);
        await _uow.SaveChangesAsync(ct);

        await _events.MessageDeletedAsync(message.Id, message.ChatId, message.SenderId, message.ReceiverId, message.IsRead, ct);
    }

    public async Task ArchiveChatAsync(Guid chatId, Guid requesterId, CancellationToken ct = default)
    {
        var archived = await _chats.ArchiveForUserAsync(chatId, requesterId, ct);
        if (!archived) throw new InvalidOperationException("Chat not found");
        await _uow.SaveChangesAsync(ct);
    }

    public async Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default)
    {
        return await _messages.CountUnreadChatsAsync(userId, ct);
    }

    private async Task<bool> IsBlockedAsync(Guid userId, Guid otherUserId, CancellationToken ct)
    {
        return await _blocks.IsBlockedAsync(userId, otherUserId, ct)
               || await _blocks.IsBlockedAsync(otherUserId, userId, ct);
    }

    private async Task<Chat> GetParticipantChatAsync(Guid chatId, Guid userId, CancellationToken ct)
    {
        var chat = await _chats.GetByIdAsync(chatId, ct) ?? throw new InvalidOperationException("Chat not found");
        if (userId != chat.BuyerId && userId != chat.SellerId) throw new InvalidOperationException("Forbidden");
        return chat;
    }

    private async Task EnsureParticipantsCanUseOffersAsync(Guid userId, Guid otherUserId, CancellationToken ct)
    {
        if (await IsBlockedAsync(userId, otherUserId, ct))
            throw new ForbiddenException("Blocked");
        if (await HasInactiveParticipantAsync(userId, otherUserId, ct))
            throw new ForbiddenException("Inactive account");
    }

    private static void EnsureListingCanReceiveOffers(Listing listing)
    {
        if (listing.Status != "active" || listing.StockQuantity <= 0)
            throw new InvalidOperationException("Listing is not active");
    }

    private async Task<Message> AddOfferMessageAsync(Chat chat, Guid senderId, Guid receiverId, OfferPayload payload, CancellationToken ct)
    {
        var message = new Message(chat.Id, FormatOfferContent(payload), senderId, receiverId, chat.ListingId, "offer", JsonSerializer.Serialize(payload))
        {
            CreatedAt = _clock.UtcNow
        };
        await _messages.AddAsync(message, ct);
        await _chats.UpdateLastMessageTimestampAsync(chat.Id, message.CreatedAt, ct);
        await _uow.SaveChangesAsync(ct);
        await _events.MessageNewAsync(message, ct);
        return message;
    }

    private async Task AddSystemMessageAsync(Chat chat, Guid senderId, Guid receiverId, string content, CancellationToken ct)
    {
        var message = new Message(chat.Id, content, senderId, receiverId, chat.ListingId, "system")
        {
            CreatedAt = _clock.UtcNow
        };
        await _messages.AddAsync(message, ct);
        await _chats.UpdateLastMessageTimestampAsync(chat.Id, message.CreatedAt, ct);
        await _events.MessageNewAsync(message, ct);
    }

    private async Task SendPreferenceNotificationAsync(
        Guid receiverId,
        string title,
        string body,
        object data,
        Func<NotificationPreference, bool> allowPush,
        Func<NotificationPreference, bool> allowEmail,
        CancellationToken ct)
    {
        if (_preferences is null) return;

        var preferences = await _preferences.GetOrDefaultAsync(receiverId, ct);
        if (allowPush(preferences) && _push is not null)
        {
            await _push.SendAsync(receiverId, title, body, data, ct);
        }

        if (allowEmail(preferences) && _emailSender is not null && _users is not null)
        {
            var receiver = await _users.GetByIdAsync(receiverId, ct);
            if (!string.IsNullOrWhiteSpace(receiver?.Email))
            {
                await _emailSender.SendEmailAsync(
                    receiver.Email,
                    $"{title} on SBay",
                    $"<p>{System.Net.WebUtility.HtmlEncode(title)}</p><p>{System.Net.WebUtility.HtmlEncode(body)}</p>",
                    $"{title}\n\n{body}",
                    ct);
            }
        }
    }

    private async Task<(Chat Chat, Message Message, OfferPayload Payload)> GetPendingOfferAsync(Guid chatId, Guid messageId, Guid responderId, CancellationToken ct)
    {
        var chat = await GetParticipantChatAsync(chatId, responderId, ct);
        var message = await _messages.GetByIdAsync(messageId, ct) ?? throw new InvalidOperationException("Offer not found");
        if (message.ChatId != chat.Id || message.Type != "offer") throw new InvalidOperationException("Offer not found");
        if (message.ReceiverId != responderId) throw new InvalidOperationException("Forbidden");
        var payload = string.IsNullOrWhiteSpace(message.DataJson)
            ? null
            : JsonSerializer.Deserialize<OfferPayload>(message.DataJson);
        if (payload is null || payload.Status != "pending") throw new InvalidOperationException("Offer is not pending");
        return (chat, message, payload);
    }

    private static string NormalizeCurrency(string? currency, string fallback)
    {
        var normalized = string.IsNullOrWhiteSpace(currency) ? fallback : currency.Trim().ToUpperInvariant();
        return normalized.Length > 8 ? normalized[..8] : normalized;
    }

    private static string FormatOfferContent(OfferPayload offer)
    {
        var prefix = offer.ParentOfferId.HasValue ? "Counter offer" : "Offer";
        return $"{prefix}: {offer.Amount:0.##} {offer.Currency} ({offer.Status})";
    }

    private sealed record OfferPayload(
        Guid OfferId,
        Guid ListingId,
        decimal Amount,
        string Currency,
        string Status,
        Guid? ParentOfferId,
        DateTime? ExpiresAt);

    private async Task<bool> HasInactiveParticipantAsync(Guid userId, Guid otherUserId, CancellationToken ct)
    {
        if (_users is null) return false;

        var user = await _users.GetByIdAsync(userId, ct);
        if (user is null || !user.IsActive) return true;

        var other = await _users.GetByIdAsync(otherUserId, ct);
        return other is null || !other.IsActive;
    }

    public async Task<IReadOnlyList<ChatSummaryDto>> GetInboxSummaryAsync(Guid me, int take = 20, int skip = 0, CancellationToken ct = default)
    {
        var normalizedTake = take < 1 ? 20 : Math.Min(take, 100);
        var normalizedSkip = Math.Max(0, skip);
        var chats = await GetActiveParticipantInboxAsync(me, normalizedTake, normalizedSkip, ct);
        var summaries = new List<ChatSummaryDto>(chats.Count);
        var chatIds = chats.Select(c => c.Id).ToArray();
        var latestByChat = await _messages.GetLatestByChatAsync(chatIds, ct);
        var unreadByChat = await _messages.CountUnreadByChatAsync(chatIds, me, ct);

        foreach (var chat in chats)
        {
            latestByChat.TryGetValue(chat.Id, out var lastMessage);
            var lastMessageDto = lastMessage is null
                ? null
                : new MessageDto(
                    lastMessage.Id,
                    lastMessage.ChatId,
                    lastMessage.SenderId,
                    lastMessage.ReceiverId,
                    lastMessage.ListingId,
                    lastMessage.Content,
                    lastMessage.Type,
                    lastMessage.DataJson,
                    lastMessage.CreatedAt,
                    lastMessage.IsRead);
            unreadByChat.TryGetValue(chat.Id, out var unreadCount);
            var lastMessageAt = chat.LastMessageAt ?? lastMessage?.CreatedAt ?? chat.CreatedAt;

            summaries.Add(new ChatSummaryDto(
                chat.Id,
                chat.BuyerId,
                chat.SellerId,
                chat.ListingId,
                chat.CreatedAt,
                lastMessageAt,
                unreadCount,
                lastMessageDto));
        }

        return summaries;
    }

    public async Task<IReadOnlyList<Chat>> GetInboxAsync(Guid me, int take = 20, int skip = 0, CancellationToken ct = default)
    {
        var normalizedTake = take < 1 ? 20 : Math.Min(take, 100);
        var normalizedSkip = Math.Max(0, skip);
        return await GetActiveParticipantInboxAsync(me, normalizedTake, normalizedSkip, ct);
    }

    private async Task<IReadOnlyList<Chat>> GetActiveParticipantInboxAsync(Guid me, int take, int skip, CancellationToken ct)
    {
        if (_users is null)
            return await _chats.GetInboxAsync(me, take, skip, ct);

        var needed = (long)skip + take;
        var batchSize = Math.Min(100, Math.Max(take, 20));
        var repoSkip = 0;
        var filtered = new List<Chat>();

        while (filtered.Count < needed)
        {
            var batch = await _chats.GetInboxAsync(me, batchSize, repoSkip, ct);
            if (batch.Count == 0)
                break;

            filtered.AddRange(await FilterActiveParticipantChatsAsync(batch, ct));

            if (batch.Count < batchSize)
                break;

            repoSkip += batch.Count;
        }

        return filtered.Skip(skip).Take(take).ToList();
    }

    private async Task<IReadOnlyList<Chat>> FilterActiveParticipantChatsAsync(IReadOnlyList<Chat> chats, CancellationToken ct)
    {
        if (_users is null || chats.Count == 0)
            return chats;

        var filtered = new List<Chat>(chats.Count);
        foreach (var chat in chats)
        {
            if (!await HasInactiveParticipantAsync(chat.BuyerId, chat.SellerId, ct))
                filtered.Add(chat);
        }

        return filtered;
    }
}

using SBay.Backend.APIs.Records;
using SBay.Backend.Exceptions;
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
        INotificationRepository notifications)
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
        if (amount < 0) throw new InvalidOperationException("Offer cannot be negative");
        var chat = await GetParticipantChatAsync(chatId, senderId, ct);
        if (!chat.ListingId.HasValue) throw new InvalidOperationException("Offers require a listing chat");
        var listing = await _listings.GetByIdForManagementAsync(chat.ListingId.Value, ct)
                      ?? throw new InvalidOperationException("Listing not found");
        if (listing.Status != "active") throw new InvalidOperationException("Listing is not active");

        var receiverId = senderId == chat.BuyerId ? chat.SellerId : chat.BuyerId;
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

        await _notifications.AddAsync(new UserNotification
        {
            UserId = receiverId,
            Type = "offer_received",
            Title = "New offer received",
            Body = $"{payload.Amount:0.##} {payload.Currency} offer for {listing.Title}",
            Href = $"/messages/{chat.Id}",
            DataJson = JsonSerializer.Serialize(new { chatId = chat.Id, messageId = message.Id, listingId = chat.ListingId, amount = payload.Amount, currency = payload.Currency }),
            CreatedAt = DateTimeOffset.UtcNow
        }, ct);
        await _uow.SaveChangesAsync(ct);
        return message;
    }

    public async Task<Message> AcceptOfferAsync(Guid chatId, Guid messageId, Guid responderId, CancellationToken ct = default)
    {
        var (chat, offerMessage, payload) = await GetPendingOfferAsync(chatId, messageId, responderId, ct);
        payload = payload with { Status = "accepted" };
        offerMessage.DataJson = JsonSerializer.Serialize(payload);
        offerMessage.Content = FormatOfferContent(payload);
        await _messages.UpdateAsync(offerMessage, ct);

        var listing = await _listings.GetByIdForManagementAsync(payload.ListingId, ct)
                      ?? throw new InvalidOperationException("Listing not found");
        listing.MarkSoldUntil(_clock.UtcNow.AddDays(15));
        await _listings.UpdateAsync(listing, ct);

        await AddSystemMessageAsync(chat, responderId, offerMessage.SenderId, $"Offer accepted: {payload.Amount:0.##} {payload.Currency}", ct);
        await _uow.SaveChangesAsync(ct);
        await _events.MessageUpdatedAsync(offerMessage, ct);
        return offerMessage;
    }

    public async Task<Message> RejectOfferAsync(Guid chatId, Guid messageId, Guid responderId, CancellationToken ct = default)
    {
        var (_, offerMessage, payload) = await GetPendingOfferAsync(chatId, messageId, responderId, ct);
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
        if (amount < 0) throw new InvalidOperationException("Offer cannot be negative");
        var (chat, offerMessage, payload) = await GetPendingOfferAsync(chatId, messageId, responderId, ct);
        payload = payload with { Status = "countered" };
        offerMessage.DataJson = JsonSerializer.Serialize(payload);
        offerMessage.Content = FormatOfferContent(payload);
        await _messages.UpdateAsync(offerMessage, ct);

        var counterPayload = new OfferPayload(
            OfferId: Guid.NewGuid(),
            ListingId: payload.ListingId,
            Amount: amount,
            Currency: NormalizeCurrency(currency, payload.Currency),
            Status: "pending",
            ParentOfferId: payload.OfferId,
            ExpiresAt: null);
        var counter = await AddOfferMessageAsync(chat, responderId, offerMessage.SenderId, counterPayload, ct);
        await _uow.SaveChangesAsync(ct);
        await _events.MessageUpdatedAsync(offerMessage, ct);
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

    public async Task<IReadOnlyList<ChatSummaryDto>> GetInboxSummaryAsync(Guid me, int take = 20, int skip = 0, CancellationToken ct = default)
    {
        var normalizedTake = take < 1 ? 20 : Math.Min(take, 100);
        var normalizedSkip = Math.Max(0, skip);
        var chats = await _chats.GetInboxAsync(me, normalizedTake, normalizedSkip, ct);
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
        return await _chats.GetInboxAsync(me, normalizedTake, normalizedSkip, ct);
    }
}

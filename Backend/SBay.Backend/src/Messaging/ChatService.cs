using SBay.Backend.APIs.Records;
using SBay.Backend.Exceptions;
using SBay.Backend.Utils;
using SBay.Domain.Database;

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

    public ChatService(
        IChatRepository chats,
        IMessageRepository messages,
        ITextSanitizer sanitizer,
        IClock clock,
        IUserOwnership ownership,
        IChatEvents events,
        IUnitOfWork uow,
        IUserBlockRepository blocks)
    {
        _chats = chats;
        _messages = messages;
        _sanitizer = sanitizer;
        _clock = clock;
        _ownership = ownership;
        _events = events;
        _uow = uow;
        _blocks = blocks;
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
                    lastMessage.Content,
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

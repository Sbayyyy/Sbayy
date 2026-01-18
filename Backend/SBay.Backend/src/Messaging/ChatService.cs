using SBay.Backend.Utils;
using SBay.Domain.Database;

namespace SBay.Backend.Messaging;

public sealed class ChatService : IChatService
{
    private const int MaxMessageLength = 2000;
    private const int RateLimitCount = 5;
    private static readonly TimeSpan RateWindow = TimeSpan.FromSeconds(5);

    private readonly IChatRepository _chats;
    private readonly IMessageRepository _messages;
    private readonly ITextSanitizer _sanitizer;
    private readonly IClock _clock;
    private readonly IUserOwnership _ownership;
    private readonly IChatEvents _events;
    private readonly IUnitOfWork _uow;

    public ChatService(
        IChatRepository chats,
        IMessageRepository messages,
        ITextSanitizer sanitizer,
        IClock clock,
        IUserOwnership ownership,
        IChatEvents events,
        IUnitOfWork uow)
    {
        _chats = chats;
        _messages = messages;
        _sanitizer = sanitizer;
        _clock = clock;
        _ownership = ownership;
        _events = events;
        _uow = uow;
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

        var chat = await _chats.FindByParticipantsAsync(buyerId, sellerId, listingId, ct);
        if (chat is not null) return chat;

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
        Console.WriteLine("SANITIZER_TYPE=" + _sanitizer.GetType().FullName);
        Console.WriteLine("BEFORE=" + trimmed);
        var clean = _sanitizer.Sanitize(trimmed);
        Console.WriteLine("AFTER =" + clean);

        var msg = new Message(chat.Id, clean, senderId, receiverId, chat.ListingId) { CreatedAt = now };
        await _messages.AddAsync(msg, ct);
        await _chats.UpdateLastMessageTimestampAsync(chatId, now, ct);
        await _uow.SaveChangesAsync(ct);
        await _events.MessageNewAsync(msg, ct);
        return msg;
    }

    public async Task<IReadOnlyList<Message>> GetMessagesAsync(Guid chatId, int take = 50, DateTime? before = null, CancellationToken ct = default)
    {
        return await _messages.GetMessagesAsync(chatId, take, before, ct);
    }

    public async Task<int> MarkReadAsync(Guid chatId, Guid readerId, DateTime upTo, CancellationToken ct = default)
    {
        var affectedRows = await _messages.MarkReadUpToAsync(chatId, readerId, upTo, ct);
        await _events.MessagesReadAsync(chatId, readerId, ct);
        return affectedRows;
    }

    public async Task<IReadOnlyList<Chat>> GetInboxAsync(Guid me, int take = 20, int skip = 0, CancellationToken ct = default)
    {
        return await _chats.GetInboxAsync(me, take, skip, ct);
    }
}

using Microsoft.EntityFrameworkCore;
using SBay.Backend.Utils;
using SBay.Domain.Database;

namespace SBay.Backend.Messaging;

public sealed class ChatService : IChatService
{
    private const int MaxMessageLength = 2000;
    private const int RateLimitCount = 5;
    private static readonly TimeSpan RateWindow = TimeSpan.FromSeconds(5);

    private readonly EfDbContext _db;
    private readonly ITextSanitizer _sanitizer;
    private readonly IClock _clock;
    private readonly IUserOwnership _ownership;
    private readonly IChatEvents _events;

    public ChatService(EfDbContext db, ITextSanitizer sanitizer, IClock clock, IUserOwnership ownership, IChatEvents events)
    {
        _db = db;
        _sanitizer = sanitizer;
        _clock = clock;
        _ownership = ownership;
        _events = events;
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

        var chat = await _db.Set<Chat>().FirstOrDefaultAsync(
            c => c.BuyerId == buyerId && c.SellerId == sellerId && c.ListingId == listingId, ct);

        if (chat is not null) return chat;

        chat = new Chat { Id = Guid.NewGuid(), BuyerId = buyerId, SellerId = sellerId, ListingId = listingId };
        _db.Add(chat);
        try
        {
            await _db.SaveChangesAsync(ct);
            return chat;
        }
        catch (DbUpdateException)
        {
            return await _db.Set<Chat>().FirstAsync(
                c => c.BuyerId == buyerId && c.SellerId == sellerId && c.ListingId == listingId, ct);
        }
    }

    public async Task<Message> SendAsync(Guid chatId, Guid senderId, string content, CancellationToken ct = default)
    {
        var trimmed = content?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmed)) throw new InvalidOperationException("Empty message");
        if (trimmed.Length > MaxMessageLength) throw new InvalidOperationException("Message too long");

        var now = _clock.UtcNow;
        var windowStart = now - RateWindow;
        var sent = await _db.Set<Message>().AsNoTracking()
            .CountAsync(m => m.SenderId == senderId && m.CreatedAt >= windowStart, ct);
        if (sent >= RateLimitCount) throw new InvalidOperationException("Rate limited");

        var chat = await _db.Set<Chat>().AsNoTracking().FirstOrDefaultAsync(c => c.Id == chatId, ct)
                   ?? throw new InvalidOperationException("Chat not found");
        if (senderId != chat.BuyerId && senderId != chat.SellerId) throw new InvalidOperationException("Forbidden");

        var receiverId = senderId == chat.BuyerId ? chat.SellerId : chat.BuyerId;
        var clean = _sanitizer.Sanitize(trimmed);

        var msg = new Message(chat.Id, clean, senderId, receiverId, chat.ListingId) { CreatedAt = now };
        _db.Add(msg);

        if (_db.Database.IsRelational())
        {
            await _db.Database.ExecuteSqlRawAsync("UPDATE chats SET last_message_at = now() WHERE id = {0}", chatId);
        }
        else
        {
            var trackedChat = await _db.Set<Chat>().FirstAsync(c => c.Id == chatId, ct);
            trackedChat.LastMessageAt = now;
        }

        await _db.SaveChangesAsync(ct);
        await _events.MessageNewAsync(msg, ct);
        return msg;
    }

    public async Task<IReadOnlyList<Message>> GetMessagesAsync(Guid chatId, int take = 50, DateTime? before = null, CancellationToken ct = default)
    {
        var q = _db.Set<Message>().AsNoTracking().Where(m => m.ChatId == chatId);
        if (before is not null) q = q.Where(m => m.CreatedAt < before);
        return await q.OrderByDescending(m => m.CreatedAt).Take(take).ToListAsync(ct);
    }

    public async Task<int> MarkReadAsync(Guid chatId, Guid readerId, DateTime upTo, CancellationToken ct = default)
    {
        var q = _db.Set<Message>().Where(m =>
            m.ChatId == chatId && m.ReceiverId == readerId && !m.IsRead && m.CreatedAt <= upTo);

        int affectedRows;
        if (_db.Database.IsRelational())
        {
            affectedRows = await q.ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true), ct);
        }
        else
        {
            var items = await q.ToListAsync(ct);
            foreach (var m in items) m.IsRead = true;
            await _db.SaveChangesAsync(ct);
            affectedRows = items.Count;
        }

        await _events.MessagesReadAsync(chatId, readerId, ct);
        return affectedRows;
    }

    public async Task<IReadOnlyList<Chat>> GetInboxAsync(Guid me, int take = 20, int skip = 0, CancellationToken ct = default)
    {
        return await _db.Set<Chat>()
            .AsNoTracking()
            .Where(c => c.BuyerId == me || c.SellerId == me)
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct);
    }
}

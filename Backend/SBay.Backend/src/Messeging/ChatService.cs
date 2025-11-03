using SBay.Domain.Database;
using Microsoft.EntityFrameworkCore;
namespace SBay.Backend.Messaging;

public class ChatService : IChatService
{
    private readonly EfDbContext _db;
    public ChatService(EfDbContext db) => _db = db;

    public async Task<Chat> GetOrCreateAsync(Guid buyerId, Guid sellerId, Guid? listingId,
        CancellationToken ct = default)
    {
        var chat = await _db.Set<Chat>().FirstOrDefaultAsync(c =>
            c.BuyerId == buyerId && c.SellerId == sellerId && c.ListingId == listingId, ct);

        if (chat is not null) return chat;

        chat = new Chat { Id = Guid.NewGuid(), BuyerId = buyerId, SellerId = sellerId, ListingId = listingId };
        _db.Add(chat);
        await _db.SaveChangesAsync(ct);
        return chat;
    }

    public async Task<Message> SendAsync(Guid chatId, Guid senderId, string content, CancellationToken ct = default)
    {
        var chat = await _db.Set<Chat>().FirstAsync(c => c.Id == chatId, ct);
        var receiverId = senderId == chat.BuyerId ? chat.SellerId : chat.BuyerId;

        var msg = new Message(chat.Id, content, senderId, receiverId, chat.ListingId);
        _db.Add(msg);

        chat.LastMessageAt = msg.CreatedAt;
        await _db.SaveChangesAsync(ct);
        return msg;
    }

    public async Task<IReadOnlyList<Message>> GetMessagesAsync(Guid chatId, int take = 50, DateTime? before = null,
        CancellationToken ct = default)
    {
        var q = _db.Set<Message>().AsNoTracking().Where(m => m.ChatId == chatId);
        if (before is not null) q = q.Where(m => m.CreatedAt < before);
        return await q.OrderByDescending(m => m.CreatedAt).Take(take).ToListAsync(ct);
    }

    public async Task<int> MarkReadAsync(Guid chatId, Guid readerId, DateTime upTo, CancellationToken ct = default)
    {
        var q = _db.Set<Message>().Where(m =>
            m.ChatId == chatId && m.ReceiverId == readerId && !m.IsRead && m.CreatedAt <= upTo);
        var affectedRows = await q.ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true), ct);
        return affectedRows;
    }
}

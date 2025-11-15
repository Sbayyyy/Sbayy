using Microsoft.EntityFrameworkCore;
using SBay.Backend.Messaging;
using SBay.Domain.Database;

namespace SBay.Domain.Database;

public class EfChatRepository : IChatRepository
{
    private readonly EfDbContext _db;
    public EfChatRepository(EfDbContext db) => _db = db;

    public async Task<Chat?> FindByParticipantsAsync(Guid buyerId, Guid sellerId, Guid? listingId, CancellationToken ct)
    {
        return await _db.Set<Chat>()
            .FirstOrDefaultAsync(c => c.BuyerId == buyerId && c.SellerId == sellerId && c.ListingId == listingId, ct);
    }

    public async Task<IReadOnlyList<Chat>> GetInboxAsync(Guid userId, int take, int skip, CancellationToken ct)
    {
        return await _db.Set<Chat>()
            .AsNoTracking()
            .Where(c => c.BuyerId == userId || c.SellerId == userId)
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct);
    }

    public async Task<bool> UpdateLastMessageTimestampAsync(Guid chatId, DateTime timestamp, CancellationToken ct)
    {
        if (_db.Database.IsRelational())
        {
            var affected = await _db.Database.ExecuteSqlRawAsync(
                "UPDATE chats SET last_message_at = {0} WHERE id = {1}", timestamp, chatId);
            return affected > 0;
        }

        var chat = await _db.Set<Chat>().FirstOrDefaultAsync(c => c.Id == chatId, ct);
        if (chat == null) return false;
        chat.LastMessageAt = timestamp;
        return true;
    }

    public async Task<Chat?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _db.Set<Chat>()
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, ct);
    }

    public async Task<bool> ExistAsync(Guid id, CancellationToken ct)
    {
        return await _db.Set<Chat>().AsNoTracking().AnyAsync(c => c.Id == id, ct);
    }

    public async Task AddAsync(Chat entity, CancellationToken ct)
    {
        await _db.Set<Chat>().AddAsync(entity, ct);
    }

    public Task UpdateAsync(Chat entity, CancellationToken ct)
    {
        _db.Set<Chat>().Update(entity);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(Chat entity, CancellationToken ct)
    {
        _db.Set<Chat>().Remove(entity);
        return Task.CompletedTask;
    }
}

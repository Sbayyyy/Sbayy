using Microsoft.EntityFrameworkCore;
using SBay.Backend.Messaging;
using SBay.Domain.Database;

namespace SBay.Domain.Database;

public class EfMessageRepository : IMessageRepository
{
    private readonly EfDbContext _db;
    public EfMessageRepository(EfDbContext db) => _db = db;

    public async Task<int> CountSentSinceAsync(Guid senderId, DateTime from, CancellationToken ct)
    {
        return await _db.Set<Message>()
            .AsNoTracking()
            .CountAsync(m => m.SenderId == senderId && m.CreatedAt >= from, ct);
    }

    public async Task<IReadOnlyList<Message>> GetMessagesAsync(Guid chatId, int take, DateTime? before, CancellationToken ct)
    {
        var query = _db.Set<Message>()
            .AsNoTracking()
            .Where(m => m.ChatId == chatId);
        if (before is not null) query = query.Where(m => m.CreatedAt < before);
        return await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(take)
            .ToListAsync(ct);
    }

    public async Task<int> MarkReadUpToAsync(Guid chatId, Guid readerId, DateTime upTo, CancellationToken ct)
    {
        var query = _db.Set<Message>()
            .Where(m => m.ChatId == chatId && m.ReceiverId == readerId && !m.IsRead && m.CreatedAt <= upTo);

        if (_db.Database.IsRelational())
        {
            return await query.ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true), ct);
        }

        var items = await query.ToListAsync(ct);
        foreach (var message in items) message.IsRead = true;
        await _db.SaveChangesAsync(ct);
        return items.Count;
    }

    public async Task<Message?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _db.Set<Message>()
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id, ct);
    }

    public async Task<bool> ExistAsync(Guid id, CancellationToken ct)
    {
        return await _db.Set<Message>().AsNoTracking().AnyAsync(m => m.Id == id, ct);
    }

    public async Task AddAsync(Message entity, CancellationToken ct)
    {
            await _db.Set<Message>().AddAsync(entity, ct);
    }

    public Task UpdateAsync(Message entity, CancellationToken ct)
    {
        _db.Set<Message>().Update(entity);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(Message entity, CancellationToken ct)
    {
        _db.Set<Message>().Remove(entity);
        return Task.CompletedTask;
    }
}

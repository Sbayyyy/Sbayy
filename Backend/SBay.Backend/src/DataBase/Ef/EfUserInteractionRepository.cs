using Microsoft.EntityFrameworkCore;
using SBay.Domain.Entities;

namespace SBay.Domain.Database;

public sealed class EfUserInteractionRepository : IUserInteractionRepository
{
    private readonly EfDbContext _db;
    public EfUserInteractionRepository(EfDbContext db) => _db = db;

    public async Task RecordAsync(Guid userId, string category, double weight, DateTimeOffset now, CancellationToken ct)
    {
        await _db.Database.ExecuteSqlInterpolatedAsync($@"
            INSERT INTO user_category_interests (user_id, category, score, last_interaction_at)
            VALUES ({userId}, {category}, {weight}, {now})
            ON CONFLICT (user_id, category)
            DO UPDATE SET score = user_category_interests.score + {weight},
                          last_interaction_at = {now}", ct);
    }

    public async Task<IReadOnlyList<string>> GetTopCategoriesAsync(Guid userId, int limit, CancellationToken ct)
    {
        return await _db.Set<UserCategoryInterest>()
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.Score)
            .ThenByDescending(x => x.LastInteractionAt)
            .Select(x => x.Category)
            .Take(limit)
            .ToListAsync(ct);
    }
}

using Microsoft.EntityFrameworkCore;
using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public class EfReportRepository : IReportRepository
    {
        private readonly EfDbContext _db;

        public EfReportRepository(EfDbContext dbContext)
        {
            _db = dbContext;
        }

        public async Task AddAsync(Report report, CancellationToken ct)
        {
            await _db.Set<Report>().AddAsync(report, ct);
        }

        public async Task<Report?> GetByIdAsync(Guid id, CancellationToken ct)
        {
            return await _db.Set<Report>().FirstOrDefaultAsync(r => r.Id == id, ct);
        }

        public Task UpdateAsync(Report report, CancellationToken ct)
        {
            _db.Set<Report>().Update(report);
            return Task.CompletedTask;
        }

        public async Task<IReadOnlyList<Report>> GetAdminReportsAsync(
            Guid? reportedUserId,
            ReportTargetType? targetType,
            ReportReason? reason,
            ReportStatus? status,
            int take,
            int skip,
            CancellationToken ct)
        {
            var query = _db.Set<Report>().AsNoTracking();

            if (reportedUserId.HasValue)
                query = query.Where(r => r.ReportedUserId == reportedUserId.Value);
            if (targetType.HasValue)
                query = query.Where(r => r.TargetType == targetType.Value);
            if (reason.HasValue)
                query = query.Where(r => r.Reason == reason.Value);
            if (status.HasValue)
                query = query.Where(r => r.Status == status.Value);

            return await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync(ct);
        }
    }
}

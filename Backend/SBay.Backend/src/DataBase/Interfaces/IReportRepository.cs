using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public interface IReportRepository
    {
        Task AddAsync(Report report, CancellationToken ct);
        Task<Report?> GetByIdAsync(Guid id, CancellationToken ct);
        Task UpdateAsync(Report report, CancellationToken ct);
        Task<IReadOnlyList<Report>> GetAdminReportsAsync(
            Guid? reportedUserId,
            ReportTargetType? targetType,
            ReportReason? reason,
            ReportStatus? status,
            int take,
            int skip,
            CancellationToken ct);
    }
}

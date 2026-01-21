using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase
{
    public class FirebaseReportRepository : IReportRepository
    {
        public Task AddAsync(Report report, CancellationToken ct)
        {
            throw new NotImplementedException("Firestore report storage is not implemented.");
        }

        public Task<Report?> GetByIdAsync(Guid id, CancellationToken ct)
        {
            throw new NotImplementedException("Firestore report storage is not implemented.");
        }

        public Task UpdateAsync(Report report, CancellationToken ct)
        {
            throw new NotImplementedException("Firestore report storage is not implemented.");
        }

        public Task<IReadOnlyList<Report>> GetAdminReportsAsync(
            Guid? reportedUserId,
            ReportTargetType? targetType,
            ReportReason? reason,
            ReportStatus? status,
            int take,
            int skip,
            CancellationToken ct)
        {
            throw new NotImplementedException("Firestore report storage is not implemented.");
        }
    }
}

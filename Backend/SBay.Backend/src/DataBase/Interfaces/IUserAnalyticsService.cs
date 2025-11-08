using SBay.Backend.APIs.Records;

namespace SBay.Backend.DataBase.Interfaces;

public interface IUserAnalyticsService
{
    Task<UserStatsDto> GetStatsAsync(Guid userId, CancellationToken ct);
    Task<UserAnalyticsDto> GetAnalyticsAsync(Guid userId, DateTime from, DateTime to, string granularity, CancellationToken ct);
}


using SBay.Backend.APIs.Records;

public interface IUserAnalyticsService
{
    Task<UserStatsDto> GetStatsAsync(Guid userId, CancellationToken ct);
    Task<UserAnalyticsDto> GetAnalyticsAsync(Guid userId, DateTime from, DateTime to, string granularity, CancellationToken ct);
}
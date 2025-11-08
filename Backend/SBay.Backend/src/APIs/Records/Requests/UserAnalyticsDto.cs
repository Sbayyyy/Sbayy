namespace SBay.Backend.APIs.Records;

public sealed record UserAnalyticsDto(int ItemsSold, decimal Revenue, int OrdersCount, decimal Aov, IReadOnlyList<PointDto> Series);

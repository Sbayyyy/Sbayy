namespace SBay.Backend.APIs.Records.Responses;

public sealed record ReviewStatsDto(
    decimal AverageRating,
    int TotalReviews,
    IReadOnlyDictionary<int, int> RatingDistribution
);

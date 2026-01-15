namespace SBay.Backend.APIs.Records;

public sealed record UpdateReviewRequest(
    int? Rating,
    string? Comment
);

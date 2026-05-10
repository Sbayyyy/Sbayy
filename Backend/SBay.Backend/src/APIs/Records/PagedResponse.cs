namespace SBay.Backend.APIs.Records;

public sealed record PagedResponse<T>(
    IReadOnlyList<T> Items,
    int Total,
    int Page,
    int Limit
);

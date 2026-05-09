using SBay.Backend.APIs.Records.Responses;

namespace SBay.Backend.APIs.Records;

public sealed record ApiSuccessResponse(bool Ok = true);

public sealed record OrdersPageResponse(
    IReadOnlyList<OrderDto> Orders,
    IReadOnlyList<OrderDto> Items,
    int Total,
    int Page,
    int Limit);

public sealed record ReviewsPageResponse(
    IReadOnlyList<ReviewDto> Reviews,
    IReadOnlyList<ReviewDto> Items,
    ReviewStatsDto Stats,
    int Total,
    int Page,
    int Limit);

public sealed record ReviewHelpfulResponse(int Helpful, bool IsHelpful);

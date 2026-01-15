namespace SBay.Backend.APIs.Records;

public sealed record CreateReviewRequest(
    Guid? ProductId,
    Guid? SellerId,
    Guid? OrderId,
    int Rating,
    string Comment
);

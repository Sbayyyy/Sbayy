namespace SBay.Backend.APIs.Records.Responses;

public sealed record ReviewDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string? UserAvatar,
    Guid? ProductId,
    Guid? SellerId,
    Guid? OrderId,
    int Rating,
    string Comment,
    int Helpful,
    bool IsHelpful,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

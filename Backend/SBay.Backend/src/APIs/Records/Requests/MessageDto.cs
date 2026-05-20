namespace SBay.Backend.APIs.Records;

public sealed record MessageDto(
    Guid Id,
    Guid ChatId,
    Guid SenderId,
    Guid ReceiverId,
    Guid? ListingId,
    string Content,
    string Type,
    string? DataJson,
    DateTime CreatedAt,
    bool IsRead);

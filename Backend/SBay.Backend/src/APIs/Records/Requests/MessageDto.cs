namespace SBay.Backend.APIs.Records;

public sealed record MessageDto(Guid Id, Guid ChatId, Guid SenderId, Guid ReceiverId, string Content, DateTime CreatedAt, bool IsRead);
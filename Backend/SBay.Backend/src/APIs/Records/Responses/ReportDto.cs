using SBay.Domain.Entities;

namespace SBay.Backend.APIs.Records.Responses;

public sealed record ReportDto(
    Guid Id,
    Guid ReporterId,
    Guid? ReportedUserId,
    ReportTargetType TargetType,
    Guid TargetId,
    ReportReason Reason,
    string? Description,
    IReadOnlyList<string> EvidenceUrls,
    bool BlockRequested,
    ReportStatus Status,
    ReportAction Action,
    Guid? ReviewedById,
    DateTimeOffset? ReviewedAt,
    string? AdminNotes,
    DateTimeOffset CreatedAt
);

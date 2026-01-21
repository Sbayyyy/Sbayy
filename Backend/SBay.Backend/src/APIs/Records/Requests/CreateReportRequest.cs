namespace SBay.Backend.APIs.Records.Requests;

public record CreateReportRequest(
    string TargetType,
    Guid TargetId,
    string Reason,
    string? Description,
    List<string>? EvidenceUrls,
    bool BlockUser);

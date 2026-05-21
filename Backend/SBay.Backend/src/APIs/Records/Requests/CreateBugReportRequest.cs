namespace SBay.Backend.APIs.Records.Requests;

public sealed record CreateBugReportRequest(
    string Title,
    string Description,
    string? PageUrl,
    string? Steps,
    string? Expected,
    string? Actual,
    string? Severity,
    string? Browser,
    string? UserAgent);

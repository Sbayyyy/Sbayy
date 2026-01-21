namespace SBay.Backend.APIs.Records.Requests;

public record UpdateReportRequest(
    string? Status,
    string? Action,
    string? AdminNotes);

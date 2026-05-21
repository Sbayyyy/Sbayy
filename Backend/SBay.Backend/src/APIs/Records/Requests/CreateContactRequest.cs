namespace SBay.Backend.APIs.Records.Requests;

public sealed record CreateContactRequest(
    string Name,
    string Email,
    string Subject,
    string Message,
    string? PageUrl,
    string? UserAgent);

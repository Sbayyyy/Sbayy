namespace SBay.Backend.APIs.Records.Responses;

public sealed record ClientLogDto(
    Guid Id,
    Guid? UserId,
    string Level,
    string Source,
    string Message,
    string? ExceptionType,
    string? StackTrace,
    string? ContextJson,
    string? AppVersion,
    string? Platform,
    string? DeviceId,
    string? RequestId,
    string? UserAgent,
    string? Url,
    DateTimeOffset CreatedAt);

public sealed record ClientLogsPageResponse(
    IReadOnlyList<ClientLogDto> Items,
    int Total,
    int Page,
    int Limit);

public sealed record ClientLogSummaryResponse(
    int Total,
    int Last24Hours,
    int Errors,
    int Warnings,
    int Critical,
    IReadOnlyList<ClientLogSourceSummary> Sources);

public sealed record ClientLogSourceSummary(string Source, int Count);

namespace SBay.Backend.APIs.Records.Requests;

public sealed record CreateClientLogRequest(
    string? Level,
    string? Source,
    string? Message,
    string? ExceptionType,
    string? StackTrace,
    Dictionary<string, object?>? Context,
    string? AppVersion,
    string? Platform,
    string? DeviceId,
    string? RequestId,
    string? Url);

namespace SBay.Domain.Entities;

public sealed class ClientLog
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string Level { get; set; } = "error";
    public string Source { get; set; } = "unknown";
    public string Message { get; set; } = string.Empty;
    public string? ExceptionType { get; set; }
    public string? StackTrace { get; set; }
    public string? ContextJson { get; set; }
    public string? AppVersion { get; set; }
    public string? Platform { get; set; }
    public string? DeviceId { get; set; }
    public string? RequestId { get; set; }
    public string? UserAgent { get; set; }
    public string? Url { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

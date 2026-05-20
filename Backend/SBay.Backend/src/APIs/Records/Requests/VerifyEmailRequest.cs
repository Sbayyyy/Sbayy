namespace SBay.Backend.APIs.Records.Requests;

public sealed class VerifyEmailRequest
{
    public string Token { get; init; } = string.Empty;
}

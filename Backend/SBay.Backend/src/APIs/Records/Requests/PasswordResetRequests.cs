namespace SBay.Backend.APIs.Records.Requests;

public sealed class ForgotPasswordRequest
{
    public string Email { get; init; } = string.Empty;
}

public sealed class ResetPasswordRequest
{
    public string Token { get; init; } = string.Empty;
    public string NewPassword { get; init; } = string.Empty;
}

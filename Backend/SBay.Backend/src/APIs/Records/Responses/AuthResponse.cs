namespace SBay.Backend.APIs.Records.Responses;

public record AuthResponse(UserDto User, string Token)
{
    public string? RefreshToken { get; init; }
    public DateTimeOffset? RefreshTokenExpiresAt { get; init; }
}

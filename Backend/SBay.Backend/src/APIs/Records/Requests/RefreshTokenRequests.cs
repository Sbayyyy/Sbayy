namespace SBay.Backend.APIs.Records;

public sealed record RefreshTokenRequest(string RefreshToken);

public sealed record LogoutRequest(string? RefreshToken);

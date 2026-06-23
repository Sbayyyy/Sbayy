namespace SBay.Backend.APIs.Records.Requests;

public sealed record GoogleAuthRequest(string? IdToken, string? AccessToken);

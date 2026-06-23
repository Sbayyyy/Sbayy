namespace SBay.Backend.APIs.Records.Requests;

public sealed record GoogleMobileCallbackRequest(string? Code, string? IdToken, string? RedirectUri);

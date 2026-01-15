namespace SBay.Backend.APIs.Records;

public sealed record UpdateProfileRequest(string? DisplayName, string? Phone, string? City, string? Avatar);

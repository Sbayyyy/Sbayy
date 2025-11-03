namespace SBay.Backend.APIs.Records;

public record RegisterRequest(string Email, string Password, string? DisplayName, string? Phone);
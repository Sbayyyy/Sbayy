namespace SBay.Backend.APIs.Records;

public record AuthResponse(UserDto User, string Token);
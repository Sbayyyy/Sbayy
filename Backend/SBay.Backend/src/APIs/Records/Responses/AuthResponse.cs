namespace SBay.Backend.APIs.Records.Responses;


public record AuthResponse(UserDto User, string Token);
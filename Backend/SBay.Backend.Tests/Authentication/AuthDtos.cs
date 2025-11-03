public record RegisterRequest(string Email, string Password, string? DisplayName = null, string? Phone = null);


public record LoginRequest(string Email, string Password);
public record UserDto(Guid Id, string Email, string? DisplayName, string? Phone, string Role, DateTime CreatedAt);
public record AuthResponse(UserDto User, string Token);
namespace SBay.Backend.APIs.Records;

public record UserDto(Guid Id, string Email, string? DisplayName, string? Phone, string Role, DateTime CreatedAt);

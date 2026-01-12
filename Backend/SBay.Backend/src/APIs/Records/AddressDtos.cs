namespace SBay.Backend.APIs.Records;

/// <summary>
/// Address DTO for responses (matches Frontend: Address interface + id)
/// </summary>
public record AddressDto(
    Guid Id,
    string Name,
    string Phone,
    string Street,
    string City,
    string? Region,
    DateTime CreatedAt
);

/// <summary>
/// Request DTO for creating/updating address (matches Frontend: Address interface)
/// </summary>
public record SaveAddressRequest(
    string Name,
    string Phone,
    string Street,
    string City,
    string? Region
);

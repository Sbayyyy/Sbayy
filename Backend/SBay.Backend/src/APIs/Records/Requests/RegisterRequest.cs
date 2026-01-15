using System.Text.Json.Serialization;

namespace SBay.Backend.APIs.Records;


public record RegisterRequest(
    string Email,
    string Password,
    string? Name,
    string? DisplayName,
    string? Phone,
    string? City);

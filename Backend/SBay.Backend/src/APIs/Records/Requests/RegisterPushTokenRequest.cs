namespace SBay.Backend.APIs.Records.Requests;

public record RegisterPushTokenRequest(string Token, string? Platform, string? DeviceId);

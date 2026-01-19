namespace SBay.Backend.APIs.Records;

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

namespace SBay.Backend.APIs.Records;

public sealed record UpdateOrderStatusRequest
{
    public required string Status { get; init; }
}

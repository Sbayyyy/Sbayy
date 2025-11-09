namespace SBay.Backend.APIs.Records;

public sealed record OpenChatRequest(Guid OtherUserId, Guid? ListingId);
namespace SBay.Backend.APIs.Records;

public sealed record ChatSummaryDto(Guid ChatId, Guid BuyerId, Guid SellerId, Guid? ListingId, DateTime LastMessageAt, int UnreadCount, MessageDto? LastMessage);

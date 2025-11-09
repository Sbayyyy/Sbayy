namespace SBay.Backend.APIs.Records;

public sealed record CreateOrderReq(Guid SellerId, IReadOnlyList<CreateOrderItemReq> Items);
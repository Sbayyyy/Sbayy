namespace SBay.Backend.APIs.Records;

/// <summary>
/// Create order request
/// Frontend can provide either SavedAddressId OR NewAddress
/// </summary>
public sealed record CreateOrderReq(
    Guid SellerId,
    IReadOnlyList<CreateOrderItemReq> Items,
    
    // OPTION 1: Use saved address (preferred)
    Guid? SavedAddressId,
    
    // OPTION 2: Provide new address (will be saved automatically)
    SaveAddressRequest? NewAddress,
    
    // Payment method: 'cod', 'bank_transfer', or 'meet_in_person'
    string PaymentMethod
);
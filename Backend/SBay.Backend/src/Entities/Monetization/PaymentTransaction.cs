namespace SBay.Domain.Entities;

public enum PaymentTransactionStatus
{
    Pending,
    RequiresAction,
    Succeeded,
    Failed,
    Cancelled,
    Refunded
}

public enum PaymentTransactionPurpose
{
    ListingBoost,
    OrderPayment
}

public sealed class PaymentTransaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid? ListingId { get; set; }
    public Guid? OrderId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string? ProviderReference { get; set; }
    public PaymentTransactionPurpose Purpose { get; set; }
    public PaymentTransactionStatus Status { get; set; } = PaymentTransactionStatus.Pending;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "SYP";
    public string? MetadataJson { get; set; }
    public string? CheckoutUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

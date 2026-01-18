namespace SBay.Backend.Messaging;

public enum OfferStatus
{
    Pending,
    Accepted,
    Rejected,
    Cancelled
}
public class Offer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ListingId { get; set; }
    public Guid BuyerId { get; set; }
    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? Message { get; set; }
    public OfferStatus Status { get; set; } = OfferStatus.Pending;
}

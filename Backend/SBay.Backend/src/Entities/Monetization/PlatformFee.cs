namespace SBay.Domain.Entities;

public sealed class PlatformFee
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Guid SellerId { get; set; }
    public decimal BasisAmount { get; set; }
    public decimal FeeAmount { get; set; }
    public string Currency { get; set; } = "SYP";
    public decimal Rate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

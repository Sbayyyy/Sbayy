using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SBay.Domain.Entities;
public sealed class OrderItem
{
    [Key]
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid? ListingId { get; set; }
    public int Quantity { get; set; }
    [Column(TypeName = "numeric(12,2)")]
    public decimal PriceAmount { get; set; }
    [MaxLength(3)]
    public string PriceCurrency { get; set; } = "EUR";
    public Order Order { get; set; } = null!;
}
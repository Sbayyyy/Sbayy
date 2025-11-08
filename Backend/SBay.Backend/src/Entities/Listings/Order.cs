using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SBay.Domain.Entities;

public enum OrderStatus { Pending, Paid, Shipped, Completed, Cancelled }

public sealed class Order
{
    [Key]
    public Guid Id { get; set; }
    public Guid BuyerId { get; set; }
    public Guid SellerId { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    [Column(TypeName = "numeric(12,2)")]
    public decimal TotalAmount { get; set; }
    [MaxLength(3)]
    public string TotalCurrency { get; set; } = "EUR";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<OrderItem> Items { get; set; } = new();
}


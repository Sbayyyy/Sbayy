using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SBay.Domain.Entities;

public enum OrderStatus { Pending, Paid, Shipped, Completed, Cancelled }

/// <summary>
/// Payment method for orders (Frontend: 'cod' | 'bank_transfer' | 'meet_in_person')
/// </summary>
public enum PaymentMethod
{
    CashOnDelivery,    // 'cod'
    BankTransfer,      // 'bank_transfer'
    MeetInPerson       // 'meet_in_person'
}

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
    
    // ===== NEW: E-Commerce Features =====
    
    /// <summary>
    /// Foreign Key to Address entity (nullable for pickup orders)
    /// </summary>
    public Guid? ShippingAddressId { get; set; }
    
    /// <summary>
    /// Navigation property to Address
    /// </summary>
    public Address? ShippingAddress { get; set; }
    
    /// <summary>
    /// Payment method (COD, bank transfer, or meet in person)
    /// </summary>
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.CashOnDelivery;
    
    /// <summary>
    /// Shipping cost (calculated by ShippingService)
    /// </summary>
    [Column(TypeName = "numeric(10,2)")]
    public decimal ShippingCost { get; set; } = 0;
    
    /// <summary>
    /// Shipping carrier (e.g., "DHL Syria", "Aramex")
    /// </summary>
    [MaxLength(100)]
    public string? ShippingCarrier { get; set; }
    
    /// <summary>
    /// Estimated delivery days
    /// </summary>
    public int? EstimatedDeliveryDays { get; set; }
    
    /// <summary>
    /// Tracking number (set when order is shipped)
    /// </summary>
    [MaxLength(100)]
    public string? TrackingNumber { get; set; }
}


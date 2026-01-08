using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using SBay.Domain.Entities;

public sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> b)
    {
        b.ToTable("orders");
        b.HasKey(x => x.Id);
        
        var statusConverter = new ValueConverter<OrderStatus, string>(
            v => v.ToString().ToLowerInvariant(),
            s => Enum.Parse<OrderStatus>(s, true));
        b.Property(x => x.Status)
            .HasColumnName("status")
            .HasColumnType("text")
            .HasConversion(statusConverter)
            .HasDefaultValue(OrderStatus.Pending).HasMaxLength(20);
        b.Property(x => x.TotalAmount).HasColumnType("numeric(12,2)");
        b.Property(x => x.TotalCurrency).HasMaxLength(3).IsRequired();
        b.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
        b.Property(x => x.UpdatedAt).HasDefaultValueSql("now()");
        b.HasMany(x => x.Items).WithOne(i => i.Order).HasForeignKey(i => i.OrderId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => new { x.SellerId, x.Status, x.CreatedAt }).HasDatabaseName("idx_orders_seller_status_time");
        b.HasIndex(x => new { x.BuyerId, x.CreatedAt }).HasDatabaseName("idx_orders_buyer_time");
        
        // ===== NEW: E-Commerce Features Configuration =====
        
        // Foreign Key to Address
        b.Property(x => x.ShippingAddressId)
            .HasColumnName("shipping_address_id");
        
        b.HasOne(x => x.ShippingAddress)
            .WithMany()
            .HasForeignKey(x => x.ShippingAddressId)
            .OnDelete(DeleteBehavior.SetNull);  // Don't delete orders when address is deleted
        
        // Payment Method
        var paymentMethodConverter = new ValueConverter<PaymentMethod, string>(
            v => v.ToString().ToLowerInvariant(),
            s => Enum.Parse<PaymentMethod>(s, true));
        
        b.Property(x => x.PaymentMethod)
            .HasColumnName("payment_method")
            .HasConversion(paymentMethodConverter)
            .HasMaxLength(50)
            .HasDefaultValue(PaymentMethod.CashOnDelivery);
        
        // Shipping fields
        b.Property(x => x.ShippingCost)
            .HasColumnName("shipping_cost")
            .HasColumnType("numeric(10,2)")
            .HasDefaultValue(0);
        
        b.Property(x => x.ShippingCarrier)
            .HasColumnName("shipping_carrier")
            .HasMaxLength(100);
        
        b.Property(x => x.EstimatedDeliveryDays)
            .HasColumnName("estimated_delivery_days");
        
        b.Property(x => x.TrackingNumber)
            .HasColumnName("tracking_number")
            .HasMaxLength(100);
    }
}


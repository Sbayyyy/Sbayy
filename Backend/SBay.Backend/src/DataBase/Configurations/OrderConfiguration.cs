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
    }
}


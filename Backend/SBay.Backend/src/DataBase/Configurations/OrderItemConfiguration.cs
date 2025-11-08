using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Configurations;
public sealed class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> b)
    {
        b.ToTable("order_items");
        b.HasKey(x => x.Id);
        b.Property(x => x.PriceAmount).HasColumnType("numeric(12,2)");
        b.Property(x => x.PriceCurrency).HasMaxLength(3).IsRequired();
        b.HasIndex(x => x.OrderId).HasDatabaseName("idx_order_items_order");
    }
}
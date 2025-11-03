using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NpgsqlTypes;
using SBay.Domain.Entities;

public sealed class ListingConfiguration : IEntityTypeConfiguration<Listing>
{
    public void Configure(EntityTypeBuilder<Listing> e)
    {
        e.ToTable("listings");

        e.HasKey(x => x.Id);

        e.Property(x => x.SellerId).HasColumnName("seller_id").IsRequired();

        e.Property(x => x.Title).HasColumnName("title").IsRequired();
        e.Property(x => x.Description).HasColumnName("description");

        e.Property(x => x.CategoryPath).HasColumnName("category_path");
        e.Property(x => x.Region).HasColumnName("region");

        e.Property(x => x.StockQuantity)
            .HasColumnName("stock_quantity")
            .HasDefaultValue(1);

        e.OwnsOne(x => x.Price, m =>
        {
            m.Property(p => p.Amount)
                .HasColumnName("price_amount")
                .HasColumnType("numeric(12,2)")
                .IsRequired();

            m.Property(p => p.Currency)
                .HasColumnName("price_currency")
                .HasMaxLength(8)
                .IsRequired();
        });

        e.OwnsOne(x => x.OriginalPrice, m =>
        {
            m.Property(p => p.Amount)
                .HasColumnName("original_price_amount")
                .HasColumnType("numeric(12,2)");

            m.Property(p => p.Currency)
                .HasColumnName("original_price_currency")
                .HasMaxLength(8);
        });

        // FTS shadow column — filled by trigger in schema.sql
        e.Property<NpgsqlTsVector>("SearchVec")
            .HasColumnName("search_vec")
            .HasColumnType("tsvector")
            .ValueGeneratedOnAddOrUpdate(); // optional: lets EF know DB sets it

    }
}
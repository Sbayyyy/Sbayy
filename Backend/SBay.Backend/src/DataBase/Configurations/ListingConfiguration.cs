using Microsoft.EntityFrameworkCore;
using System;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NpgsqlTypes;
using SBay.Domain.Database;
using SBay.Domain.Entities;

public sealed class ListingConfiguration : IEntityTypeConfiguration<Listing>
{
    public void Configure(EntityTypeBuilder<Listing> e)
    {
        e.ToTable("listings");

        e.HasKey(x => x.Id);
        e.Property(x => x.Id)
         .HasColumnName("id")
         .ValueGeneratedOnAdd()
         .HasDefaultValueSql("gen_random_uuid()");

        e.Property(x => x.SellerId)
         .HasColumnName("seller_id")
         .IsRequired();

        e.HasOne<User>()
         .WithMany()
         .HasForeignKey(x => x.SellerId)
         .OnDelete(DeleteBehavior.Cascade);

        e.Property<int?>("CategoryId")
         .HasColumnName("category_id");

        e.Property(x => x.Title)
         .HasColumnName("title")
         .IsRequired();

        e.Property(x => x.Description)
         .HasColumnName("description");

        e.Property(x => x.CategoryPath)
         .HasColumnName("category_path");

        e.Property(x => x.Region)
         .HasColumnName("region");

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
            m.HasIndex(p => p.Amount)
             .HasDatabaseName("idx_listings_price_amount");
        });

        e.OwnsOne(x => x.OriginalPrice, m =>
        {
            m.Property(p => p.Amount)
             .HasColumnName("original_price_amount")
             .HasColumnType("numeric(12,2)");

            m.Property(p => p.Currency)
             .HasColumnName("original_price_currency")
             .HasMaxLength(8);
            m.HasIndex(p => p.Amount)
             .HasDatabaseName("idx_listings_original_price_amount");
        });

        e.Property(x => x.StockQuantity)
         .HasColumnName("stock_quantity")
         .HasDefaultValue(1);

        e.Property(x => x.ThumbnailUrl)
         .HasColumnName("thumbnail_url");

        e.Property(x => x.Condition)
         .HasColumnName("condition")
         .HasConversion<string>()
         .HasMaxLength(50)
         .HasDefaultValue(ItemCondition.Unknown);

        e.Property<string>("Status")
         .HasColumnName("status")
         .HasMaxLength(50)
         .HasDefaultValue("active");

        e.Property(x => x.CreatedAt)
         .HasColumnName("created_at")
         .HasDefaultValueSql("now()");

        e.Property(x => x.UpdatedAt)
         .HasColumnName("updated_at");

        e.HasIndex(x => x.SellerId)
         .HasDatabaseName("idx_listings_seller");

        e.HasIndex("CategoryId")
         .HasDatabaseName("idx_listings_category");

        var provider = e.Metadata.Model.FindAnnotation("Relational:ProviderName")?.Value?.ToString();
        if (string.Equals(provider, DatabaseProviders.PostgresProviderName, StringComparison.Ordinal))
        {
            e.Property<NpgsqlTsVector>("SearchVec")      // shadow prop (not on the C# class)
             .HasColumnName("search_vec")
             .HasColumnType("tsvector")
             .ValueGeneratedOnAddOrUpdate();
        }


        e.HasIndex(x => x.CreatedAt).HasDatabaseName("idx_listings_created_at");
        e.HasIndex(x => x.CategoryPath).HasDatabaseName("idx_listings_category_path");
    }
}
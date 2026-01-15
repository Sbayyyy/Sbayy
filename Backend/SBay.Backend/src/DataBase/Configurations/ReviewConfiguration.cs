using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SBay.Domain.Entities;

public sealed class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> b)
    {
        b.ToTable("reviews");
        b.HasKey(x => x.Id);
        b.Property(x => x.SellerId).HasColumnName("seller_id");
        b.Property(x => x.ReviewerId).HasColumnName("reviewer_id");
        b.Property(x => x.ListingId).HasColumnName("listing_id");
        b.Property(x => x.OrderId).HasColumnName("order_id");
        b.Property(x => x.Rating).HasColumnName("rating");
        b.Property(x => x.Comment).HasColumnName("comment").HasMaxLength(2000);
        b.Property(x => x.HelpfulCount).HasColumnName("helpful_count").HasDefaultValue(0);
        b.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        b.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
        b.HasIndex(x => new { x.SellerId, x.CreatedAt }).HasDatabaseName("idx_reviews_seller_time");
        b.HasIndex(x => new { x.ListingId, x.CreatedAt }).HasDatabaseName("idx_reviews_listing_time");
        b.HasIndex(x => new { x.ReviewerId, x.CreatedAt }).HasDatabaseName("idx_reviews_reviewer_time");
        b.HasIndex(x => new { x.ReviewerId, x.OrderId }).IsUnique().HasDatabaseName("ux_reviews_reviewer_order");
    }
}

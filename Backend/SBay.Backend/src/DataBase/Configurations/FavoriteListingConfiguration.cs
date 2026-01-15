using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SBay.Domain.Entities;

public sealed class FavoriteListingConfiguration : IEntityTypeConfiguration<FavoriteListing>
{
    public void Configure(EntityTypeBuilder<FavoriteListing> b)
    {
        b.ToTable("favorites");
        b.HasKey(x => new { x.UserId, x.ListingId });
        b.Property(x => x.UserId).HasColumnName("user_id");
        b.Property(x => x.ListingId).HasColumnName("listing_id");
        b.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        b.HasIndex(x => new { x.UserId, x.CreatedAt }).HasDatabaseName("idx_favorites_user_time");
        b.HasOne<Listing>()
            .WithMany()
            .HasForeignKey(x => x.ListingId)
            .OnDelete(DeleteBehavior.Cascade);
        b.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

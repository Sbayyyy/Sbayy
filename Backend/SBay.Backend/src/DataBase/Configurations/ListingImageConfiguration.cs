using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SBay.Domain.Entities;

public sealed class ImageListingConfiguration : IEntityTypeConfiguration<ListingImage>
{
    public void Configure(EntityTypeBuilder<ListingImage> b)
    {
        b.ToTable("listing_images");

        b.HasKey(x => x.Id);
        b.Property(x => x.Id)
         .HasColumnName("id")
         .ValueGeneratedOnAdd()
         .HasDefaultValueSql("gen_random_uuid()");

        b.Property(x => x.ListingId)
         .HasColumnName("listing_id")
         .IsRequired();

        b.Property(x => x.Url)
         .HasColumnName("url")
         .IsRequired();

        b.Property(x => x.Position)
         .HasColumnName("position")
         .IsRequired()
         .HasDefaultValue(0);
        b.Property(x => x.MimeType).HasColumnName("mime_type");
        b.Property(x => x.Width).HasColumnName("width");
        b.Property(x => x.Height).HasColumnName("height");
        b.HasOne(x => x.Listing)
         .WithMany(l => l.Images)
         .HasForeignKey(x => x.ListingId)
         .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => x.ListingId);
        b.HasIndex(x => new { x.ListingId, x.Position }).IsUnique();
    }
}

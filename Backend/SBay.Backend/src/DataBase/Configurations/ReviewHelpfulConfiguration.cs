using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SBay.Domain.Entities;

public sealed class ReviewHelpfulConfiguration : IEntityTypeConfiguration<ReviewHelpful>
{
    public void Configure(EntityTypeBuilder<ReviewHelpful> b)
    {
        b.ToTable("review_helpfuls");
        b.HasKey(x => new { x.ReviewId, x.UserId });
        b.Property(x => x.ReviewId).HasColumnName("review_id");
        b.Property(x => x.UserId).HasColumnName("user_id");
        b.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
    }
}

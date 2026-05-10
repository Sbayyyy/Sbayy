using Microsoft.EntityFrameworkCore;

namespace SBay.Domain.Entities;

[PrimaryKey(nameof(ReviewId), nameof(UserId))]
public sealed class ReviewHelpful
{
    public Guid ReviewId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

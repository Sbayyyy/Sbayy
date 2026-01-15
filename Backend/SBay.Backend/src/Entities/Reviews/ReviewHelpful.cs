namespace SBay.Domain.Entities;

public sealed class ReviewHelpful
{
    public Guid ReviewId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

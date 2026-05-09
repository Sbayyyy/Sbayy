namespace SBay.Domain.Entities;

public sealed class SponsoredAd
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string CtaText { get; set; } = "Learn more";
    public string TargetUrl { get; set; } = "/";
    public bool IsActive { get; set; }
    public DateTime StartsAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndsAt { get; set; }
    public int Priority { get; set; }
    public long Impressions { get; set; }
    public long Clicks { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ArchivedAt { get; set; }
}

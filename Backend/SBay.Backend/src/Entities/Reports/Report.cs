namespace SBay.Domain.Entities;

public enum ReportTargetType
{
    UserProfile,
    Listing,
    Message
}

public enum ReportReason
{
    Spam,
    Harassment,
    Scam,
    Inappropriate,
    Other
}

public enum ReportStatus
{
    Open,
    Reviewed,
    Closed
}

public enum ReportAction
{
    None,
    Warned,
    ContentRemoved,
    UserSuspended,
    UserBanned
}

public class Report
{
    public Guid Id { get; set; }
    public Guid ReporterId { get; set; }
    public Guid? ReportedUserId { get; set; }
    public ReportTargetType TargetType { get; set; }
    public Guid TargetId { get; set; }
    public ReportReason Reason { get; set; }
    public string? Description { get; set; }
    public string[]? EvidenceUrls { get; set; }
    public bool BlockRequested { get; set; }
    public ReportStatus Status { get; set; } = ReportStatus.Open;
    public ReportAction Action { get; set; } = ReportAction.None;
    public Guid? ReviewedById { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
    public string? AdminNotes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

namespace SBay.Domain.Entities
{
    public class UserNotification
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Type { get; set; } = "notification";
        public string Title { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string? Href { get; set; }
        public string? DataJson { get; set; }
        public bool IsRead { get; set; }
        public bool IsArchived { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? ReadAt { get; set; }
    }
}

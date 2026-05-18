namespace SBay.Domain.Entities
{
    public class RefreshToken
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string TokenHash { get; set; } = string.Empty;
        public string? ReplacedByTokenHash { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset ExpiresAt { get; set; }
        public DateTimeOffset? RevokedAt { get; set; }
        public string? DeviceId { get; set; }
        public string? UserAgent { get; set; }
        public bool IsActive => RevokedAt is null && ExpiresAt > DateTimeOffset.UtcNow;
    }
}

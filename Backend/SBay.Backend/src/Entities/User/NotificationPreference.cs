using System.ComponentModel.DataAnnotations;

namespace SBay.Domain.Entities
{
    public class NotificationPreference
    {
        [Key]
        public Guid UserId { get; set; }
        public bool EmailNewBids { get; set; } = true;
        public bool EmailOutbidAlerts { get; set; } = true;
        public bool EmailWonAuctions { get; set; } = true;
        public bool EmailMessages { get; set; } = true;
        public bool EmailPriceDrops { get; set; } = true;
        public bool EmailPromotions { get; set; }
        public bool PushNewBids { get; set; } = true;
        public bool PushOutbidAlerts { get; set; } = true;
        public bool PushWonAuctions { get; set; } = true;
        public bool PushMessages { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }

        public static NotificationPreference Defaults(Guid userId, DateTimeOffset now) => new()
        {
            UserId = userId,
            UpdatedAt = now
        };
    }
}

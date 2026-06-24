using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SBay.Domain.Entities
{

    public class User
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(128)]
        public string? ExternalId { get; set; }

        [Required, MaxLength(320), EmailAddress]
        public string Email { get; set; } = null!;

        [MaxLength(60)]
        public string? UserName { get; set; }
        public string? DisplayName { get; set; }
        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? Region { get; set; }
        [MaxLength(100)]
        public string? City { get; set; }

        public decimal Rating { get; set; } = 0m;
        public string? Phone { get; set; }
        public bool IsSeller { get; set; } = true;
        public string Role { get; set; } = "user";
        [MaxLength(32)]
        public string Status { get; set; } = "active";
        public bool EmailVerified { get; set; }
        [MaxLength(128)]
        public string? EmailVerificationTokenHash { get; set; }
        public DateTimeOffset? EmailVerificationExpiresAt { get; set; }
        public DateTimeOffset? EmailVerifiedAt { get; set; }
        [MaxLength(128)]
        public string? PasswordResetTokenHash { get; set; }
        public DateTimeOffset? PasswordResetExpiresAt { get; set; }
        public DateTimeOffset? PasswordResetRequestedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTimeOffset? DeactivatedAt { get; set; }
        public DateTimeOffset? AccountDeletionRequestedAt { get; set; }
        [MaxLength(500)]
        public string? AccountDeletionReason { get; set; }

        public string? AvatarUrl { get; set; }
        public DateTimeOffset? LastSeen { get; set; }

        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public int PendingOrders { get; set; }
        public int ReviewCount { get; set; }

        public bool ListingBanned { get; set; }
        public DateTimeOffset? ListingBanUntil { get; set; }
        public int? ListingLimit { get; set; }
        public int ListingLimitCount { get; set; }
        public DateTimeOffset? ListingLimitResetAt { get; set; }

        public ICollection<ShoppingList<Listing>> ShoppingLists
            = new List<ShoppingList<Listing>>();

        public ICollection<Listing> Listings { get; private set; } = new List<Listing>();

        public ShoppingCart Cart { get; private set; } = new();

        public bool IsActive => string.Equals(Status, "active", StringComparison.OrdinalIgnoreCase);

        public void Deactivate(DateTimeOffset now)
        {
            Status = "deactivated";
            DeactivatedAt = now;
        }

        [JsonIgnore]
        public static readonly JsonSerializerOptions DefaultJsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            WriteIndented = false
        };

        public string ToJson(JsonSerializerOptions? options = null)
            => JsonSerializer.Serialize(this, options ?? DefaultJsonOptions);

        public static User? FromJson(string json, JsonSerializerOptions? options = null)
            => JsonSerializer.Deserialize<User>(json, options ?? DefaultJsonOptions);
    }
}

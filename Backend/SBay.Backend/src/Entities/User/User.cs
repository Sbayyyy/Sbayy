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

        [Required, MaxLength(128)]
        public string ExternalId { get; set; } = null!;

        [Required, MaxLength(120), EmailAddress]
        public string Email { get; set; } = null!;

        [MaxLength(60)]
        public string? UserName { get; set; }
        public string? DisplayName { get; set; }
        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? Region { get; set; }

        public double Rating { get; set; } = 0.0;
        public string? Phone { get; set; }
        public bool IsSeller { get; set; } = true;
        public string Role { get; set; } = "user";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

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

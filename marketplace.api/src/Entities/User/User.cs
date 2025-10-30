using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SBay.Domain.Entities
{
    /// <summary>
    /// Represents an authenticated user of the marketplace.
    /// Authentication is handled externally (Firebase, OIDC, or custom JWT).
    /// </summary>
    public class User
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// The stable external identifier from the authentication provider.
        /// For Firebase → UID, for OIDC → sub claim.
        /// </summary>
        [Required, MaxLength(128)]
        public string ExternalId { get; set; } = null!;

        [Required, MaxLength(120), EmailAddress]
        public string Email { get; set; } = null!;

        [MaxLength(60)]
        public string? UserName { get; set; }

        [MaxLength(100)]
        public string? Region { get; set; }

        public double Rating { get; set; } = 0.0;

        public bool IsSeller { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Optional profile picture URL from the identity provider.
        /// </summary>
        public string? AvatarUrl { get; set; }

        public ICollection<ShoppingList<Listing>> ShoppingLists
            = new List<ShoppingList<Listing>>();

        public Cart Cart { get; private set; } = new();

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

using Google.Cloud.Firestore;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class UserDocument
{
    [FirestoreProperty] public string Id { get; set; } = string.Empty;
    [FirestoreProperty] public string Email { get; set; } = string.Empty;
    [FirestoreProperty] public string? ExternalId { get; set; }
    [FirestoreProperty] public string? DisplayName { get; set; }
    [FirestoreProperty] public string? Phone { get; set; }
    [FirestoreProperty] public string PasswordHash { get; set; } = string.Empty;
    [FirestoreProperty] public string Role { get; set; } = "user";
    [FirestoreProperty] public bool IsSeller { get; set; }
    [FirestoreProperty] public bool? IsAdmin { get; set; }
    [FirestoreProperty] public bool? IsActive { get; set; }
    [FirestoreProperty] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [FirestoreProperty] public DateTimeOffset? LastSeen { get; set; }
    [FirestoreProperty] public string? AvatarUrl { get; set; }
    [FirestoreProperty] public string? Region { get; set; }

    public static UserDocument FromDomain(User user) => new()
    {
        Id = FirestoreId.ToString(user.Id),
        Email = user.Email,
        ExternalId = user.ExternalId,
        DisplayName = user.DisplayName,
        Phone = user.Phone,
        PasswordHash = user.PasswordHash,
        Role = user.Role,
        IsSeller = user.IsSeller,
        CreatedAt = user.CreatedAt,
        LastSeen = user.LastSeen,
        AvatarUrl = user.AvatarUrl,
        Region = user.Region
    };

    public User ToDomain()
    {
        var user = new User
        {
            Id = FirestoreId.ParseRequired(Id),
            Email = Email,
            ExternalId = ExternalId ?? string.Empty,
            DisplayName = DisplayName,
            Phone = Phone,
            PasswordHash = PasswordHash,
            Role = Role ?? "user",
            IsSeller = IsSeller,
            CreatedAt = CreatedAt,
            LastSeen = LastSeen,
            AvatarUrl = AvatarUrl,
            Region = Region
        };
        return user;
    }
}

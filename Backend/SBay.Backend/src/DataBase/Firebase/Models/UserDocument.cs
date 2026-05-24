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
    [FirestoreProperty] public string? City { get; set; }
    [FirestoreProperty] public string PasswordHash { get; set; } = string.Empty;
    [FirestoreProperty] public string Role { get; set; } = "user";
    [FirestoreProperty] public string? Status { get; set; }
    [FirestoreProperty] public DateTimeOffset? DeactivatedAt { get; set; }
    [FirestoreProperty] public DateTimeOffset? AccountDeletionRequestedAt { get; set; }
    [FirestoreProperty] public string? AccountDeletionReason { get; set; }
    [FirestoreProperty] public bool EmailVerified { get; set; }
    [FirestoreProperty] public string? EmailVerificationTokenHash { get; set; }
    [FirestoreProperty] public DateTimeOffset? EmailVerificationExpiresAt { get; set; }
    [FirestoreProperty] public DateTimeOffset? EmailVerifiedAt { get; set; }
    [FirestoreProperty] public string? PasswordResetTokenHash { get; set; }
    [FirestoreProperty] public DateTimeOffset? PasswordResetExpiresAt { get; set; }
    [FirestoreProperty] public DateTimeOffset? PasswordResetRequestedAt { get; set; }
    [FirestoreProperty] public bool IsSeller { get; set; }
    [FirestoreProperty] public bool? IsAdmin { get; set; }
    [FirestoreProperty] public bool? IsActive { get; set; }
    [FirestoreProperty] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [FirestoreProperty] public DateTimeOffset? LastSeen { get; set; }
    [FirestoreProperty] public string? AvatarUrl { get; set; }
    [FirestoreProperty] public string? Region { get; set; }
    [FirestoreProperty] public object TotalRevenue { get; set; } = 0L;
    [FirestoreProperty] public int TotalOrders { get; set; }
    [FirestoreProperty] public int PendingOrders { get; set; }
    [FirestoreProperty] public int ReviewCount { get; set; }
    [FirestoreProperty] public double Rating { get; set; }
    [FirestoreProperty] public bool ListingBanned { get; set; }
    [FirestoreProperty] public DateTimeOffset? ListingBanUntil { get; set; }
    [FirestoreProperty] public int? ListingLimit { get; set; }
    [FirestoreProperty] public int? ListingLimitCount { get; set; }
    [FirestoreProperty] public DateTimeOffset? ListingLimitResetAt { get; set; }

    public static UserDocument FromDomain(User user) => new()
    {
        Id = FirestoreId.ToString(user.Id),
        Email = user.Email,
        ExternalId = user.ExternalId,
        DisplayName = user.DisplayName,
        Phone = user.Phone,
        City = user.City,
        PasswordHash = user.PasswordHash,
        Role = user.Role,
        Status = user.Status,
        DeactivatedAt = user.DeactivatedAt,
        AccountDeletionRequestedAt = user.AccountDeletionRequestedAt,
        AccountDeletionReason = user.AccountDeletionReason,
        EmailVerified = user.EmailVerified,
        EmailVerificationTokenHash = user.EmailVerificationTokenHash,
        EmailVerificationExpiresAt = user.EmailVerificationExpiresAt,
        EmailVerifiedAt = user.EmailVerifiedAt,
        PasswordResetTokenHash = user.PasswordResetTokenHash,
        PasswordResetExpiresAt = user.PasswordResetExpiresAt,
        PasswordResetRequestedAt = user.PasswordResetRequestedAt,
        IsSeller = user.IsSeller,
        CreatedAt = user.CreatedAt,
        LastSeen = user.LastSeen,
        AvatarUrl = user.AvatarUrl,
        Region = user.Region,
        TotalRevenue = DecimalCentsConverter.ToFirestoreCents(user.TotalRevenue),
        TotalOrders = user.TotalOrders,
        PendingOrders = user.PendingOrders,
        ReviewCount = user.ReviewCount,
        Rating = (double)user.Rating,
        ListingBanned = user.ListingBanned,
        ListingBanUntil = user.ListingBanUntil,
        ListingLimit = user.ListingLimit,
        ListingLimitCount = user.ListingLimitCount,
        ListingLimitResetAt = user.ListingLimitResetAt
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
            City = City,
            PasswordHash = PasswordHash,
            Role = Role ?? "user",
            Status = Status ?? (IsActive == false ? "inactive" : "active"),
            DeactivatedAt = DeactivatedAt,
            AccountDeletionRequestedAt = AccountDeletionRequestedAt,
            AccountDeletionReason = AccountDeletionReason,
            EmailVerified = EmailVerified,
            EmailVerificationTokenHash = EmailVerificationTokenHash,
            EmailVerificationExpiresAt = EmailVerificationExpiresAt,
            EmailVerifiedAt = EmailVerifiedAt,
            PasswordResetTokenHash = PasswordResetTokenHash,
            PasswordResetExpiresAt = PasswordResetExpiresAt,
            PasswordResetRequestedAt = PasswordResetRequestedAt,
            IsSeller = IsSeller,
            CreatedAt = CreatedAt,
            LastSeen = LastSeen,
            AvatarUrl = AvatarUrl,
            Region = Region,
            TotalRevenue = DecimalCentsConverter.FromFirestoreCents(TotalRevenue),
            TotalOrders = TotalOrders,
            PendingOrders = PendingOrders,
            ReviewCount = ReviewCount,
            Rating = (decimal)Rating,
            ListingBanned = ListingBanned,
            ListingBanUntil = ListingBanUntil,
            ListingLimit = ListingLimit,
            ListingLimitCount = ListingLimitCount ?? 0,
            ListingLimitResetAt = ListingLimitResetAt
        };
        return user;
    }
}

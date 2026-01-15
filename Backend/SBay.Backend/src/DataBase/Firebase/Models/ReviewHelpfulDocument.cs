using Google.Cloud.Firestore;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class ReviewHelpfulDocument
{
    [FirestoreProperty] public string ReviewId { get; set; } = string.Empty;
    [FirestoreProperty] public string UserId { get; set; } = string.Empty;
    [FirestoreProperty] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

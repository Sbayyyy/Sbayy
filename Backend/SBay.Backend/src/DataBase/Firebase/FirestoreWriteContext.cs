using System.Threading;
using Google.Cloud.Firestore;

namespace SBay.Backend.DataBase.Firebase;

internal static class FirestoreWriteContext
{
    private static readonly AsyncLocal<WriteBatch?> CurrentBatch = new();

    public static WriteBatch? Batch
    {
        get => CurrentBatch.Value;
        set => CurrentBatch.Value = value;
    }
}

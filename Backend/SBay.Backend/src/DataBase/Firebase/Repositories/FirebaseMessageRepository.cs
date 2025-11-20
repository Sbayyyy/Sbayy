using Google.Cloud.Firestore;
using SBay.Backend.DataBase.Firebase.Models;
using SBay.Backend.Messaging;
using SBay.Backend.Exceptions;
using SBay.Domain.Database;

namespace SBay.Backend.DataBase.Firebase;

public class FirebaseMessageRepository : IMessageRepository
{
    private readonly FirestoreDb _db;
    public FirebaseMessageRepository(FirestoreDb db) => _db = db;

    private static async Task<T> EnsureCompleted<T>(Task<T> task)
    {
        var result = await task;
        if (!task.IsCompletedSuccessfully)
            throw new DatabaseException("Operation failed");
        return result;
    }

    private static async Task EnsureCompleted(Task task)
    {
        await task;
        if (!task.IsCompletedSuccessfully)
            throw new DatabaseException("Operation failed");
    }

    private static Message Convert(DocumentSnapshot snapshot)
    {
        var doc = snapshot.ConvertTo<MessageDocument>()
                  ?? throw new DatabaseException("Message conversion failed");
        return doc.ToDomain();
    }

    public async Task<int> CountSentSinceAsync(Guid senderId, DateTime from, CancellationToken ct)
    {
        var snapshot = await EnsureCompleted(
            _db.Collection("messages")
               .WhereEqualTo("SenderId", senderId)
               .WhereGreaterThanOrEqualTo("CreatedAt", from)
               .GetSnapshotAsync(ct));
        return snapshot?.Count ?? 0;
    }

    public async Task<IReadOnlyList<Message>> GetMessagesAsync(Guid chatId, int take, DateTime? before, CancellationToken ct)
    {
        var query = _db.Collection("messages")
            .WhereEqualTo("ChatId", chatId)
            .OrderByDescending("CreatedAt")
            .Limit(take);

        if (before is not null)
        {
            query = query.WhereLessThan("CreatedAt", before.Value);
        }

        var snapshot = await EnsureCompleted(query.GetSnapshotAsync(ct));
        return snapshot.Documents
            .Where(d => d.Exists)
            .Select(Convert)
            .ToList();
    }

    public async Task<int> MarkReadUpToAsync(Guid chatId, Guid readerId, DateTime upTo, CancellationToken ct)
    {
        var snapshot = await EnsureCompleted(
            _db.Collection("messages")
               .WhereEqualTo("ChatId", chatId)
               .WhereEqualTo("ReceiverId", readerId)
               .WhereLessThanOrEqualTo("CreatedAt", upTo)
               .WhereEqualTo("IsRead", false)
               .GetSnapshotAsync(ct));

        var batch = _db.StartBatch();
        foreach (var doc in snapshot.Documents)
        {
            batch.Update(doc.Reference, new Dictionary<string, object> { ["IsRead"] = true });
        }
        if (snapshot.Documents.Count > 0)
            await EnsureCompleted(batch.CommitAsync(ct));
        return snapshot.Documents.Count;
    }

    public async Task<Message?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("messages")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));
        if (!doc.Exists) return null;
        return Convert(doc);
    }

    public async Task<bool> ExistAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("messages")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));
        return doc.Exists;
    }

    public async Task AddAsync(Message entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("messages")
               .Document(entity.Id.ToString())
               .SetAsync(MessageDocument.FromDomain(entity), cancellationToken: ct));
    }

    public async Task UpdateAsync(Message entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("messages")
               .Document(entity.Id.ToString())
               .SetAsync(MessageDocument.FromDomain(entity), cancellationToken: ct));
    }

    public async Task RemoveAsync(Message entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("messages")
               .Document(entity.Id.ToString())
               .DeleteAsync(cancellationToken: ct));
    }
}

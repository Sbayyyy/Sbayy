using Google.Cloud.Firestore;
using SBay.Backend.DataBase.Firebase.Models;
using SBay.Backend.Messaging;
using SBay.Backend.Exceptions;
using SBay.Domain.Database;

namespace SBay.Backend.DataBase.Firebase;

public class FirebaseChatRepository : IChatRepository
{
    private readonly FirestoreDb _db;
    public FirebaseChatRepository(FirestoreDb db) => _db = db;

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

    private static Chat Convert(DocumentSnapshot snapshot)
    {
        var doc = snapshot.ConvertTo<ChatDocument>()
                  ?? throw new DatabaseException("Chat conversion failed");
        return doc.ToDomain();
    }

    public async Task<Chat?> FindByParticipantsAsync(Guid buyerId, Guid sellerId, Guid? listingId, CancellationToken ct)
    {
        var query = _db.Collection("chats")
            .WhereEqualTo("BuyerId", buyerId)
            .WhereEqualTo("SellerId", sellerId)
            .WhereEqualTo("ListingId", listingId);

        var snapshot = await EnsureCompleted(query.Limit(1).GetSnapshotAsync(ct));
        var doc = snapshot.Documents.FirstOrDefault();
        if (doc == null || !doc.Exists) return null;
        return Convert(doc);
    }

    public async Task<IReadOnlyList<Chat>> GetInboxAsync(Guid userId, int take, int skip, CancellationToken ct)
    {
        var buyerTask = EnsureCompleted(
            _db.Collection("chats")
               .WhereEqualTo("BuyerId", userId)
               .OrderByDescending("LastMessageAt")
               .Limit(take + skip)
               .GetSnapshotAsync(ct));

        var sellerTask = EnsureCompleted(
            _db.Collection("chats")
               .WhereEqualTo("SellerId", userId)
               .OrderByDescending("LastMessageAt")
               .Limit(take + skip)
               .GetSnapshotAsync(ct));

        await Task.WhenAll(buyerTask, sellerTask);
        var docs = buyerTask.Result.Documents.Concat(sellerTask.Result.Documents)
            .Where(d => d.Exists)
            .Select(Convert)
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToList();
        return docs;
    }

    public async Task<bool> UpdateLastMessageTimestampAsync(Guid chatId, DateTime timestamp, CancellationToken ct)
    {
        var docRef = _db.Collection("chats").Document(chatId.ToString());
        await EnsureCompleted(docRef.UpdateAsync("LastMessageAt", timestamp));
        return true;
    }

    public async Task<Chat?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("chats")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));
        if (!doc.Exists) return null;
        return Convert(doc);
    }

    public async Task<bool> ExistAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("chats")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));
        return doc.Exists;
    }

    public async Task AddAsync(Chat entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("chats")
               .Document(entity.Id.ToString())
               .SetAsync(ChatDocument.FromDomain(entity), cancellationToken: ct));
    }

    public async Task UpdateAsync(Chat entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("chats")
               .Document(entity.Id.ToString())
               .SetAsync(ChatDocument.FromDomain(entity), cancellationToken: ct));
    }

    public async Task RemoveAsync(Chat entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("chats")
               .Document(entity.Id.ToString())
               .DeleteAsync(cancellationToken: ct));
    }
}

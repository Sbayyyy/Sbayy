using Google.Cloud.Firestore;
using SBay.Backend.DataBase.Firebase.Models;
using SBay.Backend.Exceptions;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase;

public class FirebaseUserRepository : IUserRepository
{
    private readonly FirestoreDb _db;

    public FirebaseUserRepository(FirestoreDb db)
    {
        _db = db;
    }

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

    private static User Convert(DocumentSnapshot snapshot)
    {
        var doc = snapshot.ConvertTo<UserDocument>()
                  ?? throw new DatabaseException("User conversion failed");
        return doc.ToDomain();
    }

    public async Task<User> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("users")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));

        if (!doc.Exists)
            throw new DatabaseException("User not found");

        return Convert(doc);
    }

    public async Task<bool> ExistAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("users")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));

        return doc.Exists;
    }

    public async Task AddAsync(User entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("users")
               .Document(entity.Id.ToString())
               .SetAsync(UserDocument.FromDomain(entity), cancellationToken: ct));
    }

    public async Task UpdateAsync(User entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("users")
               .Document(entity.Id.ToString())
               .SetAsync(UserDocument.FromDomain(entity), cancellationToken: ct));
    }

    public async Task RemoveAsync(User entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("users")
               .Document(entity.Id.ToString())
               .DeleteAsync(cancellationToken: ct));
    }

    public async Task<User?> GetByExternalIdAsync(string externalId, CancellationToken ct)
    {
        var snapshot = await EnsureCompleted(
            _db.Collection("users")
               .WhereEqualTo("ExternalId", externalId)
               .Limit(1)
               .GetSnapshotAsync(ct));

        var doc = snapshot.Documents.FirstOrDefault();
        if (doc == null || !doc.Exists)
            return null;

        return Convert(doc);
    }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(email)) return null;
        var snapshot = await EnsureCompleted(
            _db.Collection("users")
               .WhereEqualTo("Email", email)
               .Limit(1)
               .GetSnapshotAsync(ct));

        var doc = snapshot.Documents.FirstOrDefault();
        if (doc == null || !doc.Exists)
            return null;

        return Convert(doc);
    }

    public async Task<bool> EmailExistsAsync(string email, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        var snapshot = await EnsureCompleted(
            _db.Collection("users")
               .WhereEqualTo("Email", email)
               .Limit(1)
               .GetSnapshotAsync(ct));

        var doc = snapshot.Documents.FirstOrDefault();
        return doc is { Exists: true };
    }
}

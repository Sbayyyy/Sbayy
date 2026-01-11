using Google.Cloud.Firestore;
using SBay.Backend.DataBase.Firebase.Models;
using SBay.Backend.DataBase.Interfaces;
using SBay.Backend.Exceptions;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase;

public sealed class FirebaseAddressRepository : IAddressRepository
{
    private readonly FirestoreDb _db;

    public FirebaseAddressRepository(FirestoreDb db) => _db = db;

    private static async Task<T> EnsureCompleted<T>(Task<T> task)
    {
        try
        {
            return await task;
        }
        catch (Exception ex)
        {
            throw new DatabaseException("Operation failed", ex);
        }
    }

    private static async Task EnsureCompleted(Task task)
    {
        try
        {
            await task;
        }
        catch (Exception ex)
        {
            throw new DatabaseException("Operation failed", ex);
        }
    }

    private static Address Convert(DocumentSnapshot snapshot)
    {
        var doc = snapshot.ConvertTo<AddressDocument>()
                  ?? throw new DatabaseException("Address conversion failed");
        return doc.ToDomain();
    }

    public async Task<Address?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var doc = await EnsureCompleted(
            _db.Collection("addresses")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));
        if (!doc.Exists) return null;
        return Convert(doc);
    }

    public async Task<List<Address>> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        var snapshot = await EnsureCompleted(
            _db.Collection("addresses")
               .WhereEqualTo("UserId", userId.ToString())
               .OrderByDescending("CreatedAt")
               .GetSnapshotAsync(ct));

        if (snapshot == null || snapshot.Count == 0)
            return new List<Address>();

        return snapshot.Documents
            .Where(d => d.Exists)
            .Select(Convert)
            .ToList();
    }

    public async Task<bool> ExistsAsync(Guid id, CancellationToken ct = default)
    {
        var doc = await EnsureCompleted(
            _db.Collection("addresses")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));
        return doc.Exists;
    }

    public async Task AddAsync(Address address, CancellationToken ct = default)
    {
        if (address.Id == Guid.Empty)
            address.Id = Guid.NewGuid();
        if (address.CreatedAt == default)
            address.CreatedAt = DateTime.UtcNow;

        await EnsureCompleted(
            _db.Collection("addresses")
               .Document(address.Id.ToString())
               .SetAsync(AddressDocument.FromDomain(address), cancellationToken: ct));
    }

    public async Task UpdateAsync(Address address, CancellationToken ct = default)
    {
        address.UpdatedAt = DateTime.UtcNow;
        await EnsureCompleted(
            _db.Collection("addresses")
               .Document(address.Id.ToString())
               .SetAsync(AddressDocument.FromDomain(address), cancellationToken: ct));
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        await EnsureCompleted(
            _db.Collection("addresses")
               .Document(id.ToString())
               .DeleteAsync(cancellationToken: ct));
    }
}

using Google.Cloud.Firestore;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class AddressDocument
{
    [FirestoreProperty] public string Id { get; set; } = string.Empty;
    [FirestoreProperty] public string UserId { get; set; } = string.Empty;
    [FirestoreProperty] public string Name { get; set; } = string.Empty;
    [FirestoreProperty] public string Phone { get; set; } = string.Empty;
    [FirestoreProperty] public string Street { get; set; } = string.Empty;
    [FirestoreProperty] public string City { get; set; } = string.Empty;
    [FirestoreProperty] public string? Region { get; set; }
    [FirestoreProperty] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [FirestoreProperty] public DateTime? UpdatedAt { get; set; }

    public static AddressDocument FromDomain(Address address) => new()
    {
        Id = FirestoreId.ToString(address.Id),
        UserId = FirestoreId.ToString(address.UserId),
        Name = address.Name,
        Phone = address.Phone,
        Street = address.Street,
        City = address.City,
        Region = address.Region,
        CreatedAt = address.CreatedAt,
        UpdatedAt = address.UpdatedAt
    };

    public Address ToDomain() => new()
    {
        Id = FirestoreId.ParseRequired(Id),
        UserId = FirestoreId.ParseRequired(UserId),
        Name = Name,
        Phone = Phone,
        Street = Street,
        City = City,
        Region = Region,
        CreatedAt = CreatedAt,
        UpdatedAt = UpdatedAt
    };
}

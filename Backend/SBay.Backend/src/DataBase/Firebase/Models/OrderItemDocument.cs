using Google.Cloud.Firestore;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class OrderItemDocument
{
    [FirestoreProperty] public Guid Id { get; set; }
    [FirestoreProperty] public Guid OrderId { get; set; }
    [FirestoreProperty] public Guid? ListingId { get; set; }
    [FirestoreProperty] public int Quantity { get; set; }
    [FirestoreProperty] public decimal PriceAmount { get; set; }
    [FirestoreProperty] public string PriceCurrency { get; set; } = "EUR";

    public static OrderItemDocument FromDomain(OrderItem item) => new()
    {
        Id = item.Id,
        OrderId = item.OrderId,
        ListingId = item.ListingId,
        Quantity = item.Quantity,
        PriceAmount = item.PriceAmount,
        PriceCurrency = item.PriceCurrency
    };

    public OrderItem ToDomain() => new()
    {
        Id = Id,
        OrderId = OrderId,
        ListingId = ListingId,
        Quantity = Quantity,
        PriceAmount = PriceAmount,
        PriceCurrency = PriceCurrency
    };
}

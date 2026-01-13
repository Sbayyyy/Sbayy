using Google.Cloud.Firestore;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class OrderItemDocument
{
    [FirestoreProperty] public string Id { get; set; } = string.Empty;
    [FirestoreProperty] public string OrderId { get; set; } = string.Empty;
    [FirestoreProperty] public string? ListingId { get; set; }
    [FirestoreProperty] public int Quantity { get; set; }
    [FirestoreProperty] public object PriceAmount { get; set; } = 0L;
    [FirestoreProperty] public string PriceCurrency { get; set; } = "EUR";

    public static OrderItemDocument FromDomain(OrderItem item) => new()
    {
        Id = FirestoreId.ToString(item.Id),
        OrderId = FirestoreId.ToString(item.OrderId),
        ListingId = FirestoreId.ToString(item.ListingId),
        Quantity = item.Quantity,
        PriceAmount = DecimalCentsConverter.ToFirestoreCents(item.PriceAmount),
        PriceCurrency = item.PriceCurrency
    };

    public OrderItem ToDomain() => new()
    {
        Id = FirestoreId.ParseRequired(Id),
        OrderId = FirestoreId.ParseRequired(OrderId),
        ListingId = FirestoreId.ParseNullable(ListingId),
        Quantity = Quantity,
        PriceAmount = DecimalCentsConverter.FromFirestoreCents(PriceAmount),
        PriceCurrency = PriceCurrency
    };
}

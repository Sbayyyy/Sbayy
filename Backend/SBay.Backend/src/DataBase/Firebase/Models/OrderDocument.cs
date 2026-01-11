using Google.Cloud.Firestore;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class OrderDocument
{
    [FirestoreProperty] public string Id { get; set; } = string.Empty;
    [FirestoreProperty] public string BuyerId { get; set; } = string.Empty;
    [FirestoreProperty] public string SellerId { get; set; } = string.Empty;
    [FirestoreProperty] public string Status { get; set; } = OrderStatus.Pending.ToString();
    [FirestoreProperty] public double TotalAmount { get; set; }
    [FirestoreProperty] public string TotalCurrency { get; set; } = "EUR";
    [FirestoreProperty] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [FirestoreProperty] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [FirestoreProperty] public IList<OrderItemDocument>? Items { get; set; }

    public static OrderDocument FromDomain(Order order) => new()
    {
        Id = FirestoreId.ToString(order.Id),
        BuyerId = FirestoreId.ToString(order.BuyerId),
        SellerId = FirestoreId.ToString(order.SellerId),
        Status = order.Status.ToString(),
        TotalAmount = (double)order.TotalAmount,
        TotalCurrency = order.TotalCurrency,
        CreatedAt = order.CreatedAt,
        UpdatedAt = order.UpdatedAt,
        Items = order.Items?.Select(OrderItemDocument.FromDomain).ToList()
    };

    public Order ToDomain()
    {
        var order = new Order
        {
            Id = FirestoreId.ParseRequired(Id),
            BuyerId = FirestoreId.ParseRequired(BuyerId),
            SellerId = FirestoreId.ParseRequired(SellerId),
            Status = Enum.TryParse<OrderStatus>(Status, true, out var status) ? status : OrderStatus.Pending,
            TotalAmount = (decimal)TotalAmount,
            TotalCurrency = TotalCurrency ?? "EUR",
            CreatedAt = CreatedAt,
            UpdatedAt = UpdatedAt,
            Items = Items?.Select(i => i.ToDomain()).ToList() ?? new List<OrderItem>()
        };
        foreach (var item in order.Items)
        {
            item.OrderId = order.Id;
            item.Order = order;
        }
        return order;
    }
}

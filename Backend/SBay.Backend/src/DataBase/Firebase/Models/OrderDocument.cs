using Google.Cloud.Firestore;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class OrderDocument
{
    [FirestoreProperty] public Guid Id { get; set; }
    [FirestoreProperty] public Guid BuyerId { get; set; }
    [FirestoreProperty] public Guid SellerId { get; set; }
    [FirestoreProperty] public string Status { get; set; } = OrderStatus.Pending.ToString();
    [FirestoreProperty] public decimal TotalAmount { get; set; }
    [FirestoreProperty] public string TotalCurrency { get; set; } = "EUR";
    [FirestoreProperty] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [FirestoreProperty] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [FirestoreProperty] public IList<OrderItemDocument>? Items { get; set; }

    public static OrderDocument FromDomain(Order order) => new()
    {
        Id = order.Id,
        BuyerId = order.BuyerId,
        SellerId = order.SellerId,
        Status = order.Status.ToString(),
        TotalAmount = order.TotalAmount,
        TotalCurrency = order.TotalCurrency,
        CreatedAt = order.CreatedAt,
        UpdatedAt = order.UpdatedAt,
        Items = order.Items?.Select(OrderItemDocument.FromDomain).ToList()
    };

    public Order ToDomain()
    {
        var order = new Order
        {
            Id = Id,
            BuyerId = BuyerId,
            SellerId = SellerId,
            Status = Enum.TryParse<OrderStatus>(Status, true, out var status) ? status : OrderStatus.Pending,
            TotalAmount = TotalAmount,
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

using Google.Cloud.Firestore;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class ShoppingCartDocument
{
    [FirestoreProperty] public string Id { get; set; } = string.Empty;
    [FirestoreProperty] public string? UserId { get; set; }
    [FirestoreProperty] public DateTime UpdatedAt { get; set; }
    [FirestoreProperty] public IList<CartItemDocument>? Items { get; set; }

    public static ShoppingCartDocument FromDomain(ShoppingCart cart) => new()
    {
        Id = FirestoreId.ToString(cart.Id),
        UserId = FirestoreId.ToString(cart.UserId),
        UpdatedAt = cart.UpdatedAt,
        Items = cart.Items?.Select(CartItemDocument.FromDomain).ToList()
    };

    public ShoppingCart ToDomain()
    {
        var cart = DomainObjectFactory.Create<ShoppingCart>();
        var cartId = FirestoreId.ParseRequired(Id);
        DomainObjectFactory.SetProperty(cart, nameof(ShoppingCart.Id), cartId == Guid.Empty ? Guid.NewGuid() : cartId);
        DomainObjectFactory.SetProperty(cart, nameof(ShoppingCart.UserId), FirestoreId.ParseNullable(UserId));
        DomainObjectFactory.SetProperty(cart, nameof(ShoppingCart.UpdatedAt), UpdatedAt);
        var list = Items?.Select(i => i.ToDomain()).ToList() ?? new List<CartItem>();
        DomainObjectFactory.SetProperty(cart, "_items", list);
        return cart;
    }
}

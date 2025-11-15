using Google.Cloud.Firestore;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class ShoppingCartDocument
{
    [FirestoreProperty] public Guid Id { get; set; }
    [FirestoreProperty] public Guid? UserId { get; set; }
    [FirestoreProperty] public DateTime UpdatedAt { get; set; }
    [FirestoreProperty] public IList<CartItemDocument>? Items { get; set; }

    public static ShoppingCartDocument FromDomain(ShoppingCart cart) => new()
    {
        Id = cart.Id,
        UserId = cart.UserId,
        UpdatedAt = cart.UpdatedAt,
        Items = cart.Items?.Select(CartItemDocument.FromDomain).ToList()
    };

    public ShoppingCart ToDomain()
    {
        var cart = DomainObjectFactory.Create<ShoppingCart>();
        DomainObjectFactory.SetProperty(cart, nameof(ShoppingCart.Id), Id == Guid.Empty ? Guid.NewGuid() : Id);
        DomainObjectFactory.SetProperty(cart, nameof(ShoppingCart.UserId), UserId);
        DomainObjectFactory.SetProperty(cart, nameof(ShoppingCart.UpdatedAt), UpdatedAt);
        var list = Items?.Select(i => i.ToDomain()).ToList() ?? new List<CartItem>();
        DomainObjectFactory.SetProperty(cart, "_items", list);
        return cart;
    }
}

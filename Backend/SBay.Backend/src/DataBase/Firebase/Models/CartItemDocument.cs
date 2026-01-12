using Google.Cloud.Firestore;
using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class CartItemDocument
{
    [FirestoreProperty] public string ListingId { get; set; } = string.Empty;
    [FirestoreProperty] public int Quantity { get; set; }
    [FirestoreProperty(Converter = typeof(DecimalCentsConverter))] public decimal UnitPriceAmount { get; set; }
    [FirestoreProperty] public string UnitPriceCurrency { get; set; } = "EUR";
    [FirestoreProperty] public string? Title { get; set; }
    [FirestoreProperty] public string? ThumbnailUrl { get; set; }

    public static CartItemDocument FromDomain(CartItem item) => new()
    {
        ListingId = FirestoreId.ToString(item.ListingId),
        Quantity = item.Quantity,
        UnitPriceAmount = item.UnitPrice.Amount,
        UnitPriceCurrency = item.UnitPrice.Currency,
        Title = item.Listing?.Title,
        ThumbnailUrl = item.Listing?.ThumbnailUrl
    };

    public CartItem ToDomain()
    {
        var listing = DomainObjectFactory.Create<Listing>();
        DomainObjectFactory.SetProperty(listing, nameof(Listing.Id), FirestoreId.ParseRequired(ListingId));
        DomainObjectFactory.SetProperty(listing, nameof(Listing.Title), Title ?? string.Empty);
        DomainObjectFactory.SetProperty(listing, nameof(Listing.Price), new Money(UnitPriceAmount, UnitPriceCurrency));
        DomainObjectFactory.SetProperty(listing, nameof(Listing.ThumbnailUrl), ThumbnailUrl);

        var item = DomainObjectFactory.Create<CartItem>();
        DomainObjectFactory.SetProperty(item, nameof(CartItem.ListingId), FirestoreId.ParseRequired(ListingId));
        DomainObjectFactory.SetProperty(item, nameof(CartItem.Listing), listing);
        DomainObjectFactory.SetProperty(item, nameof(CartItem.Quantity), Quantity);
        DomainObjectFactory.SetProperty(item, nameof(CartItem.UnitPrice), new Money(UnitPriceAmount, UnitPriceCurrency));
        return item;
    }
}

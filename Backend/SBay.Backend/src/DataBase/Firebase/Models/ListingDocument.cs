using Google.Cloud.Firestore;
using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class ListingDocument
{
    [FirestoreProperty] public Guid Id { get; set; }
    [FirestoreProperty] public Guid SellerId { get; set; }
    [FirestoreProperty] public string Title { get; set; } = string.Empty;
    [FirestoreProperty] public string Description { get; set; } = string.Empty;
    [FirestoreProperty] public decimal PriceAmount { get; set; }
    [FirestoreProperty] public string PriceCurrency { get; set; } = "EUR";
    [FirestoreProperty] public decimal? OriginalPriceAmount { get; set; }
    [FirestoreProperty] public string? OriginalPriceCurrency { get; set; }
    [FirestoreProperty] public int StockQuantity { get; set; } = 1;
    [FirestoreProperty] public string? ThumbnailUrl { get; set; }
    [FirestoreProperty] public string? CategoryPath { get; set; }
    [FirestoreProperty] public string? Region { get; set; }
    [FirestoreProperty] public string Status { get; set; } = "active";
    [FirestoreProperty] public string Condition { get; set; } = ItemCondition.Unknown.ToString();
    [FirestoreProperty] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [FirestoreProperty] public DateTime? UpdatedAt { get; set; }
    [FirestoreProperty] public IList<ListingImageDocument>? Images { get; set; }

    public static ListingDocument FromDomain(Listing entity) => new()
    {
        Id = entity.Id,
        SellerId = entity.SellerId,
        Title = entity.Title,
        Description = entity.Description,
        PriceAmount = entity.Price.Amount,
        PriceCurrency = entity.Price.Currency,
        OriginalPriceAmount = entity.OriginalPrice?.Amount,
        OriginalPriceCurrency = entity.OriginalPrice?.Currency,
        StockQuantity = entity.StockQuantity,
        ThumbnailUrl = entity.ThumbnailUrl,
        CategoryPath = entity.CategoryPath,
        Region = entity.Region,
        Status = entity.Status,
        Condition = entity.Condition.ToString(),
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt,
        Images = entity.Images?.Select(ListingImageDocument.FromDomain).ToList()
    };

    public Listing ToDomain()
    {
        var price = new Money(PriceAmount, string.IsNullOrWhiteSpace(PriceCurrency) ? "EUR" : PriceCurrency);
        Money? original = OriginalPriceAmount.HasValue && !string.IsNullOrWhiteSpace(OriginalPriceCurrency)
            ? new Money(OriginalPriceAmount.Value, OriginalPriceCurrency)
            : null;

        var listing = DomainObjectFactory.Create<Listing>();
        DomainObjectFactory.SetProperty(listing, nameof(Listing.Id), Id);
        DomainObjectFactory.SetProperty(listing, nameof(Listing.SellerId), SellerId);
        DomainObjectFactory.SetProperty(listing, nameof(Listing.Title), Title);
        DomainObjectFactory.SetProperty(listing, nameof(Listing.Description), Description);
        DomainObjectFactory.SetProperty(listing, nameof(Listing.Price), price);
        DomainObjectFactory.SetProperty(listing, nameof(Listing.OriginalPrice), original);
        DomainObjectFactory.SetProperty(listing, nameof(Listing.StockQuantity), StockQuantity);
        DomainObjectFactory.SetProperty(listing, nameof(Listing.ThumbnailUrl), ThumbnailUrl);
        DomainObjectFactory.SetProperty(listing, nameof(Listing.CategoryPath), CategoryPath);
        DomainObjectFactory.SetProperty(listing, nameof(Listing.Region), Region);
        DomainObjectFactory.SetProperty(listing, nameof(Listing.Condition), Enum.TryParse<ItemCondition>(Condition, true, out var cond) ? cond : ItemCondition.Unknown);
        DomainObjectFactory.SetProperty(listing, nameof(Listing.Status), Status);
        DomainObjectFactory.SetProperty(listing, nameof(Listing.CreatedAt), CreatedAt);
        DomainObjectFactory.SetProperty(listing, nameof(Listing.UpdatedAt), UpdatedAt);
        var imgs = Images?.Select(i => i.ToDomain()).OrderBy(i => i.Position).ToList() ?? new List<ListingImage>();
        DomainObjectFactory.SetProperty(listing, nameof(Listing.Images), imgs);
        return listing;
    }
}

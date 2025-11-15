using Google.Cloud.Firestore;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class ListingImageDocument
{
    [FirestoreProperty] public Guid Id { get; set; }
    [FirestoreProperty] public Guid ListingId { get; set; }
    [FirestoreProperty] public string Url { get; set; } = string.Empty;
    [FirestoreProperty] public int Position { get; set; }
    [FirestoreProperty] public string? MimeType { get; set; }
    [FirestoreProperty] public int? Width { get; set; }
    [FirestoreProperty] public int? Height { get; set; }

    public static ListingImageDocument FromDomain(ListingImage entity) => new()
    {
        Id = entity.Id == Guid.Empty ? Guid.NewGuid() : entity.Id,
        ListingId = entity.ListingId,
        Url = entity.Url,
        Position = entity.Position,
        MimeType = entity.MimeType,
        Width = entity.Width,
        Height = entity.Height
    };

    public ListingImage ToDomain()
    {
        var image = DomainObjectFactory.Create<ListingImage>();
        DomainObjectFactory.SetProperty(image, nameof(ListingImage.Id), Id == Guid.Empty ? Guid.NewGuid() : Id);
        DomainObjectFactory.SetProperty(image, nameof(ListingImage.ListingId), ListingId);
        DomainObjectFactory.SetProperty(image, nameof(ListingImage.Url), Url);
        DomainObjectFactory.SetProperty(image, nameof(ListingImage.Position), Position);
        DomainObjectFactory.SetProperty(image, nameof(ListingImage.MimeType), MimeType);
        DomainObjectFactory.SetProperty(image, nameof(ListingImage.Width), Width);
        DomainObjectFactory.SetProperty(image, nameof(ListingImage.Height), Height);
        return image;
    }
}

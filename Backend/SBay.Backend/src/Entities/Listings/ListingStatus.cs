namespace SBay.Domain.Entities;

public enum ListingStatus
{
    Active,
    Sold,
    Hidden
}

public static class ListingStatusExtensions
{
    public static string ToStorageValue(this ListingStatus status)
    {
        return status switch
        {
            ListingStatus.Active => "active",
            ListingStatus.Sold => "sold",
            ListingStatus.Hidden => "hidden",
            _ => throw new ArgumentOutOfRangeException(nameof(status), status, null)
        };
    }
}

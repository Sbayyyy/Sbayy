using Microsoft.EntityFrameworkCore;

namespace SBay.Domain.Entities;

[PrimaryKey(nameof(UserId), nameof(ListingId))]
public sealed class FavoriteListing
{
    public Guid UserId { get; set; }
    public Guid ListingId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

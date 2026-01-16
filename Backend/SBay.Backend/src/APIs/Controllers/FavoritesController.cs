using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Backend.APIs.Records.Responses;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/favorites")]
[Authorize]
public sealed class FavoritesController : ControllerBase
{
    private readonly IFavoriteRepository _favorites;
    private readonly IListingRepository _listings;
    private readonly ICurrentUserResolver _resolver;
    private readonly IUserRepository _users;
    private readonly IUnitOfWork _uow;

    public FavoritesController(
        IFavoriteRepository favorites,
        IListingRepository listings,
        ICurrentUserResolver resolver,
        IUserRepository users,
        IUnitOfWork uow)
    {
        _favorites = favorites;
        _listings = listings;
        _resolver = resolver;
        _users = users;
        _uow = uow;
    }

    [HttpGet]
    [Authorize(Policy = ScopePolicies.ListingsRead)]
    public async Task<ActionResult<IReadOnlyList<ListingResponse>>> GetMine(CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();

        var favorites = await _favorites.GetByUserAsync(me.Value, ct);
        if (favorites.Count == 0)
            return Ok(Array.Empty<ListingResponse>());

        var listingIds = favorites.Select(f => f.ListingId).Distinct().ToList();
        var listings = await _listings.GetByIdsAsync(listingIds, ct);
        var listingById = listings.ToDictionary(l => l.Id);
        var sellerById = new Dictionary<Guid, User>();
        foreach (var sellerId in listings.Select(l => l.SellerId).Distinct())
        {
            var seller = await _users.GetByIdAsync(sellerId, ct);
            if (seller != null)
                sellerById[sellerId] = seller;
        }

        var ordered = new List<ListingResponse>();
        foreach (var favorite in favorites)
        {
            if (listingById.TryGetValue(favorite.ListingId, out var listing))
            {
                sellerById.TryGetValue(listing.SellerId, out var seller);
                ordered.Add(ToResponse(listing, seller));
            }
        }

        return Ok(ordered);
    }

    [HttpPost("{listingId:guid}")]
    [Authorize(Policy = ScopePolicies.ListingsWrite)]
    public async Task<IActionResult> Add(Guid listingId, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();
        if (listingId == Guid.Empty) return BadRequest("ListingId is required.");

        var listing = await _listings.GetByIdAsync(listingId, ct);
        if (listing is null) return NotFound();

        var exists = await _favorites.ExistsAsync(me.Value, listingId, ct);
        if (exists) return NoContent();

        await _favorites.AddAsync(new FavoriteListing
        {
            UserId = me.Value,
            ListingId = listingId,
            CreatedAt = DateTimeOffset.UtcNow
        }, ct);
        await _uow.SaveChangesAsync(ct);

        return NoContent();
    }

    [HttpDelete("{listingId:guid}")]
    [Authorize(Policy = ScopePolicies.ListingsWrite)]
    public async Task<IActionResult> Remove(Guid listingId, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();
        if (listingId == Guid.Empty) return BadRequest("ListingId is required.");

        await _favorites.RemoveAsync(me.Value, listingId, ct);
        return NoContent();
    }

    private static ListingResponse ToResponse(Listing l, User? seller)
    {
        var images = l.Images
            .OrderBy(i => i.Position)
            .Select(i => new ListingImageDto
            {
                Url = i.Url,
                Position = i.Position,
                MimeType = i.MimeType,
                Width = i.Width,
                Height = i.Height
            })
            .ToList();

        SellerSummaryDto? sellerDto = null;
        if (seller != null)
        {
            sellerDto = new SellerSummaryDto(
                seller.Id,
                seller.DisplayName ?? seller.Email,
                seller.AvatarUrl,
                seller.Rating,
                seller.ReviewCount,
                seller.City
            );
        }

        return new ListingResponse
        {
            Id = l.Id,
            SellerId = l.SellerId,
            Title = l.Title,
            Description = l.Description,
            PriceAmount = l.Price.Amount,
            PriceCurrency = l.Price.Currency,
            Stock = l.StockQuantity,
            Condition = l.Condition.ToString(),
            CategoryPath = l.CategoryPath,
            Region = l.Region,
            CreatedAt = new DateTimeOffset(l.CreatedAt),
            ThumbnailUrl = l.ThumbnailUrl,
            Images = images,
            ImageUrls = images.Select(i => i.Url).ToList(),
            Seller = sellerDto
        };
    }
}

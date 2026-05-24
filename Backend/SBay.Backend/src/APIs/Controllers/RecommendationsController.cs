using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Backend.APIs.Records;
using SBay.Backend.APIs.Records.Responses;
using SBay.Backend.DataBase.Queries;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;

[ApiController]
[Route("api/recommendations")]
[Authorize]
public sealed class RecommendationsController : ControllerBase
{
    private readonly IUserInteractionRepository _interactions;
    private readonly IListingRepository _listings;
    private readonly ICurrentUserResolver _resolver;

    private static readonly IReadOnlyDictionary<string, double> Weights = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase)
    {
        ["view"] = 1,
        ["category_click"] = 2,
        ["favorite"] = 4,
        ["purchase"] = 5,
    };

    public RecommendationsController(
        IUserInteractionRepository interactions,
        IListingRepository listings,
        ICurrentUserResolver resolver)
    {
        _interactions = interactions;
        _listings = listings;
        _resolver = resolver;
    }

    [HttpPost("track")]
    public async Task<IActionResult> Track([FromBody] TrackInteractionRequest body, CancellationToken ct)
    {
        if (body is null || string.IsNullOrWhiteSpace(body.Category) || string.IsNullOrWhiteSpace(body.Type))
            return BadRequest("Category and type are required.");

        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();

        if (!Weights.TryGetValue(body.Type.Trim(), out var weight))
            return BadRequest("Unknown interaction type.");

        var category = NormalizeCategory(body.Category);
        if (string.IsNullOrEmpty(category)) return BadRequest("Category is invalid.");

        await _interactions.RecordAsync(me.Value, category, weight, DateTimeOffset.UtcNow, ct);
        return NoContent();
    }

    [HttpGet("listings")]
    public async Task<ActionResult<IReadOnlyList<ListingResponse>>> GetRecommended([FromQuery] int pageSize = 12, CancellationToken ct = default)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();

        var size = pageSize is < 1 or > 48 ? 12 : pageSize;

        var topCategories = await _interactions.GetTopCategoriesAsync(me.Value, 4, ct);
        if (topCategories.Count == 0)
            return Ok(Array.Empty<ListingResponse>());

        var byId = new Dictionary<Guid, Listing>();
        foreach (var category in topCategories)
        {
            var query = new ListingQuery { Category = category, Page = 1, PageSize = size };
            var found = await _listings.SearchAsync(query, ct);
            foreach (var listing in found)
            {
                if (listing.SellerId == me.Value) continue;
                byId.TryAdd(listing.Id, listing);
            }
        }

        var now = DateTime.UtcNow;
        var ordered = byId.Values
            .OrderByDescending(l => l.BoostedUntil.HasValue && l.BoostedUntil.Value > now)
            .ThenByDescending(l => l.CreatedAt)
            .Take(size)
            .Select(l => ToResponse(l))
            .ToList();

        return Ok(ordered);
    }

    private static string NormalizeCategory(string raw)
    {
        var trimmed = raw.Trim();
        if (trimmed.Length == 0) return string.Empty;
        var top = trimmed.Split('/')[0].Trim().ToLowerInvariant();
        return top.Length > ListingQuery.MaxCategoryLength ? top[..ListingQuery.MaxCategoryLength] : top;
    }

    private static ListingResponse ToResponse(Listing l)
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
            Status = l.Status,
            CategoryPath = l.CategoryPath,
            Region = l.Region,
            SpecificLocation = l.SpecificLocation,
            CreatedAt = new DateTimeOffset(l.CreatedAt),
            SoldUntil = l.SoldUntil.HasValue ? new DateTimeOffset(l.SoldUntil.Value) : null,
            BoostedUntil = l.BoostedUntil.HasValue ? new DateTimeOffset(l.BoostedUntil.Value) : null,
            IsBoosted = l.BoostedUntil.HasValue && l.BoostedUntil.Value > DateTime.UtcNow,
            ThumbnailUrl = l.ThumbnailUrl,
            Images = images,
            ImageUrls = images.Select(i => i.Url).ToList(),
            Seller = null
        };
    }
}

public sealed class TrackInteractionRequest
{
    public string Category { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}

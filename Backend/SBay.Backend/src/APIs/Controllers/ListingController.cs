using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;
using System.Security.Claims;
using SBay.Backend.APIs.Records;
using SBay.Backend.DataBase.Queries;
using SBay.Backend.APIs.Records.Responses;
using SBay.Domain.Authentication;

[ApiController]
[Route("api/[controller]")]
public sealed class ListingsController : ControllerBase
{
    private readonly IListingRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserResolver _resolver;
    private readonly IUserRepository _users;
    private readonly IConfiguration _config;

    public ListingsController(IListingRepository repo, IUnitOfWork uow, ICurrentUserResolver resolver, IUserRepository users, IConfiguration config)
    {
        _repo = repo;
        _uow = uow;
        _resolver = resolver;
        _users = users;
        _config = config;
    }

    private static ListingResponse ToResponse(Listing l, User? seller = null)
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

    [HttpPost]
    [Authorize(Policy = ScopePolicies.ListingsWrite)]
    public async Task<ActionResult<ListingResponse>> Create([FromBody] AddListingRequest body, CancellationToken ct)
    {
        
        if (string.IsNullOrWhiteSpace(body.Title))         return ValidationProblem("Title is required.");
        if (string.IsNullOrWhiteSpace(body.Description))   return ValidationProblem("Description is required.");
        if (body.PriceAmount <= 0)                         return ValidationProblem("Price must be greater than 0.");
        if (body.Stock < 0)                                return ValidationProblem("Stock cannot be negative.");
        if (string.IsNullOrWhiteSpace(body.PriceCurrency)) return ValidationProblem("Price currency is required.");

        
        var sellerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sellerIdStr, out var sellerId)) return Forbid();

        var sellerUser = await _users.GetByIdAsync(sellerId, ct);
        if (sellerUser == null) return Forbid();
        if (!User.IsInRole("admin"))
        {
            if (sellerUser.ListingBanned) return Forbid();
            if (sellerUser.ListingBanUntil.HasValue && sellerUser.ListingBanUntil.Value > DateTimeOffset.UtcNow)
                return Forbid();

            if (sellerUser.ListingLimit.HasValue)
            {
                var periodHours = _config.GetValue<int?>("ListingLimits:PeriodHours") ?? 24;
                var now = DateTimeOffset.UtcNow;
                var consumed = await _users.TryConsumeListingSlotAsync(sellerUser.Id, sellerUser.ListingLimit.Value, now, periodHours, ct);
                if (!consumed)
                    return BadRequest("Listing limit reached. Please try again later.");
            }
        }

        
        var currency = body.PriceCurrency.Trim().ToUpperInvariant();
        var primaryImage = body.ImageUrls?.FirstOrDefault();

        var listing = new Listing(
            sellerId: sellerId,
            title: body.Title.Trim(),
            desc: body.Description.Trim(),
            price: new Money(body.PriceAmount, currency),
            stock: body.Stock,
            condition: ItemConditionExtensions.FromString(body.Condition),
            thumb: string.IsNullOrWhiteSpace(primaryImage) ? null : primaryImage.Trim(),
            categoryPath: body.CategoryPath,
            original: null,
            region: body.Region
        );

        
        if (body.ImageUrls is { Count: > 0 })
        {
            for (int i = 0; i < body.ImageUrls.Count; i++)
            {
                var url = body.ImageUrls[i];
                if (string.IsNullOrWhiteSpace(url)) continue;
                listing.Images.Add(new ListingImage(
                    listingId: listing.Id,
                    url: url.Trim(),
                    position: i
                ));
            }
        }

        
        await _repo.AddAsync(listing, ct);
        await _uow.SaveChangesAsync(ct);

        var sellerUserForResponse = await _users.GetByIdAsync(sellerId, ct);
        return CreatedAtAction(nameof(GetById), new { id = listing.Id }, ToResponse(listing, sellerUserForResponse));
    }

    [HttpGet("me")]
    [Authorize(Policy = ScopePolicies.ListingsRead)]
    public async Task<ActionResult<IReadOnlyList<ListingResponse>>> GetMine(CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();

        var items = await _repo.GetBySellerAsync(me.Value, ct);
        return items.Select(l => ToResponse(l, null)).ToList();
    }

    [HttpGet("seller/{sellerId:guid}")]
    public async Task<ActionResult<IReadOnlyList<ListingResponse>>> GetBySeller(Guid sellerId, CancellationToken ct)
    {
        var items = await _repo.GetBySellerAsync(sellerId, ct);
        return items.Select(l => ToResponse(l, null)).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ListingResponse>> GetById(Guid id, CancellationToken ct)
    {
        var listing = await _repo.GetByIdAsync(id, ct);
        if (listing is null) return NotFound();
        var seller = await _users.GetByIdAsync(listing.SellerId, ct);
        return ToResponse(listing, seller);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = ScopePolicies.ListingsWrite)]
    public async Task<ActionResult<ListingResponse>> Update(Guid id, [FromBody] UpdateListingRequest body, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();

        var listing = await _repo.GetByIdAsync(id, ct);
        if (listing is null) return NotFound();
        if (listing.SellerId != me.Value && !User.IsInRole("admin")) return Forbid();

        if (body.Title != null && string.IsNullOrWhiteSpace(body.Title))
            return BadRequest("Title cannot be empty.");
        if (body.Description != null && string.IsNullOrWhiteSpace(body.Description))
            return BadRequest("Description cannot be empty.");
        if (body.PriceAmount.HasValue && body.PriceAmount <= 0)
            return BadRequest("Price must be greater than 0.");
        if (body.Stock.HasValue && body.Stock.Value < 0)
            return BadRequest("Stock cannot be negative.");

        ItemCondition? condition = null;
        if (!string.IsNullOrWhiteSpace(body.Condition))
        {
            var parsed = ItemConditionExtensions.FromString(body.Condition);
            if (parsed == ItemCondition.Unknown && !string.Equals(body.Condition.Trim(), "unknown", StringComparison.OrdinalIgnoreCase))
                return BadRequest("Invalid condition.");
            condition = parsed;
        }

        Money? price = null;
        if (body.PriceAmount.HasValue || !string.IsNullOrWhiteSpace(body.PriceCurrency))
        {
            var currency = string.IsNullOrWhiteSpace(body.PriceCurrency)
                ? listing.Price.Currency
                : body.PriceCurrency.Trim().ToUpperInvariant();
            var amount = body.PriceAmount ?? listing.Price.Amount;
            price = new Money(amount, currency);
        }

        listing.UpdateDetails(
            body.Title,
            body.Description,
            price,
            body.Stock,
            condition,
            body.CategoryPath,
            body.Region);

        if (body.ImageUrls != null)
            listing.ReplaceImages(body.ImageUrls);

        await _repo.UpdateAsync(listing, ct);
        await _uow.SaveChangesAsync(ct);

        var seller = await _users.GetByIdAsync(listing.SellerId, ct);
        return Ok(ToResponse(listing, seller));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = ScopePolicies.ListingsWrite)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();

        var listing = await _repo.GetByIdAsync(id, ct);
        if (listing is null) return NotFound();
        if (listing.SellerId != me.Value && !User.IsInRole("admin")) return Forbid();

        await _repo.RemoveAsync(listing, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ListingResponse>>> Search([FromQuery] ListingQuery q, CancellationToken ct)
    {
        try
        {
            q.Validate();
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return BadRequest(ex.Message);
        }

        var items = await _repo.SearchAsync(q, ct);
        return items.Select(l => ToResponse(l, null)).ToList();
    }
}

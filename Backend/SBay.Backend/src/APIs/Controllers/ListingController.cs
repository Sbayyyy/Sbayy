using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;
using System.Security.Claims;
using SBay.Backend.APIs.Records;
using SBay.Backend.DataBase.Queries;
using SBay.Backend.APIs.Records.Responses;

[ApiController]
[Route("api/[controller]")]
public sealed class ListingsController : ControllerBase
{
    private readonly IListingRepository _repo;
    private readonly IUnitOfWork _uow;

    public ListingsController(IListingRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow = uow;
    }

    private static ListingResponse ToResponse(Listing l) => new()
    {
        Id            = l.Id,
        Title         = l.Title,
        Description   = l.Description,
        PriceAmount   = l.Price.Amount,
        PriceCurrency = l.Price.Currency,
        Stock         = l.StockQuantity,
        Condition     = l.Condition,
        CategoryPath  = l.CategoryPath,
        Region        = l.Region,
        CreatedAt     = new DateTimeOffset(l.CreatedAt),
        ThumbnailUrl  = l.ThumbnailUrl,
        Images        = l.Images
            .OrderBy(i => i.Position)
            .Select(i => new ListingImageDto
            {
                Url      = i.Url,
                Position = i.Position,
                MimeType = i.MimeType,
                Width    = i.Width,
                Height   = i.Height
            })
            .ToList()
    };

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ListingResponse>> Create([FromBody] AddListingRequest body, CancellationToken ct)
    {
        // --- Validation ---
        if (string.IsNullOrWhiteSpace(body.Title))         return ValidationProblem("Title is required.");
        if (string.IsNullOrWhiteSpace(body.Description))   return ValidationProblem("Description is required.");
        if (body.PriceAmount <= 0)                         return ValidationProblem("Price must be greater than 0.");
        if (body.Stock < 0)                                return ValidationProblem("Stock cannot be negative.");
        if (string.IsNullOrWhiteSpace(body.PriceCurrency)) return ValidationProblem("Price currency is required.");

        // --- Seller ---
        var sellerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sellerIdStr, out var sellerId)) return Forbid();

        // --- Build listing aggregate ---
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

        // --- Add images via navigation ---
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

        // --- Persist (single unit of work) ---
        await _repo.AddAsync(listing, ct);
        await _uow.SaveChangesAsync(ct);

        // --- Return created resource ---
        return CreatedAtAction(nameof(GetById), new { id = listing.Id }, ToResponse(listing));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ListingResponse>> GetById(Guid id, CancellationToken ct)
    {
        var listing = await _repo.GetByIdAsync(id, ct);
        if (listing is null) return NotFound();
        return ToResponse(listing);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ListingResponse>>> Search([FromQuery] ListingQuery q, CancellationToken ct)
    {
        var items = await _repo.SearchAsync(q, ct);
        return items.Select(ToResponse).ToList();
    }
}

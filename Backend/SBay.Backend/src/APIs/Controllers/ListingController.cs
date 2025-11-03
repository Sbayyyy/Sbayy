using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;
using System.Security.Claims;
using SBay.Backend.APIs.Records;
using SBay.Backend.DataBase.Queries;

[ApiController]
[Route("api/[controller]")]
public sealed class ListingsController : ControllerBase
{
    private readonly IListingRepository _repo;        // or IListingRepository
    private readonly IUnitOfWork _uow;                // if you have one

    public ListingsController(IListingRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow  = uow;
    }

    [HttpPost]
    [Authorize(Policy = "SellerOnly")]
    public async Task<ActionResult<ListingResponse>> Create([FromBody] AddListingRequest body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.Title))
            return ValidationProblem("Title is required.");
        if (string.IsNullOrWhiteSpace(body.Description))
            return ValidationProblem("Description is required.");
        if (body.PriceAmount <= 0)
            return ValidationProblem("Price must be greater than 0.");
        if (body.Stock < 0)
            return ValidationProblem("Stock cannot be negative.");

        var sellerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                          ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sellerIdStr, out var sellerId))
            return Forbid(); // invalid token

        var listing = new Listing(
            sellerId: sellerId,
            title: body.Title.Trim(),
            desc: body.Description.Trim(),
            price: new Money(body.PriceAmount, body.PriceCurrency.Trim()),
            stock: body.Stock,
            condition: body.Condition,
            thumb: null,
            categoryPath: body.CategoryPath,
            original: null,
            region: body.Region
        );

        await _repo.AddAsync(listing, ct);
        await _uow.SaveChangesAsync(ct); // or _db.SaveChangesAsync(ct)

        // Optional: persist image URLs if you have ListingImage entity/table
        // foreach (var (url, i) in (body.ImageUrls ?? new()).Select((u,i)=>(u,i)))
        //     _db.ListingImages.Add(new ListingImage(Guid.NewGuid(), listing.Id, url, i));
        // await _uow.SaveChangesAsync(ct);

        var res = new ListingResponse
        {
            Id = listing.Id,
            Title = listing.Title,
            Description = listing.Description,
            PriceAmount = listing.Price.Amount,
            PriceCurrency = listing.Price.Currency,
            Stock = listing.StockQuantity,
            Condition = listing.Condition,
            CategoryPath = listing.CategoryPath,
            Region = listing.Region,
            CreatedAt = listing.CreatedAt
        };

        return CreatedAtAction(nameof(GetById), new { id = listing.Id }, res);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ListingResponse>> GetById(Guid id, CancellationToken ct)
    {
        var listing = await _repo.GetByIdAsync(id, ct);
        if (listing is null) return NotFound();

        return new ListingResponse
        {
            Id = listing.Id,
            Title = listing.Title,
            Description = listing.Description,
            PriceAmount = listing.Price.Amount,
            PriceCurrency = listing.Price.Currency,
            Stock = listing.StockQuantity,
            Condition = listing.Condition,
            CategoryPath = listing.CategoryPath,
            Region = listing.Region,
            CreatedAt = listing.CreatedAt
        };
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ListingResponse>>> Search([FromQuery] ListingQuery q, CancellationToken ct)
    {
        var items = await _repo.SearchAsync(q, ct);
        return items.Select(l => new ListingResponse
        {
            Id = l.Id,
            Title = l.Title,
            Description = l.Description,
            PriceAmount = l.Price.Amount,
            PriceCurrency = l.Price.Currency,
            Stock = l.StockQuantity,
            Condition = l.Condition,
            CategoryPath = l.CategoryPath,
            Region = l.Region,
            CreatedAt = l.CreatedAt
        }).ToList();
    }
}

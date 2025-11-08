using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SBay.Backend.APIs.Records;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;
namespace SBay.Backend.Api.Controllers;



[ApiController]
[Route("api/orders")]
public sealed class OrdersController : ControllerBase
{
    private readonly EfDbContext _db;
    private readonly ICurrentUserResolver _resolver;
    private readonly IDataProvider _dataProvider;

    public OrdersController(EfDbContext db, ICurrentUserResolver resolver, IDataProvider dataProvider)
    {
        _db = db;
        _resolver = resolver;
        _dataProvider = dataProvider;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<OrderDto>> Create([FromBody] CreateOrderReq req, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();
        if (req.Items == null || req.Items.Count == 0) return ValidationProblem("At least one item is required.");

        // Optional seller validation: if client sends SellerId, verify it exists and caller is allowed
        if (req.SellerId != Guid.Empty)
        {
            var seller = await _dataProvider.Users.GetByIdAsync(req.SellerId, ct);
            if (seller == null)
                return NotFound("Seller not found.");

            // Basic authorization: a user cannot create an order for themselves as seller
            if (req.SellerId == me.Value)
                return Forbid();
        }

        // Collect requested listing IDs (authoritative data will be loaded from DB)
        var requestedItems = req.Items;
        var listingIds = requestedItems.Select(i => i.ListingId).Where(id => id != Guid.Empty).Distinct().ToList();
        if (listingIds.Count == 0) return ValidationProblem("ListingId required for each item.");

        // Load listings from DB
        var listings = await _db.Set<Listing>()
            .AsNoTracking()
            .Where(l => listingIds.Contains(l.Id))
            .Select(l => new { l.Id, l.SellerId, l.Price })
            .ToListAsync(ct);

        if (listings.Count != listingIds.Count)
        {
            var found = listings.Select(l => l.Id).ToHashSet();
            var missing = listingIds.Where(id => !found.Contains(id)).ToArray();
            return ValidationProblem($"One or more listings not found: {string.Join(", ", missing)}");
        }

        // Ensure a single seller across all items (or split orders if domain requires; here we enforce single-seller)
        var sellers = listings.Select(l => l.SellerId).Distinct().ToList();
        if (sellers.Count != 1)
        {
            return ValidationProblem("All items in an order must belong to the same seller.");
        }
        var sellerId = sellers[0];

        // If client provided a seller id, ensure it matches authoritative listing seller
        if (req.SellerId != Guid.Empty && req.SellerId != sellerId)
        {
            return ValidationProblem("Seller in request does not match listing seller.");
        }

        // Validate buyer != seller
        if (sellerId == me.Value)
        {
            return ValidationProblem("Buyer and seller cannot be the same user.");
        }

        // Ensure a single currency across all items
        var currencies = listings.Select(l => l.Price.Currency).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (currencies.Count != 1)
        {
            return ValidationProblem("All items in an order must have the same currency.");
        }
        var currency = currencies[0];

        // Map listing dictionary for fast lookup
        var listingById = listings.ToDictionary(l => l.Id);

        var order = new Order
        {
            Id = Guid.NewGuid(),
            BuyerId = me.Value,
            SellerId = sellerId,
            Status = OrderStatus.Pending,
            TotalCurrency = currency,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        foreach (var it in requestedItems)
        {
            if (it.Quantity <= 0)
            {
                return ValidationProblem("Item quantity must be greater than 0.");
            }

            var l = listingById[it.ListingId];
            order.Items.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                ListingId = l.Id,
                Quantity = it.Quantity,
                PriceAmount = l.Price.Amount,
                PriceCurrency = l.Price.Currency
            });
        }

        order.TotalAmount = order.Items.Sum(i => i.PriceAmount * i.Quantity);

        _db.Add(order);
        await _db.SaveChangesAsync(ct);

        var dto = new OrderDto(
            order.Id, order.BuyerId, order.SellerId, order.Status.ToString(),
            order.TotalAmount, order.TotalCurrency, order.CreatedAt, order.UpdatedAt,
            order.Items.Select(i => new OrderItemDto(i.Id, i.ListingId ?? Guid.Empty, i.Quantity, i.PriceAmount, i.PriceCurrency)).ToList()
        );

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, dto);
    }

    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<OrderDto>> GetById(Guid id, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();

        var order = await _db.Set<Order>()
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id, ct);

        if (order == null) return NotFound();
        if (order.BuyerId != me.Value && order.SellerId != me.Value && !User.IsInRole("admin")) return Forbid();

        var dto = new OrderDto(
            order.Id, order.BuyerId, order.SellerId, order.Status.ToString(),
            order.TotalAmount, order.TotalCurrency, order.CreatedAt, order.UpdatedAt,
            order.Items.Select(i => new OrderItemDto(i.Id, i.ListingId ?? Guid.Empty, i.Quantity, i.PriceAmount, i.PriceCurrency)).ToList()
        );

        return Ok(dto);
    }
}

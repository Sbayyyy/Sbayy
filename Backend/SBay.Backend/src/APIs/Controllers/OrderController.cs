using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Backend.APIs.Records;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/orders")]
public sealed class OrdersController : ControllerBase
{
    private readonly ICurrentUserResolver _resolver;
    private readonly IUserRepository _users;
    private readonly IListingRepository _listings;
    private readonly IOrderRepository _orders;
    private readonly IUnitOfWork _uow;

    public OrdersController(
        ICurrentUserResolver resolver,
        IUserRepository users,
        IListingRepository listings,
        IOrderRepository orders,
        IUnitOfWork uow)
    {
        _resolver = resolver;
        _users = users;
        _listings = listings;
        _orders = orders;
        _uow = uow;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<OrderDto>> Create([FromBody] CreateOrderReq req, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();
        if (req.Items == null || req.Items.Count == 0) return ValidationProblem("At least one item is required.");

        if (req.SellerId != Guid.Empty)
        {
            var seller = await _users.GetByIdAsync(req.SellerId, ct);
            if (seller == null) return NotFound("Seller not found.");
            if (req.SellerId == me.Value) return Forbid();
        }

        var listingIds = req.Items
            .Select(i => i.ListingId)
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();
        if (listingIds.Count == 0) return ValidationProblem("ListingId required for each item.");

        var listings = await _listings.GetByIdsAsync(listingIds, ct);
        if (listings.Count != listingIds.Count)
        {
            var found = listings.Select(l => l.Id).ToHashSet();
            var missing = listingIds.Where(id => !found.Contains(id));
            return ValidationProblem($"One or more listings not found: {string.Join(", ", missing)}");
        }

        var sellers = listings.Select(l => l.SellerId).Distinct().ToList();
        if (sellers.Count != 1) return ValidationProblem("All items in an order must belong to the same seller.");
        var sellerId = sellers[0];

        if (req.SellerId != Guid.Empty && req.SellerId != sellerId)
            return ValidationProblem("Seller in request does not match listing seller.");

        if (sellerId == me.Value)
            return ValidationProblem("Buyer and seller cannot be the same user.");

        var currencies = listings.Select(l => l.Price.Currency).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (currencies.Count != 1)
            return ValidationProblem("All items in an order must have the same currency.");
        var currency = currencies[0];

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

        foreach (var it in req.Items)
        {
            if (it.ListingId == Guid.Empty || !listingById.TryGetValue(it.ListingId, out var listing))
                return ValidationProblem("Invalid or unknown ListingId for item.");
            if (it.Quantity <= 0) return ValidationProblem("Item quantity must be greater than 0.");

            order.Items.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                ListingId = listing.Id,
                Quantity = it.Quantity,
                PriceAmount = listing.Price.Amount,
                PriceCurrency = listing.Price.Currency
            });
        }

        order.TotalAmount = order.Items.Sum(i => i.PriceAmount * i.Quantity);

        await _orders.AddAsync(order, ct);
        await _uow.SaveChangesAsync(ct);

        var dto = ToDto(order);
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, dto);
    }

    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<OrderDto>> GetById(Guid id, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();

        var order = await _orders.GetWithItemsAsync(id, ct);
        if (order == null) return NotFound();
        if (order.BuyerId != me.Value && order.SellerId != me.Value && !User.IsInRole("admin"))
            return Forbid();

        return Ok(ToDto(order));
    }

    private static OrderDto ToDto(Order order)
    {
        return new OrderDto(
            order.Id,
            order.BuyerId,
            order.SellerId,
            order.Status.ToString(),
            order.TotalAmount,
            order.TotalCurrency,
            order.CreatedAt,
            order.UpdatedAt,
            order.Items.Select(i => new OrderItemDto(
                i.Id,
                i.ListingId ?? Guid.Empty,
                i.Quantity,
                i.PriceAmount,
                i.PriceCurrency)).ToList());
    }
}

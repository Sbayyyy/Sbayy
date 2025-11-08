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

    public OrdersController(EfDbContext db, ICurrentUserResolver resolver)
    {
        _db = db;
        _resolver = resolver;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<OrderDto>> Create([FromBody] CreateOrderReq req, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();
        if (req.Items == null || req.Items.Count == 0) return BadRequest();

        var sellerId = req.SellerId;
        var order = new Order
        {
            Id = Guid.NewGuid(),
            BuyerId = me.Value,
            SellerId = sellerId,
            Status = OrderStatus.Pending,
            TotalCurrency = req.Items[0].PriceCurrency
        };

        foreach (var it in req.Items)
        {
            order.Items.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                ListingId = it.ListingId,
                Quantity = it.Quantity,
                PriceAmount = it.PriceAmount,
                PriceCurrency = it.PriceCurrency
            });
        }

        order.TotalAmount = order.Items.Sum(i => i.PriceAmount * i.Quantity);
        order.CreatedAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;

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

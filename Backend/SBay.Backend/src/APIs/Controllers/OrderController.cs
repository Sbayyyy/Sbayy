using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Backend.APIs.Records;
using SBay.Backend.DataBase.Interfaces;
using SBay.Backend.Services;
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
    private readonly IAddressRepository _addresses;
    private readonly IShippingService _shipping;
    private readonly IUnitOfWork _uow;

    public OrdersController(
        ICurrentUserResolver resolver,
        IUserRepository users,
        IListingRepository listings,
        IOrderRepository orders,
        IAddressRepository addresses,
        IShippingService shipping,
        IUnitOfWork uow)
    {
        _resolver = resolver;
        _users = users;
        _listings = listings;
        _orders = orders;
        _addresses = addresses;
        _shipping = shipping;
        _uow = uow;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<OrderDto>> Create([FromBody] CreateOrderReq req, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();
        if (req.Items == null || req.Items.Count == 0) return ValidationProblem("At least one item is required.");

        // ===== NEW: Validate Payment Method =====
        var paymentMethod = req.PaymentMethod?.ToLower() switch
        {
            "cod" => PaymentMethod.CashOnDelivery,
            "bank_transfer" => PaymentMethod.BankTransfer,
            "meet_in_person" => PaymentMethod.MeetInPerson,
            _ => (PaymentMethod?)null
        };
        if (!paymentMethod.HasValue)
            return BadRequest("Invalid payment method. Use: 'cod', 'bank_transfer', or 'meet_in_person'");

        // ===== NEW: Handle Address (saved OR new) =====
        Guid? addressId = req.SavedAddressId;
        
        if (addressId == null && req.NewAddress != null)
        {
            // Create and save new address
            var newAddr = new Address
            {
                UserId = me.Value,
                Name = req.NewAddress.Name.Trim(),
                Phone = req.NewAddress.Phone.Trim(),
                Street = req.NewAddress.Street.Trim(),
                City = req.NewAddress.City.Trim(),
                Region = req.NewAddress.Region?.Trim()
            };
            await _addresses.AddAsync(newAddr, ct);
            await _uow.SaveChangesAsync(ct);
            addressId = newAddr.Id;
        }
        
        // Validate address
        Address? address = null;
        if (addressId.HasValue)
        {
            address = await _addresses.GetByIdAsync(addressId.Value, ct);
            if (address == null) return BadRequest("Address not found");
            if (address.UserId != me.Value) return Forbid();
        }

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

        // ===== NEW: Calculate Shipping =====
        ShippingQuote? shippingQuote = null;
        if (address != null)
        {
            shippingQuote = await _shipping.CalculateShippingAsync(address.City, 1.0m, ct);
        }

        var listingById = listings.ToDictionary(l => l.Id);
        var order = new Order
        {
            Id = Guid.NewGuid(),
            BuyerId = me.Value,
            SellerId = sellerId,
            Status = OrderStatus.Pending,
            TotalCurrency = currency,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            
            // ===== NEW: E-Commerce Fields =====
            ShippingAddressId = addressId,
            PaymentMethod = paymentMethod.Value,
            ShippingCost = shippingQuote?.Cost ?? 0,
            ShippingCarrier = shippingQuote?.Carrier,
            EstimatedDeliveryDays = shippingQuote?.EstimatedDays
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

        // Calculate total (subtotal + shipping)
        var subtotal = order.Items.Sum(i => i.PriceAmount * i.Quantity);
        order.TotalAmount = subtotal + order.ShippingCost;

        await _orders.AddAsync(order, ct);
        await _uow.SaveChangesAsync(ct);

        var dto = ToDto(order, address);
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

        // ===== NEW: Populate Address =====
        Address? address = null;
        if (order.ShippingAddressId.HasValue)
        {
            address = await _addresses.GetByIdAsync(order.ShippingAddressId.Value, ct);
        }

        return Ok(ToDto(order, address));
    }

    // ===== UPDATED: ToDto with Address and ShippingInfo =====
    private static OrderDto ToDto(Order order, Address? address)
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
                i.PriceCurrency)).ToList(),
            
            // NEW: Populated Address
            ShippingAddress: address != null ? new AddressDto(
                address.Id,
                address.Name,
                address.Phone,
                address.Street,
                address.City,
                address.Region,
                address.CreatedAt
            ) : null,
            
            // NEW: Payment Method
            PaymentMethod: order.PaymentMethod switch
            {
                PaymentMethod.CashOnDelivery => "cod",
                PaymentMethod.BankTransfer => "bank_transfer",
                PaymentMethod.MeetInPerson => "meet_in_person",
                _ => "cod"
            },
            
            // NEW: Shipping Info
            ShippingInfo: new ShippingInfoDto(
                order.ShippingCost,
                order.ShippingCarrier ?? "other",
                order.EstimatedDeliveryDays ?? 3,
                order.TrackingNumber
            )
        );
    }
}

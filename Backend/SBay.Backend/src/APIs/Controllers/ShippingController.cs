using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SBay.Backend.Services;

namespace SBay.Backend.APIs.Controllers;

[ApiController]
[Route("api/shipping")]
public sealed class ShippingController : ControllerBase
{
    private readonly IShippingService _shipping;

    public ShippingController(IShippingService shipping)
    {
        _shipping = shipping;
    }

    [HttpPost("calculate")]
    [EnableRateLimiting("shipping")]
    public async Task<ActionResult<ShippingQuote>> Calculate([FromBody] CalculateShippingRequest req, CancellationToken ct)
    {
        var quote = await _shipping.CalculateShippingAsync(req.City, req.WeightKg, ct);
        return Ok(quote);
    }

    public sealed class CalculateShippingRequest
    {
        [Required]
        [MinLength(1)]
        [RegularExpression(@".*\S.*")]
        public string City { get; init; } = string.Empty;

        [Range(1, 100)]
        public decimal WeightKg { get; init; } = 1m;
    }
}

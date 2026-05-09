using Microsoft.AspNetCore.Mvc;
using SBay.Backend.Services;
using SBay.Backend.Utils;

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
    public async Task<ActionResult<ShippingQuote>> Calculate([FromBody] CalculateShippingRequest req, CancellationToken ct)
    {
        if (req == null || string.IsNullOrWhiteSpace(req.City))
            return BadRequest(ApiProblemDetails.Validation("City is required.", nameof(req.City)));

        var weight = req.WeightKg.GetValueOrDefault(1m);
        if (weight < 0)
            return BadRequest(ApiProblemDetails.Validation("WeightKg must be >= 0.", nameof(req.WeightKg)));
        if (weight > 100)
            return BadRequest(ApiProblemDetails.Validation("WeightKg must be <= 100.", nameof(req.WeightKg)));

        var quote = await _shipping.CalculateShippingAsync(req.City, weight, ct);
        return Ok(quote);
    }

    public sealed record CalculateShippingRequest(string City, decimal? WeightKg);
}

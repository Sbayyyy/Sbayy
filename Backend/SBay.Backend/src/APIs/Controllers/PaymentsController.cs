using Microsoft.AspNetCore.Mvc;
using SBay.Backend.Services;
using SBay.Backend.Services.Payments;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/payments")]
public sealed class PaymentsController : ControllerBase
{
    private readonly PaymentGatewayRegistry _gateways;
    private readonly MonetizationService _monetization;

    public PaymentsController(PaymentGatewayRegistry gateways, MonetizationService monetization)
    {
        _gateways = gateways;
        _monetization = monetization;
    }

    [HttpPost("webhooks/{provider}")]
    public async Task<IActionResult> Webhook(string provider, CancellationToken ct)
    {
        IPaymentGateway gateway;
        try
        {
            gateway = _gateways.Get(provider);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }

        var result = await gateway.ParseWebhookAsync(Request, ct);
        if (result is null) return Unauthorized();

        var applied = await _monetization.ApplyPaymentWebhookAsync(result, ct);
        return applied ? Ok(new { status = "processed" }) : NotFound();
    }
}

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Backend.APIs.Records.Requests;
using SBay.Domain.Database;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly IPushTokenRepository _pushTokens;
    private readonly IUnitOfWork _uow;

    public NotificationsController(IPushTokenRepository pushTokens, IUnitOfWork uow)
    {
        _pushTokens = pushTokens;
        _uow = uow;
    }

    [HttpPost("push-token")]
    public async Task<IActionResult> RegisterPushToken([FromBody] RegisterPushTokenRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Token))
            return BadRequest(new { message = "Token is required." });

        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _pushTokens.UpsertAsync(me, req.Token.Trim(), req.Platform, req.DeviceId, DateTimeOffset.UtcNow, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }

    [HttpDelete("push-token")]
    public async Task<IActionResult> RemovePushToken([FromQuery] string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Token is required." });

        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _pushTokens.RemoveAsync(me, token.Trim(), ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }
}

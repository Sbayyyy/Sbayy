using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SBay.Backend.APIs.Records;
using SBay.Backend.APIs.Records.Requests;
using SBay.Backend.Utils;
using SBay.Domain.Authentication;
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
    [Authorize(Policy = ScopePolicies.UsersWrite)]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> RegisterPushToken([FromBody] RegisterPushTokenRequest req, CancellationToken ct)
    {
        if (req == null || string.IsNullOrWhiteSpace(req.Token))
            return BadRequest(ApiProblemDetails.Validation("Token is required.", nameof(req.Token)));
        if (req.Token.Trim().Length > 512)
            return BadRequest(ApiProblemDetails.Validation("Token is too long.", nameof(req.Token)));

        var rawId = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(rawId) || !Guid.TryParse(rawId, out var me))
            return Unauthorized();

        await _pushTokens.UpsertAsync(me, req.Token.Trim(), req.Platform, req.DeviceId, DateTimeOffset.UtcNow, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(new ApiSuccessResponse());
    }

    [HttpDelete("push-token")]
    [Authorize(Policy = ScopePolicies.UsersWrite)]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> RemovePushToken([FromQuery] string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(ApiProblemDetails.Validation("Token is required.", nameof(token)));

        var rawId = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(rawId) || !Guid.TryParse(rawId, out var me))
            return Unauthorized();

        await _pushTokens.RemoveAsync(me, token.Trim(), ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }
}

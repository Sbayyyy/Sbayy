using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SBay.Backend.APIs.Records;
using SBay.Backend.APIs.Records.Requests;
using SBay.Backend.Utils;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly IPushTokenRepository _pushTokens;
    private readonly INotificationRepository _notifications;
    private readonly IUnitOfWork _uow;

    public NotificationsController(IPushTokenRepository pushTokens, INotificationRepository notifications, IUnitOfWork uow)
    {
        _pushTokens = pushTokens;
        _notifications = notifications;
        _uow = uow;
    }

    [HttpGet]
    [Authorize(Policy = ScopePolicies.UsersRead)]
    public async Task<ActionResult<NotificationsResponse>> GetNotifications([FromQuery] int take = 50, [FromQuery] int skip = 0, CancellationToken ct = default)
    {
        if (take is < 1 or > 100)
            return BadRequest(ApiProblemDetails.Validation("Take must be between 1 and 100.", nameof(take)));
        if (skip < 0)
            return BadRequest(ApiProblemDetails.Validation("Skip must be greater than or equal to 0.", nameof(skip)));

        var me = GetCurrentUserId();
        if (!me.HasValue) return Unauthorized();

        var items = await _notifications.GetAsync(me.Value, take, skip, ct);
        return Ok(new NotificationsResponse(items.Select(NotificationDto.From).ToList()));
    }

    [HttpGet("unread-count")]
    [Authorize(Policy = ScopePolicies.UsersRead)]
    public async Task<ActionResult<NotificationUnreadCountResponse>> GetUnreadCount(CancellationToken ct)
    {
        var me = GetCurrentUserId();
        if (!me.HasValue) return Unauthorized();

        var total = await _notifications.GetUnreadCountAsync(me.Value, ct);
        return Ok(new NotificationUnreadCountResponse(total));
    }

    [HttpPost("mark-read")]
    [Authorize(Policy = ScopePolicies.UsersWrite)]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<NotificationMarkedReadResponse>> MarkAllRead(CancellationToken ct)
    {
        var me = GetCurrentUserId();
        if (!me.HasValue) return Unauthorized();

        var count = await _notifications.MarkAllReadAsync(me.Value, DateTimeOffset.UtcNow, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(new NotificationMarkedReadResponse(count));
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

        var me = GetCurrentUserId();
        if (!me.HasValue)
            return Unauthorized();

        await _pushTokens.UpsertAsync(me.Value, req.Token.Trim(), req.Platform, req.DeviceId, DateTimeOffset.UtcNow, ct);
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

        var me = GetCurrentUserId();
        if (!me.HasValue)
            return Unauthorized();

        await _pushTokens.RemoveAsync(me.Value, token.Trim(), ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    private Guid? GetCurrentUserId()
    {
        var rawId = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(rawId, out var me) ? me : null;
    }
}

public sealed record NotificationsResponse(IReadOnlyList<NotificationDto> Notifications);
public sealed record NotificationUnreadCountResponse(int Total);
public sealed record NotificationMarkedReadResponse(int Count);

public sealed record NotificationDto(
    Guid Id,
    string Type,
    string Title,
    string Body,
    DateTimeOffset CreatedAt,
    string? Href,
    bool Read)
{
    public static NotificationDto From(UserNotification notification) => new(
        notification.Id,
        notification.Type,
        notification.Title,
        notification.Body,
        notification.CreatedAt,
        notification.Href,
        notification.IsRead);
}

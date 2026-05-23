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
    private readonly INotificationPreferenceRepository _preferences;
    private readonly IUnitOfWork _uow;

    public NotificationsController(
        IPushTokenRepository pushTokens,
        INotificationRepository notifications,
        INotificationPreferenceRepository preferences,
        IUnitOfWork uow)
    {
        _pushTokens = pushTokens;
        _notifications = notifications;
        _preferences = preferences;
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

    [HttpPost("{id:guid}/mark-read")]
    [Authorize(Policy = ScopePolicies.UsersWrite)]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        var me = GetCurrentUserId();
        if (!me.HasValue) return Unauthorized();

        var marked = await _notifications.MarkReadAsync(me.Value, id, DateTimeOffset.UtcNow, ct);
        if (!marked) return NotFound();

        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = ScopePolicies.UsersWrite)]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken ct)
    {
        var me = GetCurrentUserId();
        if (!me.HasValue) return Unauthorized();

        await _notifications.ArchiveAsync(me.Value, id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("preferences")]
    [Authorize(Policy = ScopePolicies.UsersRead)]
    public async Task<ActionResult<NotificationPreferencesDto>> GetPreferences(CancellationToken ct)
    {
        var me = GetCurrentUserId();
        if (!me.HasValue) return Unauthorized();

        var preferences = await _preferences.GetOrDefaultAsync(me.Value, ct);
        return Ok(NotificationPreferencesDto.From(preferences));
    }

    [HttpPut("preferences")]
    [Authorize(Policy = ScopePolicies.UsersWrite)]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<NotificationPreferencesDto>> UpdatePreferences(
        [FromBody] NotificationPreferencesDto req,
        CancellationToken ct)
    {
        var me = GetCurrentUserId();
        if (!me.HasValue) return Unauthorized();

        var preferences = req.ToEntity(me.Value, DateTimeOffset.UtcNow);
        await _preferences.UpsertAsync(preferences, ct);
        await _uow.SaveChangesAsync(ct);
        return Ok(NotificationPreferencesDto.From(preferences));
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

public sealed record NotificationPreferencesDto(
    bool EmailNewBids,
    bool EmailOutbidAlerts,
    bool EmailWonAuctions,
    bool EmailMessages,
    bool EmailPriceDrops,
    bool EmailPromotions,
    bool PushNewBids,
    bool PushOutbidAlerts,
    bool PushWonAuctions,
    bool PushMessages)
{
    public static NotificationPreferencesDto From(NotificationPreference preferences) => new(
        preferences.EmailNewBids,
        preferences.EmailOutbidAlerts,
        preferences.EmailWonAuctions,
        preferences.EmailMessages,
        preferences.EmailPriceDrops,
        preferences.EmailPromotions,
        preferences.PushNewBids,
        preferences.PushOutbidAlerts,
        preferences.PushWonAuctions,
        preferences.PushMessages);

    public NotificationPreference ToEntity(Guid userId, DateTimeOffset now) => new()
    {
        UserId = userId,
        EmailNewBids = EmailNewBids,
        EmailOutbidAlerts = EmailOutbidAlerts,
        EmailWonAuctions = EmailWonAuctions,
        EmailMessages = EmailMessages,
        EmailPriceDrops = EmailPriceDrops,
        EmailPromotions = EmailPromotions,
        PushNewBids = PushNewBids,
        PushOutbidAlerts = PushOutbidAlerts,
        PushWonAuctions = PushWonAuctions,
        PushMessages = PushMessages,
        UpdatedAt = now
    };
}

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

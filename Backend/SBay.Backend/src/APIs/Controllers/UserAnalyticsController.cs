using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Backend.APIs.Records;
using SBay.Backend.DataBase.Interfaces;
using SBay.Domain.Authentication;
using SBay.Domain.Entities;

[ApiController]
[Route("api/users")]
[Authorize]
public sealed class UserAnalyticsController : ControllerBase
{
    private readonly IUserAnalyticsService _svc;
    private readonly ICurrentUserResolver _resolver;
    public UserAnalyticsController(IUserAnalyticsService svc, ICurrentUserResolver resolver) { _svc = svc; _resolver = resolver; }

    [HttpGet("{id:guid}/stats")]
    [Authorize]
    [Authorize(Policy = ScopePolicies.UsersRead)]
    public async Task<ActionResult<UserStatsDto>> GetStats(Guid id, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();
        if (me.Value != id && !User.IsInRole("admin")) return Forbid();
        return Ok(await _svc.GetStatsAsync(id, ct));
    }

    [HttpGet("{id:guid}/analytics")]
    [Authorize]
    [Authorize(Policy = ScopePolicies.UsersRead)]
    public async Task<ActionResult<UserAnalyticsDto>> GetAnalytics(Guid id, [FromQuery] DateTime from, [FromQuery] DateTime to, [FromQuery] string granularity = "day", CancellationToken ct = default)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();
        if (me.Value != id && !User.IsInRole("admin")) return Forbid();
        return Ok(await _svc.GetAnalyticsAsync(id, from, to, granularity, ct));
    }
}

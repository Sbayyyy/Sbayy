using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SBay.Backend.APIs.Records.Requests;
using SBay.Backend.APIs.Records.Responses;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

[ApiController]
public sealed class ClientLogsController : ControllerBase
{
    private static readonly HashSet<string> AllowedLevels = new(StringComparer.OrdinalIgnoreCase)
    {
        "debug",
        "info",
        "warning",
        "error",
        "critical"
    };

    private readonly EfDbContext _db;
    private readonly ILogger<ClientLogsController> _logger;

    public ClientLogsController(EfDbContext db, ILogger<ClientLogsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpPost("api/client-logs")]
    [AllowAnonymous]
    [EnableRateLimiting("clientLogs")]
    public async Task<ActionResult<ClientLogDto>> Create([FromBody] CreateClientLogRequest? req, CancellationToken ct)
    {
        if (req == null) return BadRequest("Log payload is required.");

        var level = NormalizeLevel(req.Level);
        var source = Trim(req.Source, 64) ?? "unknown";
        var message = Trim(req.Message, 1000);
        if (string.IsNullOrWhiteSpace(message))
            return BadRequest("Message is required.");

        var userId = GetUserId();
        var log = new ClientLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Level = level,
            Source = source,
            Message = message,
            ExceptionType = Trim(req.ExceptionType, 160),
            StackTrace = Trim(req.StackTrace, 12000),
            ContextJson = SerializeContext(req.Context),
            AppVersion = Trim(req.AppVersion, 64),
            Platform = Trim(req.Platform, 64),
            DeviceId = Trim(req.DeviceId, 160),
            RequestId = Trim(req.RequestId ?? Request.Headers["X-Request-ID"].ToString(), 160),
            UserAgent = Trim(Request.Headers.UserAgent.ToString(), 512),
            Url = Trim(req.Url, 1000),
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.ClientLogs.Add(log);
        await _db.SaveChangesAsync(ct);

        _logger.LogWarning(
            "Client log stored {ClientLogId} level={Level} source={Source} user={UserId} message={Message}",
            log.Id,
            log.Level,
            log.Source,
            log.UserId,
            log.Message);

        return Ok(ToDto(log));
    }

    [HttpGet("api/admin/client-logs")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ClientLogsPageResponse>> List(
        [FromQuery] string? level,
        [FromQuery] string? source,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        var query = _db.ClientLogs.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(level))
        {
            var normalizedLevel = NormalizeLevel(level);
            query = query.Where(x => x.Level == normalizedLevel);
        }

        if (!string.IsNullOrWhiteSpace(source))
        {
            var sourceValue = source.Trim();
            query = query.Where(x => x.Source == sourceValue);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim();
            query = query.Where(x =>
                EF.Functions.ILike(x.Message, $"%{value}%") ||
                (x.ExceptionType != null && EF.Functions.ILike(x.ExceptionType, $"%{value}%")) ||
                (x.Url != null && EF.Functions.ILike(x.Url, $"%{value}%")));
        }

        var total = await query.CountAsync(ct);
        var logs = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync(ct);
        var items = logs.Select(ToDto).ToList();

        return Ok(new ClientLogsPageResponse(items, total, page, limit));
    }

    [HttpGet("api/admin/client-logs/summary")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ClientLogSummaryResponse>> Summary(CancellationToken ct)
    {
        var since = DateTimeOffset.UtcNow.AddHours(-24);
        var sources = await _db.ClientLogs
            .AsNoTracking()
            .GroupBy(x => x.Source)
            .Select(g => new ClientLogSourceSummary(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .Take(10)
            .ToListAsync(ct);

        return Ok(new ClientLogSummaryResponse(
            await _db.ClientLogs.CountAsync(ct),
            await _db.ClientLogs.CountAsync(x => x.CreatedAt >= since, ct),
            await _db.ClientLogs.CountAsync(x => x.Level == "error", ct),
            await _db.ClientLogs.CountAsync(x => x.Level == "warning", ct),
            await _db.ClientLogs.CountAsync(x => x.Level == "critical", ct),
            sources));
    }

    private Guid? GetUserId()
    {
        var raw = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var userId) ? userId : null;
    }

    private static string NormalizeLevel(string? level)
    {
        var value = (level ?? "error").Trim().ToLowerInvariant();
        return AllowedLevels.Contains(value) ? value : "error";
    }

    private static string? Trim(string? value, int maxLength)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed)) return null;
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static string? SerializeContext(Dictionary<string, object?>? context)
    {
        if (context == null || context.Count == 0) return null;
        var json = JsonSerializer.Serialize(context);
        return json.Length <= 6000 ? json : json[..6000];
    }

    private static ClientLogDto ToDto(ClientLog log) => new(
        log.Id,
        log.UserId,
        log.Level,
        log.Source,
        log.Message,
        log.ExceptionType,
        log.StackTrace,
        log.ContextJson,
        log.AppVersion,
        log.Platform,
        log.DeviceId,
        log.RequestId,
        log.UserAgent,
        log.Url,
        log.CreatedAt);
}

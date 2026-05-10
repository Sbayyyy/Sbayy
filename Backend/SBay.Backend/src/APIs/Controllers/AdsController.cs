using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/ads")]
public sealed class AdsController : ControllerBase
{
    private readonly EfDbContext _db;

    public AdsController(EfDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SponsoredAdDto>>> GetActive(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var ads = await _db.SponsoredAds
            .AsNoTracking()
            .Where(a => a.IsActive && a.ArchivedAt == null && a.StartsAt <= now && (a.EndsAt == null || a.EndsAt > now))
            .OrderByDescending(a => a.Priority)
            .ThenByDescending(a => a.CreatedAt)
            .Take(10)
            .ToListAsync(ct);
        return ads.Select(ToDto).ToList();
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<SponsoredAdDto>> Create([FromBody] UpsertSponsoredAdRequest request, CancellationToken ct)
    {
        var validation = Validate(request);
        if (validation != null) return BadRequest(validation);

        var ad = new SponsoredAd
        {
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim(),
            CtaText = string.IsNullOrWhiteSpace(request.CtaText) ? "Learn more" : request.CtaText.Trim(),
            TargetUrl = request.TargetUrl.Trim(),
            IsActive = request.IsActive,
            StartsAt = request.StartsAt ?? DateTime.UtcNow,
            EndsAt = request.EndsAt,
            Priority = request.Priority
        };
        await _db.SponsoredAds.AddAsync(ad, ct);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetActive), new { id = ad.Id }, ToDto(ad));
    }

    [HttpPatch("{id:guid}")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<SponsoredAdDto>> Update(Guid id, [FromBody] UpsertSponsoredAdRequest request, CancellationToken ct)
    {
        var validation = Validate(request);
        if (validation != null) return BadRequest(validation);

        var ad = await _db.SponsoredAds.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (ad is null) return NotFound();

        ad.Title = request.Title.Trim();
        ad.Description = request.Description.Trim();
        ad.ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim();
        ad.CtaText = string.IsNullOrWhiteSpace(request.CtaText) ? "Learn more" : request.CtaText.Trim();
        ad.TargetUrl = request.TargetUrl.Trim();
        ad.IsActive = request.IsActive;
        ad.StartsAt = request.StartsAt ?? ad.StartsAt;
        ad.EndsAt = request.EndsAt;
        ad.Priority = request.Priority;
        ad.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(ToDto(ad));
    }

    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken ct)
    {
        var ad = await _db.SponsoredAds.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (ad is null) return NotFound();
        ad.IsActive = false;
        ad.ArchivedAt = DateTime.UtcNow;
        ad.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/impression")]
    public async Task<IActionResult> Impression(Guid id, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var ad = await _db.SponsoredAds
            .FirstOrDefaultAsync(a => a.Id == id && a.IsActive && a.ArchivedAt == null && a.StartsAt <= now && (a.EndsAt == null || a.EndsAt > now), ct);
        if (ad is not null)
        {
            ad.Impressions += 1;
            ad.UpdatedAt = now;
            await _db.SaveChangesAsync(ct);
        }
        return NoContent();
    }

    [HttpPost("{id:guid}/click")]
    public async Task<IActionResult> Click(Guid id, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var ad = await _db.SponsoredAds
            .FirstOrDefaultAsync(a => a.Id == id && a.IsActive && a.ArchivedAt == null && a.StartsAt <= now && (a.EndsAt == null || a.EndsAt > now), ct);
        if (ad is not null)
        {
            ad.Clicks += 1;
            ad.UpdatedAt = now;
            await _db.SaveChangesAsync(ct);
        }
        return NoContent();
    }

    private static string? Validate(UpsertSponsoredAdRequest request)
    {
        if (request == null) return "Ad payload is required.";
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 160) return "Title is required and must be 160 characters or less.";
        if (string.IsNullOrWhiteSpace(request.Description) || request.Description.Length > 600) return "Description is required and must be 600 characters or less.";
        if (string.IsNullOrWhiteSpace(request.TargetUrl) || !IsAllowedUrl(request.TargetUrl)) return "Target URL must be an internal path or an http/https URL.";
        if (!string.IsNullOrWhiteSpace(request.ImageUrl) && !IsAllowedUrl(request.ImageUrl)) return "Image URL must be an internal path or an http/https URL.";
        if (request.EndsAt.HasValue && request.StartsAt.HasValue && request.EndsAt <= request.StartsAt) return "End date must be after start date.";
        return null;
    }

    private static bool IsAllowedUrl(string value)
    {
        var trimmed = value.Trim();
        if (trimmed.StartsWith("/", StringComparison.Ordinal) && !trimmed.StartsWith("//", StringComparison.Ordinal)) return true;
        return Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) &&
               (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }

    private static SponsoredAdDto ToDto(SponsoredAd ad)
    {
        return new SponsoredAdDto(ad.Id, "ad", ad.Title, ad.Description, ad.ImageUrl, ad.CtaText, ad.TargetUrl, ad.Priority, ad.Impressions, ad.Clicks);
    }
}

public sealed record UpsertSponsoredAdRequest(string Title, string Description, string? ImageUrl, string? CtaText, string TargetUrl, bool IsActive, DateTime? StartsAt, DateTime? EndsAt, int Priority);
public sealed record SponsoredAdDto(Guid Id, string Type, string Title, string Description, string? ImageUrl, string CtaText, string TargetUrl, int Priority, long Impressions, long Clicks);

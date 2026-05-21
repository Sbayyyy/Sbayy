using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SBay.Backend.Exceptions;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/admin/listings")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminListingsController : ControllerBase
{
    private static readonly string[] AllowedStatuses = ["active", "sold", "hidden", "deleted"];

    private readonly EfDbContext _db;

    public AdminListingsController(EfDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminListingDto>>> List(
        [FromQuery] string? q,
        [FromQuery] string? status,
        [FromQuery] Guid? sellerId,
        [FromQuery] int take = 50,
        [FromQuery] int skip = 0,
        CancellationToken ct = default)
    {
        if (take <= 0 || take > 200)
            throw new InvalidInputException("Take must be between 1 and 200.");
        if (skip < 0)
            throw new InvalidInputException("Skip must be >= 0.");

        var query = _db.Listings.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var text = q.Trim().ToLowerInvariant();
            query = query.Where(l =>
                l.Title.ToLower().Contains(text) ||
                (l.Description != null && l.Description.ToLower().Contains(text)));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = NormalizeStatus(status);
            query = query.Where(l => l.Status == normalizedStatus);
        }

        if (sellerId.HasValue && sellerId.Value != Guid.Empty)
            query = query.Where(l => l.SellerId == sellerId.Value);

        var items = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(l => new AdminListingDto(
                l.Id,
                l.SellerId,
                _db.Users.Where(u => u.Id == l.SellerId).Select(u => u.Email).FirstOrDefault(),
                l.Title,
                l.Status,
                l.Price.Amount,
                l.Price.Currency,
                l.StockQuantity,
                l.CategoryPath,
                l.Region,
                l.CreatedAt,
                l.UpdatedAt))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AdminListingDto>> Get(Guid id, CancellationToken ct)
    {
        var item = await _db.Listings
            .AsNoTracking()
            .Where(l => l.Id == id)
            .Select(l => new AdminListingDto(
                l.Id,
                l.SellerId,
                _db.Users.Where(u => u.Id == l.SellerId).Select(u => u.Email).FirstOrDefault(),
                l.Title,
                l.Status,
                l.Price.Amount,
                l.Price.Currency,
                l.StockQuantity,
                l.CategoryPath,
                l.Region,
                l.CreatedAt,
                l.UpdatedAt))
            .FirstOrDefaultAsync(ct);

        if (item is null)
            throw new NotFoundException("Listing not found.");

        return Ok(item);
    }

    [HttpPatch("{id:guid}/status")]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<AdminListingDto>> UpdateStatus(Guid id, [FromBody] UpdateAdminListingStatusRequest req, CancellationToken ct)
    {
        if (req is null)
            throw new InvalidInputException("Status payload is required.");

        var status = NormalizeStatus(req.Status);
        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null)
            throw new NotFoundException("Listing not found.");

        if (status == "deleted")
            listing.SetStatus("deleted");
        else
            listing.UpdateStatus(status);

        await _db.SaveChangesAsync(ct);
        return await Get(id, ct);
    }

    [HttpDelete("{id:guid}")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null)
            throw new NotFoundException("Listing not found.");

        listing.SetStatus("deleted");
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static string NormalizeStatus(string? status)
    {
        var normalized = status?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalized) || !AllowedStatuses.Contains(normalized))
            throw new InvalidInputException("Status must be one of: active, sold, hidden, deleted.");
        return normalized;
    }
}

public sealed record UpdateAdminListingStatusRequest(string? Status);

public sealed record AdminListingDto(
    Guid Id,
    Guid SellerId,
    string? SellerEmail,
    string Title,
    string Status,
    decimal PriceAmount,
    string PriceCurrency,
    int Stock,
    string? CategoryPath,
    string? Region,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

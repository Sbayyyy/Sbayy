using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/platform")]
public sealed class PlatformController : ControllerBase
{
    private readonly EfDbContext _db;

    public PlatformController(EfDbContext db)
    {
        _db = db;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<PlatformStatsDto>> Stats(CancellationToken ct)
    {
        var activeListings = _db.Listings.Where(l => l.Status == "active" && l.StockQuantity > 0);

        var stats = new PlatformStatsDto(
            await _db.Users.CountAsync(ct),
            await activeListings.CountAsync(ct),
            await activeListings
                .Where(l => l.Region != null && l.Region != "")
                .Select(l => l.Region)
                .Distinct()
                .CountAsync(ct),
            await _db.Set<Order>().CountAsync(o => o.Status == OrderStatus.Completed, ct));

        return Ok(stats);
    }
}

public sealed record PlatformStatsDto(
    int RegisteredUsers,
    int ActiveListings,
    int CoveredRegions,
    int CompletedTransactions);

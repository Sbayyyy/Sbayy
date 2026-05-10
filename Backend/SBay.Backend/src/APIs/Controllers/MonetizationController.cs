using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SBay.Backend.Services;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/monetization")]
public sealed class MonetizationController : ControllerBase
{
    private readonly MonetizationService _monetization;
    private readonly EfDbContext _db;
    private readonly ICurrentUserResolver _resolver;

    public MonetizationController(MonetizationService monetization, EfDbContext db, ICurrentUserResolver resolver)
    {
        _monetization = monetization;
        _db = db;
        _resolver = resolver;
    }

    [HttpGet("boost-options")]
    public ActionResult<IReadOnlyList<BoostOption>> GetBoostOptions()
    {
        return Ok(_monetization.GetBoostOptions());
    }

    [HttpPost("listings/{listingId:guid}/boost")]
    [Authorize(Policy = ScopePolicies.ListingsWrite)]
    public async Task<ActionResult<PaymentTransactionDto>> CreateBoost(Guid listingId, [FromBody] CreateBoostRequest? request, CancellationToken ct)
    {
        if (request is null) return BadRequest("Boost payload is required.");
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();

        try
        {
            var result = await _monetization.CreateBoostPaymentAsync(me.Value, listingId, request.OptionId, request.ReturnUrl, ct);
            return Ok(ToDto(result.Transaction));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("transactions")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<PaymentTransactionDto>>> GetTransactions(CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();

        var transactions = await _db.PaymentTransactions
            .AsNoTracking()
            .Where(t => t.UserId == me.Value)
            .OrderByDescending(t => t.CreatedAt)
            .Take(50)
            .ToListAsync(ct);
        return transactions.Select(ToDto).ToList();
    }

    [HttpGet("seller-summary")]
    [Authorize]
    public async Task<ActionResult<SellerMonetizationSummary>> GetSellerSummary(CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();

        var now = DateTime.UtcNow;
        var activeBoosts = await _db.ListingBoostPurchases
            .AsNoTracking()
            .CountAsync(b => b.SellerId == me.Value && b.IsActive && b.EndsAt > now, ct);
        var pendingPayments = await _db.PaymentTransactions
            .AsNoTracking()
            .CountAsync(t => t.UserId == me.Value && t.Status == PaymentTransactionStatus.Pending, ct);
        var fees = await _db.PlatformFees
            .AsNoTracking()
            .Where(f => f.SellerId == me.Value)
            .ToListAsync(ct);

        return new SellerMonetizationSummary(activeBoosts, pendingPayments, fees.Sum(f => f.FeeAmount), fees.FirstOrDefault()?.Currency ?? "SYP");
    }

    private static PaymentTransactionDto ToDto(PaymentTransaction transaction)
    {
        return new PaymentTransactionDto(
            transaction.Id,
            transaction.Provider,
            transaction.ProviderReference,
            transaction.Purpose.ToString(),
            transaction.Status.ToString(),
            transaction.Amount,
            transaction.Currency,
            transaction.CheckoutUrl,
            transaction.CreatedAt,
            transaction.UpdatedAt);
    }
}

public sealed record CreateBoostRequest(string OptionId, string? ReturnUrl);
public sealed record PaymentTransactionDto(Guid Id, string Provider, string? ProviderReference, string Purpose, string Status, decimal Amount, string Currency, string? CheckoutUrl, DateTime CreatedAt, DateTime UpdatedAt);
public sealed record SellerMonetizationSummary(int ActiveBoosts, int PendingPayments, decimal TotalPlatformFees, string Currency);

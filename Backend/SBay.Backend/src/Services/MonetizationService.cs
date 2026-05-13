using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SBay.Backend.Services.Payments;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Services;

public sealed record BoostOption(string Id, string Name, decimal Price, string Currency, int DurationDays);

public sealed class MonetizationService
{
    private readonly EfDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly PaymentGatewayRegistry _gateways;

    public MonetizationService(EfDbContext db, IConfiguration configuration, PaymentGatewayRegistry gateways)
    {
        _db = db;
        _configuration = configuration;
        _gateways = gateways;
    }

    public IReadOnlyList<BoostOption> GetBoostOptions()
    {
        var currency = _configuration["Monetization:Currency"] ?? "SYP";
        var options = _configuration.GetSection("Monetization:BoostOptions").Get<List<BoostOption>>();
        if (options is { Count: > 0 }) return options;
        return new[]
        {
            new BoostOption("boost_7", "7 day boost", 25000m, currency, 7),
            new BoostOption("boost_14", "14 day boost", 40000m, currency, 14),
            new BoostOption("boost_30", "30 day boost", 70000m, currency, 30)
        };
    }

    public async Task<(PaymentTransaction Transaction, ListingBoostPurchase Boost)> CreateBoostPaymentAsync(Guid sellerId, Guid listingId, string optionId, string? returnUrl, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(optionId))
            throw new ArgumentException("Boost option is required.", nameof(optionId));
        if (!IsAllowedReturnUrl(returnUrl))
            throw new ArgumentException("Return URL must be an internal path or an http/https URL.", nameof(returnUrl));

        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == listingId, ct)
                      ?? throw new InvalidOperationException("Listing not found.");
        if (listing.SellerId != sellerId)
            throw new UnauthorizedAccessException("Listing does not belong to the current user.");
        if (!string.Equals(listing.Status, "active", StringComparison.OrdinalIgnoreCase) || listing.StockQuantity <= 0)
            throw new InvalidOperationException("Only active available listings can be boosted.");

        var option = GetBoostOptions().FirstOrDefault(o => string.Equals(o.Id, optionId, StringComparison.OrdinalIgnoreCase))
                     ?? throw new ArgumentException("Invalid boost option.", nameof(optionId));
        var gateway = _gateways.ActiveGateway;

        var transaction = new PaymentTransaction
        {
            UserId = sellerId,
            ListingId = listingId,
            Provider = gateway.Name,
            Purpose = PaymentTransactionPurpose.ListingBoost,
            Status = PaymentTransactionStatus.Pending,
            Amount = option.Price,
            Currency = option.Currency,
            MetadataJson = JsonSerializer.Serialize(new { option.Id, option.DurationDays })
        };

        await _db.PaymentTransactions.AddAsync(transaction, ct);
        var session = await gateway.CreateSessionAsync(new PaymentGatewayRequest(
            transaction.Id,
            sellerId,
            option.Price,
            option.Currency,
            "listing_boost",
            option.Name,
            returnUrl), ct);

        transaction.ProviderReference = session.ProviderReference;
        transaction.CheckoutUrl = session.CheckoutUrl;
        transaction.Status = session.Status;
        transaction.UpdatedAt = DateTime.UtcNow;

        var boost = new ListingBoostPurchase
        {
            ListingId = listingId,
            SellerId = sellerId,
            PaymentTransactionId = transaction.Id,
            OptionId = option.Id
        };
        await _db.ListingBoostPurchases.AddAsync(boost, ct);
        await _db.SaveChangesAsync(ct);
        return (transaction, boost);
    }

    public async Task<bool> ApplyPaymentWebhookAsync(PaymentWebhookResult webhook, CancellationToken ct)
    {
        var transaction = await _db.PaymentTransactions
            .FirstOrDefaultAsync(t => t.Provider == webhook.Provider && t.ProviderReference == webhook.ProviderReference, ct);
        if (transaction is null) return false;
        if (transaction.Status == webhook.Status) return true;
        if (transaction.Status == PaymentTransactionStatus.Succeeded && webhook.Status != PaymentTransactionStatus.Refunded)
            return true;
        if (transaction.Status is PaymentTransactionStatus.Failed or PaymentTransactionStatus.Cancelled or PaymentTransactionStatus.Refunded)
            return true;

        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? tx = null;
        if (_db.Database.IsRelational())
            tx = await _db.Database.BeginTransactionAsync(ct);

        transaction.Status = webhook.Status;
        transaction.UpdatedAt = DateTime.UtcNow;

        if (transaction.Purpose == PaymentTransactionPurpose.ListingBoost &&
            webhook.Status == PaymentTransactionStatus.Succeeded)
        {
            var boost = await _db.ListingBoostPurchases.FirstOrDefaultAsync(b => b.PaymentTransactionId == transaction.Id, ct);
            if (boost is not null && !boost.IsActive)
            {
                var option = GetBoostOptions().First(o => string.Equals(o.Id, boost.OptionId, StringComparison.OrdinalIgnoreCase));
                var starts = DateTime.UtcNow;
                var ends = starts.AddDays(option.DurationDays);
                boost.StartsAt = starts;
                boost.EndsAt = ends;
                boost.IsActive = true;
                boost.UpdatedAt = DateTime.UtcNow;

                var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == boost.ListingId, ct);
                if (listing is not null && string.Equals(listing.Status, "active", StringComparison.OrdinalIgnoreCase))
                    listing.ActivateBoost(ends);
            }
        }

        await _db.SaveChangesAsync(ct);
        if (tx is not null)
        {
            await tx.CommitAsync(ct);
            await tx.DisposeAsync();
        }
        return true;
    }

    public async Task<PlatformFee?> EnsureCommissionAsync(Order order, CancellationToken ct)
    {
        if (order.Status != OrderStatus.Completed) return null;
        var existing = await _db.PlatformFees.FirstOrDefaultAsync(f => f.OrderId == order.Id, ct);
        if (existing is not null) return existing;

        var rate = _configuration.GetValue("Monetization:CommissionPercent", 5m) / 100m;
        if (rate <= 0) return null;

        var fee = new PlatformFee
        {
            OrderId = order.Id,
            SellerId = order.SellerId,
            BasisAmount = order.TotalAmount,
            FeeAmount = Math.Round(order.TotalAmount * rate, 2, MidpointRounding.AwayFromZero),
            Currency = order.TotalCurrency,
            Rate = rate
        };
        await _db.PlatformFees.AddAsync(fee, ct);
        return fee;
    }

    private static bool IsAllowedReturnUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return true;
        var trimmed = value.Trim();
        if (trimmed.StartsWith("/", StringComparison.Ordinal) && !trimmed.StartsWith("//", StringComparison.Ordinal)) return true;
        return Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) &&
               (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}

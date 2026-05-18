using Microsoft.EntityFrameworkCore;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Services;

public sealed class AccountDeletionService
{
    private readonly EfDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<AccountDeletionService> _logger;

    public AccountDeletionService(
        EfDbContext db,
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<AccountDeletionService> logger)
    {
        _db = db;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public async Task<int> DeleteExpiredDeactivatedAccountsAsync(CancellationToken ct)
    {
        var graceDays = Math.Clamp(_configuration.GetValue<int?>("AccountDeletion:GraceDays") ?? 90, 1, 365);
        var batchSize = Math.Clamp(_configuration.GetValue<int?>("AccountDeletion:BatchSize") ?? 20, 1, 100);
        var cutoff = DateTimeOffset.UtcNow.AddDays(-graceDays);

        var users = await _db.Users
            .Where(u => u.Status == "deactivated" && u.DeactivatedAt != null && u.DeactivatedAt <= cutoff)
            .OrderBy(u => u.DeactivatedAt)
            .Take(batchSize)
            .ToListAsync(ct);

        var deleted = 0;
        foreach (var user in users)
        {
            ct.ThrowIfCancellationRequested();
            if (await DeleteAccountAsync(user, ct))
                deleted++;
        }

        return deleted;
    }

    private async Task<bool> DeleteAccountAsync(User user, CancellationToken ct)
    {
        var imageReferences = await LoadOwnedImageReferencesAsync(user.Id, user.AvatarUrl, ct);

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        await DeleteDependentRowsAsync(user.Id, ct);
        var userRows = await _db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM users WHERE id = {user.Id} AND status = 'deactivated'",
            ct);

        if (userRows != 1)
        {
            await tx.RollbackAsync(ct);
            return false;
        }

        await tx.CommitAsync(ct);
        DeleteOwnedFiles(imageReferences);
        _logger.LogInformation("Deleted deactivated account userId={UserId} imageRefs={ImageReferenceCount}", user.Id, imageReferences.Count);
        return true;
    }

    private async Task<IReadOnlyList<string>> LoadOwnedImageReferencesAsync(Guid userId, string? avatarUrl, CancellationToken ct)
    {
        var values = new List<string?>();
        values.Add(avatarUrl);
        values.AddRange(await _db.Listings
            .AsNoTracking()
            .Where(l => l.SellerId == userId)
            .Select(l => l.ThumbnailUrl)
            .ToListAsync(ct));
        values.AddRange(await _db.Set<ListingImage>()
            .AsNoTracking()
            .Where(i => _db.Listings.Where(l => l.SellerId == userId).Select(l => l.Id).Contains(i.ListingId))
            .Select(i => i.Url)
            .ToListAsync(ct));

        return values
            .Select(NormalizeUploadReference)
            .Where(x => x != null)
            .Select(x => x!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private async Task DeleteDependentRowsAsync(Guid userId, CancellationToken ct)
    {
        await _db.Database.ExecuteSqlInterpolatedAsync($"""
DELETE FROM review_helpfuls
WHERE user_id = {userId}
   OR review_id IN (
        SELECT id FROM reviews
        WHERE seller_id = {userId}
           OR reviewer_id = {userId}
           OR listing_id IN (SELECT id FROM listings WHERE seller_id = {userId})
           OR order_id IN (SELECT id FROM orders WHERE buyer_id = {userId} OR seller_id = {userId})
   )
""", ct);

        await _db.Database.ExecuteSqlInterpolatedAsync($"""
DELETE FROM reviews
WHERE seller_id = {userId}
   OR reviewer_id = {userId}
   OR listing_id IN (SELECT id FROM listings WHERE seller_id = {userId})
   OR order_id IN (SELECT id FROM orders WHERE buyer_id = {userId} OR seller_id = {userId})
""", ct);

        await _db.Database.ExecuteSqlInterpolatedAsync($"""
DELETE FROM platform_fees
WHERE seller_id = {userId}
   OR order_id IN (SELECT id FROM orders WHERE buyer_id = {userId} OR seller_id = {userId})
""", ct);

        await _db.Database.ExecuteSqlInterpolatedAsync($"""
DELETE FROM listing_boost_purchases
WHERE seller_id = {userId}
   OR listing_id IN (SELECT id FROM listings WHERE seller_id = {userId})
""", ct);

        await _db.Database.ExecuteSqlInterpolatedAsync($"""
DELETE FROM payment_transactions
WHERE user_id = {userId}
   OR listing_id IN (SELECT id FROM listings WHERE seller_id = {userId})
   OR order_id IN (SELECT id FROM orders WHERE buyer_id = {userId} OR seller_id = {userId})
""", ct);

        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE buyer_id = {userId} OR seller_id = {userId})",
            ct);
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM orders WHERE buyer_id = {userId} OR seller_id = {userId}",
            ct);
        await _db.Database.ExecuteSqlInterpolatedAsync($"""
DELETE FROM messages
WHERE sender_id = {userId}
   OR receiver_id = {userId}
   OR chat_id IN (SELECT id FROM chats WHERE buyer_id = {userId} OR seller_id = {userId})
""", ct);
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM chats WHERE buyer_id = {userId} OR seller_id = {userId}",
            ct);
        await _db.Database.ExecuteSqlInterpolatedAsync($"""
DELETE FROM reports
WHERE reporter_id = {userId}
   OR reported_user_id = {userId}
   OR reviewed_by_id = {userId}
   OR target_id = {userId}
   OR target_id IN (SELECT id FROM listings WHERE seller_id = {userId})
""", ct);
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM user_blocks WHERE blocker_id = {userId} OR blocked_user_id = {userId}",
            ct);
        await _db.Database.ExecuteSqlInterpolatedAsync($"""
DELETE FROM favorites
WHERE user_id = {userId}
   OR listing_id IN (SELECT id FROM listings WHERE seller_id = {userId})
""", ct);
        await _db.Database.ExecuteSqlInterpolatedAsync($"""
DELETE FROM cart_items
WHERE cart_id IN (SELECT id FROM carts WHERE user_id = {userId})
   OR listing_id IN (SELECT id FROM listings WHERE seller_id = {userId})
""", ct);
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM carts WHERE user_id = {userId}",
            ct);
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM addresses WHERE user_id = {userId}",
            ct);
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM notifications WHERE user_id = {userId}",
            ct);
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM push_tokens WHERE user_id = {userId}",
            ct);
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM refresh_tokens WHERE user_id = {userId}",
            ct);
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM listing_images WHERE listing_id IN (SELECT id FROM listings WHERE seller_id = {userId})",
            ct);
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM listings WHERE seller_id = {userId}",
            ct);
    }

    private void DeleteOwnedFiles(IReadOnlyList<string> relativePaths)
    {
        var root = ResolveUploadsRoot();
        foreach (var relativePath in relativePaths)
        {
            var fullPath = GetSafeFullPath(root, relativePath);
            if (fullPath == null || !File.Exists(fullPath))
                continue;

            try
            {
                File.Delete(fullPath);
                _logger.LogInformation("Deleted account-owned upload path={Path}", relativePath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete account-owned upload path={Path}", relativePath);
            }
        }
    }

    private string ResolveUploadsRoot()
    {
        var configured = _configuration["Storage:Local:Path"];
        if (!string.IsNullOrWhiteSpace(configured))
            return Path.GetFullPath(configured);

        var webRoot = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
        return Path.GetFullPath(Path.Combine(webRoot, "uploads"));
    }

    private string? NormalizeUploadReference(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var trimmed = value.Trim();
        string path;
        if (trimmed.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            path = trimmed;
        }
        else if (Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
        {
            path = uri.AbsolutePath;
            var localBase = _configuration["Storage:Local:PublicBaseUrl"];
            var appBase = _configuration["App:PublicBaseUrl"];
            if (!IsAllowedUploadHost(uri, localBase) && !IsAllowedUploadHost(uri, appBase))
                return null;
        }
        else
        {
            return null;
        }

        if (!path.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
            return null;

        return NormalizeRelativePath(Uri.UnescapeDataString(path["/uploads/".Length..]));
    }

    private static bool IsAllowedUploadHost(Uri uri, string? configuredBase)
    {
        if (string.IsNullOrWhiteSpace(configuredBase) || !Uri.TryCreate(configuredBase.TrimEnd('/'), UriKind.Absolute, out var baseUri))
            return false;
        return string.Equals(uri.Scheme, baseUri.Scheme, StringComparison.OrdinalIgnoreCase) &&
               string.Equals(uri.Host, baseUri.Host, StringComparison.OrdinalIgnoreCase) &&
               uri.Port == baseUri.Port;
    }

    private static string? NormalizeRelativePath(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var normalized = value.Replace('\\', '/').TrimStart('/');
        if (normalized.Contains('\0') || normalized.Split('/').Any(p => p is "" or "." or ".."))
            return null;
        if (Path.IsPathRooted(normalized))
            return null;
        return normalized;
    }

    private static string? GetSafeFullPath(string root, string relative)
    {
        var fullRoot = Path.GetFullPath(root);
        var fullPath = Path.GetFullPath(Path.Combine(fullRoot, relative));
        var rootWithSeparator = fullRoot.EndsWith(Path.DirectorySeparatorChar)
            ? fullRoot
            : fullRoot + Path.DirectorySeparatorChar;
        return fullPath.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase) ? fullPath : null;
    }
}

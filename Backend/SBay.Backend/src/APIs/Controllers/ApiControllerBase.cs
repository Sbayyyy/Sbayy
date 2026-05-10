using Microsoft.AspNetCore.Mvc;

namespace SBay.Backend.Api.Controllers;

/// <summary>
/// Base controller providing common helpers for pagination, normalization, and error handling.
/// Promotes consistency across all API endpoints.
/// </summary>
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>
    /// Normalize pagination parameters to safe defaults.
    /// 
    /// Standard:
    /// - page >= 1, max value from config or 1000
    /// - limit >= 1, max 100 (reasonable default)
    /// </summary>
    protected static (int Page, int Limit) NormalizePaging(int page, int limit, int? maxLimit = null)
    {
        maxLimit ??= 100;
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedLimit = limit < 1 ? 20 : Math.Min(limit, maxLimit.Value);
        return (normalizedPage, normalizedLimit);
    }

    /// <summary>
    /// Normalize offset-based pagination (skip/take).
    /// 
    /// Standard:
    /// - skip >= 0
    /// - take >= 1, max 100
    /// </summary>
    protected static (int Skip, int Take) NormalizeOffsetPaging(int skip, int take, int? maxTake = null)
    {
        maxTake ??= 100;
        var normalizedSkip = Math.Max(0, skip);
        var normalizedTake = take < 1 ? 20 : Math.Min(take, maxTake.Value);
        return (normalizedSkip, normalizedTake);
    }

    /// <summary>
    /// Validate that a resource belongs to the current user.
    /// Returns Forbid if ownership doesn't match.
    /// </summary>
    protected IActionResult ValidateOwnership(Guid resourceOwnerId, Guid currentUserId, string? adminRole = "admin")
    {
        if (resourceOwnerId != currentUserId && !User.IsInRole(adminRole ?? "admin"))
            return Forbid();
        return Ok();  // Ownership valid
    }

    /// <summary>
    /// Validate that a resource was found.
    /// Returns NotFound if null.
    /// </summary>
    protected IActionResult RequireNotNull<T>(T? resource, string? resourceName = null) where T : class
    {
        if (resource is null)
            return NotFound(new { message = $"{resourceName ?? "Resource"} not found." });
        return Ok();  // Resource exists
    }
}

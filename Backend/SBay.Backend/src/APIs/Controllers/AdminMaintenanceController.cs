using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SBay.Backend.Services;

namespace SBay.Backend.APIs.Controllers;

[ApiController]
[Route("api/admin/maintenance")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminMaintenanceController : ControllerBase
{
    private readonly ImageCleanupService _imageCleanup;

    public AdminMaintenanceController(ImageCleanupService imageCleanup)
    {
        _imageCleanup = imageCleanup;
    }

    [HttpPost("cleanup-unused-images")]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<ImageCleanupResult>> CleanupUnusedImages(
        [FromQuery] bool dryRun = true,
        [FromQuery] int graceHours = 72,
        CancellationToken ct = default)
    {
        var result = await _imageCleanup.CleanupAsync(dryRun, graceHours, ct);
        return Ok(result);
    }
}

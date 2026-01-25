using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Backend.APIs.Records.Responses;
using SBay.Backend.Services;
using SBay.Domain.Authentication;

namespace SBay.Backend.APIs.Controllers;

[ApiController]
[Route("api/uploads")]
public sealed class UploadsController : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif"
    };

    private readonly IImageStorageProvider _storage;
    private readonly ILogger<UploadsController> _logger;

    public UploadsController(IImageStorageProvider storage, ILogger<UploadsController> logger)
    {
        _storage = storage;
        _logger = logger;
    }

    [HttpPost("images")]
    [Authorize]
    [Authorize(Policy = ScopePolicies.ListingsWrite)]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<UploadImagesResponse>> UploadImages(
        [FromForm] List<IFormFile> files,
        CancellationToken ct)
    {
        if (files == null || files.Count == 0)
            return BadRequest("No files uploaded.");

        var urls = new List<string>();
        try
        {
            foreach (var file in files)
            {
                if (file.Length <= 0)
                    continue;

                var ext = Path.GetExtension(file.FileName);
                if (string.IsNullOrWhiteSpace(ext) || !AllowedExtensions.Contains(ext))
                    throw new InvalidOperationException("Unsupported image type.");

                var fileName = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
                await using var stream = file.OpenReadStream();
                var url = await _storage.UploadAsync(stream, fileName, file.ContentType, ct);
                urls.Add(url);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Image upload failed.");
            return BadRequest("An error occurred while uploading the image.");
        }

        return Ok(new UploadImagesResponse(urls));
    }
}

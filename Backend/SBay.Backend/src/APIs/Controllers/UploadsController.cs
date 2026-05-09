using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SBay.Backend.APIs.Records.Responses;
using SBay.Backend.Services;
using SBay.Backend.Utils;
using SBay.Domain.Authentication;

namespace SBay.Backend.APIs.Controllers;

[ApiController]
[Route("api/uploads")]
public sealed class UploadsController : ControllerBase
{
    private const int MaxImageFiles = 8;
    private const long MaxImageFileBytes = 5 * 1024 * 1024;
    private const long MaxAvatarFileBytes = 2 * 1024 * 1024;

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
    [EnableRateLimiting("uploads")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<UploadImagesResponse>> UploadImages(
        [FromForm] List<IFormFile> files,
        CancellationToken ct)
    {
        if (files == null || files.Count == 0)
            return BadRequest(ApiProblemDetails.Validation("No files uploaded.", nameof(files)));
        if (files.Count > MaxImageFiles)
            return BadRequest(ApiProblemDetails.Validation($"A maximum of {MaxImageFiles} files can be uploaded at once.", nameof(files)));

        var urls = new List<string>();
        try
        {
            foreach (var file in files)
            {
                if (file.Length <= 0)
                    continue;
                if (file.Length > MaxImageFileBytes)
                    throw new InvalidOperationException("Image is too large.");

                var ext = Path.GetExtension(file.FileName);
                if (string.IsNullOrWhiteSpace(ext) || !AllowedExtensions.Contains(ext))
                    throw new InvalidOperationException("Unsupported image type.");
                await using var buffer = new MemoryStream();
                await file.CopyToAsync(buffer, ct);
                if (!TryDetectImageType(buffer.ToArray(), out var detectedExt, out var detectedContentType) ||
                    !string.Equals(ext, detectedExt, StringComparison.OrdinalIgnoreCase) &&
                    !(string.Equals(ext, ".jpg", StringComparison.OrdinalIgnoreCase) && string.Equals(detectedExt, ".jpeg", StringComparison.OrdinalIgnoreCase)) &&
                    !(string.Equals(ext, ".jpeg", StringComparison.OrdinalIgnoreCase) && string.Equals(detectedExt, ".jpg", StringComparison.OrdinalIgnoreCase)))
                    throw new InvalidOperationException("Unsupported image type.");
                buffer.Position = 0;

                var fileName = $"{Guid.NewGuid():N}{detectedExt.ToLowerInvariant()}";
                var url = await _storage.UploadAsync(buffer, fileName, detectedContentType, ct);
                urls.Add(url);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Image upload failed.");
            return BadRequest(ApiProblemDetails.BadRequest("An error occurred while uploading the image.", "upload_failed"));
        }

        return Ok(new UploadImagesResponse(urls));
    }

    [HttpPost("avatar")]
    [Authorize]
    [Authorize(Policy = ScopePolicies.UsersWrite)]
    [EnableRateLimiting("uploads")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<UploadImagesResponse>> UploadAvatar(
        [FromForm] IFormFile file,
        CancellationToken ct)
    {
        if (file == null || file.Length <= 0)
            return BadRequest(ApiProblemDetails.Validation("No file uploaded.", nameof(file)));
        if (file.Length > MaxAvatarFileBytes)
            return BadRequest(ApiProblemDetails.Validation("Image is too large.", nameof(file)));

        var ext = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(ext) || !AllowedExtensions.Contains(ext))
            return BadRequest(ApiProblemDetails.Validation("Unsupported image type.", nameof(file)));

        try
        {
            await using var buffer = new MemoryStream();
            await file.CopyToAsync(buffer, ct);
            if (!TryDetectImageType(buffer.ToArray(), out var detectedExt, out var detectedContentType) ||
                !string.Equals(ext, detectedExt, StringComparison.OrdinalIgnoreCase) &&
                !(string.Equals(ext, ".jpg", StringComparison.OrdinalIgnoreCase) && string.Equals(detectedExt, ".jpeg", StringComparison.OrdinalIgnoreCase)) &&
                !(string.Equals(ext, ".jpeg", StringComparison.OrdinalIgnoreCase) && string.Equals(detectedExt, ".jpg", StringComparison.OrdinalIgnoreCase)))
                return BadRequest(ApiProblemDetails.Validation("Unsupported image type.", nameof(file)));
            buffer.Position = 0;
            var fileName = $"{Guid.NewGuid():N}{detectedExt.ToLowerInvariant()}";
            var url = await _storage.UploadAsync(buffer, fileName, detectedContentType, ct);
            return Ok(new UploadImagesResponse(new List<string> { url }));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Avatar upload failed.");
            return BadRequest(ApiProblemDetails.BadRequest("An error occurred while uploading the image.", "upload_failed"));
        }
    }

    private static bool TryDetectImageType(byte[] bytes, out string extension, out string contentType)
    {
        extension = string.Empty;
        contentType = string.Empty;
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
        {
            extension = ".jpg";
            contentType = "image/jpeg";
            return true;
        }
        if (bytes.Length >= 8 &&
            bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47 &&
            bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A)
        {
            extension = ".png";
            contentType = "image/png";
            return true;
        }
        if (bytes.Length >= 6 &&
            bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 &&
            bytes[3] == 0x38 && (bytes[4] == 0x37 || bytes[4] == 0x39) && bytes[5] == 0x61)
        {
            extension = ".gif";
            contentType = "image/gif";
            return true;
        }
        if (bytes.Length >= 12 &&
            bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 &&
            bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50)
        {
            extension = ".webp";
            contentType = "image/webp";
            return true;
        }
        return false;
    }
}

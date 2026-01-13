using Google.Apis.Auth.OAuth2;
using Google.Cloud.Storage.V1;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Backend.APIs.Records.Responses;

namespace SBay.Backend.APIs.Controllers;

[ApiController]
[Route("api/uploads")]
public sealed class UploadsController : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif"
    };

    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;
    private readonly ILogger<UploadsController> _logger;

    public UploadsController(IWebHostEnvironment env, IConfiguration config, ILogger<UploadsController> logger)
    {
        _env = env;
        _config = config;
        _logger = logger;
    }

    [HttpPost("images")]
    [Authorize]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<UploadImagesResponse>> UploadImages(
        [FromForm] List<IFormFile> files,
        CancellationToken ct)
    {
        if (files == null || files.Count == 0)
            return BadRequest("No files uploaded.");

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var uploadsRoot = Path.Combine(webRoot, "uploads");
        Directory.CreateDirectory(uploadsRoot);

        var urls = new List<string>();
        var savedPaths = new List<string>();
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
                var localPath = Path.Combine(uploadsRoot, fileName);

                await using (var stream = System.IO.File.Create(localPath))
                {
                    await file.CopyToAsync(stream, ct);
                }

                savedPaths.Add(localPath);

                var baseUrl = _config["App:PublicBaseUrl"];
                if (string.IsNullOrWhiteSpace(baseUrl))
                    baseUrl = $"{Request.Scheme}://{Request.Host}";
                var localUrl = $"{baseUrl.TrimEnd('/')}/uploads/{fileName}";
                urls.Add(localUrl);

                await TryUploadToFirebaseAsync(localPath, fileName, file.ContentType, ct);
            }
        }
        catch (Exception ex)
        {
            foreach (var path in savedPaths)
            {
                try
                {
                    System.IO.File.Delete(path);
                }
                catch (Exception deleteEx)
                {
                    _logger.LogWarning(deleteEx, "Failed to delete orphaned upload file {Path}.", path);
                }
            }

            _logger.LogWarning(ex, "Image upload failed; cleaned up {Count} files.", savedPaths.Count);
            return BadRequest("An error occurred while uploading the image.");
        }

        return Ok(new UploadImagesResponse(urls));
    }

    private async Task TryUploadToFirebaseAsync(
        string localPath,
        string fileName,
        string? contentType,
        CancellationToken ct)
    {
        var bucket = _config["Firebase:StorageBucket"];
        if (string.IsNullOrWhiteSpace(bucket))
            return;

        using var client = TryCreateStorageClient();
        if (client == null)
        {
            _logger.LogWarning("Firebase storage bucket configured but credentials are missing.");
            return;
        }

        try
        {
            await using var stream = System.IO.File.OpenRead(localPath);
            var objectName = $"listings/{fileName}";
            await client.UploadObjectAsync(
                bucket,
                objectName,
                string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
                stream,
                cancellationToken: ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Firebase storage upload failed for {FileName}.", fileName);
        }
    }

    private StorageClient? TryCreateStorageClient()
    {
        var credentialsPath = _config["Firebase:CredentialsPath"];
        if (string.IsNullOrWhiteSpace(credentialsPath))
        {
            try
            {
                return StorageClient.Create();
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Firebase storage client creation failed using default credentials.");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Firebase storage client creation failed.");
                return null;
            }
        }

        var fullPath = Path.IsPathRooted(credentialsPath)
            ? credentialsPath
            : Path.Combine(_env.ContentRootPath, credentialsPath);

        if (!System.IO.File.Exists(fullPath))
            return null;

        var credential = GoogleCredential.FromFile(fullPath);
        try
        {
            return StorageClient.Create(credential);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Firebase storage client creation failed for credentials at {Path}.", fullPath);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Firebase storage client creation failed for credentials at {Path}.", fullPath);
            return null;
        }
    }
}

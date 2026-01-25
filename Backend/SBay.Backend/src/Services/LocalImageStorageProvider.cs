namespace SBay.Backend.Services;

public sealed class LocalImageStorageProvider : IImageStorageProvider
{
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;

    public LocalImageStorageProvider(IWebHostEnvironment env, IConfiguration config)
    {
        _env = env;
        _config = config;
    }

    public async Task<string> UploadAsync(
        Stream stream,
        string fileName,
        string contentType,
        CancellationToken ct)
    {
        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var uploadsRoot = Path.Combine(webRoot, "uploads");
        Directory.CreateDirectory(uploadsRoot);

        var localPath = Path.Combine(uploadsRoot, fileName);
        await using (var fileStream = System.IO.File.Create(localPath))
        {
            await stream.CopyToAsync(fileStream, ct);
        }

        var baseUrl = _config["Storage:Local:PublicBaseUrl"]
                      ?? _config["App:PublicBaseUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return $"/uploads/{fileName}";
        }

        return $"{baseUrl.TrimEnd('/')}/uploads/{fileName}";
    }
}

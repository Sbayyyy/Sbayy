namespace SBay.Backend.Utils;

public static class StoredImageUrlValidator
{
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp", ".gif" };

    public static bool IsAllowed(string? value, IConfiguration configuration)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var url = value.Trim();
        if (url.Length > 2048) return false;

        if (url.StartsWith("/uploads/", StringComparison.Ordinal))
            return IsSafePath(url);

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)) return false;
        if (!HasAllowedExtension(uri.AbsolutePath)) return false;

        var allowedBases = new[]
            {
                configuration["Storage:S3:PublicBaseUrl"],
                configuration["Storage:Local:PublicBaseUrl"],
                configuration["App:PublicBaseUrl"]
            }
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Select(v => v!.TrimEnd('/'))
            .ToArray();

        return allowedBases.Length == 0 || allowedBases.Any(b => url.StartsWith(b + "/", StringComparison.OrdinalIgnoreCase));
    }

    private static bool IsSafePath(string value)
    {
        if (value.Contains("..", StringComparison.Ordinal)) return false;
        if (value.Contains('\\')) return false;
        return HasAllowedExtension(value);
    }

    private static bool HasAllowedExtension(string value)
    {
        var ext = Path.GetExtension(value);
        return AllowedExtensions.Contains(ext, StringComparer.OrdinalIgnoreCase);
    }
}

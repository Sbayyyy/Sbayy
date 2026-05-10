using Microsoft.EntityFrameworkCore;
using SBay.Domain.Database;

namespace SBay.Backend.Services;

public sealed class ImageCleanupService
{
    private readonly EfDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<ImageCleanupService> _logger;

    public ImageCleanupService(
        EfDbContext db,
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<ImageCleanupService> logger)
    {
        _db = db;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public async Task<ImageCleanupResult> CleanupAsync(bool dryRun, int graceHours, CancellationToken ct)
    {
        var root = ResolveUploadsRoot();
        var grace = TimeSpan.FromHours(Math.Clamp(graceHours, 24, 168));
        Directory.CreateDirectory(root);

        var referenced = await LoadReferencedRelativePathsAsync(ct);
        var files = EnumerateFiles(root).ToList();
        var now = DateTimeOffset.UtcNow;
        var candidates = new List<ImageCleanupCandidate>();
        long referencedCount = 0;

        foreach (var file in files)
        {
            ct.ThrowIfCancellationRequested();
            var relative = NormalizeRelativePath(Path.GetRelativePath(root, file.FullName));
            if (relative == null)
                continue;

            if (referenced.Contains(relative))
            {
                referencedCount++;
                continue;
            }

            var age = now - file.LastWriteTimeUtc;
            if (age < grace)
                continue;

            var candidate = new ImageCleanupCandidate(relative, file.Length, file.LastWriteTimeUtc);
            candidates.Add(candidate);
            _logger.LogInformation("Unused upload cleanup candidate dryRun={DryRun} path={Path} bytes={Bytes}", dryRun, relative, file.Length);
        }

        var deleted = new List<ImageCleanupCandidate>();
        if (!dryRun)
        {
            foreach (var candidate in candidates)
            {
                var fullPath = GetSafeFullPath(root, candidate.Path);
                if (fullPath == null || !File.Exists(fullPath))
                    continue;

                File.Delete(fullPath);
                deleted.Add(candidate);
                _logger.LogInformation("Deleted unused upload path={Path} bytes={Bytes}", candidate.Path, candidate.Bytes);
            }
        }

        var affected = dryRun ? candidates : deleted;
        return new ImageCleanupResult(
            DryRun: dryRun,
            UploadsRoot: root,
            GraceHours: (int)grace.TotalHours,
            TotalFiles: files.Count,
            ReferencedFiles: referencedCount,
            UnreferencedCandidateFiles: candidates.Count,
            DeletedFiles: deleted.Count,
            EstimatedFreedBytes: candidates.Sum(c => c.Bytes),
            FreedBytes: deleted.Sum(c => c.Bytes),
            Candidates: affected);
    }

    private async Task<HashSet<string>> LoadReferencedRelativePathsAsync(CancellationToken ct)
    {
        var values = new List<string?>();
        values.AddRange(await _db.Listings.AsNoTracking().Select(l => l.ThumbnailUrl).ToListAsync(ct));
        values.AddRange(await _db.Set<SBay.Domain.Entities.ListingImage>().AsNoTracking().Select(i => i.Url).ToListAsync(ct));
        values.AddRange(await _db.Users.AsNoTracking().Select(u => u.AvatarUrl).ToListAsync(ct));
        values.AddRange(await _db.SponsoredAds.AsNoTracking().Select(a => a.ImageUrl).ToListAsync(ct));

        var reportEvidence = await _db.Reports.AsNoTracking()
            .Where(r => r.EvidenceUrls != null)
            .Select(r => r.EvidenceUrls)
            .ToListAsync(ct);
        foreach (var urls in reportEvidence)
            values.AddRange(urls ?? Array.Empty<string>());

        var referenced = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var value in values)
        {
            var normalized = NormalizeUploadReference(value);
            if (normalized != null)
                referenced.Add(normalized);
        }

        return referenced;
    }

    private string ResolveUploadsRoot()
    {
        var configured = _configuration["Storage:Local:Path"];
        if (!string.IsNullOrWhiteSpace(configured))
            return Path.GetFullPath(configured);

        var webRoot = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
        return Path.GetFullPath(Path.Combine(webRoot, "uploads"));
    }

    private IEnumerable<FileInfo> EnumerateFiles(string root)
    {
        var pending = new Stack<DirectoryInfo>();
        pending.Push(new DirectoryInfo(root));

        while (pending.Count > 0)
        {
            var current = pending.Pop();
            if ((current.Attributes & FileAttributes.ReparsePoint) != 0)
                continue;

            foreach (var directory in current.EnumerateDirectories())
            {
                if (directory.Name.StartsWith(".", StringComparison.Ordinal) ||
                    (directory.Attributes & FileAttributes.ReparsePoint) != 0)
                    continue;
                pending.Push(directory);
            }

            foreach (var file in current.EnumerateFiles())
            {
                if ((file.Attributes & FileAttributes.ReparsePoint) != 0)
                    continue;
                yield return file;
            }
        }
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

public sealed record ImageCleanupResult(
    bool DryRun,
    string UploadsRoot,
    int GraceHours,
    int TotalFiles,
    long ReferencedFiles,
    int UnreferencedCandidateFiles,
    int DeletedFiles,
    long EstimatedFreedBytes,
    long FreedBytes,
    IReadOnlyList<ImageCleanupCandidate> Candidates);

public sealed record ImageCleanupCandidate(string Path, long Bytes, DateTimeOffset LastModifiedUtc);

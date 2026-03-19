using Amazon.S3;
using Amazon.S3.Model;

namespace SBay.Backend.Services;

public sealed class S3ImageStorageProvider : IImageStorageProvider
{
    private readonly IAmazonS3 _s3;
    private readonly IConfiguration _config;
    private readonly ILogger<S3ImageStorageProvider> _logger;
    private bool _logged;

    public S3ImageStorageProvider(IAmazonS3 s3, IConfiguration config, ILogger<S3ImageStorageProvider> logger)
    {
        _s3 = s3;
        _config = config;
        _logger = logger;
    }

    public async Task<string> UploadAsync(
        Stream stream,
        string fileName,
        string contentType,
        CancellationToken ct)
    {
        if (!_logged)
        {
            _logged = true;
            var accessKey = _config["Storage:S3:AccessKey"] ?? string.Empty;
            var endpoint = _config["Storage:S3:Endpoint"] ?? string.Empty;
            var accessKeyMask = accessKey.Length <= 4 ? accessKey : $"{accessKey[..4]}****";
            var endpointMask = endpoint.Length <= 32 ? endpoint : $"{endpoint[..32]}...";
            _logger.LogInformation(
                "S3 config in UploadAsync. AccessKeyPrefix={AccessKeyPrefix}, Endpoint={Endpoint}",
                accessKeyMask,
                endpointMask);
        }

        var bucket = _config["Storage:S3:Bucket"];
        if (string.IsNullOrWhiteSpace(bucket))
            throw new InvalidOperationException("Storage:S3:Bucket is not configured.");

        var prefix = _config["Storage:S3:Prefix"];
        var key = string.IsNullOrWhiteSpace(prefix)
            ? fileName
            : $"{prefix.TrimEnd('/')}/{fileName}";

        var request = new PutObjectRequest
        {
            BucketName = bucket,
            Key = key,
            InputStream = stream,
            ContentType = contentType
        };

        await _s3.PutObjectAsync(request, ct);

        var publicBase = _config["Storage:S3:PublicBaseUrl"];
        if (string.IsNullOrWhiteSpace(publicBase))
            throw new InvalidOperationException("Storage:S3:PublicBaseUrl is not configured.");

        return $"{publicBase.TrimEnd('/')}/{bucket}/{key}";
    }
}

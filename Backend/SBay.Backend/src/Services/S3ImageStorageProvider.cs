using Amazon.S3;
using Amazon.S3.Model;

namespace SBay.Backend.Services;

public sealed class S3ImageStorageProvider : IImageStorageProvider
{
    private readonly IAmazonS3 _s3;
    private readonly IConfiguration _config;

    public S3ImageStorageProvider(IAmazonS3 s3, IConfiguration config)
    {
        _s3 = s3;
        _config = config;
    }

    public async Task<string> UploadAsync(
        Stream stream,
        string fileName,
        string contentType,
        CancellationToken ct)
    {
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

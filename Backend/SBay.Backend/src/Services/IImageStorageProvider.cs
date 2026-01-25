namespace SBay.Backend.Services;

public interface IImageStorageProvider
{
    Task<string> UploadAsync(
        Stream stream,
        string fileName,
        string contentType,
        CancellationToken ct);
}

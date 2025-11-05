namespace SBay.Backend.APIs.Records.Responses;

public sealed record ListingImageDto
{
    public required string Url { get; init; }
    public int Position { get; init; }
    public string? MimeType { get; init; }
    public int? Width { get; init; }
    public int? Height { get; init; }
}
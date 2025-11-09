namespace SBay.Backend.APIs.Records;

public sealed record PointDto(DateTime Bucket, int ItemsSold, decimal Revenue, int Orders);
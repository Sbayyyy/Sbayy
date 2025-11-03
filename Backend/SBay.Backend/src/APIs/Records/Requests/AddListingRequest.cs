namespace SBay.Backend.APIs.Records;

public record AddListingRequest(
 string? CategoryPath,
 string? Region,
 List<string>? ImageUrls,
 decimal PriceAmount,
 string Title = null!,
 string Description  = null!,
 string PriceCurrency = "SYP",
 int Stock = 1,
 ItemCondition Condition = ItemCondition.New
);
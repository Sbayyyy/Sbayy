using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace SBay.Backend.APIs.Records;

public sealed record CreateOrderItemReq(
    [param: Required]
    Guid ListingId,

    [param: Range(1, int.MaxValue, ErrorMessage = "Quantity must be greater than 0.")]
    int Quantity,

    decimal PriceAmount,

    [param: Required]
    [param: StringLength(3, MinimumLength = 3, ErrorMessage = "PriceCurrency must be a 3-letter code.")]
    [param: RegularExpression("^[A-Z]{3}$", ErrorMessage = "PriceCurrency must be an uppercase 3-letter ISO code.")]
    string PriceCurrency,

    [param: Range(0, double.MaxValue, ErrorMessage = "WeightKg must be >= 0.")]
    decimal? WeightKg = null
) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ListingId == Guid.Empty)
            yield return new ValidationResult("ListingId is required.", new[] { nameof(ListingId) });
        if (PriceAmount < 0)
            yield return new ValidationResult("PriceAmount cannot be negative.", new[] { nameof(PriceAmount) });
        if (WeightKg.HasValue && WeightKg.Value < 0)
            yield return new ValidationResult("WeightKg must be >= 0.", new[] { nameof(WeightKg) });
    }
}

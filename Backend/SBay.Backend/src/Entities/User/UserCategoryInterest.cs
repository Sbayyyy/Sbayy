using Microsoft.EntityFrameworkCore;

namespace SBay.Domain.Entities;

[PrimaryKey(nameof(UserId), nameof(Category))]
public sealed class UserCategoryInterest
{
    public Guid UserId { get; set; }
    public string Category { get; set; } = string.Empty;
    public double Score { get; set; }
    public DateTimeOffset LastInteractionAt { get; set; } = DateTimeOffset.UtcNow;
}

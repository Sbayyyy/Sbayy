using System.ComponentModel.DataAnnotations;

namespace SBay.Domain.Entities;

public sealed class Review
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SellerId { get; set; }
    public Guid ReviewerId { get; set; }
    public Guid? ListingId { get; set; }
    public Guid? OrderId { get; set; }
    [Range(1, 5)]
    public int Rating { get; set; }
    [MaxLength(2000)]
    public string Comment { get; set; } = string.Empty;
    public int HelpfulCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

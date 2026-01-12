using System.ComponentModel.DataAnnotations;

namespace SBay.Domain.Entities;

/// <summary>
/// Shipping address for orders
/// Matches Frontend: Address interface (name, phone, street, city, region)
/// </summary>
public sealed class Address
{
    [Key]
    public Guid Id { get; set; }
    
    /// <summary>
    /// User who owns this address
    /// </summary>
    public Guid UserId { get; set; }
    
    /// <summary>
    /// Full name for shipping (Frontend: Address.name)
    /// </summary>
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Phone number (Syrian format: 09xx... or +963...) (Frontend: Address.phone)
    /// </summary>
    [Required, MaxLength(20)]
    public string Phone { get; set; } = string.Empty;
    
    /// <summary>
    /// Street address with details (Frontend: Address.street)
    /// </summary>
    [Required, MaxLength(200)]
    public string Street { get; set; } = string.Empty;
    
    /// <summary>
    /// Syrian city/governorate (Frontend: Address.city)
    /// </summary>
    [Required, MaxLength(100)]
    public string City { get; set; } = string.Empty;
    
    /// <summary>
    /// Optional: District/neighborhood (Frontend: Address.region)
    /// </summary>
    [MaxLength(100)]
    public string? Region { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation property
    public User User { get; set; } = null!;
}

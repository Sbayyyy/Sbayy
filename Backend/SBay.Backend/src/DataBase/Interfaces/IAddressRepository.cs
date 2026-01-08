using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Interfaces;

/// <summary>
/// Repository interface for Address entity (Repository Pattern)
/// </summary>
public interface IAddressRepository
{
    /// <summary>
    /// Get address by ID
    /// </summary>
    Task<Address?> GetByIdAsync(Guid id, CancellationToken ct = default);
    
    /// <summary>
    /// Get all addresses for a user
    /// </summary>
    Task<List<Address>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    
    /// <summary>
    /// Check if address exists
    /// </summary>
    Task<bool> ExistsAsync(Guid id, CancellationToken ct = default);
    
    /// <summary>
    /// Add new address
    /// </summary>
    Task AddAsync(Address address, CancellationToken ct = default);
    
    /// <summary>
    /// Update existing address
    /// </summary>
    Task UpdateAsync(Address address, CancellationToken ct = default);
    
    /// <summary>
    /// Delete address
    /// </summary>
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

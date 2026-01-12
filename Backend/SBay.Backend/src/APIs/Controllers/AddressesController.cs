using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Backend.APIs.Records;
using SBay.Backend.DataBase.Interfaces;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

/// <summary>
/// REST API for Address management (CRUD)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AddressesController : ControllerBase
{
    private readonly IAddressRepository _addresses;
    private readonly ICurrentUserResolver _resolver;
    private readonly IUnitOfWork _uow;
    
    public AddressesController(
        IAddressRepository addresses,
        ICurrentUserResolver resolver,
        IUnitOfWork uow)
    {
        _addresses = addresses;
        _resolver = resolver;
        _uow = uow;
    }
    
    /// <summary>
    /// GET /api/addresses - Get all saved addresses for current user
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<AddressDto>>> GetMyAddresses(CancellationToken ct)
    {
        var userId = await _resolver.GetUserIdAsync(User, ct);
        if (!userId.HasValue) return Unauthorized();
        
        var addresses = await _addresses.GetByUserIdAsync(userId.Value, ct);
        return Ok(addresses.Select(ToDto).ToList());
    }
    
    /// <summary>
    /// GET /api/addresses/{id} - Get address by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AddressDto>> GetById(Guid id, CancellationToken ct)
    {
        var userId = await _resolver.GetUserIdAsync(User, ct);
        if (!userId.HasValue) return Unauthorized();
        
        var address = await _addresses.GetByIdAsync(id, ct);
        if (address == null) return NotFound();
        if (address.UserId != userId.Value) return Forbid();
        
        return Ok(ToDto(address));
    }
    
    /// <summary>
    /// POST /api/addresses - Create new address
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<AddressDto>> Create(
        [FromBody] SaveAddressRequest req, 
        CancellationToken ct)
    {
        var userId = await _resolver.GetUserIdAsync(User, ct);
        if (!userId.HasValue) return Unauthorized();
        
        // Validation
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest("Name is required");
        if (string.IsNullOrWhiteSpace(req.Phone))
            return BadRequest("Phone is required");
        if (string.IsNullOrWhiteSpace(req.Street))
            return BadRequest("Street is required");
        if (string.IsNullOrWhiteSpace(req.City))
            return BadRequest("City is required");
        
        var address = new Address
        {
            UserId = userId.Value,
            Name = req.Name.Trim(),
            Phone = req.Phone.Trim(),
            Street = req.Street.Trim(),
            City = req.City.Trim(),
            Region = req.Region?.Trim()
        };
        
        await _addresses.AddAsync(address, ct);
        await _uow.SaveChangesAsync(ct);
        
        return CreatedAtAction(
            nameof(GetById), 
            new { id = address.Id }, 
            ToDto(address)
        );
    }
    
    /// <summary>
    /// PUT /api/addresses/{id} - Update existing address
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AddressDto>> Update(
        Guid id, 
        [FromBody] SaveAddressRequest req, 
        CancellationToken ct)
    {
        var userId = await _resolver.GetUserIdAsync(User, ct);
        if (!userId.HasValue) return Unauthorized();
        
        var address = await _addresses.GetByIdAsync(id, ct);
        if (address == null) return NotFound();
        if (address.UserId != userId.Value) return Forbid();
        
        // Validation
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest("Name is required");
        if (string.IsNullOrWhiteSpace(req.Phone))
            return BadRequest("Phone is required");
        if (string.IsNullOrWhiteSpace(req.Street))
            return BadRequest("Street is required");
        if (string.IsNullOrWhiteSpace(req.City))
            return BadRequest("City is required");
        
        // Update fields
        address.Name = req.Name.Trim();
        address.Phone = req.Phone.Trim();
        address.Street = req.Street.Trim();
        address.City = req.City.Trim();
        address.Region = req.Region?.Trim();
        
        await _addresses.UpdateAsync(address, ct);
        await _uow.SaveChangesAsync(ct);
        
        return Ok(ToDto(address));
    }
    
    /// <summary>
    /// DELETE /api/addresses/{id} - Delete address
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = await _resolver.GetUserIdAsync(User, ct);
        if (!userId.HasValue) return Unauthorized();
        
        var address = await _addresses.GetByIdAsync(id, ct);
        if (address == null) return NotFound();
        if (address.UserId != userId.Value) return Forbid();
        
        await _addresses.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        
        return NoContent();
    }
    
    // Helper: Entity → DTO
    private static AddressDto ToDto(Address a) => new(
        a.Id,
        a.Name,
        a.Phone,
        a.Street,
        a.City,
        a.Region,
        a.CreatedAt
    );
}

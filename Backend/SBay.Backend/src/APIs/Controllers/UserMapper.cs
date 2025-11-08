using SBay.Backend.APIs.Records;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

public static class UserMapper
{
    public static UserDto ToDto(this User u) => 
        new(u.Id, u.Email, u.DisplayName, u.Phone, u.Role,u.IsSeller, u.CreatedAt,u.LastSeen);
}
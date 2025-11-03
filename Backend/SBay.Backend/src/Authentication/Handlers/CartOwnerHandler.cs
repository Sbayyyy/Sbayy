using Microsoft.AspNetCore.Authorization;
using SBay.Domain.Authentication.Requirements;

namespace SBay.Domain.Authentication.Handlers;

public class CartOwnerHandler:AuthorizationHandler<CartOwnerRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, CartOwnerRequirement requirement)
    {
        throw new NotImplementedException();
    }
}
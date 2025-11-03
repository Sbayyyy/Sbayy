using Microsoft.AspNetCore.Authorization;
using SBay.Domain.Authentication.Requirements;

namespace SBay.Domain.Authentication.Handlers;

public class OrderPartyHandler:AuthorizationHandler<OrderPartyRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, OrderPartyRequirement requirement)
    {
        throw new NotImplementedException();
    }
}
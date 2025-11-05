using Microsoft.AspNetCore.Authorization;
using SBay.Domain.Authentication.Requirements;

namespace SBay.Domain.Authentication.Handlers;

public class IsMessageReceiverHandler:AuthorizationHandler<IsMessageReceiverRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, IsMessageReceiverRequirement requirement)
    {
        throw new NotImplementedException();
    }
}
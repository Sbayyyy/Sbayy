using Microsoft.AspNetCore.Authorization;
using SBay.Domain.Authentication.Requirements;

namespace SBay.Domain.Authentication.Handlers;

public class NotSelfMessageHandler:AuthorizationHandler<NotSelfMessageRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, NotSelfMessageRequirement requirement)
    {
        throw new NotImplementedException();
    }
}
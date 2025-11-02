using Microsoft.AspNetCore.Authorization;
using SBay.Domain.Authentication.Requirements;

namespace SBay.Domain.Authentication.Handlers;

public class MessageOwnerHandler:AuthorizationHandler<MessageOwnerRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, MessageOwnerRequirement requirement)
    {
        throw new NotImplementedException();
    }
}
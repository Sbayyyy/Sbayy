using Microsoft.AspNetCore.Authorization;
using SBay.Domain.Authentication.Requirements;

namespace SBay.Domain.Authentication.Handlers;

public class ListingActiveHandler:AuthorizationHandler<ListingActiveRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, ListingActiveRequirement requirement)
    {
        throw new NotImplementedException();
    }
}
using Microsoft.AspNetCore.Authorization;
using SBay.Domain.Authentication.Requirements;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Domain.Authentication.Handlers;

public sealed class CanStartChatHandler:AuthorizationHandler<CanStartChatRequirement>
{
    private readonly IListingRepository _listings;
    private readonly ICurrentUserResolver _who;
    private readonly IHttpContextAccessor _http;
    public CanStartChatHandler(IListingRepository listings, ICurrentUserResolver who, IHttpContextAccessor http)
    { _listings = listings; _who = who; _http = http; }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, CanStartChatRequirement requirement)
    {
        var http = _http.HttpContext;
        if (http is null) return;

        var ct = http.RequestAborted;

        
        var listingId = http.RouteGuid("listingId");
        if (listingId is null) return;

        var me = await http.GetCurrentUserIdAsync(_who, ct);
        if (me is null) return;

        var listing = await _listings.GetByIdAsync(listingId.Value, ct);
        if (listing is null) return;
        if (listing.SellerId == me.Value) return; 

        context.Succeed(requirement);
    }
}

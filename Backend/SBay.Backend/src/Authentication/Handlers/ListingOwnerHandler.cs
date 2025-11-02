using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using SBay.Domain.Authentication.Requirements;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Domain.Authentication.Handlers;

public sealed class ListingOwnerHandler
    : AuthorizationHandler<ListingOwnerRequirement>
{
    private readonly EfDbContext _db;
    private readonly ICurrentUserResolver _who;
    private readonly IHttpContextAccessor _http;

    public ListingOwnerHandler(EfDbContext db, ICurrentUserResolver who, IHttpContextAccessor http)
    { _db = db; _who = who; _http = http; }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, ListingOwnerRequirement requirement)
    {
        var http = _http.HttpContext;
        if (http is null) return;

        var ct = http.RequestAborted;
        var me = await http.GetCurrentUserIdAsync(_who, ct);
        if (me is null) return;

        var listingId = http.RouteGuid("listingId");
        if (listingId is null) return;

        var sellerId = await _db.Listings.AsNoTracking()
            .Where(x => x.Id == listingId.Value)
            .Select(x => x.SellerId)
            .FirstOrDefaultAsync(ct);

        if (sellerId != Guid.Empty && sellerId == me.Value)
            context.Succeed(requirement);
    }
}
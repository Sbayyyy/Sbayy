using Microsoft.AspNetCore.Authorization;
using SBay.Domain.Authentication.Requirements;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using System.Text;
using System.Text.Json;

namespace SBay.Domain.Authentication.Handlers;


public sealed class CanStartChatHandler
    : AuthorizationHandler<CanStartChatRequirement>
{
    private readonly IListingRepository _listings;
    private readonly ICurrentUserResolver _who;
    private readonly IHttpContextAccessor _http;

    public CanStartChatHandler(
        IListingRepository listings,
        ICurrentUserResolver who,
        IHttpContextAccessor http)
    {
        _listings = listings;
        _who = who;
        _http = http;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        CanStartChatRequirement requirement)
    {
        var http = _http.HttpContext;
        if (http is null)
            return;

        var ct = http.RequestAborted;

        var me = await http.GetCurrentUserIdAsync(_who, ct);
        if (me is null)
            return;

        Guid? listingId = null;


        if (http.Request.ContentLength > 0 &&
            http.Request.Body.CanRead)
        {
            http.Request.EnableBuffering();

            using var reader = new StreamReader(
                http.Request.Body,
                Encoding.UTF8,
                detectEncodingFromByteOrderMarks: false,
                leaveOpen: true);

            var body = await reader.ReadToEndAsync(ct);
            http.Request.Body.Position = 0;

            if (!string.IsNullOrWhiteSpace(body))
            {
                using var doc = JsonDocument.Parse(body);
                if (doc.RootElement.TryGetProperty("listingId", out var prop) &&
                    prop.ValueKind == JsonValueKind.String &&
                    Guid.TryParse(prop.GetString(), out var parsed))
                {
                    listingId = parsed;
                }
            }
        }

        if (listingId is null)
            return;


        var listing = await _listings.GetByIdAsync(listingId.Value, ct);
        if (listing is null)
            return;


        if (listing.SellerId == me.Value)
            return;

        context.Succeed(requirement);
    }
}


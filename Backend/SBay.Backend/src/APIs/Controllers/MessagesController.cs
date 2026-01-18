using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Backend.APIs.Records;
using SBay.Backend.APIs.Records.Responses;
using SBay.Backend.Messaging;
using SBay.Domain.Authentication;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/messages")]
[Authorize]
public sealed class MessagesController : ControllerBase
{
    private readonly IChatService _svc;

    public MessagesController(IChatService svc)
    {
        _svc = svc;
    }

    [HttpGet("unread-count")]
    [Authorize(Policy = ScopePolicies.MessagesRead)]
    public async Task<ActionResult<UnreadCountResponse>> GetUnreadCount(CancellationToken ct)
    {
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var total = await _svc.GetUnreadCountAsync(me, ct);
        return Ok(new UnreadCountResponse(total));
    }

    [HttpPatch("{messageId:guid}")]
    [Authorize(Policy = ScopePolicies.MessagesWrite)]
    public async Task<ActionResult<Message>> UpdateMessage(Guid messageId, [FromBody] UpdateMessageRequest req, CancellationToken ct)
    {
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var message = await _svc.UpdateMessageAsync(messageId, me, req.Content, ct);
        return Ok(message);
    }

    [HttpDelete("{messageId:guid}")]
    [Authorize(Policy = ScopePolicies.MessagesWrite)]
    public async Task<ActionResult> DeleteMessage(Guid messageId, CancellationToken ct)
    {
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _svc.DeleteMessageAsync(messageId, me, ct);
        return NoContent();
    }
}

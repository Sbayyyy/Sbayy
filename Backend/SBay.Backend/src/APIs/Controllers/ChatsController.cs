using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Backend.APIs.Records;
using SBay.Backend.APIs.Records.Responses;
using SBay.Backend.Messaging;
using SBay.Domain.Authentication;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatsController : ControllerBase
{
    private readonly IChatService _svc;

    public ChatsController(IChatService svc)
    {
        _svc = svc;
    }
    [HttpPost("open")]
    [Authorize(Policy = "CanStartChat")]
    [Authorize(Policy = ScopePolicies.MessagesWrite)]
    public async Task<ActionResult<OpenChatResponse>> Open([FromBody] OpenChatRequest req, CancellationToken ct)
    {
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var chat = await _svc.OpenOrGetAsync(me, req.OtherUserId, req.ListingId, ct);
        return Ok(new OpenChatResponse(chat.Id));
    }

    [HttpGet]
    [Authorize(Policy = ScopePolicies.MessagesRead)]
    public async Task<ActionResult<IReadOnlyList<Chat>>> Inbox([FromQuery] int take = 20, [FromQuery] int skip = 0, CancellationToken ct = default)
    {
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var items = await _svc.GetInboxAsync(me, take, skip, ct);
        return Ok(items);
    }

    [Authorize(Policy = "CanReadThread")]
    [Authorize(Policy = ScopePolicies.MessagesRead)]
    [HttpGet("{chatId:guid}/messages")]
    public async Task<ActionResult<IReadOnlyList<Message>>> History(Guid chatId, [FromQuery] DateTime? before, [FromQuery] int take = 50, CancellationToken ct = default)
    {
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        _ = me;
        var items = await _svc.GetMessagesAsync(chatId, take, before, ct);
        return Ok(items);
    }

    [HttpPost("{chatId:guid}/messages")]
    [Authorize(Policy = ScopePolicies.MessagesWrite)]
    public async Task<ActionResult<Message>> Send(Guid chatId, [FromBody] SendMessageRequest req, CancellationToken ct)
    {
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var dto = await _svc.SendAsync(chatId, me, req.Content, ct);
        return Ok(dto);
    }

    [HttpPost("{chatId:guid}/read")]
    [Authorize(Policy = ScopePolicies.MessagesWrite)]
    public async Task<ActionResult<int>> Read(Guid chatId, [FromQuery] Guid? upToMessageId, CancellationToken ct)
    {
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var boundary = upToMessageId.HasValue
            ? await _svc.GetMessagesAsync(chatId, 1, null, ct).ContinueWith(t => t.Result.FirstOrDefault(m => m.Id == upToMessageId.Value)?.CreatedAt, ct)
            : DateTime.UtcNow;
        var n = await _svc.MarkReadAsync(chatId, me, boundary ?? DateTime.UtcNow, ct);
        return Ok(n);
    }

}


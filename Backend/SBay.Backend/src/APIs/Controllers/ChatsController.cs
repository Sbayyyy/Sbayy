using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SBay.Backend.APIs.Records;
using SBay.Backend.APIs.Records.Responses;
using SBay.Backend.Messaging;
using SBay.Backend.Utils;
using SBay.Domain.Authentication;
using SBay.Domain.Database;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatsController : ControllerBase
{
    private readonly IChatService _svc;
    private readonly IMessageRepository _messages;

    public ChatsController(IChatService svc, IMessageRepository messages)
    {
        _svc = svc;
        _messages = messages;
    }

    [HttpPost("open")]
    [Authorize(Policy = "CanStartChat")]
    [Authorize(Policy = ScopePolicies.MessagesWrite)]
    [EnableRateLimiting("chat")]
    public async Task<ActionResult<OpenChatResponse>> Open([FromBody] OpenChatRequest req, CancellationToken ct)
    {
        if (req == null || req.OtherUserId == Guid.Empty)
            return BadRequest(ApiProblemDetails.Validation("OtherUserId is required.", nameof(req.OtherUserId)));
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var chat = await _svc.OpenOrGetAsync(me, req.OtherUserId, req.ListingId, ct);
        return Ok(new OpenChatResponse(chat.Id));
    }

    [HttpGet]
    [Authorize(Policy = ScopePolicies.MessagesRead)]
    public async Task<ActionResult<IReadOnlyList<ChatDto>>> Inbox([FromQuery] int take = 20, [FromQuery] int skip = 0, CancellationToken ct = default)
    {
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var items = await _svc.GetInboxAsync(me, take, skip, ct);
        return Ok(items.Select(ToDto).ToList());
    }

    [HttpGet("summary")]
    [Authorize(Policy = ScopePolicies.MessagesRead)]
    public async Task<ActionResult<IReadOnlyList<ChatSummaryDto>>> InboxSummary([FromQuery] int take = 20, [FromQuery] int skip = 0, CancellationToken ct = default)
    {
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var items = await _svc.GetInboxSummaryAsync(me, take, skip, ct);
        return Ok(items);
    }

    [Authorize(Policy = "CanReadThread")]
    [Authorize(Policy = ScopePolicies.MessagesRead)]
    [HttpGet("{chatId:guid}/messages")]
    public async Task<ActionResult<IReadOnlyList<MessageDto>>> History(Guid chatId, [FromQuery] DateTime? before, [FromQuery] int take = 50, CancellationToken ct = default)
    {
        var items = await _svc.GetMessagesAsync(chatId, take, before, ct);
        return Ok(items.Select(ToMessageDto).ToList());
    }

    [HttpPost("{chatId:guid}/messages")]
    [Authorize(Policy = ScopePolicies.MessagesWrite)]
    [EnableRateLimiting("chat")]
    public async Task<ActionResult<MessageDto>> Send(Guid chatId, [FromBody] SendMessageRequest req, CancellationToken ct)
    {
        if (req == null || string.IsNullOrWhiteSpace(req.Content))
            return BadRequest(ApiProblemDetails.Validation("Content is required.", nameof(req.Content)));
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var dto = await _svc.SendAsync(chatId, me, req.Content, ct);
        return Ok(ToMessageDto(dto));
    }

    [HttpPost("{chatId:guid}/offers")]
    [Authorize(Policy = ScopePolicies.MessagesWrite)]
    [EnableRateLimiting("chat")]
    public async Task<ActionResult<MessageDto>> SendOffer(Guid chatId, [FromBody] CreateOfferRequest req, CancellationToken ct)
    {
        if (req == null || req.Amount < 0)
            return BadRequest(ApiProblemDetails.Validation("Offer amount cannot be negative.", nameof(req.Amount)));
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var message = await _svc.SendOfferAsync(chatId, me, req.Amount, req.Currency, ct);
        return Ok(ToMessageDto(message));
    }

    [HttpPost("{chatId:guid}/offers/{messageId:guid}/accept")]
    [Authorize(Policy = ScopePolicies.MessagesWrite)]
    [EnableRateLimiting("chat")]
    public async Task<ActionResult<MessageDto>> AcceptOffer(Guid chatId, Guid messageId, CancellationToken ct)
    {
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var message = await _svc.AcceptOfferAsync(chatId, messageId, me, ct);
        return Ok(ToMessageDto(message));
    }

    [HttpPost("{chatId:guid}/offers/{messageId:guid}/reject")]
    [Authorize(Policy = ScopePolicies.MessagesWrite)]
    [EnableRateLimiting("chat")]
    public async Task<ActionResult<MessageDto>> RejectOffer(Guid chatId, Guid messageId, CancellationToken ct)
    {
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var message = await _svc.RejectOfferAsync(chatId, messageId, me, ct);
        return Ok(ToMessageDto(message));
    }

    [HttpPost("{chatId:guid}/offers/{messageId:guid}/counter")]
    [Authorize(Policy = ScopePolicies.MessagesWrite)]
    [EnableRateLimiting("chat")]
    public async Task<ActionResult<MessageDto>> CounterOffer(Guid chatId, Guid messageId, [FromBody] CounterOfferRequest req, CancellationToken ct)
    {
        if (req == null || req.Amount < 0)
            return BadRequest(ApiProblemDetails.Validation("Offer amount cannot be negative.", nameof(req.Amount)));
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var message = await _svc.CounterOfferAsync(chatId, messageId, me, req.Amount, req.Currency, ct);
        return Ok(ToMessageDto(message));
    }

    [HttpPost("{chatId:guid}/read")]
    [Authorize(Policy = "CanReadThread")]
    [Authorize(Policy = ScopePolicies.MessagesWrite)]
    [EnableRateLimiting("chat")]
    public async Task<ActionResult<int>> Read(Guid chatId, [FromQuery] Guid? upToMessageId, CancellationToken ct)
    {
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var boundary = DateTime.UtcNow;
        if (upToMessageId.HasValue)
        {
            var message = await _messages.GetByIdAsync(upToMessageId.Value, ct);
            if (message is null || message.ChatId != chatId) return NotFound();
            if (message.ReceiverId != me) return Forbid();
            boundary = message.CreatedAt;
        }
        var n = await _svc.MarkReadAsync(chatId, me, boundary, ct);
        return Ok(n);
    }

    [HttpDelete("{chatId:guid}")]
    [Authorize(Policy = "CanReadThread")]
    [Authorize(Policy = ScopePolicies.MessagesWrite)]
    [EnableRateLimiting("chat")]
    public async Task<IActionResult> Archive(Guid chatId, CancellationToken ct)
    {
        var me = Guid.Parse(User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _svc.ArchiveChatAsync(chatId, me, ct);
        return NoContent();
    }

    private static ChatDto ToDto(Chat chat) => new(
        chat.Id,
        chat.BuyerId,
        chat.SellerId,
        chat.ListingId,
        chat.CreatedAt,
        chat.LastMessageAt,
        chat.BuyerArchived,
        chat.SellerArchived
    );

    private static MessageDto ToMessageDto(Message message) => new(
        message.Id,
        message.ChatId,
        message.SenderId,
        message.ReceiverId,
        message.ListingId,
        message.Content,
        message.Type,
        message.DataJson,
        message.CreatedAt,
        message.IsRead
    );
}

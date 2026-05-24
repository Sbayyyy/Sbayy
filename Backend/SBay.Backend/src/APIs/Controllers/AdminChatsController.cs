using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SBay.Backend.Exceptions;
using SBay.Backend.Messaging;
using SBay.Domain.Database;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/admin/chats")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminChatsController : ControllerBase
{
    private readonly EfDbContext _db;

    public AdminChatsController(EfDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminChatDto>>> List(
        [FromQuery] string? q,
        [FromQuery] Guid? userId,
        [FromQuery] Guid? listingId,
        [FromQuery] int take = 50,
        [FromQuery] int skip = 0,
        CancellationToken ct = default)
    {
        if (take <= 0 || take > 200)
            throw new InvalidInputException("Take must be between 1 and 200.");
        if (skip < 0)
            throw new InvalidInputException("Skip must be >= 0.");

        var query = _db.Set<Chat>().AsNoTracking().AsQueryable();

        if (userId.HasValue && userId.Value != Guid.Empty)
            query = query.Where(c => c.BuyerId == userId.Value || c.SellerId == userId.Value);

        if (listingId.HasValue && listingId.Value != Guid.Empty)
            query = query.Where(c => c.ListingId == listingId.Value);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var text = q.Trim().ToLowerInvariant();
            query = query.Where(c =>
                _db.Users.Any(u => u.Id == c.BuyerId && u.Email.ToLower().Contains(text)) ||
                _db.Users.Any(u => u.Id == c.SellerId && u.Email.ToLower().Contains(text)));
        }

        var items = await query
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(c => new AdminChatDto(
                c.Id,
                c.BuyerId,
                _db.Users.Where(u => u.Id == c.BuyerId).Select(u => u.Email).FirstOrDefault(),
                c.SellerId,
                _db.Users.Where(u => u.Id == c.SellerId).Select(u => u.Email).FirstOrDefault(),
                c.ListingId,
                _db.Listings.Where(l => l.Id == c.ListingId).Select(l => l.Title).FirstOrDefault(),
                _db.Messages.Count(m => m.ChatId == c.Id),
                c.CreatedAt,
                c.LastMessageAt))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("{chatId:guid}")]
    public async Task<ActionResult<AdminChatDto>> Get(Guid chatId, CancellationToken ct)
    {
        var item = await _db.Set<Chat>()
            .AsNoTracking()
            .Where(c => c.Id == chatId)
            .Select(c => new AdminChatDto(
                c.Id,
                c.BuyerId,
                _db.Users.Where(u => u.Id == c.BuyerId).Select(u => u.Email).FirstOrDefault(),
                c.SellerId,
                _db.Users.Where(u => u.Id == c.SellerId).Select(u => u.Email).FirstOrDefault(),
                c.ListingId,
                _db.Listings.Where(l => l.Id == c.ListingId).Select(l => l.Title).FirstOrDefault(),
                _db.Messages.Count(m => m.ChatId == c.Id),
                c.CreatedAt,
                c.LastMessageAt))
            .FirstOrDefaultAsync(ct);

        if (item is null)
            throw new NotFoundException("Chat not found.");

        return Ok(item);
    }

    [HttpGet("{chatId:guid}/messages")]
    public async Task<ActionResult<IReadOnlyList<AdminChatMessageDto>>> Messages(
        Guid chatId,
        [FromQuery] int take = 200,
        CancellationToken ct = default)
    {
        if (take <= 0 || take > 500)
            throw new InvalidInputException("Take must be between 1 and 500.");

        var exists = await _db.Set<Chat>().AsNoTracking().AnyAsync(c => c.Id == chatId, ct);
        if (!exists)
            throw new NotFoundException("Chat not found.");

        var items = await _db.Messages
            .AsNoTracking()
            .Where(m => m.ChatId == chatId)
            .OrderBy(m => m.CreatedAt)
            .Take(take)
            .Select(m => new AdminChatMessageDto(
                m.Id,
                m.ChatId,
                m.SenderId,
                _db.Users.Where(u => u.Id == m.SenderId).Select(u => u.Email).FirstOrDefault(),
                m.ReceiverId,
                m.Content,
                m.Type,
                m.CreatedAt,
                m.IsRead))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpDelete("{chatId:guid}/messages/{messageId:guid}")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> DeleteMessage(Guid chatId, Guid messageId, CancellationToken ct)
    {
        var message = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId && m.ChatId == chatId, ct);
        if (message is null)
            throw new NotFoundException("Message not found.");

        _db.Messages.Remove(message);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public sealed record AdminChatDto(
    Guid Id,
    Guid BuyerId,
    string? BuyerEmail,
    Guid SellerId,
    string? SellerEmail,
    Guid? ListingId,
    string? ListingTitle,
    int MessageCount,
    DateTime CreatedAt,
    DateTime? LastMessageAt);

public sealed record AdminChatMessageDto(
    Guid Id,
    Guid ChatId,
    Guid SenderId,
    string? SenderEmail,
    Guid ReceiverId,
    string Content,
    string Type,
    DateTime CreatedAt,
    bool IsRead);

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Backend.APIs.Records.Requests;
using SBay.Backend.APIs.Records.Responses;
using SBay.Backend.Exceptions;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportRepository _reports;
    private readonly IUserBlockRepository _blocks;
    private readonly IMessageRepository _messages;
    private readonly IListingRepository _listings;
    private readonly IUserRepository _users;
    private readonly ICurrentUserResolver _resolver;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(
        IReportRepository reports,
        IUserBlockRepository blocks,
        IMessageRepository messages,
        IListingRepository listings,
        IUserRepository users,
        ICurrentUserResolver resolver,
        IUnitOfWork uow,
        ILogger<ReportsController> logger)
    {
        _reports = reports;
        _blocks = blocks;
        _messages = messages;
        _listings = listings;
        _users = users;
        _resolver = resolver;
        _uow = uow;
        _logger = logger;
    }

    [HttpPost]
    [Authorize(Policy = ScopePolicies.UsersWrite)]
    public async Task<ActionResult<ReportDto>> Create([FromBody] CreateReportRequest req, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty)
            throw new UnauthorizedException("Unauthorized");

        if (!Enum.TryParse<ReportTargetType>(req.TargetType, true, out var targetType))
            throw new InvalidInputException("Invalid target type.");

        if (!Enum.TryParse<ReportReason>(req.Reason, true, out var reason))
            throw new InvalidInputException("Invalid report reason.");

        if (req.TargetId == Guid.Empty)
            throw new InvalidInputException("TargetId is required.");

        if (reason == ReportReason.Other && string.IsNullOrWhiteSpace(req.Description))
            throw new InvalidInputException("Description is required for 'Other' reason.");

        Guid? reportedUserId = null;
        switch (targetType)
        {
            case ReportTargetType.UserProfile:
            {
                var user = await _users.GetByIdAsync(req.TargetId, ct);
                if (user is null) throw new NotFoundException("User not found.");
                reportedUserId = user.Id;
                break;
            }
            case ReportTargetType.Listing:
            {
                var listing = await _listings.GetByIdAsync(req.TargetId, ct);
                if (listing is null) throw new NotFoundException("Listing not found.");
                reportedUserId = listing.SellerId;
                break;
            }
            case ReportTargetType.Message:
            {
                var message = await _messages.GetByIdAsync(req.TargetId, ct);
                if (message is null) throw new NotFoundException("Message not found.");
                reportedUserId = message.SenderId;
                break;
            }
        }

        if (reportedUserId.HasValue && reportedUserId.Value == me.Value)
            throw new InvalidInputException("Cannot report yourself.");

        var report = new Report
        {
            Id = Guid.NewGuid(),
            ReporterId = me.Value,
            ReportedUserId = reportedUserId,
            TargetType = targetType,
            TargetId = req.TargetId,
            Reason = reason,
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            EvidenceUrls = req.EvidenceUrls?.Where(u => !string.IsNullOrWhiteSpace(u)).Select(u => u.Trim()).ToArray(),
            BlockRequested = req.BlockUser,
            Status = ReportStatus.Open,
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _reports.AddAsync(report, ct);

        if (req.BlockUser && reportedUserId.HasValue)
        {
            await _blocks.AddAsync(me.Value, reportedUserId.Value, DateTimeOffset.UtcNow, ct);
        }

        await _uow.SaveChangesAsync(ct);

        _logger.LogWarning(
            "New report submitted {ReportId} target={TargetType}:{TargetId} reporter={ReporterId} reported={ReportedUserId}",
            report.Id,
            report.TargetType,
            report.TargetId,
            report.ReporterId,
            report.ReportedUserId);

        return Ok(ToDto(report));
    }

    [HttpGet("admin")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<IReadOnlyList<ReportDto>>> GetAdminReports(
        [FromQuery] Guid? reportedUserId,
        [FromQuery] string? targetType,
        [FromQuery] string? reason,
        [FromQuery] string? status,
        [FromQuery] int take = 50,
        [FromQuery] int skip = 0,
        CancellationToken ct = default)
    {
        ReportTargetType? targetEnum = null;
        if (!string.IsNullOrWhiteSpace(targetType))
        {
            if (!Enum.TryParse<ReportTargetType>(targetType, true, out var parsed))
                throw new InvalidInputException("Invalid target type.");
            targetEnum = parsed;
        }

        ReportReason? reasonEnum = null;
        if (!string.IsNullOrWhiteSpace(reason))
        {
            if (!Enum.TryParse<ReportReason>(reason, true, out var parsed))
                throw new InvalidInputException("Invalid report reason.");
            reasonEnum = parsed;
        }

        ReportStatus? statusEnum = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<ReportStatus>(status, true, out var parsed))
                throw new InvalidInputException("Invalid report status.");
            statusEnum = parsed;
        }

        if (take <= 0 || take > 200)
            throw new InvalidInputException("Take must be between 1 and 200.");

        if (skip < 0)
            throw new InvalidInputException("Skip must be >= 0.");

        var items = await _reports.GetAdminReportsAsync(
            reportedUserId,
            targetEnum,
            reasonEnum,
            statusEnum,
            take,
            skip,
            ct);

        return Ok(items.Select(ToDto).ToList());
    }

    [HttpGet("admin/{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ReportDto>> GetAdminReport(Guid id, CancellationToken ct)
    {
        var report = await _reports.GetByIdAsync(id, ct);
        if (report is null)
            throw new NotFoundException("Report not found.");
        return Ok(ToDto(report));
    }

    [HttpPatch("admin/{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ReportDto>> UpdateAdminReport(
        Guid id,
        [FromBody] UpdateReportRequest req,
        CancellationToken ct)
    {
        var report = await _reports.GetByIdAsync(id, ct);
        if (report is null)
            throw new NotFoundException("Report not found.");

        var hasUpdate = false;

        if (!string.IsNullOrWhiteSpace(req.Status))
        {
            if (!Enum.TryParse<ReportStatus>(req.Status, true, out var statusEnum))
                throw new InvalidInputException("Invalid report status.");
            report.Status = statusEnum;
            hasUpdate = true;
        }

        if (!string.IsNullOrWhiteSpace(req.Action))
        {
            if (!Enum.TryParse<ReportAction>(req.Action, true, out var actionEnum))
                throw new InvalidInputException("Invalid report action.");
            report.Action = actionEnum;
            hasUpdate = true;
        }

        if (req.AdminNotes is not null)
        {
            report.AdminNotes = string.IsNullOrWhiteSpace(req.AdminNotes)
                ? null
                : req.AdminNotes.Trim();
            hasUpdate = true;
        }

        if (!hasUpdate)
            throw new InvalidInputException("No changes provided.");

        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty)
            throw new UnauthorizedException("Unauthorized");

        report.ReviewedById = me.Value;
        report.ReviewedAt = DateTimeOffset.UtcNow;

        await _reports.UpdateAsync(report, ct);
        await _uow.SaveChangesAsync(ct);

        return Ok(ToDto(report));
    }

    private static ReportDto ToDto(Report report)
    {
        return new ReportDto(
            report.Id,
            report.ReporterId,
            report.ReportedUserId,
            report.TargetType,
            report.TargetId,
            report.Reason,
            report.Description,
            report.EvidenceUrls ?? Array.Empty<string>(),
            report.BlockRequested,
            report.Status,
            report.Action,
            report.ReviewedById,
            report.ReviewedAt,
            report.AdminNotes,
            report.CreatedAt);
    }
}

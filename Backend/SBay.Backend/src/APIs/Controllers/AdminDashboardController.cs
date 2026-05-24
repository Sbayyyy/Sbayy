using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SBay.Backend.Messaging;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/admin/dashboard")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminDashboardController : ControllerBase
{
    private readonly EfDbContext _db;

    public AdminDashboardController(EfDbContext db)
    {
        _db = db;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<AdminDashboardSummaryDto>> Summary(CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        var users = new DashboardUsersDto(
            await _db.Users.CountAsync(ct),
            await _db.Users.CountAsync(u => u.Status == "active", ct),
            await _db.Users.CountAsync(u => u.Status == "blocked", ct),
            await _db.Users.CountAsync(u => u.Status == "deactivated", ct),
            await _db.Users.CountAsync(u => u.Role == "admin", ct),
            await _db.Users.CountAsync(u => u.IsSeller, ct),
            await _db.Users.CountAsync(u => !u.EmailVerified, ct));

        var listings = new DashboardListingsDto(
            await _db.Listings.CountAsync(ct),
            await _db.Listings.CountAsync(l => l.Status == "active", ct),
            await _db.Listings.CountAsync(l => l.Status == "sold", ct),
            await _db.Listings.CountAsync(l => l.Status == "hidden", ct),
            await _db.Listings.CountAsync(l => l.Status == "deleted", ct));

        var chats = new DashboardChatsDto(
            await _db.Set<Chat>().CountAsync(ct),
            await _db.Messages.CountAsync(ct),
            await _db.Messages.CountAsync(m => !m.IsRead, ct));

        var reports = new DashboardReportsDto(
            await _db.Reports.CountAsync(ct),
            await _db.Reports.CountAsync(r => r.Status == ReportStatus.Open, ct),
            await _db.Reports.CountAsync(r => r.Status == ReportStatus.Reviewed, ct),
            await _db.Reports.CountAsync(r => r.Status == ReportStatus.Closed, ct));

        var orders = new DashboardOrdersDto(
            await _db.Set<Order>().CountAsync(ct),
            await _db.Set<Order>().CountAsync(o => o.Status == OrderStatus.Pending, ct),
            await _db.Set<Order>().CountAsync(o => o.Status == OrderStatus.Paid, ct),
            await _db.Set<Order>().CountAsync(o => o.Status == OrderStatus.Shipped, ct),
            await _db.Set<Order>().CountAsync(o => o.Status == OrderStatus.Completed, ct),
            await _db.Set<Order>().CountAsync(o => o.Status == OrderStatus.Cancelled, ct));

        var notifications = new DashboardNotificationsDto(
            await _db.UserNotifications.CountAsync(ct),
            await _db.UserNotifications.CountAsync(n => !n.IsRead && !n.IsArchived, ct));

        var commerce = new DashboardCommerceDto(
            await _db.Reviews.CountAsync(ct),
            await _db.Favorites.CountAsync(ct),
            await _db.PaymentTransactions.CountAsync(ct),
            await _db.SponsoredAds.CountAsync(ct),
            await _db.SponsoredAds.CountAsync(a =>
                a.IsActive &&
                a.ArchivedAt == null &&
                a.StartsAt <= now &&
                (a.EndsAt == null || a.EndsAt > now), ct));

        var bugReports = new DashboardBugReportsDto(
            null,
            false,
            "Bug reports are currently sent to support email and application logs, so no stored count is available without adding storage or a log analytics source.");

        var clientLogs = new DashboardClientLogsDto(
            await _db.ClientLogs.CountAsync(ct),
            await _db.ClientLogs.CountAsync(l => l.CreatedAt >= DateTimeOffset.UtcNow.AddHours(-24), ct),
            await _db.ClientLogs.CountAsync(l => l.Level == "error", ct),
            await _db.ClientLogs.CountAsync(l => l.Level == "warning", ct),
            await _db.ClientLogs.CountAsync(l => l.Level == "critical", ct));

        return Ok(new AdminDashboardSummaryDto(
            DateTimeOffset.UtcNow,
            users,
            listings,
            chats,
            reports,
            orders,
            notifications,
            commerce,
            bugReports,
            clientLogs));
    }
}

public sealed record AdminDashboardSummaryDto(
    DateTimeOffset GeneratedAt,
    DashboardUsersDto Users,
    DashboardListingsDto Listings,
    DashboardChatsDto Chats,
    DashboardReportsDto Reports,
    DashboardOrdersDto Orders,
    DashboardNotificationsDto Notifications,
    DashboardCommerceDto Commerce,
    DashboardBugReportsDto BugReports,
    DashboardClientLogsDto ClientLogs);

public sealed record DashboardUsersDto(
    int Total,
    int Active,
    int Blocked,
    int Deactivated,
    int Admins,
    int Sellers,
    int Unverified);

public sealed record DashboardListingsDto(
    int Total,
    int Active,
    int Sold,
    int Hidden,
    int Deleted);

public sealed record DashboardChatsDto(
    int Total,
    int Messages,
    int UnreadMessages);

public sealed record DashboardReportsDto(
    int Total,
    int Open,
    int Reviewed,
    int Closed);

public sealed record DashboardOrdersDto(
    int Total,
    int Pending,
    int Paid,
    int Shipped,
    int Completed,
    int Cancelled);

public sealed record DashboardNotificationsDto(
    int Total,
    int Unread);

public sealed record DashboardCommerceDto(
    int Reviews,
    int Favorites,
    int Payments,
    int SponsoredAds,
    int ActiveSponsoredAds);

public sealed record DashboardBugReportsDto(
    int? Total,
    bool Stored,
    string Note);

public sealed record DashboardClientLogsDto(
    int Total,
    int Last24Hours,
    int Errors,
    int Warnings,
    int Critical);

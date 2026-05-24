using Microsoft.EntityFrameworkCore;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Services;

public sealed record PasswordResetEmailJob(Guid? UserId, string? Email, bool IsNoOp);

public interface IPasswordResetEmailQueue
{
    ValueTask EnqueueAsync(PasswordResetEmailJob job, CancellationToken ct);
}

public sealed class PasswordResetEmailQueue : IPasswordResetEmailQueue
{
    private readonly IServiceScopeFactory _scopeFactory;

    public PasswordResetEmailQueue(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public async ValueTask EnqueueAsync(PasswordResetEmailJob job, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        var now = DateTimeOffset.UtcNow;

        db.PasswordResetEmailOutbox.Add(new PasswordResetEmailOutbox
        {
            Id = Guid.NewGuid(),
            UserId = job.UserId,
            Email = job.Email,
            IsNoOp = job.IsNoOp,
            Status = "pending",
            CreatedAt = now,
            NextAttemptAt = now
        });
        await db.SaveChangesAsync(ct);
    }
}

public sealed class PasswordResetEmailWorker : BackgroundService
{
    private const int BatchSize = 10;
    private const int MaxAttempts = 5;
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan StaleProcessingTimeout = TimeSpan.FromMinutes(10);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<PasswordResetEmailWorker> _logger;

    public PasswordResetEmailWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<PasswordResetEmailWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(PollInterval);
        do
        {
            await ProcessDueJobsAsync(stoppingToken);
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task ProcessDueJobsAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            var jobs = await ClaimDueJobsAsync(ct);
            if (jobs.Count == 0) return;

            foreach (var job in jobs)
            {
                await ProcessJobAsync(job, ct);
            }
        }
    }

    private async Task<IReadOnlyList<PasswordResetEmailOutbox>> ClaimDueJobsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        var now = DateTimeOffset.UtcNow;
        var staleBefore = now.Subtract(StaleProcessingTimeout);

        var ids = await db.PasswordResetEmailOutbox
            .AsNoTracking()
            .Where(x =>
                !x.DeadLetteredAt.HasValue &&
                !x.ProcessedAt.HasValue &&
                x.NextAttemptAt <= now &&
                (x.Status == "pending" || x.Status == "failed" || (x.Status == "processing" && x.LockedAt < staleBefore)))
            .OrderBy(x => x.NextAttemptAt)
            .Select(x => x.Id)
            .Take(BatchSize)
            .ToListAsync(ct);

        var claimed = new List<PasswordResetEmailOutbox>(ids.Count);
        foreach (var id in ids)
        {
            var rows = await db.PasswordResetEmailOutbox
                .Where(x =>
                    x.Id == id &&
                    !x.DeadLetteredAt.HasValue &&
                    !x.ProcessedAt.HasValue &&
                    x.NextAttemptAt <= now &&
                    (x.Status == "pending" || x.Status == "failed" || (x.Status == "processing" && x.LockedAt < staleBefore)))
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.Status, "processing")
                    .SetProperty(x => x.LockedAt, now),
                    ct);

            if (rows == 1)
            {
                var job = await db.PasswordResetEmailOutbox.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
                if (job is not null) claimed.Add(job);
            }
        }

        return claimed;
    }

    private async Task ProcessJobAsync(PasswordResetEmailOutbox job, CancellationToken ct)
    {
        if (job.IsNoOp)
        {
            await MarkSucceededAsync(job.Id, ct);
            return;
        }

        if (job.UserId is null || string.IsNullOrWhiteSpace(job.Email))
        {
            await MarkFailedAsync(job.Id, "Password reset email job was missing user id or email.", ct);
            return;
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
            var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
            var emailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();

            var tokenResult = await PersistPasswordResetTokenAsync(users, uow, job, ct);
            if (tokenResult.Status == PasswordResetTokenPersistStatus.Stale)
            {
                await MarkSucceededAsync(job.Id, ct);
                return;
            }

            if (tokenResult.Status == PasswordResetTokenPersistStatus.Failed || tokenResult.Token is null)
            {
                await MarkFailedAsync(job.Id, "User was missing or inactive.", ct);
                return;
            }

            await SendPasswordResetEmailAsync(emailSender, job.Email, tokenResult.Token, ct);
            await MarkSucceededAsync(job.Id, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email for job {JobId} user {UserId}.", job.Id, job.UserId);
            await MarkFailedAsync(job.Id, ex.Message, ct);
        }
    }

    private async Task MarkSucceededAsync(Guid id, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        var now = DateTimeOffset.UtcNow;
        await db.PasswordResetEmailOutbox
            .Where(x => x.Id == id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Status, "succeeded")
                .SetProperty(x => x.ProcessedAt, now)
                .SetProperty(x => x.LockedAt, (DateTimeOffset?)null)
                .SetProperty(x => x.LastError, (string?)null),
                ct);
    }

    private async Task MarkFailedAsync(Guid id, string error, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        var existing = await db.PasswordResetEmailOutbox.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (existing is null) return;

        var attempts = existing.Attempts + 1;
        var deadLetter = attempts >= MaxAttempts;
        var now = DateTimeOffset.UtcNow;
        var delaySeconds = Math.Min(3600, Math.Pow(2, attempts) * 30);
        var nextAttemptAt = deadLetter ? now : now.AddSeconds(delaySeconds);
        var safeError = error.Length <= 1000 ? error : error[..1000];

        await db.PasswordResetEmailOutbox
            .Where(x => x.Id == id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Status, deadLetter ? "dead_letter" : "failed")
                .SetProperty(x => x.Attempts, attempts)
                .SetProperty(x => x.NextAttemptAt, nextAttemptAt)
                .SetProperty(x => x.LockedAt, (DateTimeOffset?)null)
                .SetProperty(x => x.DeadLetteredAt, deadLetter ? now : null)
                .SetProperty(x => x.LastError, safeError),
                ct);
    }

    private async Task<PasswordResetTokenPersistResult> PersistPasswordResetTokenAsync(
        IUserRepository users,
        IUnitOfWork uow,
        PasswordResetEmailOutbox job,
        CancellationToken ct)
    {
        var user = await users.GetByIdAsync(job.UserId!.Value, ct);
        if (user is null || !user.IsActive)
            return PasswordResetTokenPersistResult.Failed;

        if (user.PasswordResetRequestedAt.HasValue && user.PasswordResetRequestedAt.Value > job.CreatedAt)
            return PasswordResetTokenPersistResult.Stale;

        var token = CreatePasswordResetToken();
        user.PasswordResetTokenHash = HashToken(token);
        user.PasswordResetExpiresAt = DateTimeOffset.UtcNow.AddMinutes(
            Math.Clamp(_config.GetValue<int?>("PasswordReset:TokenMinutes") ?? 60, 10, 1440));
        user.PasswordResetRequestedAt = job.CreatedAt;

        await users.UpdateAsync(user, ct);
        await uow.SaveChangesAsync(ct);
        return PasswordResetTokenPersistResult.Created(token);
    }

    private async Task SendPasswordResetEmailAsync(IEmailSender emailSender, string email, string token, CancellationToken ct)
    {
        var baseUrl = (_config["Frontend:BaseUrl"]
            ?? _config["Cors:AllowedOrigins:0"]
            ?? _config["FRONTEND_URL"]
            ?? "http://localhost:3000").TrimEnd('/');
        var resetUrl = $"{baseUrl}/auth/resetPassword#token={Uri.EscapeDataString(token)}";
        var subject = "Reset your SBay password";
        var text = $"Reset your SBay password here: {resetUrl}\n\nIf you did not request this, you can ignore this email.";
        var html = $"""
            <p>We received a request to reset your SBay password.</p>
            <p><a href="{resetUrl}">Reset your password</a></p>
            <p>If the button does not work, copy and paste this link:</p>
            <p>{resetUrl}</p>
            <p>If you did not request this, you can ignore this email.</p>
            """;
        await emailSender.SendEmailAsync(email, subject, html, text, ct);
    }

    private static string HashToken(string token)
    {
        var bytes = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    private static string CreatePasswordResetToken()
    {
        return Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(
            System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
    }

    private enum PasswordResetTokenPersistStatus
    {
        Created,
        Stale,
        Failed
    }

    private sealed record PasswordResetTokenPersistResult(PasswordResetTokenPersistStatus Status, string? Token = null)
    {
        public static PasswordResetTokenPersistResult Created(string token) => new(PasswordResetTokenPersistStatus.Created, token);
        public static PasswordResetTokenPersistResult Stale { get; } = new(PasswordResetTokenPersistStatus.Stale);
        public static PasswordResetTokenPersistResult Failed { get; } = new(PasswordResetTokenPersistStatus.Failed);
    }
}

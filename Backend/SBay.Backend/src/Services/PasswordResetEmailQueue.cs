using System.Threading.Channels;
using SBay.Domain.Database;

namespace SBay.Backend.Services;

public sealed record PasswordResetEmailJob(Guid? UserId, string? Email, string Token, bool IsNoOp);

public interface IPasswordResetEmailQueue
{
    ValueTask EnqueueAsync(PasswordResetEmailJob job, CancellationToken ct);
}

public sealed class PasswordResetEmailQueue : IPasswordResetEmailQueue
{
    private readonly Channel<PasswordResetEmailJob> _channel = Channel.CreateBounded<PasswordResetEmailJob>(
        new BoundedChannelOptions(256)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = true,
            SingleWriter = false
        });

    public ValueTask EnqueueAsync(PasswordResetEmailJob job, CancellationToken ct) =>
        _channel.Writer.WriteAsync(job, ct);

    internal IAsyncEnumerable<PasswordResetEmailJob> ReadAllAsync(CancellationToken ct) =>
        _channel.Reader.ReadAllAsync(ct);
}

public sealed class PasswordResetEmailWorker : BackgroundService
{
    private readonly PasswordResetEmailQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<PasswordResetEmailWorker> _logger;

    public PasswordResetEmailWorker(
        PasswordResetEmailQueue queue,
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<PasswordResetEmailWorker> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var job in _queue.ReadAllAsync(stoppingToken))
        {
            if (job.IsNoOp)
            {
                await Task.Yield();
                continue;
            }

            if (job.UserId is null || string.IsNullOrWhiteSpace(job.Email))
            {
                _logger.LogWarning("Password reset email job {UserId} skipped because user id or email was empty.", job.UserId);
                continue;
            }

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
                var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                var emailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();

                var persisted = await PersistPasswordResetTokenAsync(users, uow, job, stoppingToken);
                if (!persisted)
                    continue;

                await SendPasswordResetEmailAsync(emailSender, job.Email, job.Token, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email for user {UserId}.", job.UserId);
            }
        }
    }

    private async Task<bool> PersistPasswordResetTokenAsync(
        IUserRepository users,
        IUnitOfWork uow,
        PasswordResetEmailJob job,
        CancellationToken ct)
    {
        var user = await users.GetByIdAsync(job.UserId!.Value, ct);
        if (user is null || !user.IsActive)
        {
            _logger.LogWarning("Password reset email job {UserId} skipped because the user was missing or inactive.", job.UserId);
            return false;
        }

        user.PasswordResetTokenHash = HashToken(job.Token);
        user.PasswordResetExpiresAt = DateTimeOffset.UtcNow.AddMinutes(
            Math.Clamp(_config.GetValue<int?>("PasswordReset:TokenMinutes") ?? 60, 10, 1440));
        user.PasswordResetRequestedAt = DateTimeOffset.UtcNow;

        await users.UpdateAsync(user, ct);
        await uow.SaveChangesAsync(ct);
        return true;
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
}

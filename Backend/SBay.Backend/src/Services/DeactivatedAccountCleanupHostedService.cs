namespace SBay.Backend.Services;

public sealed class DeactivatedAccountCleanupHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DeactivatedAccountCleanupHostedService> _logger;

    public DeactivatedAccountCleanupHostedService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<DeactivatedAccountCleanupHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_configuration.GetValue("AccountDeletion:CleanupEnabled", true))
            return;

        var intervalHours = Math.Clamp(_configuration.GetValue<int?>("AccountDeletion:CleanupIntervalHours") ?? 24, 1, 168);
        await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<AccountDeletionService>();
                var deleted = await service.DeleteExpiredDeactivatedAccountsAsync(stoppingToken);
                if (deleted > 0)
                    _logger.LogInformation("Deleted {DeletedCount} expired deactivated accounts.", deleted);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Expired deactivated account cleanup failed.");
            }

            await Task.Delay(TimeSpan.FromHours(intervalHours), stoppingToken);
        }
    }
}

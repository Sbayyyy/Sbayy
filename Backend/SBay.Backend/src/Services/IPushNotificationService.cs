namespace SBay.Backend.Services
{
    public interface IPushNotificationService
    {
        Task SendAsync(Guid userId, string title, string body, object? data, CancellationToken ct);
    }
}

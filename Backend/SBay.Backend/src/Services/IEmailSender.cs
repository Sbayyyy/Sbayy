namespace SBay.Backend.Services;

public interface IEmailSender
{
    Task SendEmailAsync(string to, string subject, string htmlBody, string textBody, CancellationToken ct = default);
}

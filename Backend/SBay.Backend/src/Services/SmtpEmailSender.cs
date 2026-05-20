using System.Net;
using System.Net.Mail;

namespace SBay.Backend.Services;

public sealed class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IConfiguration config, ILogger<SmtpEmailSender> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendEmailAsync(string to, string subject, string htmlBody, string textBody, CancellationToken ct = default)
    {
        var host = _config["Email:Smtp:Host"];
        var from = _config["Email:From"];
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(from))
        {
            _logger.LogInformation("Email delivery is not configured. Verification email to {Email}: {Body}", to, textBody);
            return;
        }

        using var message = new MailMessage
        {
            From = new MailAddress(from, _config["Email:FromName"] ?? "SBay"),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        message.To.Add(to);
        message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(textBody, null, "text/plain"));

        using var client = new SmtpClient(host, _config.GetValue<int?>("Email:Smtp:Port") ?? 587)
        {
            EnableSsl = _config.GetValue("Email:Smtp:EnableSsl", true)
        };

        var username = _config["Email:Smtp:Username"];
        var password = _config["Email:Smtp:Password"];
        if (!string.IsNullOrWhiteSpace(username))
        {
            client.Credentials = new NetworkCredential(username, password);
        }

        await client.SendMailAsync(message, ct);
    }
}

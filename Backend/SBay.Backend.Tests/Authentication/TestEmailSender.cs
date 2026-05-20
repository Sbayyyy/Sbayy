using System.Text.RegularExpressions;
using SBay.Backend.Services;

public sealed class TestEmailSender : IEmailSender
{
    private readonly List<SentEmail> _sent = new();

    public IReadOnlyList<SentEmail> Sent => _sent;

    public Task SendEmailAsync(string to, string subject, string htmlBody, string textBody, CancellationToken ct = default)
    {
        _sent.Add(new SentEmail(to, subject, htmlBody, textBody));
        return Task.CompletedTask;
    }

    public string GetLatestVerificationToken(string email)
    {
        var message = _sent.Last(m => string.Equals(m.To, email, StringComparison.OrdinalIgnoreCase));
        var match = Regex.Match(message.TextBody, @"token=([^&\s]+)");
        if (!match.Success)
            throw new InvalidOperationException("Verification token not found in email body.");
        return Uri.UnescapeDataString(match.Groups[1].Value);
    }
}

public sealed record SentEmail(string To, string Subject, string HtmlBody, string TextBody);

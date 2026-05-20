using System.Net.Mail;

namespace SBay.Backend.Utils;

public static class EmailValidator
{
    public static bool TryNormalize(string? email, out string normalized)
    {
        normalized = string.Empty;
        var trimmed = email?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed) || trimmed.Length is < 3 or > 254)
            return false;

        try
        {
            var parsed = new MailAddress(trimmed);
            if (!string.Equals(parsed.Address, trimmed, StringComparison.OrdinalIgnoreCase))
                return false;

            var host = parsed.Host;
            if (string.IsNullOrWhiteSpace(parsed.User) || parsed.User.Length > 64 || string.IsNullOrWhiteSpace(host))
                return false;
            if (!host.Contains('.') || host.StartsWith('.') || host.EndsWith('.') || host.Contains(".."))
                return false;
            if (host.Split('.').Any(IsInvalidDomainLabel))
                return false;

            normalized = parsed.Address.ToLowerInvariant();
            return true;
        }
        catch
        {
            return false;
        }
    }

    public static bool IsValid(string? email) => TryNormalize(email, out _);

    private static bool IsInvalidDomainLabel(string label)
    {
        return label.Length == 0
            || label.Length > 63
            || label.StartsWith('-')
            || label.EndsWith('-')
            || label.Any(c => !char.IsAsciiLetterOrDigit(c) && c != '-');
    }
}

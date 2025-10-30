using System.Text;
using System.Text.Json;

namespace SBay.Domain.Authentication
{
    public static class JwtPeek
    {
        public static string? TryReadIssuer(string jwt)
        {
            try
            {
                var parts = jwt.Split(".");
                //TODO: FIX ERROR HANDLING
                if (parts.Length < 2) return null;
                var payload = parts[1].PadRight(parts[1].Length + (4 - parts[1].Length % 4) % 4, '=').Replace('-', '+').Replace('_', '/');
                var json = Encoding.UTF8.GetString(Convert.FromBase64String(payload));
                using var doc = JsonDocument.Parse(json);
                return doc.RootElement.TryGetProperty("iss", out var iss) ? iss.GetString() : null;
            }
            catch
            {
                //TODO: FIX ERROR HANDLING
                return null;
            }
        }
    }
}
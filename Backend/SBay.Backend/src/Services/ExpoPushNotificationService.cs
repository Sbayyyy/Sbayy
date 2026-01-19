using System.Net.Http.Json;
using System.Linq;
using SBay.Domain.Database;

namespace SBay.Backend.Services
{
    public class ExpoPushNotificationService : IPushNotificationService
    {
        private static readonly Uri Endpoint = new("https://exp.host/--/api/v2/push/send");
        private readonly HttpClient _http;
        private readonly IPushTokenRepository _tokens;

        public ExpoPushNotificationService(HttpClient http, IPushTokenRepository tokens)
        {
            _http = http;
            _tokens = tokens;
        }

        public async Task SendAsync(Guid userId, string title, string body, object? data, CancellationToken ct)
        {
            var tokens = await _tokens.GetTokensAsync(userId, ct);
            if (tokens.Count == 0) return;

            var payloads = tokens
                .Select(t => new
                {
                    to = t.Token,
                    title,
                    body,
                    data,
                    sound = "default",
                    priority = "high"
                })
                .ToArray();

            using var response = await _http.PostAsJsonAsync(Endpoint, payloads, ct);
            response.EnsureSuccessStatusCode();
        }
    }
}

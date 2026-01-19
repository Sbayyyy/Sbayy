using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using SBay.Domain.Database;

namespace SBay.Backend.Services
{
    public class ExpoPushNotificationService : IPushNotificationService
    {
        private static readonly Uri Endpoint = new("https://exp.host/--/api/v2/push/send");
        private readonly HttpClient _http;
        private readonly IPushTokenRepository _tokens;
        private readonly ILogger<ExpoPushNotificationService> _logger;

        public ExpoPushNotificationService(
            HttpClient http,
            IPushTokenRepository tokens,
            ILogger<ExpoPushNotificationService> logger)
        {
            _http = http;
            _tokens = tokens;
            _logger = logger;
        }

        public async Task SendAsync(Guid userId, string title, string body, object? data, CancellationToken ct)
        {
            var tokens = await _tokens.GetTokensAsync(userId, ct);
            if (tokens.Count == 0) return;

            var payloads = tokens.Select(t => new PushPayload(
                t.Token,
                title,
                body,
                data,
                "default",
                "high")).ToList();

            await SendWithRetryAsync(userId, payloads, ct);
        }

        private async Task SendWithRetryAsync(Guid userId, List<PushPayload> payloads, CancellationToken ct)
        {
            var pending = payloads;
            for (var attempt = 0; attempt < 3 && pending.Count > 0; attempt++)
            {
                using var response = await _http.PostAsJsonAsync(
                    Endpoint,
                    pending.Select(p => new
                    {
                        to = p.Token,
                        title = p.Title,
                        body = p.Body,
                        data = p.Data,
                        sound = p.Sound,
                        priority = p.Priority
                    }),
                    ct);

                response.EnsureSuccessStatusCode();
                var json = await response.Content.ReadAsStringAsync(ct);
                var parsed = JsonSerializer.Deserialize<ExpoResponse>(json, JsonOptions);

                if (parsed?.Data is null || parsed.Data.Length == 0)
                {
                    _logger.LogWarning("Expo push response missing data: {Body}", json);
                    return;
                }

                var nextRetry = new List<PushPayload>();
                var count = Math.Min(parsed.Data.Length, pending.Count);

                for (var i = 0; i < count; i++)
                {
                    var entry = parsed.Data[i];
                    if (!string.Equals(entry.Status, "error", StringComparison.OrdinalIgnoreCase))
                        continue;

                    var errorCode = entry.Details?.Error;
                    _logger.LogWarning(
                        "Expo push error for token {Token}: {Status} {Message} {Error}",
                        pending[i].Token,
                        entry.Status,
                        entry.Message ?? string.Empty,
                        errorCode ?? string.Empty);

                    if (string.Equals(errorCode, "DeviceNotRegistered", StringComparison.OrdinalIgnoreCase))
                    {
                        await _tokens.RemoveAsync(userId, pending[i].Token, ct);
                    }
                    else if (IsTransient(errorCode))
                    {
                        nextRetry.Add(pending[i]);
                    }
                }

                if (parsed.Data.Length != pending.Count)
                {
                    _logger.LogWarning(
                        "Expo push response count mismatch: sent {Sent} received {Received}",
                        pending.Count,
                        parsed.Data.Length);
                }

                if (nextRetry.Count == 0) return;

                var delayMs = (int)Math.Pow(2, attempt) * 500;
                await Task.Delay(delayMs, ct);
                pending = nextRetry;
            }
        }

        private static bool IsTransient(string? errorCode)
        {
            if (string.IsNullOrWhiteSpace(errorCode)) return false;
            return string.Equals(errorCode, "MessageRateExceeded", StringComparison.OrdinalIgnoreCase)
                || string.Equals(errorCode, "ExpoPushTokenRateExceeded", StringComparison.OrdinalIgnoreCase)
                || string.Equals(errorCode, "TooManyRequests", StringComparison.OrdinalIgnoreCase)
                || string.Equals(errorCode, "InternalError", StringComparison.OrdinalIgnoreCase)
                || string.Equals(errorCode, "ServerError", StringComparison.OrdinalIgnoreCase);
        }

        private sealed record PushPayload(
            string Token,
            string Title,
            string Body,
            object? Data,
            string Sound,
            string Priority);

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        private sealed record ExpoResponse(ExpoResponseData[] Data);

        private sealed record ExpoResponseData(
            string Status,
            string? Message,
            ExpoErrorDetails? Details);

        private sealed record ExpoErrorDetails(string? Error);
    }
}

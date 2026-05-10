using System.Text.Json;
using SBay.Domain.Entities;

namespace SBay.Backend.Services.Payments;

public sealed class MockPaymentGateway : IPaymentGateway
{
    private readonly IConfiguration _configuration;

    public MockPaymentGateway(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string Name => "mock";

    public Task<PaymentGatewaySession> CreateSessionAsync(PaymentGatewayRequest request, CancellationToken ct)
    {
        var reference = $"mock_{request.TransactionId:N}";
        return Task.FromResult(new PaymentGatewaySession(
            reference,
            request.ReturnUrl,
            PaymentTransactionStatus.Pending));
    }

    public async Task<PaymentWebhookResult?> ParseWebhookAsync(HttpRequest request, CancellationToken ct)
    {
        var expectedSecret = _configuration["Payments:Mock:WebhookSecret"];
        if (!string.IsNullOrWhiteSpace(expectedSecret))
        {
            var provided = request.Headers["X-Mock-Payment-Secret"].FirstOrDefault();
            if (!string.Equals(provided, expectedSecret, StringComparison.Ordinal))
                return null;
        }

        using var document = await JsonDocument.ParseAsync(request.Body, cancellationToken: ct);
        var root = document.RootElement;
        var reference = root.TryGetProperty("providerReference", out var refValue)
            ? refValue.GetString()
            : null;
        if (string.IsNullOrWhiteSpace(reference)) return null;

        var eventId = root.TryGetProperty("eventId", out var eventValue)
            ? eventValue.GetString()
            : reference;
        var statusValue = root.TryGetProperty("status", out var statusElement)
            ? statusElement.GetString()
            : "pending";

        var status = statusValue?.Trim().ToLowerInvariant() switch
        {
            "requires_action" => PaymentTransactionStatus.RequiresAction,
            "succeeded" => PaymentTransactionStatus.Succeeded,
            "paid" => PaymentTransactionStatus.Succeeded,
            "failed" => PaymentTransactionStatus.Failed,
            "cancelled" => PaymentTransactionStatus.Cancelled,
            "canceled" => PaymentTransactionStatus.Cancelled,
            "refunded" => PaymentTransactionStatus.Refunded,
            _ => PaymentTransactionStatus.Pending
        };

        return new PaymentWebhookResult(Name, reference, status, eventId ?? reference);
    }
}

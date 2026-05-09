using SBay.Domain.Entities;

namespace SBay.Backend.Services.Payments;

public sealed record PaymentGatewayRequest(
    Guid TransactionId,
    Guid UserId,
    decimal Amount,
    string Currency,
    string Purpose,
    string Description,
    string? ReturnUrl);

public sealed record PaymentGatewaySession(
    string ProviderReference,
    string? CheckoutUrl,
    PaymentTransactionStatus Status);

public sealed record PaymentWebhookResult(
    string Provider,
    string ProviderReference,
    PaymentTransactionStatus Status,
    string EventId);

public interface IPaymentGateway
{
    string Name { get; }
    Task<PaymentGatewaySession> CreateSessionAsync(PaymentGatewayRequest request, CancellationToken ct);
    Task<PaymentWebhookResult?> ParseWebhookAsync(HttpRequest request, CancellationToken ct);
}

public sealed class PaymentGatewayRegistry
{
    private readonly IReadOnlyDictionary<string, IPaymentGateway> _gateways;
    private readonly IConfiguration _configuration;

    public PaymentGatewayRegistry(IEnumerable<IPaymentGateway> gateways, IConfiguration configuration)
    {
        _gateways = gateways.ToDictionary(g => g.Name, StringComparer.OrdinalIgnoreCase);
        _configuration = configuration;
    }

    public IPaymentGateway ActiveGateway
    {
        get
        {
            var name = _configuration["Payments:Provider"] ?? "mock";
            if (_gateways.TryGetValue(name, out var gateway)) return gateway;
            throw new InvalidOperationException($"Payment provider '{name}' is not registered.");
        }
    }

    public IPaymentGateway Get(string provider)
    {
        if (_gateways.TryGetValue(provider, out var gateway)) return gateway;
        throw new InvalidOperationException($"Payment provider '{provider}' is not registered.");
    }
}

namespace SBay.Domain.Authentication;

public sealed class JwtOptions
{
    public string Issuer { get; init; } = "SBay";
    public string Audience { get; init; } = "SBayClients";
    public string Secret { get; init; } = "REPLACE_ME_WITH_A_LONG_RANDOM_SECRET";
    public int ExpMinutes { get; init; } = 60;
}
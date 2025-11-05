namespace SBay.Domain.Authentication;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = "SBay";
    public string Audience { get; set; } = "SBayClients";
    public string Secret { get; set; } = "REPLACE_ME_WITH_A_LONG_RANDOM_SECRET";
    public int ExpMinutes { get; set; } = 60;
}
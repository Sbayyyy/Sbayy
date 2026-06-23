using SBay.Backend.Authentication;

public sealed class TestGoogleTokenVerifier : IGoogleTokenVerifier
{
    public Task<VerifiedGoogleToken?> VerifyIdTokenAsync(string idToken, CancellationToken ct)
    {
        if (string.Equals(idToken, "invalid", StringComparison.Ordinal))
            return Task.FromResult<VerifiedGoogleToken?>(null);

        var parts = idToken.Split('|');
        if (parts.Length < 2)
            return Task.FromResult<VerifiedGoogleToken?>(null);

        var verified = parts.Length < 4 || !string.Equals(parts[3], "unverified", StringComparison.Ordinal);
        return Task.FromResult<VerifiedGoogleToken?>(new VerifiedGoogleToken(
            parts[0],
            parts[1],
            verified,
            parts.Length > 2 ? parts[2] : null,
            null));
    }
}

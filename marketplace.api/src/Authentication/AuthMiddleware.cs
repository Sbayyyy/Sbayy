using SBay.Domain.Authentication;

public sealed class AuthMiddleWare
{
    private readonly RequestDelegate _next;
    private readonly IReadOnlyList<IAuthenticator> _authenticators;
    public AuthMiddleWare(RequestDelegate next, IEnumerable<IAuthenticator> authenticators)
    {
        _next = next;
        _authenticators = authenticators.ToList();
    }
    public async Task Invoke(HttpContext ctx)
    {
        var auth = ctx.Request.Headers.Authorization.ToString();
        if (auth.StartsWith("Bearer", StringComparison.OrdinalIgnoreCase))
        {
            var token = auth["Bearer ".Length..];
            var strat = _authenticators.FirstOrDefault(a => a.CanHandle(token));
            if (strat != null)
            {
                var principal = await strat.ValidateAsync(token, ctx.RequestAborted);
                if (principal != null)
                {
                    ctx.User = principal;
                }
            }
        }
        await _next(ctx);
    }
}
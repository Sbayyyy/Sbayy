using System.Linq;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;
using SBay.Backend.Authentication;
using SBay.Backend.Services;
using SBay.Domain.Database;
using SBay.Domain.Entities;

public class TestWebAppFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = $"WebAppTests-{Guid.NewGuid()}";
    private readonly string _environment;
    private readonly IReadOnlyDictionary<string, string?> _configurationOverrides;

    public TestWebAppFactory() : this("Testing", null)
    {
    }

    internal TestWebAppFactory(IReadOnlyDictionary<string, string?> configurationOverrides)
        : this("Testing", configurationOverrides)
    {
    }

    internal TestWebAppFactory(string environment)
        : this(environment, null)
    {
    }

    private TestWebAppFactory(string environment, IReadOnlyDictionary<string, string?>? configurationOverrides)
    {
        _environment = environment;
        _configurationOverrides = configurationOverrides ?? new Dictionary<string, string?>();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(_environment);

        builder.ConfigureAppConfiguration((ctx, cfg) =>
        {
            var testConfiguration = new Dictionary<string, string?>
            {
                ["Database:Provider"] = "ef",
                ["ConnectionStrings:Default"] = "Host=localhost;Port=5432;Database=sbay_tests;Username=sbay;Password=sbay_tests",
                ["Storage:Provider"] = "local",
                ["Jwt:Issuer"] = "SBay",
                ["Jwt:Audience"] = "SBayClients",
                ["Jwt:Secret"] = "test_jwt_secret_32_bytes_minimum_value",
                ["Jwt:ExpMinutes"] = "60",
                ["Jwt:RefreshTokenDays"] = "7",
                ["RateLimits:Auth:PermitLimit"] = "1000",
                ["RateLimits:Registration:PermitLimit"] = "1000",
                ["RateLimits:Uploads:PermitLimit"] = "1000",
                ["RateLimits:Reports:PermitLimit"] = "1000",
                ["RateLimits:Chat:PermitLimit"] = "1000",
                ["RateLimits:Shipping:PermitLimit"] = "1000",
                ["RateLimits:Write:PermitLimit"] = "1000",
                ["Authentication:Google:OAuthClientId"] = "test-web-client.apps.googleusercontent.com",
                ["Authentication:Google:OAuthClientSecret"] = "test-google-client-secret",
                ["Authentication:Google:MobileRedirectUris:0"] = "sbay://auth/google",
                ["Authentication:Google:MobileRedirectUris:1"] = "sbay:///auth/google"
            };
            foreach (var pair in _configurationOverrides)
            {
                testConfiguration[pair.Key] = pair.Value;
            }

            cfg.AddJsonFile("appsettings.json", optional: true)
               .AddJsonFile("appsettings.Testing.json", optional: true)
               .AddEnvironmentVariables()
               .AddInMemoryCollection(testConfiguration);
        });

        builder.ConfigureServices(services =>
        {
            var optionsDescriptors = services
                .Where(d =>
                    d.ServiceType == typeof(DbContextOptions) ||
                    d.ServiceType == typeof(DbContextOptions<EfDbContext>))
                .ToList();
            foreach (var d in optionsDescriptors)
                services.Remove(d);

            var optionsConfigDescriptors = services
                .Where(d =>
                    d.ServiceType.FullName?.StartsWith("Microsoft.EntityFrameworkCore.Infrastructure.IDbContextOptionsConfiguration`1", StringComparison.Ordinal) == true)
                .ToList();
            foreach (var d in optionsConfigDescriptors)
                services.Remove(d);

            var npgsqlDescriptors = services
                .Where(d =>
                    (d.ImplementationType?.FullName?.Contains("Npgsql") ?? false) ||
                    (d.ServiceType.FullName?.Contains("Npgsql") ?? false) ||
                    (d.ImplementationInstance?.GetType().FullName?.Contains("Npgsql") ?? false))
                .ToList();
            foreach (var d in npgsqlDescriptors)
                services.Remove(d);

            var dbContextDescriptors = services
                .Where(d =>
                    d.ServiceType == typeof(EfDbContext) ||
                    d.ImplementationType == typeof(EfDbContext) ||
                    d.ImplementationInstance?.GetType() == typeof(EfDbContext))
                .ToList();
            foreach (var d in dbContextDescriptors)
                services.Remove(d);

            var providerDescriptors = services
                .Where(d =>
                    string.Equals(d.ServiceType.FullName, "Microsoft.EntityFrameworkCore.Infrastructure.IDatabaseProvider", StringComparison.Ordinal))
                .ToList();
            foreach (var d in providerDescriptors)
                services.Remove(d);

            services.AddDbContext<EfDbContext>(options =>
            {
                options.UseInMemoryDatabase(_dbName);
            });

            services.RemoveAll<IEmailSender>();
            services.AddSingleton<TestEmailSender>();
            services.AddSingleton<IEmailSender>(sp => sp.GetRequiredService<TestEmailSender>());

            services.RemoveAll<IGoogleTokenVerifier>();
            services.AddSingleton<IGoogleTokenVerifier, TestGoogleTokenVerifier>();
            services.RemoveAll<IGoogleOAuthCodeExchanger>();
            services.AddSingleton<IGoogleOAuthCodeExchanger, TestGoogleOAuthCodeExchanger>();

            services.AddAuthentication(o =>
            {
                o.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                o.DefaultChallengeScheme    = TestAuthHandler.SchemeName;
            })
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                TestAuthHandler.SchemeName, _ => { });

            services.PostConfigure<JwtBearerOptions>("SBayJwt", options =>
            {
                options.TokenValidationParameters.IssuerSigningKey =
                    new SymmetricSecurityKey(Encoding.UTF8.GetBytes("test_jwt_secret_32_bytes_minimum_value"));
            });

            // Intentionally skip seeding to avoid forcing provider initialization here.
        });
    }
}


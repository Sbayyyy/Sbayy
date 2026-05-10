using System.Linq;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using SBay.Domain.Database;
using SBay.Domain.Entities;

public class TestWebAppFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = $"WebAppTests-{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((ctx, cfg) =>
        {
            cfg.AddJsonFile("appsettings.json", optional: true)
               .AddJsonFile("appsettings.Testing.json", optional: true)
               .AddInMemoryCollection(new Dictionary<string, string?>
               {
                   ["ConnectionStrings:Default"] = "Host=localhost;Port=5432;Database=sbay_tests;Username=sbay;Password=sbay_tests",
                   ["Storage:Provider"] = "local",
                   ["Jwt:Secret"] = "test_jwt_secret_32_bytes_minimum_value"
               })
               .AddEnvironmentVariables();
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


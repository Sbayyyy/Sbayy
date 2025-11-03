using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SBay.Domain.Authentication;
using SBay.Domain.Database;

public class TestWebAppFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development"); // detailed errors during tests

        builder.ConfigureAppConfiguration((ctx, cfg) =>
        {
            // Load the same config the app uses
            cfg.AddJsonFile("appsettings.json", optional: false, reloadOnChange: false);

            // Allow local dev secrets (dotnet user-secrets) to override in Development
            cfg.AddUserSecrets<Program>(optional: true);

            // Allow CI/prod to override via env vars (e.g., Jwt__Secret)
            cfg.AddEnvironmentVariables();
        });

        builder.ConfigureServices(services =>
        {
            // Swap DbContext to test database connection
            var existing = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<EfDbContext>));
            if (existing != null) services.Remove(existing);

            // Use configuration loaded above
            using var sp = services.BuildServiceProvider();
            var cfg = sp.GetRequiredService<IConfiguration>();

            var connStr = cfg.GetConnectionString("Default")
                          ?? throw new InvalidOperationException("Missing ConnectionStrings:Default");

            services.AddDbContext<EfDbContext>(o => o.UseNpgsql(connStr));

            // Bind JwtOptions from the SAME "Jwt" section (Issuer/Audience/Secret/ExpMinutes)
            services.Configure<JwtOptions>(cfg.GetSection("Jwt"));

            // Ensure DB exists for tests
            using var scope = services.BuildServiceProvider().CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
            db.Database.EnsureCreated();
        });
    }
}

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SBay.Domain.Database;
// using SBay.Domain.Entities; // your User entity namespace

public class TestWebAppFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((ctx, cfg) =>
        {
            cfg.AddJsonFile("appsettings.json", optional: true)
               .AddJsonFile("appsettings.Testing.json", optional: true)
               .AddEnvironmentVariables();
        });

        builder.ConfigureServices(services =>
        {
            // If you want to use InMemory for controller tests, uncomment:
            // var descriptor = services.SingleOrDefault(
            //     d => d.ServiceType == typeof(DbContextOptions<EfDbContext>));
            // if (descriptor != null) services.Remove(descriptor);
            // services.AddDbContext<EfDbContext>(o => o.UseInMemoryDatabase("api-tests"));

            // ⚠️ Replace the real auth with our test auth
            services.AddAuthentication(o =>
            {
                o.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                o.DefaultChallengeScheme    = TestAuthHandler.SchemeName;
            })
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                TestAuthHandler.SchemeName, _ => { });

            // Ensure DB exists and seed a seller user with the same GUID as our fake auth
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
            db.Database.EnsureCreated();

            // Seed seller if missing (adjust to your User entity/columns)
            var sellerId = TestAuthHandler.SellerId;
            var exists = db.Users.AsNoTracking().Any(u => u.Id == sellerId);
            if (!exists)
            {
                db.Database.ExecuteSqlRaw(@"
INSERT INTO users (id, email, password_hash, display_name, role, is_seller)
VALUES ({0}, {1}, {2}, {3}, 'seller', TRUE)
ON CONFLICT (email) DO NOTHING;",
                    sellerId,
                    "test.seller@example.com",
                    "$test_hash",
                    "Test Seller");
            }
        });
    }
}

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SBay.Domain.Database;


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
            
            
            
            
            

            
            services.AddAuthentication(o =>
            {
                o.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                o.DefaultChallengeScheme    = TestAuthHandler.SchemeName;
            })
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                TestAuthHandler.SchemeName, _ => { });

            
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
            

            
            var sellerId = TestAuthHandler.SellerId;
            var exists = db.Users.AsNoTracking().Any(u => u.Id == sellerId);
            if (!exists)
            {
                db.Database.ExecuteSqlRaw(@"
INSERT INTO users (id, email, password_hash, display_name, role, is_seller, created_at)
VALUES ({0}, {1}, {2}, {3}, 'seller', TRUE, now())
ON CONFLICT (email) DO NOTHING;",
                    sellerId,
                    "test.seller@example.com",
                    "$test_hash",
                    "Test Seller");
            }
        });
    }
}

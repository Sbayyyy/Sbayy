using System.Linq;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SBay.Domain.Database;
using SBay.Domain.Entities;

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

            const string sellerEmail = "seller@example.com";
            var seller = db.Users.AsNoTracking().FirstOrDefault(u => u.Email == sellerEmail);
            if (seller == null)
            {
                var user = new User
                {
                    Id = TestAuthHandler.SellerId,
                    Email = sellerEmail,
                    PasswordHash = "hash",
                    IsSeller = true,
                    Role = "user"
                };
                db.Users.Add(user);
                db.SaveChanges();
            }
            else
            {
                TestAuthHandler.SellerId = seller.Id;
            }
        });
    }
}

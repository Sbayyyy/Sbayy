using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SBay.Domain.Entities;
using SBay.Domain.Database;
using Xunit;

namespace SBay.Backend.Tests.DB
{
    public class EfDbContextTests
    {
        private static string GetConnectionString()
        {
            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("ConnectionStrings.json", optional: false, reloadOnChange: false)
                .Build();

            var connStr = config.GetConnectionString("Default");
            if (string.IsNullOrWhiteSpace(connStr))
                throw new InvalidOperationException("Missing ConnectionStrings:Default in appsettings.json");

            return connStr;
        }

        [Fact]
        public async Task CanConnectAndPersist_UserEntity_WithRealDatabase()
        {
            var connString = GetConnectionString();

            var options = new DbContextOptionsBuilder<EfDbContext>()
                .UseNpgsql(connString)
                .UseSnakeCaseNamingConvention()
                .Options;

            await using var ctx = new EfDbContext(options);

            Assert.True(await ctx.Database.CanConnectAsync(), "Database is not reachable");

            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = "real4.test@example.com",
                DisplayName = "RealUser",
                Region = "EU",
                IsSeller = false,
                CreatedAt = DateTime.UtcNow
            };

            ctx.Users.Add(user);
            var saved = await ctx.SaveChangesAsync();
            Assert.True(saved > 0, "User entity was not saved");

            var fetched = await ctx.Users.FirstOrDefaultAsync(u => u.Id == user.Id);
            Assert.NotNull(fetched);
            Assert.Equal(user.Email, fetched!.Email);
            Assert.Equal(user.DisplayName, fetched.DisplayName);
        }
    }
}

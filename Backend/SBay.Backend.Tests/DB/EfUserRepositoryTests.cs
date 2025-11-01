using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using Xunit;

namespace SBay.Backend.Tests.DB
{
    public class EfUserRepositoryTests
    {
        private static string GetConnectionString()
        {
            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("ConnectionStrings.json", optional: false, reloadOnChange: false)
                .Build();

            var cs = config.GetConnectionString("Default");
            if (string.IsNullOrWhiteSpace(cs))
                throw new InvalidOperationException("Missing ConnectionStrings:Default in appsettings.json");

            return cs;
        }

        private static EfDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<EfDbContext>()
                .UseNpgsql(GetConnectionString())
                .UseSnakeCaseNamingConvention()
                .Options;

            return new EfDbContext(options);
        }

        [Fact]
        public async Task AddAsync_Then_GetByIdAsync_Returns_User()
        {
            await using var ctx = CreateContext();
            Assert.True(await ctx.Database.CanConnectAsync(), "DB not reachable");

            var repo = new EfUserRepository(ctx);

            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = "repo5.user@example.com",
                DisplayName = "RepoUser",
                Region = "EU",
                IsSeller = false,
                CreatedAt = DateTime.UtcNow,
                PasswordHash = "hashed_password"
            };

            await repo.AddAsync(user, CancellationToken.None);

            await ctx.SaveChangesAsync(CancellationToken.None);

            var fetched = await repo.GetByIdAsync(user.Id, CancellationToken.None);
            Assert.NotNull(fetched);
            Assert.Equal(user.Email, fetched!.Email);
            Assert.Equal(user.DisplayName, fetched.DisplayName);
        }

        [Fact]
        public async Task UnitOfWork_SaveChangesAsync_Persists_Changes()
        {
            await using var ctx = CreateContext();
            Assert.True(await ctx.Database.CanConnectAsync(), "DB not reachable");

            var uow = new EfUnitOfWork(ctx);

            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = "uow5.user@example.com",
                DisplayName = "UowUser",
                Region = "EU",
                IsSeller = false,
                CreatedAt = DateTime.UtcNow,
                PasswordHash = "hashed_password"
            };

            ctx.Users.Add(user);

            var result = await uow.SaveChangesAsync(CancellationToken.None);

            Assert.True(result > 0, "No rows were saved");
            var found = await ctx.Users.FindAsync(new object[] { user.Id }, CancellationToken.None);
            Assert.NotNull(found);
            Assert.Equal("uow5.user@example.com", found!.Email);
        }
    }
}

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
    [Collection("db")]
    public class EfUserRepositoryTests:DBScopedTest
    {
        public EfUserRepositoryTests(TestDatabaseFixture fx) : base(fx) { }
        

        [Fact]
        public async Task AddAsync_Then_GetByIdAsync_Returns_User()
        {
            Assert.True(await Db.Database.CanConnectAsync(), "DB not reachable");

            var repo = new EfUserRepository(Db);

            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = "repos.user@example.com",
                DisplayName = "RepoUser",
                Region = "EU",
                IsSeller = false,
                CreatedAt = DateTime.UtcNow,
                PasswordHash = "hashed_password"
            };

            await repo.AddAsync(user, CancellationToken.None);

            await Db.SaveChangesAsync(CancellationToken.None);

            var fetched = await repo.GetByIdAsync(user.Id, CancellationToken.None);
            Assert.NotNull(fetched);
            Assert.Equal(user.Email, fetched!.Email);
            Assert.Equal(user.DisplayName, fetched.DisplayName);
        }

        [Fact]
        public async Task UnitOfWork_SaveChangesAsync_Persists_Changes()
        {
            Assert.True(await Db.Database.CanConnectAsync(), "DB not reachable");


            var uow = new EfUnitOfWork(Db);

            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = "uows.user@example.com",
                DisplayName = "UowUser",
                Region = "EU",
                IsSeller = false,
                CreatedAt = DateTime.UtcNow,
                PasswordHash = "hashed_password"
            };

            Db.Users.Add(user);

            var result = await uow.SaveChangesAsync(CancellationToken.None);

            Assert.True(result > 0, "No rows were saved");
            var found = await Db.Users.FindAsync(new object[] { user.Id }, CancellationToken.None);
            Assert.NotNull(found);
            Assert.Equal("uows.user@example.com", found!.Email);
        }
    }
}

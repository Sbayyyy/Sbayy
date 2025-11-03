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
    [Collection("db")]
    public class EfDbContextTests : DBScopedTest
    {
        public EfDbContextTests(TestDatabaseFixture fx) : base(fx)
        {
        }

        [Fact]
        public async Task CanConnectAndPersist_UserEntity_WithRealDatabase()
        {
            Assert.True(await Db.Database.CanConnectAsync(), "Database is not reachable");
            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = "realest.test@example.com",
                DisplayName = "RealUser",
                Region = "EU",
                IsSeller = false,
                CreatedAt = DateTime.UtcNow
            };

            Db.Users.Add(user);
            var saved = await Db.SaveChangesAsync();
            Assert.True(saved > 0, "User entity was not saved");

            var fetched = await Db.Users.FirstOrDefaultAsync(u => u.Id == user.Id);
            Assert.NotNull(fetched);
            Assert.Equal(user.Email, fetched!.Email);
            Assert.Equal(user.DisplayName, fetched.DisplayName);
        }
    }
}
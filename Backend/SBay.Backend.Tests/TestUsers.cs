using Microsoft.Extensions.DependencyInjection;
using SBay.Domain.Database;
using SBay.Domain.Entities;

public static class TestUsers
{
    public static async Task EnsureDefaultSellerAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        if (await db.Users.FindAsync(TestAuthHandler.SellerId) != null)
            return;

        db.Users.Add(new User
        {
            Id = TestAuthHandler.SellerId,
            Email = $"test.{TestAuthHandler.SellerId:N}@example.com",
            PasswordHash = "$",
            Role = "seller",
            IsSeller = true,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
    }
}

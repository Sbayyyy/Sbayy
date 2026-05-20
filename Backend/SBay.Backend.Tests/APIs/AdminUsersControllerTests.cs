using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using SBay.Backend.Api.Controllers;
using SBay.Domain.Database;
using SBay.Domain.Entities;

public sealed class AdminUsersControllerTests
{
    [Fact]
    public async Task List_ReturnsForbidden_WhenCallerIsNotCurrentAdmin()
    {
        using var factory = new TestWebAppFactory();
        var userId = Guid.NewGuid();
        await SeedUserAsync(factory, userId, "seller", "active");
        var client = CreateAuthedClient(factory, userId, "seller");

        var res = await client.GetAsync("/api/admin/users");

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task List_ReturnsForbidden_WhenTokenSaysAdminButDatabaseRoleDoesNot()
    {
        using var factory = new TestWebAppFactory();
        var userId = Guid.NewGuid();
        await SeedUserAsync(factory, userId, "user", "active");
        var client = CreateAuthedClient(factory, userId, "admin");

        var res = await client.GetAsync("/api/admin/users");

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_CreatesAdminManagedUser_WhenCallerIsCurrentAdmin()
    {
        using var factory = new TestWebAppFactory();
        var adminId = Guid.NewGuid();
        await SeedUserAsync(factory, adminId, "admin", "active");
        var client = CreateAuthedClient(factory, adminId, "admin");
        var email = $"moderator.{Guid.NewGuid():N}@example.com";

        var res = await client.PostAsJsonAsync("/api/admin/users", new
        {
            email,
            password = "StrongAdmin123!",
            displayName = "Moderator",
            role = "support",
            status = "active",
            isSeller = false
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await res.Content.ReadFromJsonAsync<AdminUserDto>();
        body.Should().NotBeNull();
        body!.Email.Should().Be(email);
        body.Role.Should().Be("support");
        body.Status.Should().Be("active");
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("user@localhost")]
    [InlineData("user@example")]
    [InlineData("user@bad_domain.com")]
    public async Task Create_RejectsInvalidEmail(string email)
    {
        using var factory = new TestWebAppFactory();
        var adminId = Guid.NewGuid();
        await SeedUserAsync(factory, adminId, "admin", "active");
        var client = CreateAuthedClient(factory, adminId, "admin");

        var res = await client.PostAsJsonAsync("/api/admin/users", new
        {
            email,
            password = "StrongAdmin123!",
            displayName = "Moderator",
            role = "support",
            status = "active",
            isSeller = false
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_PreventsDemotingLastActiveAdmin()
    {
        using var factory = new TestWebAppFactory();
        var adminId = Guid.NewGuid();
        await SeedUserAsync(factory, adminId, "admin", "active");
        var client = CreateAuthedClient(factory, adminId, "admin");

        var res = await client.PatchAsJsonAsync($"/api/admin/users/{adminId}", new
        {
            role = "user"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private static HttpClient CreateAuthedClient(TestWebAppFactory factory, Guid userId, string role)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Role", role);
        client.DefaultRequestHeaders.Add("X-Test-IsSeller", (role is "seller" or "admin").ToString().ToLowerInvariant());
        return client;
    }

    private static async Task SeedUserAsync(TestWebAppFactory factory, Guid id, string role, string status)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        db.Users.Add(new User
        {
            Id = id,
            Email = $"{id:N}@example.com",
            DisplayName = role,
            PasswordHash = "test",
            Role = role,
            Status = status,
            IsSeller = role is "seller" or "admin",
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
    }
}

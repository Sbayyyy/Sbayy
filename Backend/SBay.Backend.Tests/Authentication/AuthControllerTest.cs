using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

public class AuthControllerTests : IClassFixture<TestWebAppFactory>
{
    private readonly TestWebAppFactory _factory;
    public AuthControllerTests(TestWebAppFactory factory) => _factory = factory;

    [Fact]
    public async Task Register_Returns201_And_SendsVerificationEmail()
    {
        var client = _factory.CreateClient();
        var req = new RegisterRequest($"{Guid.NewGuid():N}@example.com", "Password1!", "Alice");

        var res = await client.PostAsJsonAsync("/api/auth/register", req);
        res.StatusCode.Should().Be(HttpStatusCode.Created);

        var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();
        emailSender.Sent.Should().ContainSingle(m => m.To == req.Email.ToLowerInvariant());
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("user@localhost")]
    [InlineData("user@example")]
    [InlineData("user@bad_domain.com")]
    [InlineData("user@@example.com")]
    public async Task Register_RejectsInvalidEmail(string email)
    {
        var client = _factory.CreateClient();

        var res = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, "Password1!", "Alice"));

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_NormalizesEmail()
    {
        var client = _factory.CreateClient();
        var req = new RegisterRequest($"  USER.{Guid.NewGuid():N}@Example.COM  ", "Password1!", "Alice");

        var res = await client.PostAsJsonAsync("/api/auth/register", req);

        res.StatusCode.Should().Be(HttpStatusCode.Created);
        var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();
        emailSender.Sent.Last().To.Should().Be(req.Email.Trim().ToLowerInvariant());
    }

    [Fact]
    public async Task Login_Succeeds_After_Register()
    {
        var client = _factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";
        var pwd = "Password1!";

        var reg = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, pwd, "Bob"));
        reg.EnsureSuccessStatusCode();

        var token = _factory.Services.GetRequiredService<TestEmailSender>().GetLatestVerificationToken(email);
        var verify = await client.GetAsync($"/api/auth/verify-email?token={Uri.EscapeDataString(token)}");
        verify.EnsureSuccessStatusCode();

        var login = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, pwd));
        login.StatusCode.Should().Be(HttpStatusCode.OK);

        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        auth.Should().NotBeNull();
        auth!.User.Email.Should().Be(email.ToLowerInvariant());
        auth.Token.Should().NotBeNullOrWhiteSpace();
        auth.RefreshToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Login_BeforeEmailVerification_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";
        var pwd = "Password1!";

        var reg = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, pwd, "Bob"));
        reg.EnsureSuccessStatusCode();

        var login = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, pwd));

        login.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task VerifyEmail_ReturnsAuthResponse_AndMarksUserVerified()
    {
        var client = _factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";

        var reg = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, "Password1!", "Verify"));
        reg.EnsureSuccessStatusCode();
        var token = _factory.Services.GetRequiredService<TestEmailSender>().GetLatestVerificationToken(email);

        var verify = await client.GetAsync($"/api/auth/verify-email?token={Uri.EscapeDataString(token)}");

        verify.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await verify.Content.ReadFromJsonAsync<AuthResponse>();
        auth.Should().NotBeNull();
        auth!.User.Email.Should().Be(email.ToLowerInvariant());
        auth.User.Verified.Should().BeTrue();
        auth.Token.Should().NotBeNullOrWhiteSpace();
        auth.RefreshToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Refresh_RotatesRefreshToken_AndOldTokenStopsWorking()
    {
        var client = _factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";
        var pwd = "Password1!";

        var login = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, pwd, "Refresh"));
        login.EnsureSuccessStatusCode();
        var token = _factory.Services.GetRequiredService<TestEmailSender>().GetLatestVerificationToken(email);
        var verify = await client.GetAsync($"/api/auth/verify-email?token={Uri.EscapeDataString(token)}");
        verify.EnsureSuccessStatusCode();
        var initial = await verify.Content.ReadFromJsonAsync<AuthResponse>();
        initial!.RefreshToken.Should().NotBeNullOrWhiteSpace();

        var refresh = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = initial.RefreshToken });
        refresh.StatusCode.Should().Be(HttpStatusCode.OK);
        var refreshed = await refresh.Content.ReadFromJsonAsync<AuthResponse>();
        refreshed!.Token.Should().NotBeNullOrWhiteSpace();
        refreshed.RefreshToken.Should().NotBeNullOrWhiteSpace();
        refreshed.RefreshToken.Should().NotBe(initial.RefreshToken);

        var reuse = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = initial.RefreshToken });
        reuse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_With_WrongPassword_Returns401()
    {
        var client = _factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";

        var reg = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, "Password1!", "Eve"));
        if (!reg.IsSuccessStatusCode)
        {
            var err = await reg.Content.ReadAsStringAsync();
            throw new Exception($"Register failed ({(int)reg.StatusCode}): {err}");
        }

        var bad = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "Wrong!"));
        bad.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_With_Valid_Token_Returns_User()
    {
        
        try
        {
            var (client, auth) = await AuthTestClient.CreateAuthedAsync(_factory);


        
        var res = await client.GetAsync("/api/auth/me");
        if (!res.IsSuccessStatusCode)
        {
            var body = await res.Content.ReadAsStringAsync();
            throw new Exception($"get me failed: {(int)res.StatusCode} {res.ReasonPhrase}\n{body}");
        }
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var me = await res.Content.ReadFromJsonAsync<UserDto>();
        me.Should().NotBeNull();
        me!.Id.Should().Be(auth.User.Id);
        me.Email.Should().Be(auth.User.Email);
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            throw;
        }

    }

    [Fact]
    public async Task FallbackPolicy_Blocks_Anonymous_Me()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/auth/me");
        res.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeactivatedAccount_IsBlocked_AndCannotLoginAgain()
    {
        var password = "Password1!";
        var (client, auth) = await AuthTestClient.CreateAuthedAsync(_factory, "deactivate", password);

        var deactivate = await client.DeleteAsync("/api/users/me");
        deactivate.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var authedMe = await client.GetAsync("/api/auth/me");
        authedMe.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var login = await _factory.CreateClient().PostAsJsonAsync("/api/auth/login",
            new LoginRequest(auth.User.Email, password));
        login.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}

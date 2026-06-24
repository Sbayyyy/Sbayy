using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.WebUtilities;
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
        emailSender.Sent.Should().Contain(m => m.To == req.Email.Trim().ToLowerInvariant());
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
        var verify = await client.PostAsJsonAsync("/api/auth/verify-email", new { token });
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
    public async Task Login_BeforeEmailVerification_SucceedsWithUnverifiedUser()
    {
        var client = _factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";
        var pwd = "Password1!";

        var reg = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, pwd, "Bob"));
        reg.EnsureSuccessStatusCode();

        var login = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, pwd));

        login.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        auth!.User.Verified.Should().BeFalse();
        auth.Token.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GoogleLogin_CreatesUser_AndReturnsAuthResponse()
    {
        var client = _factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";

        var response = await client.PostAsJsonAsync("/api/auth/google", new
        {
            idToken = $"google-sub-1|{email}|Google User"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        auth.Should().NotBeNull();
        auth!.User.Email.Should().Be(email.ToLowerInvariant());
        auth.User.DisplayName.Should().Be("Google User");
        auth.User.Verified.Should().BeTrue();
        auth.Token.Should().NotBeNullOrWhiteSpace();
        auth.RefreshToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GoogleLogin_LinksExistingEmailUser()
    {
        var client = _factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";

        var registration = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, "Password1!", "Existing User"));
        registration.EnsureSuccessStatusCode();

        var response = await client.PostAsJsonAsync("/api/auth/google", new
        {
            idToken = $"google-sub-2|{email}|Google Name"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        auth.Should().NotBeNull();
        auth!.User.Email.Should().Be(email.ToLowerInvariant());
        auth.User.DisplayName.Should().Be("Existing User");
        auth.User.Verified.Should().BeTrue();
        auth.RefreshToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GoogleLogin_ReturningGoogleUser_Succeeds()
    {
        var client = _factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";
        var token = $"google-sub-3|{email}|Returning User";

        var first = await client.PostAsJsonAsync("/api/auth/google", new { idToken = token });
        first.EnsureSuccessStatusCode();
        var firstAuth = await first.Content.ReadFromJsonAsync<AuthResponse>();

        var second = await client.PostAsJsonAsync("/api/auth/google", new { idToken = token });

        second.StatusCode.Should().Be(HttpStatusCode.OK);
        var secondAuth = await second.Content.ReadFromJsonAsync<AuthResponse>();
        secondAuth.Should().NotBeNull();
        secondAuth!.User.Id.Should().Be(firstAuth!.User.Id);
        secondAuth.RefreshToken.Should().NotBeNullOrWhiteSpace();
        secondAuth.RefreshToken.Should().NotBe(firstAuth.RefreshToken);
    }

    [Fact]
    public async Task GoogleLogin_RejectsInvalidToken()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/google", new
        {
            idToken = "invalid"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("|user@example.com|Google User")]
    [InlineData("google-sub| |Google User")]
    public async Task GoogleLogin_RejectsMissingRequiredGoogleClaims(string idToken)
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/google", new
        {
            idToken
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GoogleLogin_RejectsUnverifiedGoogleEmail()
    {
        var client = _factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";

        var response = await client.PostAsJsonAsync("/api/auth/google", new
        {
            idToken = $"google-sub-4|{email}|Google User|unverified"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GoogleMobileStart_RedirectsToGoogleWithSignedState()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var response = await client.GetAsync("/api/auth/google/mobile/start?redirectUri=sbay%3A%2F%2Fauth%2Fgoogle");

        response.StatusCode.Should().Be(HttpStatusCode.Redirect);
        var location = response.Headers.Location;
        location.Should().NotBeNull();
        location!.Host.Should().Be("accounts.google.com");
        location.AbsolutePath.Should().Be("/o/oauth2/v2/auth");

        var query = QueryHelpers.ParseQuery(location.Query);
        query["client_id"].ToString().Should().Be("test-web-client.apps.googleusercontent.com");
        query["response_type"].ToString().Should().Be("code");
        query["scope"].ToString().Should().Contain("openid");
        query["redirect_uri"].ToString().Should().EndWith("/api/auth/google/mobile/callback");
        query["state"].ToString().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GoogleMobileStart_AcceptsExpoThreeSlashRedirectUri()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var response = await client.GetAsync("/api/auth/google/mobile/start?redirectUri=sbay%3A%2F%2F%2Fauth%2Fgoogle");

        response.StatusCode.Should().Be(HttpStatusCode.Redirect);
        var query = QueryHelpers.ParseQuery(response.Headers.Location!.Query);
        query["state"].ToString().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GoogleMobileStart_RejectsUnapprovedRedirectUri()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var response = await client.GetAsync("/api/auth/google/mobile/start?redirectUri=https%3A%2F%2Fevil.example%2Fcallback");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GoogleMobileCallback_RejectsInvalidState()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var response = await client.GetAsync("/api/auth/google/mobile/callback?code=any-code&state=tampered");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GoogleMobileCallback_ExchangesCode_AndRedirectsToAppWithTokens()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
        var email = $"{Guid.NewGuid():N}@example.com";
        var start = await client.GetAsync("/api/auth/google/mobile/start?redirectUri=sbay%3A%2F%2Fauth%2Fgoogle");
        var state = QueryHelpers.ParseQuery(start.Headers.Location!.Query)["state"].ToString();

        var callback = await client.GetAsync(
            $"/api/auth/google/mobile/callback?code={Uri.EscapeDataString($"mobile-sub-1|{email}|Mobile User")}&state={Uri.EscapeDataString(state)}");

        callback.StatusCode.Should().Be(HttpStatusCode.Redirect);
        var location = callback.Headers.Location;
        location.Should().NotBeNull();
        location!.Scheme.Should().Be("sbay");
        location.Host.Should().Be("auth");
        location.AbsolutePath.Should().Be("/google");

        var query = QueryHelpers.ParseQuery(location.Query);
        query["token"].ToString().Should().NotBeNullOrWhiteSpace();
        query["refreshToken"].ToString().Should().NotBeNullOrWhiteSpace();
        query["refreshTokenExpiresAt"].ToString().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GoogleMobileCallback_PostWithIdToken_ReturnsAuthResponse()
    {
        var client = _factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";

        var response = await client.PostAsJsonAsync("/api/auth/google/mobile/callback", new
        {
            idToken = $"mobile-post-sub|{email}|Mobile User"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        auth.Should().NotBeNull();
        auth!.User.Email.Should().Be(email.ToLowerInvariant());
        auth.User.DisplayName.Should().Be("Mobile User");
        auth.RefreshToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GoogleMobileCallback_PostWithCode_ReturnsAuthResponse()
    {
        var client = _factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";

        var response = await client.PostAsJsonAsync("/api/auth/google/mobile/callback", new
        {
            code = $"mobile-post-code-sub|{email}|Mobile User",
            redirectUri = "sbay:///auth/google"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        auth.Should().NotBeNull();
        auth!.User.Email.Should().Be(email.ToLowerInvariant());
        auth.User.DisplayName.Should().Be("Mobile User");
        auth.RefreshToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GoogleMobileCallback_PostWithCode_RejectsUnapprovedRedirectUri()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/google/mobile/callback", new
        {
            code = "mobile-post-sub|user@example.com|Mobile User",
            redirectUri = "https://evil.example/callback"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task VerifyEmail_MarksUserVerified_AndAllowsLogin()
    {
        var client = _factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";

        var reg = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, "Password1!", "Verify"));
        reg.EnsureSuccessStatusCode();
        var token = _factory.Services.GetRequiredService<TestEmailSender>().GetLatestVerificationToken(email);

        var verify = await client.PostAsJsonAsync("/api/auth/verify-email", new { token });

        verify.StatusCode.Should().Be(HttpStatusCode.OK);
        var login = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "Password1!"));
        login.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        auth!.User.Verified.Should().BeTrue();
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
        var verify = await client.PostAsJsonAsync("/api/auth/verify-email", new { token });
        verify.EnsureSuccessStatusCode();
        var loginAuth = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, pwd));
        loginAuth.EnsureSuccessStatusCode();
        var initial = await loginAuth.Content.ReadFromJsonAsync<AuthResponse>();
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
    public async Task Logout_RevokesRefreshToken()
    {
        var client = _factory.CreateClient();
        var email = $"{Guid.NewGuid():N}@example.com";
        var pwd = "Password1!";

        var registration = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, pwd, "Logout"));
        registration.EnsureSuccessStatusCode();
        var verificationToken = _factory.Services.GetRequiredService<TestEmailSender>().GetLatestVerificationToken(email);
        var verify = await client.PostAsJsonAsync("/api/auth/verify-email", new { token = verificationToken });
        verify.EnsureSuccessStatusCode();

        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, pwd));
        login.EnsureSuccessStatusCode();
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        auth!.RefreshToken.Should().NotBeNullOrWhiteSpace();

        var logout = await client.PostAsJsonAsync("/api/auth/logout", new { refreshToken = auth.RefreshToken });
        logout.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var refresh = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = auth.RefreshToken });
        refresh.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ChangePassword_RevokesRefreshTokens()
    {
        var password = "Password1!";
        var newPassword = "NewPassword1!";
        var (client, auth) = await AuthTestClient.CreateAuthedAsync(_factory, "change-password", password);
        auth.RefreshToken.Should().NotBeNullOrWhiteSpace();

        var changePassword = await client.PostAsJsonAsync("/api/auth/change-password", new
        {
            currentPassword = password,
            newPassword
        });
        changePassword.StatusCode.Should().Be(HttpStatusCode.OK);

        var refresh = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = auth.RefreshToken });
        refresh.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var login = await _factory.CreateClient().PostAsJsonAsync("/api/auth/login",
            new LoginRequest(auth.User.Email, newPassword));
        login.StatusCode.Should().Be(HttpStatusCode.OK);
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

    [Fact]
    public async Task AccountDeletionRequest_DeactivatesAccount_AndReturnsSchedule()
    {
        var password = "Password1!";
        var (client, auth) = await AuthTestClient.CreateAuthedAsync(_factory, "delete-request", password);

        var response = await client.PostAsJsonAsync("/api/users/me/deletion-request", new { reason = "privacy" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AccountDeletionRequestDto>();
        body.Should().NotBeNull();
        body!.Status.Should().Be("requested");
        body.ScheduledDeletionAt.Should().BeAfter(body.RequestedAt);

        var login = await _factory.CreateClient().PostAsJsonAsync("/api/auth/login",
            new LoginRequest(auth.User.Email, password));
        login.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private sealed record AccountDeletionRequestDto(
        string Status,
        DateTimeOffset RequestedAt,
        DateTimeOffset ScheduledDeletionAt,
        string? Reason);
}

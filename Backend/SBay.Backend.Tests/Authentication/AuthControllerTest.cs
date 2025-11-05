using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

public class AuthControllerTests : IClassFixture<TestWebAppFactory>
{
    private readonly TestWebAppFactory _factory;
    public AuthControllerTests(TestWebAppFactory factory) => _factory = factory;

    [Fact]
    public async Task Register_Returns201_And_Token_And_UserDto()
    {
        var client = _factory.CreateClient();
        var req = new RegisterRequest($"{Guid.NewGuid():N}@example.com", "Password1!", "Alice");

        var res = await client.PostAsJsonAsync("/api/auth/register", req);
        res.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        body.Should().NotBeNull();
        body!.User.Email.Should().Be(req.Email.ToLowerInvariant());
        body.Token.Should().NotBeNullOrWhiteSpace();
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

        var login = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, pwd));
        login.StatusCode.Should().Be(HttpStatusCode.OK);

        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        auth.Should().NotBeNull();
        auth!.User.Email.Should().Be(email.ToLowerInvariant());
        auth.Token.Should().NotBeNullOrWhiteSpace();
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
}

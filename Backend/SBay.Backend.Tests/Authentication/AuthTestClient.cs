using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;

public static class AuthTestClient
{
    public static async Task<(HttpClient client, AuthResponse auth)> CreateAuthedAsync(
        TestWebAppFactory factory,
        string email = "users",
        string password = "Password1!")
    {
        var client = factory.CreateClient();
        var uniqueEmail = $"{email}.{Guid.NewGuid():N}@example.com";

        var reg = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(uniqueEmail, password, "Test User","01231294890"));
        if (!reg.IsSuccessStatusCode)
        {
            var body = await reg.Content.ReadAsStringAsync();
            throw new Exception($"Register failed: {(int)reg.StatusCode} {reg.ReasonPhrase}\n{body}");
        }

        var emailSender = factory.Services.GetRequiredService<TestEmailSender>();
        var token = emailSender.GetLatestVerificationToken(uniqueEmail);
        var verify = await client.PostAsJsonAsync("/api/auth/verify-email", new { token });
        verify.EnsureSuccessStatusCode();

        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(uniqueEmail, password));
        login.EnsureSuccessStatusCode();

        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>()
                   ?? throw new InvalidOperationException("Login returned no body");

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
        client.DefaultRequestHeaders.Add("X-Test-UserId", auth.User.Id.ToString());

        return (client, auth);
    }
}

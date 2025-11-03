using System.Net.Http.Headers;
using System.Net.Http.Json;

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

        var auth = await reg.Content.ReadFromJsonAsync<AuthResponse>()
                   ?? throw new InvalidOperationException("Register returned no body");

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth.Token);

        return (client, auth);
    }
}
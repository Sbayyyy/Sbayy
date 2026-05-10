using System.Net;
using System.Net.Http.Headers;
using FluentAssertions;
using Xunit;

public class UploadsControllerTests : IClassFixture<TestWebAppFactory>
{
    private readonly TestWebAppFactory _factory;

    public UploadsControllerTests(TestWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task UploadAvatar_Rejects_FileWithImageExtensionButInvalidBytes()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
        client.DefaultRequestHeaders.Add("X-Test-Scopes", "users.write");

        using var content = new MultipartFormDataContent();
        using var file = new ByteArrayContent("not an image"u8.ToArray());
        file.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        content.Add(file, "file", "avatar.jpg");

        var res = await client.PostAsync("/api/uploads/avatar", content);

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}

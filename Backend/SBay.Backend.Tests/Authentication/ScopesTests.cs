using SBay.Domain.Authentication;
using SBay.Domain.Entities;
using Xunit;

public sealed class ScopesTests
{
    [Fact]
    public void ForUser_RemovesListingAndMessageWrite_WhenEmailIsUnverified()
    {
        var user = new User
        {
            Email = "buyer@example.com",
            PasswordHash = "hash",
            IsSeller = true,
            Role = "user",
            EmailVerified = false
        };

        var scopes = Scopes.ForUser(user);

        Assert.Contains(Scopes.ListingsRead, scopes);
        Assert.Contains(Scopes.MessagesRead, scopes);
        Assert.DoesNotContain(Scopes.ListingsWrite, scopes);
        Assert.DoesNotContain(Scopes.MessagesWrite, scopes);
    }

    [Fact]
    public void ForUser_KeepsListingAndMessageWrite_WhenEmailIsVerified()
    {
        var user = new User
        {
            Email = "seller@example.com",
            PasswordHash = "hash",
            IsSeller = true,
            Role = "user",
            EmailVerified = true
        };

        var scopes = Scopes.ForUser(user);

        Assert.Contains(Scopes.ListingsWrite, scopes);
        Assert.Contains(Scopes.MessagesWrite, scopes);
    }
}

using System.Collections.Generic;
using System.Linq;
using FluentAssertions;
using Google.Cloud.Firestore;
using Google.Cloud.Firestore.V1;
using Grpc.Core;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SBay.Backend.DataBase.Firebase;
using SBay.Backend.DataBase.Interfaces;
using SBay.Domain.Database;
using Xunit;

namespace SBay.Backend.Tests.Configuration;

public sealed class DatabaseProviderTests
{
    [Fact]
    public void DefaultProvider_UsesEntityFramework()
    {
        using var factory = new TestWebAppFactory();
        var repo = factory.Services.GetRequiredService<IListingRepository>();
        repo.Should().BeOfType<EfListingRepository>();

        var analytics = factory.Services.GetRequiredService<IUserAnalyticsService>();
        analytics.Should().BeOfType<EfUserAnalyticsService>();
    }

    [Fact]
    public void FirestoreProvider_UsesFirebaseRepositories()
    {
        using var factory = new FirestoreWebAppFactory();
        var repo = factory.Services.GetRequiredService<IListingRepository>();
        repo.Should().BeOfType<FirebaseListingRepository>();

        var analytics = factory.Services.GetRequiredService<IUserAnalyticsService>();
        analytics.Should().BeOfType<FirebaseUserAnalyticsService>();
    }

    private sealed class FirestoreWebAppFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((context, config) =>
            {
                var overrides = new Dictionary<string, string?>
                {
                    ["Database:Provider"] = "firestore",
                    ["Firebase:ProjectId"] = "test-project",
                    ["Firebase:CredentialsPath"] = string.Empty
                };
                config.AddInMemoryCollection(overrides);
            });

            builder.ConfigureTestServices(services =>
            {
                var existing = services.FirstOrDefault(d => d.ServiceType == typeof(FirestoreDb));
                if (existing != null)
                    services.Remove(existing);

                services.AddSingleton(CreateStubFirestoreDb());
            });
        }
    }

    private static FirestoreDb CreateStubFirestoreDb()
    {
        var clientBuilder = new FirestoreClientBuilder
        {
            ChannelCredentials = ChannelCredentials.Insecure,
            Endpoint = "localhost:1"
        };
        var client = clientBuilder.Build();
        return FirestoreDb.Create("test-project", client);
    }
}

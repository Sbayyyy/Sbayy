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
    public void FirestoreProvider_FailsFast_WhenRefreshTokensUnsupported()
    {
        var previousProvider = Environment.GetEnvironmentVariable("Database__Provider");
        var previousProject = Environment.GetEnvironmentVariable("Firebase__ProjectId");
        var previousCredentials = Environment.GetEnvironmentVariable("Firebase__CredentialsPath");
        var previousReports = Environment.GetEnvironmentVariable("EnableFirestoreReports");
        var previousBlocks = Environment.GetEnvironmentVariable("EnableFirestoreUserBlocks");
        try
        {
            Environment.SetEnvironmentVariable("Database__Provider", "firestore");
            Environment.SetEnvironmentVariable("Firebase__ProjectId", "test-project");
            Environment.SetEnvironmentVariable("Firebase__CredentialsPath", string.Empty);
            Environment.SetEnvironmentVariable("EnableFirestoreReports", "true");
            Environment.SetEnvironmentVariable("EnableFirestoreUserBlocks", "true");
            using var factory = new FirestoreWebAppFactory();
            var act = () => factory.Services.GetRequiredService<IListingRepository>();

            act.Should().Throw<InvalidOperationException>()
                .WithMessage("Firestore refresh-token repository not implemented; change Database:Provider or implement FirebaseRefreshTokenRepository.");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Database__Provider", previousProvider);
            Environment.SetEnvironmentVariable("Firebase__ProjectId", previousProject);
            Environment.SetEnvironmentVariable("Firebase__CredentialsPath", previousCredentials);
            Environment.SetEnvironmentVariable("EnableFirestoreReports", previousReports);
            Environment.SetEnvironmentVariable("EnableFirestoreUserBlocks", previousBlocks);
        }
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
                    ["Firebase:CredentialsPath"] = string.Empty,
                    ["EnableFirestoreReports"] = "true",
                    ["EnableFirestoreUserBlocks"] = "true"
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

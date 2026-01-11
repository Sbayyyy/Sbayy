using System;
using System.Threading;
using System.Threading.Tasks;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using Google.Cloud.Firestore.V1;
using SBay.Backend.DataBase.Firebase;
using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;
using Xunit;

namespace SBay.Backend.Tests.DB;

public sealed class FirestoreRepositoryTests
{
    [Fact]
    public async Task ListingRepository_AddsAndLoadsListing()
    {
        var db = CreateFirestoreDb();
        if (db is null) return;
        var repo = new FirebaseListingRepository(db);
        var listing = new Listing(
            sellerId: Guid.NewGuid(),
            title: "Test Listing",
            desc: "Firestore integration test listing.",
            price: new Money(25.50m, "USD"),
            stock: 3,
            condition: ItemCondition.Used,
            categoryPath: "electronics/phones",
            region: "NA"
        );

        var ct = CancellationToken.None;
        var keepData = IsKeepDataEnabled();
        try
        {
            await repo.AddAsync(listing, ct);
            var fetched = await repo.GetByIdAsync(listing.Id, ct);

            Assert.NotNull(fetched);
            Assert.Equal(listing.Id, fetched!.Id);
            Assert.Equal(listing.SellerId, fetched.SellerId);
            Assert.Equal(listing.Title, fetched.Title);
            Assert.Equal(listing.Price.Amount, fetched.Price.Amount);
            Assert.Equal(listing.Price.Currency, fetched.Price.Currency);
            Assert.Equal(listing.CategoryPath, fetched.CategoryPath);
        }
        finally
        {
            if (!keepData)
            {
                await db.Collection("listings")
                    .Document(listing.Id.ToString())
                    .DeleteAsync(cancellationToken: ct);
            }
        }
    }

    [Fact]
    public async Task UserRepository_AddsAndLoadsUser()
    {
        var db = CreateFirestoreDb();
        if (db is null) return;
        var repo = new FirebaseUserRepository(db);
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "firestore.user@example.com",
            ExternalId = "ext-firestore-user",
            DisplayName = "Firestore User",
            PasswordHash = "hashed-pwd",
            Role = "user",
            IsSeller = true,
            CreatedAt = DateTime.UtcNow
        };

        var ct = CancellationToken.None;
        var keepData = IsKeepDataEnabled();
        try
        {
            await repo.AddAsync(user, ct);
            var fetched = await repo.GetByEmailAsync(user.Email, ct);

            Assert.NotNull(fetched);
            Assert.Equal(user.Id, fetched!.Id);
            Assert.Equal(user.Email, fetched.Email);
            Assert.Equal(user.ExternalId, fetched.ExternalId);
            Assert.Equal(user.DisplayName, fetched.DisplayName);
        }
        finally
        {
            if (!keepData)
            {
                await db.Collection("users")
                    .Document(user.Id.ToString())
                    .DeleteAsync(cancellationToken: ct);
            }
        }
    }

    private static FirestoreDb? CreateFirestoreDb()
    {
        var useReal = Environment.GetEnvironmentVariable("FIRESTORE_USE_REAL");
        if (string.Equals(useReal, "true", StringComparison.OrdinalIgnoreCase))
        {
            var realProjectId = Environment.GetEnvironmentVariable("FIRESTORE_PROJECT_ID");
            if (string.IsNullOrWhiteSpace(realProjectId))
                throw new InvalidOperationException("Set FIRESTORE_PROJECT_ID to use real Firestore.");

            var realDatabaseId = Environment.GetEnvironmentVariable("FIRESTORE_DATABASE_ID");
            var builder = new FirestoreDbBuilder { ProjectId = realProjectId };
            if (!string.IsNullOrWhiteSpace(realDatabaseId))
                builder.DatabaseId = realDatabaseId;
            var credentialsPath = Environment.GetEnvironmentVariable("FIRESTORE_CREDENTIALS_PATH");
            if (!string.IsNullOrWhiteSpace(credentialsPath))
                builder.Credential = GoogleCredential.FromFile(credentialsPath);

            return builder.Build();
        }

        var host = Environment.GetEnvironmentVariable("FIRESTORE_EMULATOR_HOST");
        if (string.IsNullOrWhiteSpace(host))
            return null;

        var emulatorProjectId = Environment.GetEnvironmentVariable("FIRESTORE_PROJECT_ID") ?? "test-project";
        var emulatorDatabaseId = Environment.GetEnvironmentVariable("FIRESTORE_DATABASE_ID");
        var client = new FirestoreClientBuilder
        {
            Endpoint = host,
            ChannelCredentials = Grpc.Core.ChannelCredentials.Insecure
        }.Build();
        return new FirestoreDbBuilder
        {
            ProjectId = emulatorProjectId,
            DatabaseId = emulatorDatabaseId ?? "(default)",
            ChannelCredentials = Grpc.Core.ChannelCredentials.Insecure,
            Endpoint = host
        }.Build();
    }

    private static bool IsKeepDataEnabled()
        => string.Equals(
            Environment.GetEnvironmentVariable("FIRESTORE_KEEP_TEST_DATA"),
            "true",
            StringComparison.OrdinalIgnoreCase);
}

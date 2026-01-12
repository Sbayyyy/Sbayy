using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;

static string RequireEnv(string name)
{
    var value = Environment.GetEnvironmentVariable(name);
    if (string.IsNullOrWhiteSpace(value))
        throw new InvalidOperationException($"Missing required env var: {name}");
    return value;
}

var projectId = RequireEnv("FIRESTORE_PROJECT_ID");
var credentialsPath = RequireEnv("FIRESTORE_CREDENTIALS_PATH");
var databaseId = Environment.GetEnvironmentVariable("FIRESTORE_DATABASE_ID") ?? "(default)";

var builder = new FirestoreDbBuilder
{
    ProjectId = projectId,
    DatabaseId = databaseId,
    Credential = GoogleCredential.FromFile(credentialsPath)
};

var db = builder.Build();

var deletes = 0;

async Task<int> DeleteByQuery(string collection, Query query)
{
    var snap = await query.GetSnapshotAsync();
    if (snap.Count == 0) return 0;

    var batch = db.StartBatch();
    foreach (var doc in snap.Documents)
        batch.Delete(doc.Reference);
    await batch.CommitAsync();
    return snap.Count;
}

deletes += await DeleteByQuery(
    "users",
    db.Collection("users").WhereEqualTo("Email", "firestore.user@example.com"));

deletes += await DeleteByQuery(
    "listings",
    db.Collection("listings")
        .WhereEqualTo("Title", "Test Listing")
        .WhereEqualTo("Description", "Firestore integration test listing."));

Console.WriteLine($"Deleted {deletes} Firestore test documents.");

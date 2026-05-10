using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SBay.Domain.Database;
using Testcontainers.PostgreSql;

public class TestDatabaseFixture : IAsyncLifetime
{
    private DbContextOptions<EfDbContext> _options = default!;
    private PostgreSqlContainer? _postgres;

    public EfDbContext CreateContext() => new EfDbContext(_options);

    public async Task InitializeAsync()
    {
        var cfg = new ConfigurationBuilder()
            .AddEnvironmentVariables()
            .Build();

        var connStr = cfg.GetConnectionString("Default")
                      ?? Environment.GetEnvironmentVariable("SBAY_TEST_CONNECTION_STRING");
        if (string.IsNullOrWhiteSpace(connStr))
        {
            _postgres = new PostgreSqlBuilder()
                .WithImage("postgres:16-alpine")
                .WithDatabase("sbay_tests")
                .WithUsername("sbay_tests")
                .WithPassword("sbay_tests_password")
                .Build();
            await _postgres.StartAsync();
            connStr = _postgres.GetConnectionString();
        }

        _options = new DbContextOptionsBuilder<EfDbContext>()
            .UseNpgsql(connStr)
            .UseSnakeCaseNamingConvention()
            .Options;

        await using var db = new EfDbContext(_options);
        await ApplySchemaAsync(db);
    }

    public async Task DisposeAsync()
    {
        if (_postgres is not null)
            await _postgres.DisposeAsync();
    }

    private static async Task ApplySchemaAsync(EfDbContext db)
    {
        var root = FindRepositoryRoot();
        var schema = await File.ReadAllTextAsync(Path.Combine(root, "Database", "01_schema.sql"));
        var ecommerce = await File.ReadAllTextAsync(Path.Combine(root, "Database", "03_ecommerce.sql"));
        await db.Database.ExecuteSqlRawAsync(schema);
        await db.Database.ExecuteSqlRawAsync(ecommerce);
    }

    private static string FindRepositoryRoot()
    {
        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (dir is not null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "Database")) &&
                File.Exists(Path.Combine(dir.FullName, "sbay.sln")))
            {
                return dir.FullName;
            }

            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("Could not find repository root.");
    }
}

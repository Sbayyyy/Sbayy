using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SBay.Domain.Database;

public class TestDatabaseFixture : IAsyncLifetime
{
    private DbContextOptions<EfDbContext> _options = default!;

    public EfDbContext CreateContext() => new EfDbContext(_options);

    public async Task InitializeAsync()
    {
        var cfg = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("ConnectionStrings.json", optional: false, reloadOnChange: false)
            .Build();

        var connStr = cfg.GetConnectionString("Default")
                      ?? throw new InvalidOperationException("Missing ConnectionStrings:Default");

        _options = new DbContextOptionsBuilder<EfDbContext>()
            .UseNpgsql(connStr)
            .UseSnakeCaseNamingConvention()
            .Options;

        await using var db = new EfDbContext(_options);
        await db.Database.EnsureCreatedAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;
}
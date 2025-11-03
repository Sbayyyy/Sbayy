using Microsoft.EntityFrameworkCore.Storage;
using SBay.Domain.Database;

namespace SBay.Backend.Tests;

public class DBScopedTest:IAsyncLifetime
{
    protected readonly TestDatabaseFixture Fx;
    protected EfDbContext Db = default!;
    private IDbContextTransaction? _tx;
    protected DBScopedTest(TestDatabaseFixture fx) => Fx = fx;

    public async Task InitializeAsync()
    {
        Db = Fx.CreateContext();
        _tx = await Db.Database.BeginTransactionAsync();
    }

    public async Task DisposeAsync()
    {
        if (_tx != null) await _tx.RollbackAsync();
        await Db.DisposeAsync();
    }
}
namespace SBay.Domain.Database
{
    public interface IReadStore<T>
    {
        Task<T?> GetByIdAsync(Guid id, CancellationToken ct);
        Task<bool> ExistAsync(Guid id, CancellationToken ct);
    }
}

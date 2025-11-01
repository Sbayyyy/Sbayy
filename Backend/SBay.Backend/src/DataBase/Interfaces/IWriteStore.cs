namespace SBay.Domain.Database
{
    public interface IWriteStore<T>
    {
        Task AddAsync(T entity, CancellationToken ct);
        Task UpdateAsync(T entity, CancellationToken ct);
        Task RemoveAsync(T entity, CancellationToken ct);
    }
}
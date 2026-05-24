namespace SBay.Domain.Database;

public interface IUserInteractionRepository
{
    Task RecordAsync(Guid userId, string category, double weight, DateTimeOffset now, CancellationToken ct);
    Task<IReadOnlyList<string>> GetTopCategoriesAsync(Guid userId, int limit, CancellationToken ct);
}

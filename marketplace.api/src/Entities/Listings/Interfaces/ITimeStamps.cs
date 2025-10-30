namespace SBay.Domain.Entities
{
    public interface ITimestamps
    {
        DateTime CreatedAt { get; }
        DateTime? UpdatedAt { get; }
    }
}
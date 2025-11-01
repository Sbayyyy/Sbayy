namespace SBay.Domain.Entities
{
    public interface IItem
    {
        Guid Id { get; }
        Guid SellerId { get; }
        string Title { get; }
        string Description { get; }
    }
}
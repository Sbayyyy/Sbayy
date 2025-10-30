namespace SBay.Domain.Entities
{
    public interface IItem
    {
        Guid Id { get; }
        Guid SellerId { get; }
        string Title { get; }
        string Description { get; }

        Money Price { get; }
        Money? OriginalPrice { get; }

        ItemCondition Condition { get; }
        string? CategoryPath { get; }

        int StockQuantity { get; }
        string? ThumbnailUrl { get; }

        DateTime CreatedAt { get; }
        DateTime? UpdatedAt { get; }
    }
}
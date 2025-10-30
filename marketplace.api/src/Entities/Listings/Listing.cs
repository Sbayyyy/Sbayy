
namespace SBay.Domain.Entities
{
    //TODO: Implement This Class
    public class Listing : IItem
    {
        public Guid Id => throw new NotImplementedException();

        public Guid SellerId => throw new NotImplementedException();

        public string Title => throw new NotImplementedException();

        public string Description => throw new NotImplementedException();

        public Money Price => throw new NotImplementedException();

        public Money? OriginalPrice => throw new NotImplementedException();

        public ItemCondition Condition => throw new NotImplementedException();

        public string? CategoryPath => throw new NotImplementedException();

        public int StockQuantity => throw new NotImplementedException();

        public string? ThumbnailUrl => throw new NotImplementedException();

        public DateTime CreatedAt => throw new NotImplementedException();

        public DateTime? UpdatedAt => throw new NotImplementedException();
    }
}

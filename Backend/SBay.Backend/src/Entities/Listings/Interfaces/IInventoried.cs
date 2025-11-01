namespace SBay.Domain.Entities
{
    public interface IInventoried
    {
        int StockQuantity { get; }                   // non-negative; mutations via domain methods
    }
}
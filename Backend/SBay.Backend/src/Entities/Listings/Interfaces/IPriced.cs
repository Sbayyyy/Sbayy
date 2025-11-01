namespace SBay.Domain.Entities
{
    public interface IPriced
    {
        ValueObjects.Money Price { get; }            // current unit price (incl/excl tax? decide)
        ValueObjects.Money? OriginalPrice { get; }   // present when discounted, else null
    }
}

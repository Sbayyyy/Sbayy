namespace SBay.Domain.Entities
{
    public interface IPriced
    {
        ValueObjects.Money Price { get; }            
        ValueObjects.Money? OriginalPrice { get; }   
    }
}

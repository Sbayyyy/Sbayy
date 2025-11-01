namespace SBay.Domain.Entities
{
    public interface IConditioned
    {
        ItemCondition Condition { get; }
    }
}
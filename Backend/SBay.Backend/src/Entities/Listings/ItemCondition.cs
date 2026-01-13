public enum ItemCondition
{
    Unknown,
    New,
    Used,
    LikeNew,
    ForParts,
    Refurbished,
    Damaged
};
public static class ItemConditionExtensions
{
    public static ItemCondition FromString(string? condition)
    {
        return condition?.Trim().ToLower() switch
        {
            "new" => ItemCondition.New,
            "likenew" or "like new" => ItemCondition.LikeNew,
            "used" => ItemCondition.Used,
            "forparts" or "for parts" => ItemCondition.ForParts,
            "refurbished" => ItemCondition.Refurbished,
            "damaged" => ItemCondition.Damaged,
            "unknown" => ItemCondition.Unknown,
            _ => ItemCondition.Unknown,
        };
    }
    public static string ToFriendlyString(this ItemCondition condition)
    {
        return condition switch
        {
            ItemCondition.New => "New",
            ItemCondition.LikeNew => "Like New",
            ItemCondition.Used => "Used",
            ItemCondition.ForParts => "For Parts",
            _ => "Unknown",
        };
    }
}


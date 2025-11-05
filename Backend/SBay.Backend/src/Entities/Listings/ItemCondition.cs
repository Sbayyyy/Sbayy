public enum ItemCondition
{
    Unknown = 0,
    New,
    LikeNew,
    Used,
    ForParts
}
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


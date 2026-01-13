namespace SBay.Backend.DataBase.Firebase.Models;

internal static class DecimalCentsConverter
{
    public static long ToFirestoreCents(decimal value)
    {
        return (long)Math.Round(value * 100m, 0, MidpointRounding.AwayFromZero);
    }

    public static long? ToFirestoreCents(decimal? value)
    {
        if (!value.HasValue)
            return null;
        return (long)Math.Round(value.Value * 100m, 0, MidpointRounding.AwayFromZero);
    }

    public static decimal FromFirestoreCents(object value)
    {
        return ConvertValue(value);
    }

    public static decimal? FromFirestoreCentsNullable(object? value)
    {
        if (value is null)
            return null;
        return ConvertValue(value);
    }

    private static decimal ConvertValue(object value)
    {
        return value switch
        {
            long l => l / 100m,
            int i => i / 100m,
            double d => (decimal)d / 100m,
            decimal m => m / 100m,
            string s when decimal.TryParse(s, out var parsed) => parsed / 100m,
            _ => throw new ArgumentException($"Unsupported Firestore numeric value type: {value?.GetType().FullName}")
        };
    }
}

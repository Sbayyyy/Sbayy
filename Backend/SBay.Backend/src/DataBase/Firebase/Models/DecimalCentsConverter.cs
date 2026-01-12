using Google.Cloud.Firestore;

namespace SBay.Backend.DataBase.Firebase.Models;

internal sealed class DecimalCentsConverter : FirestoreConverter<decimal>
{
    public override object ToFirestore(decimal value)
    {
        return (long)Math.Round(value * 100m, 0, MidpointRounding.AwayFromZero);
    }

    public override decimal FromFirestore(object value)
    {
        return ConvertValue(value);
    }

    internal static decimal ConvertValue(object value)
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

internal sealed class NullableDecimalCentsConverter : FirestoreConverter<decimal?>
{
    public override object? ToFirestore(decimal? value)
    {
        if (!value.HasValue)
            return null;
        return (long)Math.Round(value.Value * 100m, 0, MidpointRounding.AwayFromZero);
    }

    public override decimal? FromFirestore(object value)
    {
        if (value is null)
            return null;
        return DecimalCentsConverter.ConvertValue(value);
    }
}

using System;

namespace SBay.Backend.DataBase.Firebase.Models;

internal static class FirestoreId
{
    public static string ToString(Guid value)
        => value == Guid.Empty ? string.Empty : value.ToString();

    public static string? ToString(Guid? value)
        => value.HasValue && value.Value != Guid.Empty ? value.Value.ToString() : null;

    public static Guid ParseRequired(string? value)
    {
        if (!Guid.TryParse(value, out var id))
            throw new InvalidOperationException("Invalid Firestore id value.");
        return id;
    }

    public static Guid? ParseNullable(string? value)
        => Guid.TryParse(value, out var id) ? id : null;
}

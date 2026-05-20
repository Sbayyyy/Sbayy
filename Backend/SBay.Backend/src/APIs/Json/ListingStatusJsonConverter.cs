using System.Text.Json;
using System.Text.Json.Serialization;
using SBay.Domain.Entities;

namespace SBay.Backend.APIs.Json;

public sealed class ListingStatusJsonConverter : JsonConverter<ListingStatus?>
{
    public override ListingStatus? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
            return null;

        if (reader.TokenType != JsonTokenType.String)
            throw new JsonException("Listing status must be a string.");

        return reader.GetString()?.Trim().ToLowerInvariant() switch
        {
            "active" => ListingStatus.Active,
            "sold" => ListingStatus.Sold,
            "hidden" => ListingStatus.Hidden,
            _ => throw new JsonException("Invalid listing status.")
        };
    }

    public override void Write(Utf8JsonWriter writer, ListingStatus? value, JsonSerializerOptions options)
    {
        if (!value.HasValue)
        {
            writer.WriteNullValue();
            return;
        }

        writer.WriteStringValue(value.Value.ToStorageValue());
    }
}

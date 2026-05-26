using System.Globalization;
using System.Text;

namespace SBay.Backend.DataBase.Queries;

public static class CategorySearchAliases
{
    private static readonly IReadOnlyDictionary<string, string[]> AliasesBySlug =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["cars"] =
            [
                "cars", "car", "vehicles", "vehicle", "motors", "motorcycles", "motorcycle",
                "مركبات", "مركبة", "سيارات", "سيارة", "دراجات", "دراجة", "قطع غيار"
            ],
            ["electronics"] =
            [
                "electronics", "electronic", "phones", "phone", "mobiles", "mobile", "computers", "computer",
                "إلكترونيات", "الكترونيات", "الالكترونيات", "الإلكترونيات", "هواتف", "هاتف", "جوالات", "جوال", "موبايلات", "موبايل", "كمبيوتر", "حاسوب"
            ],
            ["furniture"] =
            [
                "furniture",
                "أثاث", "اثاث", "مفروشات"
            ],
            ["home"] =
            [
                "home", "garden", "home garden", "home & garden", "household", "decor",
                "منزل", "حديقة", "منزل وحديقة", "المنزل والحديقة", "ديكور", "أدوات منزلية", "ادوات منزلية"
            ],
            ["fashion"] =
            [
                "fashion", "clothing", "clothes", "shoes", "accessories",
                "أزياء", "ازياء", "ملابس", "أحذية", "احذية", "إكسسوارات", "اكسسوارات"
            ],
            ["books"] =
            [
                "books", "book",
                "كتب", "كتاب"
            ],
            ["sports"] =
            [
                "sports", "sport",
                "رياضة", "رياضي", "رياضات"
            ],
            ["real-estate"] =
            [
                "real-estate", "real estate", "property", "properties", "apartments", "apartment", "homes", "houses", "offices",
                "عقارات", "عقار", "شقق", "شقة", "منازل", "مكاتب", "مكتب"
            ],
            ["other"] =
            [
                "other", "misc", "miscellaneous", "various",
                "أخرى", "اخرى", "متنوع", "متنوعة"
            ]
        };

    private static readonly IReadOnlyDictionary<string, string> SlugByAlias = BuildSlugByAlias();

    public static IReadOnlyList<string> ResolveCategoryPrefixes(string? value)
    {
        var normalized = Normalize(value);
        if (normalized.Length == 0)
            return Array.Empty<string>();

        var topLevel = normalized.Split('/')[0].Trim();
        if (AliasesBySlug.ContainsKey(topLevel))
            return [topLevel];

        return SlugByAlias.TryGetValue(topLevel, out var slug)
            ? [slug]
            : Array.Empty<string>();
    }

    public static IReadOnlyList<string> ResolveStoragePrefixes(string? value)
    {
        var normalizedPath = NormalizeCategoryPath(value);
        if (normalizedPath is null)
            return Array.Empty<string>();

        var parts = normalizedPath.Split('/', 2);
        var slug = parts[0];
        if (parts.Length > 1)
            return [normalizedPath];

        if (!AliasesBySlug.TryGetValue(slug, out var aliases))
            return [slug];

        return aliases
            .Append(slug)
            .SelectMany(StorageCandidates)
            .Where(alias => alias.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public static string? NormalizeCategoryPath(string? value)
    {
        var normalized = Normalize(value);
        if (normalized.Length == 0)
            return null;

        var parts = normalized.Split('/', 2);
        var topLevel = parts[0].Trim();
        var slug = AliasesBySlug.ContainsKey(topLevel)
            ? topLevel
            : SlugByAlias.TryGetValue(topLevel, out var resolved)
                ? resolved
                : topLevel;

        return parts.Length == 1 ? slug : $"{slug}/{parts[1].Trim()}";
    }

    private static Dictionary<string, string> BuildSlugByAlias()
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (slug, aliases) in AliasesBySlug)
        {
            map[Normalize(slug)] = slug;
            foreach (var alias in aliases)
                map[Normalize(alias)] = slug;
        }

        return map;
    }

    private static IEnumerable<string> StorageCandidates(string value)
    {
        var trimmed = value.Trim().ToLowerInvariant();
        if (trimmed.Length > 0)
            yield return trimmed;

        var normalized = Normalize(value);
        if (normalized.Length > 0)
            yield return normalized;
    }

    private static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var trimmed = value.Trim()
            .Replace('-', ' ')
            .Replace('_', ' ');
        var builder = new StringBuilder(trimmed.Length);

        foreach (var ch in trimmed.Normalize(NormalizationForm.FormD))
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (category is UnicodeCategory.NonSpacingMark or UnicodeCategory.Format)
                continue;

            builder.Append(ch);
        }

        return builder
            .ToString()
            .Normalize(NormalizationForm.FormC)
            .ToLowerInvariant()
            .Replace("أ", "ا")
            .Replace("إ", "ا")
            .Replace("آ", "ا")
            .Replace("ى", "ي")
            .Replace("ة", "ه")
            .Trim();
    }
}

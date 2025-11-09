using System.Text.RegularExpressions;

namespace SBay.Backend.Messaging;

public sealed class ProfanityTextSanitizer : ITextSanitizer
{
    private readonly Regex? _standalone;
    private readonly Regex? _substring;
    private readonly HashSet<string> _whitelist;
    private readonly bool _preserveLength;
    private readonly char _maskChar;

    // Characters we allow between letters to catch "s.hit" or "f.u.c.k"
    private const string NoiseChars = @"[.\-_*,'`~!@#$%^&+=?]*";

    public ProfanityTextSanitizer(
        IEnumerable<string> standaloneWords,
        IEnumerable<string> substringWords,
        IEnumerable<string>? whitelistWords = null,
        bool preserveLength = true,
        char maskChar = '*')
    {
        _standalone = BuildPattern(standaloneWords, withBoundaries: true);
        _substring  = BuildPattern(substringWords, withBoundaries: false);
        _whitelist  = new HashSet<string>((whitelistWords ?? Array.Empty<string>())
            .Where(w => !string.IsNullOrWhiteSpace(w))
            .Select(s => s.ToLowerInvariant()));

        _preserveLength = preserveLength;
        _maskChar = maskChar;
    }

    public static ProfanityTextSanitizer FromSources(
        IEnumerable<string>? standaloneWords = null,
        IEnumerable<string>? substringWords = null,
        IEnumerable<string>? whitelistWords = null,
        string? standalonePath = null,
        string? substringPath = null,
        string? whitelistPath = null,
        bool preserveLength = true,
        char maskChar = '*')
    {
        var mergedStandalone = Merge(standaloneWords, ReadLines(standalonePath));
        var mergedSubstring  = Merge(substringWords,  ReadLines(substringPath));
        var mergedWhitelist  = Merge(whitelistWords,  ReadLines(whitelistPath));
        return new ProfanityTextSanitizer(mergedStandalone, mergedSubstring, mergedWhitelist, preserveLength, maskChar);
    }

    public string Sanitize(string input)
    {
        var text = input ?? string.Empty;
        if (_standalone is not null)
            text = _standalone.Replace(text, Mask);

        if (_substring is not null)
            text = _substring.Replace(text, m => IsInWhitelistToken(m, text) ? m.Value : Mask(m));

        return text.Trim();
    }

    private static Regex? BuildPattern(IEnumerable<string>? words, bool withBoundaries)
    {
        var list = words?.Where(w => !string.IsNullOrWhiteSpace(w)).Select(w => Regex.Escape(w.Trim())).ToArray()
                   ?? Array.Empty<string>();
        if (list.Length == 0) return null;

        // Convert "shit" → s[noise]*h[noise]*i[noise]*t
        static string Expand(string w) => string.Join(NoiseChars, w.ToCharArray());
        var expanded = list.Select(Expand);
        var joined = string.Join("|", expanded);
        var pattern = withBoundaries
            ? $@"\b({joined})\b"
            : $"({joined})";
        return new Regex(pattern, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);
    }

    private static IEnumerable<string> Merge(IEnumerable<string>? a, IEnumerable<string>? b) =>
        (a ?? Enumerable.Empty<string>())
            .Concat(b ?? Enumerable.Empty<string>())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase);

    private static IEnumerable<string> ReadLines(string? path)
    {
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path)) return Array.Empty<string>();
        return File.ReadAllLines(path);
    }

    private string Mask(Match m)
        => _preserveLength ? new string(_maskChar, m.Value.Length) : _maskChar.ToString();

    private bool IsInWhitelistToken(Match m, string full)
    {
        int l = m.Index, r = m.Index + m.Length - 1;
        while (l > 0 && char.IsLetterOrDigit(full[l - 1])) l--;
        while (r + 1 < full.Length && char.IsLetterOrDigit(full[r + 1])) r++;
        if (l < 0 || r < 0 || r < l) return false;
        var token = full.AsSpan(l, r - l + 1).ToString().ToLowerInvariant();
        return _whitelist.Contains(token);
    }
}

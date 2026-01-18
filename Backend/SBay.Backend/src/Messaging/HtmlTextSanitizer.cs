using System.Text.RegularExpressions;
using Ganss.Xss;

namespace SBay.Backend.Messaging;

public sealed class HtmlTextSanitizer : ITextSanitizer
{
    private static readonly Regex ScriptBlocks = new Regex(
        "<script\\b[^<]*(?:(?!</script>)<[^<]*)*</script>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly HtmlSanitizer _s;

    public HtmlTextSanitizer()
    {
        _s = new HtmlSanitizer();
        _s.AllowedTags.Clear();
        _s.AllowedAttributes.Clear();
        _s.AllowedCssProperties.Clear();
        _s.AllowedAtRules.Clear();
        _s.AllowedClasses.Clear();
        _s.AllowedSchemes.Clear();
    }

    public string Sanitize(string input)
    {
        var s = input ?? string.Empty;
        s = ScriptBlocks.Replace(s, string.Empty);
        return _s.Sanitize(s).Trim();
    }
}

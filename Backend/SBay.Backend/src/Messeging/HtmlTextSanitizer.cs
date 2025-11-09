using Ganss.Xss;
namespace SBay.Backend.Messaging;

public sealed class HtmlTextSanitizer : ITextSanitizer
{
    private readonly HtmlSanitizer _s = new();
    public string Sanitize(string input) => _s.Sanitize(input).Trim();
}
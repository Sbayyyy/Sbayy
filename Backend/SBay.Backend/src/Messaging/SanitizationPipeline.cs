namespace SBay.Backend.Messaging;
public sealed class SanitizationPipeline : ITextSanitizer
{
    private readonly IReadOnlyList<ITextSanitizer> _chain;
    public SanitizationPipeline(IEnumerable<ITextSanitizer> chain) => _chain = chain.ToList();
    public string Sanitize(string input) => _chain.Aggregate(input ?? string.Empty, (txt, s) => s.Sanitize(txt));
}
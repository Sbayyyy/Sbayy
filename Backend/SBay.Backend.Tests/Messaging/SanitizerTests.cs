using System;
using Xunit;
using SBay.Backend.Messaging;

public sealed class SanitizerTests
{
    [Fact]
    public void HtmlTextSanitizer_StripsDangerousTags_AndTrims()
    {
        var s = new HtmlTextSanitizer();
        var input = "   <b>Hello</b> <script>alert('x')</script>   ";
        var result = s.Sanitize(input);

        Assert.DoesNotContain("<script", result, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Hello", result);
        Assert.Equal(result.Trim(), result);
    }

    [Fact]
    public void ProfanityTextSanitizer_MasksWords_PreservingLength_CaseInsensitive()
    {
        var s = new ProfanityTextSanitizer(
            standaloneWords: Array.Empty<string>(),
            substringWords: new[] { "fuck", "shit" },
            whitelistWords: Array.Empty<string>(),
            preserveLength: true,
            maskChar: '*');

        var input = "A shitshit and shit case";
        var result = s.Sanitize(input);

        Assert.Equal("A ******** and **** case", result);
        Assert.DoesNotContain("fuck", result, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("shit", result, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void SanitizationPipeline_AppliesInOrder_HtmlThenProfanity()
    {
        var html = new HtmlTextSanitizer();
        var profanity = new ProfanityTextSanitizer(
            standaloneWords: Array.Empty<string>(),
            substringWords: new[] { "shit" },
            whitelistWords: Array.Empty<string>(),
            preserveLength: true,
            maskChar: '*');

        var pipeline = new SanitizationPipeline(new ITextSanitizer[] { html, profanity });

        var input = " <i>shit</i> <script>alert(1)</script> ";
        var result = pipeline.Sanitize(input);

        Assert.DoesNotContain("<script", result, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("shit", result, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("****", result);
        Assert.Equal(result.Trim(), result);
    }
}

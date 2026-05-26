using FluentAssertions;
using SBay.Backend.DataBase.Queries;

namespace SBay.Backend.Tests.BackendUnitTests;

public class ListingQueryTests
{
    [Fact]
    public void Validate_Should_Throw_For_InvalidPageAndPageSize()
    {
        var q = new ListingQuery
        {
            Page = 0,
            PageSize = 999
        };

        var act = () => q.Validate();
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Values_Should_Pass_Through()
    {
        var q = new ListingQuery
        {
            Text = "screw",
            Category = "tools",
            Page = 2,
            PageSize = 20,
            MinPrice = 5,
            MaxPrice = 15
        };

        var act = () => q.Validate();
        act.Should().NotThrow();
        q.Text.Should().Be("screw");
        q.Category.Should().Be("tools");
        q.Page.Should().Be(2);
        q.PageSize.Should().Be(20);
        q.MinPrice.Should().Be(5);
        q.MaxPrice.Should().Be(15);
    }

    [Theory]
    [InlineData("electronics", "electronics")]
    [InlineData("Electronics", "electronics")]
    [InlineData("إلكترونيات", "electronics")]
    [InlineData("الكترونيات", "electronics")]
    [InlineData("real estate", "real-estate")]
    [InlineData("عقارات", "real-estate")]
    public void CategoryAliases_Should_Normalize_To_Canonical_Slug(string input, string expected)
    {
        CategorySearchAliases.NormalizeCategoryPath(input).Should().Be(expected);
    }

    [Fact]
    public void CategoryAliases_Should_Preserve_SubCategory_Path()
    {
        CategorySearchAliases.NormalizeCategoryPath("Electronics/mobiles").Should().Be("electronics/mobiles");
    }

    [Fact]
    public void CategoryAliases_Should_Not_Treat_Free_Text_As_Category()
    {
        CategorySearchAliases.ResolveCategoryPrefixes("iphone 12").Should().BeEmpty();
    }

    [Fact]
    public void CategoryAliases_Should_Return_Raw_And_Normalized_Storage_Prefixes()
    {
        var prefixes = CategorySearchAliases.ResolveStoragePrefixes("Electronics");

        prefixes.Should().Contain("electronics");
        prefixes.Should().Contain("إلكترونيات");
        prefixes.Should().Contain("الكترونيات");
    }
}

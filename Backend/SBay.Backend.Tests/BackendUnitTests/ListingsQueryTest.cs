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
}

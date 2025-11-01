using FluentAssertions;
using SBay.Backend.DataBase.Queries;

namespace SBay.Backend.Tests.BackendUnitTests;

public class ListingQueryTests
{
    [Fact]
    public void Defaults_Should_Be_Clamped()
    {
        var q = new ListingQuery(page: 0, pageSize: 999);
        q.Page.Should().Be(1);
        q.PageSize.Should().Be(24);
    }

    [Fact]
    public void Values_Should_Pass_Through()
    {
        var q = new ListingQuery(text: "screw", category: "tools", page: 2, pageSize: 20, minPrice: 5, maxPrice: 15);
        q.Text.Should().Be("screw");
        q.Category.Should().Be("tools");
        q.Page.Should().Be(2);
        q.PageSize.Should().Be(20);
        q.MinPrice.Should().Be(5);
        q.MaxPrice.Should().Be(15);
    }
}
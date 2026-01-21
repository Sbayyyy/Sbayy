namespace SBay.Domain.Entities;

public class UserBlock
{
    public Guid Id { get; set; }
    public Guid BlockerId { get; set; }
    public Guid BlockedUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

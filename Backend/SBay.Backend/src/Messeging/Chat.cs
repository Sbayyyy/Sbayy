using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SBay.Backend.Messeging;
[Table("chats")]
public class Chat
{
    [Key] public Guid Id { get; set; }

    // two-party “marketplace” chat
    [Required] public Guid BuyerId { get; set; }
    [Required] public Guid SellerId { get; set; }

    // optional listing scope (null = general DM)
    public Guid? ListingId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastMessageAt { get; set; }

    // soft controls
    public bool BuyerArchived { get; set; }
    public bool SellerArchived { get; set; }

    public ICollection<Message> Messages { get; set; } = new List<Message>();
}

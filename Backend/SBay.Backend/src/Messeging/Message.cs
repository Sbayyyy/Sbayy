using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SBay.Backend.Messeging
{
    [Table("messages")]
    public class Message
    {
        [Key] public Guid Id { get; set; }

        [Required] public Guid ChatId { get; set; }
        [ForeignKey(nameof(ChatId))] public Chat Chat { get; set; } = default!;

        [Required, MaxLength(5000)] public string Content { get; set; } = default!;
        [Required] public Guid SenderId { get; set; }
        [Required] public Guid ReceiverId { get; set; } // denormalized for quick inbox queries
        public Guid? ListingId { get; set; }             // mirror Chat.ListingId for convenience

        [Required] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsRead { get; set; }

        public Message() { }
        public Message(Guid chatId, string content, Guid senderId, Guid receiverId, Guid? listingId)
        {
            Id = Guid.NewGuid();
            ChatId = chatId;
            Content = content.Trim();
            SenderId = senderId;
            ReceiverId = receiverId;
            ListingId = listingId;
            CreatedAt = DateTime.UtcNow;
        }
    }
}
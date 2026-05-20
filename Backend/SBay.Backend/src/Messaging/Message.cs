using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SBay.Backend.Messaging
{
    [Table("messages")]
    public class Message
    {
        [Key] public Guid Id { get; set; }

        [Required] public Guid ChatId { get; set; }
        [ForeignKey(nameof(ChatId))] public Chat Chat { get; set; } = default!;

        [Required, MaxLength(5000)] public string Content { get; set; } = default!;
        [Required, MaxLength(32)] public string Type { get; set; } = "text";
        public string? DataJson { get; set; }
        [Required] public Guid SenderId { get; set; }
        [Required] public Guid ReceiverId { get; set; } 
        public Guid? ListingId { get; set; }             

        [Required] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsRead { get; set; }

        public Message() { }
        public Message(Guid chatId, string content, Guid senderId, Guid receiverId, Guid? listingId, string type = "text", string? dataJson = null)
        {
            Id = Guid.NewGuid();
            ChatId = chatId;
            Content = content.Trim();
            Type = string.IsNullOrWhiteSpace(type) ? "text" : type.Trim();
            DataJson = dataJson;
            SenderId = senderId;
            ReceiverId = receiverId;
            ListingId = listingId;
            CreatedAt = DateTime.UtcNow;
        }
    }
}

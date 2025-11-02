using Microsoft.AspNetCore.SignalR;

namespace SBay.Backend.Messaging;

public class MessagingHub:Hub
{
    private readonly IChatService _chatService;

    public MessagingHub(IChatService chatService) => _chatService = chatService;

    public async Task<Guid> OpenOrCreateChat(Guid otherUserId, Guid? listingId)
    {
        var me = Guid.Parse(Context.UserIdentifier!);
        var buyer = me;                        
        var seller = otherUserId;               
        var chat = await _chatService.GetOrCreateAsync(buyer, seller, listingId);
        return chat.Id;
    }

    public async Task SendMessage(Guid chatId, string content)
    {
        var me = Guid.Parse(Context.UserIdentifier!);
        if (string.IsNullOrWhiteSpace(content)) throw new HubException("Empty message.");
        var msg = await _chatService.SendAsync(chatId, me, content.Trim());
        await Clients.Users(msg.SenderId.ToString(), msg.ReceiverId.ToString())
            .SendAsync("ReceiveMessage", msg);
    }
    
}
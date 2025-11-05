// using Microsoft.AspNetCore.SignalR;
//
// namespace SBay.Backend.Messaging;
//
// public class MessagingHub : Hub
// {
//     private readonly IChatService _chatService;
//
//     public MessagingHub(IChatService chatService) => _chatService = chatService;
//
//     public async Task<Guid> OpenOrCreateChat(Guid otherUserId, Guid? listingId)
//     {
//         var me = Guid.Parse(Context.UserIdentifier!);
//
//         Guid buyerId, sellerId;
//
//         if (listingId.HasValue)
//         {
//             // 1) Resolve the listing owner to decide roles deterministically
//             var listing = await _dataProvider.Listings.GetByIdAsync(listingId.Value); // inject IDataProvider or IListingRepository
//             if (listing is null)
//                 throw new HubException("Listing not found.");
//
//             var ownerId = listing.SellerId; // authoritative seller for this chat (listing owner)  ← backed by schema
//                                             // If the caller owns the listing, they're the seller; otherwise the owner is the seller.
//             if (me == ownerId)
//             {
//                 sellerId = me;
//                 buyerId = otherUserId;
//             }
//             else if (otherUserId == ownerId)
//             {
//                 sellerId = otherUserId;
//                 buyerId = me;
//             }
//             else
//             {
//                 // Neither participant is the listing owner — treat as invalid for listing-scoped chat
//                 throw new HubException("Neither participant is the listing owner for this listing.");
//             }
//         }
//         else
//         {
//             // 2) No listing context: infer via user roles (if you keep a seller/user role),
//             //    else normalize to a stable ordering to avoid duplicates.
//             var meIsSeller = await _userService.IsSellerAsync(me);          // implement using Users.role
//             var otherIsSeller = await _userService.IsSellerAsync(otherUserId); // implement using Users.role
//
//             if (meIsSeller && !otherIsSeller) { sellerId = me; buyerId = otherUserId; }
//             else if (!meIsSeller && otherIsSeller) { sellerId = otherUserId; buyerId = me; }
//             else
//             {
//                 // Fallback: normalize deterministically so (A,B) == (B,A)
//                 (buyerId, sellerId) = me.CompareTo(otherUserId) < 0
//                     ? (me, otherUserId)
//                     : (otherUserId, me);
//             }
//         }
//
//         var chat = await _chatService.GetOrCreateAsync(buyerId, sellerId, listingId);
//         return chat.Id;
//     }
//
//     public async Task SendMessage(Guid chatId, string content)
//     {
//         if (!Guid.TryParse(Context.UserIdentifier, out var me))
//             throw new HubException("Unauthenticated or invalid user identifier.");
//         if (string.IsNullOrWhiteSpace(content)) throw new HubException("Empty message.");
//         var msg = await _chatService.SendAsync(chatId, me, content.Trim());
//         if (msg.SenderId != me && msg.ReceiverId != me)
//             throw new HubException("You are not a participant in this chat.");
//         await Clients.Users(msg.SenderId.ToString(), msg.ReceiverId.ToString())
//             .SendAsync("ReceiveMessage", msg);
//     }
//
// }
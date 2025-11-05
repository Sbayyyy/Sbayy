using Microsoft.AspNetCore.Authorization;

namespace SBay.Domain.Authentication.Requirements;

public sealed class MessageOwnerRequirement:IAuthorizationRequirement
{
    public TimeSpan EditableWindow { get; }
    public MessageOwnerRequirement(TimeSpan editableWindow) => EditableWindow = editableWindow;
    
}
using Microsoft.AspNetCore.Authorization;

namespace SBay.Domain.Authentication.Requirements;

public sealed class ScopeRequirement:IAuthorizationRequirement
{
    public string Scope { get; }
    public ScopeRequirement(string scope) => Scope = scope;
}
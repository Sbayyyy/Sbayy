using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using SBay.Domain.Authentication;

namespace SBay.Domain.ValueObjects;

public static class ConnectAuthenticators
{
   public static void connectAuthenticators(WebApplicationBuilder builder)
   {
      // Keep raw claim names ("sub", "user_id", "role")
JwtSecurityTokenHandler.DefaultMapInboundClaims = false;
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

// ----- read config -----
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()!;
var firebaseProjectId = builder.Configuration["Firebase:ProjectId"];
var oidcAuthority     = builder.Configuration["Oidc:Authority"];
var oidcAudience      = builder.Configuration["Oidc:Audience"];

// ----- AUTHENTICATION -----
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultScheme            = "Composite";
        options.DefaultAuthenticateScheme = "Composite";
        options.DefaultChallengeScheme    = "Composite";
    })

    .AddJwtBearer("SBayJwt", o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,   ValidIssuer = jwt.Issuer,
            ValidateAudience = true, ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
            ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(2),
            NameClaimType = "sub",
            RoleClaimType = "role"
        };
    })

    .AddJwtBearer("Firebase", o =>
    {
        if (string.IsNullOrWhiteSpace(firebaseProjectId))
            return;

        o.MapInboundClaims = false;
        o.Authority       = $"https://securetoken.google.com/{firebaseProjectId}";
        o.MetadataAddress = "https://www.googleapis.com/identitytoolkit/.well-known/openid-configuration";
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,   ValidIssuer   = $"https://securetoken.google.com/{firebaseProjectId}",
            ValidateAudience = true, ValidAudience = firebaseProjectId,
            ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(2),
            NameClaimType = "user_id",
            RoleClaimType = "role"
        };
        o.RequireHttpsMetadata = true;
    })

    .AddJwtBearer("Oidc", o =>
    {
        if (string.IsNullOrWhiteSpace(oidcAuthority))
            return; 

        o.MapInboundClaims = false;
        o.Authority = oidcAuthority; 
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,   ValidIssuer = oidcAuthority.TrimEnd('/'),
            ValidateAudience = !string.IsNullOrWhiteSpace(oidcAudience),
            ValidAudience = oidcAudience,
            ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(2),
            NameClaimType = "sub",
            RoleClaimType = "role"
        };
        o.RequireHttpsMetadata = true;
    })

    .AddPolicyScheme("Composite", "Composite", options =>
    {
        options.ForwardDefaultSelector = ctx =>
        {
            if (!ctx.Request.Headers.TryGetValue("Authorization", out var header) ||
                !AuthenticationHeaderValue.TryParse(header!, out var ahv) ||
                !ahv.Scheme.Equals("Bearer", StringComparison.OrdinalIgnoreCase) ||
                string.IsNullOrWhiteSpace(ahv.Parameter))
                return "SBayJwt";

            var iss = JwtPeek.TryReadIssuer(ahv.Parameter);
            if (!string.IsNullOrWhiteSpace(firebaseProjectId) &&
                string.Equals(iss, $"https://securetoken.google.com/{firebaseProjectId}", StringComparison.OrdinalIgnoreCase))
                return "Firebase";

            if (!string.IsNullOrWhiteSpace(oidcAuthority) &&
                iss != null && iss.StartsWith(oidcAuthority.TrimEnd('/'), StringComparison.OrdinalIgnoreCase))
                return "Oidc";

            return "SBayJwt";
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    options.AddPolicy("Authenticated", p => p.RequireAuthenticatedUser());
    options.AddPolicy("SellerOnly",    p => p.RequireClaim("role", "seller", "admin"));
    options.AddPolicy("AdminOnly",     p => p.RequireRole("admin"));
    options.AddPolicy("Scope:listings.write", p => p.RequireClaim("scope", "listings.write"));
    options.AddPolicy("CanStartChat", p =>
        p.RequireAuthenticatedUser()
            .AddRequirements(new ListingActiveRequirement(), new NotSelfMessageRequirement()));

    options.AddPolicy("CanSendMessage", p =>
        p.RequireAuthenticatedUser()
            .AddRequirements(new ChatParticipantRequirement()));

    options.AddPolicy("CanReadThread", p =>
        p.RequireAuthenticatedUser()
            .AddRequirements(new ChatParticipantRequirement()));

    options.AddPolicy("CanMarkRead", p =>
        p.RequireAuthenticatedUser()
            .AddRequirements(new IsMessageReceiverRequirement()));

    // generic building blocks
    options.AddPolicy("SameUser",      p => p.Requirements.Add(new SameUserRequirement()));
    options.AddPolicy("ListingOwner",  p => p.Requirements.Add(new ListingOwnerRequirement()));
    options.AddPolicy("Scope:messages.read",
        p => p.RequireClaim("scope", "messages.read"));
    options.AddPolicy("Scope:messages.write",
        p => p.RequireClaim("scope", "messages.write"));
});

   }
}
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using SBay.Domain.Authentication;
using SBay.Domain.Authentication.Handlers;
using SBay.Domain.Authentication.Requirements;
using SBay.Domain.Entities;

namespace SBay.Domain.ValueObjects;

public static class ConnectAuthenticators
{
    public static void connectAuthenticators(WebApplicationBuilder builder)
    {
        JwtSecurityTokenHandler.DefaultMapInboundClaims = false;
        JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

        builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
        var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()!;
        builder.Services
            .AddAuthentication(options =>
            {
                options.DefaultScheme = "SBayJwt";
                options.DefaultAuthenticateScheme = "SBayJwt";
                options.DefaultChallengeScheme = "SBayJwt";
            })
            .AddJwtBearer("SBayJwt", o =>
            {
                o.MapInboundClaims = false;
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
                    ValidateLifetime = true,
                    RequireExpirationTime = true,
                    RequireSignedTokens = true,
                    ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
                    ClockSkew = TimeSpan.FromMinutes(2),
                    NameClaimType = "sub",
                    RoleClaimType = "role"
                };
            });

        builder.Services.AddAuthorization(options =>
        {
            // Note: FallbackPolicy applies to all endpoints without [Authorize] or [AllowAnonymous]
            // We don't set a FallbackPolicy to allow [AllowAnonymous] to work properly
            // Endpoints that need auth must explicitly use [Authorize]

            options.AddPolicy("CanDeleteOwnMessage", p =>
                p.RequireAuthenticatedUser()
                 .AddRequirements(new MessageOwnerRequirement(TimeSpan.FromMinutes(10))));

            options.AddPolicy("ChatMember", p =>
                p.RequireAuthenticatedUser()
                 .AddRequirements(new ChatParticipantRequirement()));

            options.AddPolicy("CanStartChat", p =>
                p.RequireAuthenticatedUser()
                 .AddRequirements(new CanStartChatRequirement()));

            options.AddPolicy("CanSendMessage", p =>
                p.RequireAuthenticatedUser()
                 .AddRequirements(new ChatParticipantRequirement()));

            options.AddPolicy("CanReadThread", p =>
                p.RequireAuthenticatedUser()
                 .AddRequirements(new ChatParticipantRequirement()));

            options.AddPolicy("CanMarkRead", p =>
                p.RequireAuthenticatedUser()
                 .AddRequirements(new IsMessageReceiverRequirement()));

            options.AddPolicy("ListingOwner", p =>
                p.RequireAuthenticatedUser()
                 .AddRequirements(new ListingOwnerRequirement()));

            options.AddPolicy("SameUser", p =>
                p.RequireAuthenticatedUser()
                 .AddRequirements(new SameUserRequirement()));

            options.AddPolicy("SellerOnly", p => p.RequireRole("seller", "admin"));
            options.AddPolicy("AdminOnly", p => p.RequireRole("admin"));

            foreach (var scope in Scopes.All)
            {
                options.AddPolicy($"Scope:{scope}", p =>
                    p.Requirements.Add(new ScopeRequirement(scope)));
            }
        });

        builder.Services.AddHttpContextAccessor();
        builder.Services.AddScoped<ICurrentUserResolver, CurrentUserResolver>();
        builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

        builder.Services.AddScoped<IAuthorizationHandler, MessageOwnerHandler>();
        builder.Services.AddScoped<IAuthorizationHandler, ChatParticipantHandler>();
        builder.Services.AddScoped<IAuthorizationHandler, CanStartChatHandler>();
        builder.Services.AddScoped<IAuthorizationHandler, IsMessageReceiverHandler>();

        builder.Services.AddScoped<IAuthorizationHandler, ListingOwnerHandler>();
        builder.Services.AddScoped<IAuthorizationHandler, SameUserHandler>();

        builder.Services.AddScoped<IAuthorizationHandler, CartOwnerHandler>();
        builder.Services.AddScoped<IAuthorizationHandler, OrderPartyHandler>();
        builder.Services.AddScoped<IAuthorizationHandler, ScopeRequirementHandler>();


        builder.Services.PostConfigureAll<JwtBearerOptions>(o =>
        {
            o.Events ??= new JwtBearerEvents();
            var prev = o.Events.OnMessageReceived;
            o.Events.OnMessageReceived = async ctx =>
            {
                if (ctx.Request.Query.TryGetValue("access_token", out var token) &&
                    ctx.HttpContext.Request.Path.StartsWithSegments("/hubs/chat"))
                {
                    ctx.Token = token;
                }
                if (prev != null) await prev(ctx);
            };
        });
    }
}

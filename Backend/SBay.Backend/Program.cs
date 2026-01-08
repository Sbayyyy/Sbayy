using System.IO;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using Microsoft.EntityFrameworkCore;
using SBay.Backend.DataBase.Ef;
using SBay.Backend.DataBase.Firebase;
using SBay.Backend.DataBase.Interfaces;
using SBay.Backend.Messaging;
using SBay.Backend.Services;
using SBay.Backend.Utils;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
    .AddEnvironmentVariables();

var providerName = builder.Configuration.GetValue<string>("Database:Provider") ?? "ef";
var useEf = !string.Equals(providerName, "firestore", StringComparison.OrdinalIgnoreCase);

if (useEf)
{
    var connStr = builder.Configuration.GetConnectionString("Default")
                  ?? throw new InvalidOperationException("Missing connection string 'Default'.");
    builder.Services.AddDbContext<EfDbContext>(opt =>
        opt.UseNpgsql(connStr).UseSnakeCaseNamingConvention());

    builder.Services.AddScoped<IDataProvider, EfDataProvider>();
    builder.Services.AddScoped<IUserRepository, EfUserRepository>();
    builder.Services.AddScoped<IListingRepository, EfListingRepository>();
    builder.Services.AddScoped<IReadStore<Listing>>(sp => sp.GetRequiredService<IListingRepository>());
    builder.Services.AddScoped<IWriteStore<Listing>>(sp => sp.GetRequiredService<IListingRepository>());
    builder.Services.AddScoped<ICartRepository, EfCartRepository>();
    builder.Services.AddScoped<IOrderRepository, EfOrderRepository>();
    builder.Services.AddScoped<IChatRepository, EfChatRepository>();
    builder.Services.AddScoped<IMessageRepository, EfMessageRepository>();
    builder.Services.AddScoped<IAddressRepository, EfAddressRepository>();  // NEW
    builder.Services.AddScoped<IUnitOfWork, EfUnitOfWork>();
    builder.Services.AddScoped<IUserAnalyticsService, EfUserAnalyticsService>();
}
else
{
    builder.Services.AddSingleton(sp =>
    {
        var projectId = builder.Configuration["Firebase:ProjectId"];
        if (string.IsNullOrWhiteSpace(projectId))
            throw new InvalidOperationException("Missing Firebase:ProjectId");

        var credentialsPath = builder.Configuration["Firebase:CredentialsPath"];
        GoogleCredential? credential = null;
        if (!string.IsNullOrWhiteSpace(credentialsPath))
        {
            var fullPath = Path.IsPathRooted(credentialsPath)
                ? credentialsPath
                : Path.Combine(builder.Environment.ContentRootPath, credentialsPath);
            if (!File.Exists(fullPath))
                throw new InvalidOperationException($"Firebase credentials not found at {fullPath}");
            credential = GoogleCredential.FromFile(fullPath);
        }

        var firestoreBuilder = new FirestoreDbBuilder { ProjectId = projectId };
        if (credential is not null)
            firestoreBuilder.Credential = credential;
        return firestoreBuilder.Build();
    });

    builder.Services.AddScoped<IUserRepository, FirebaseUserRepository>();
    builder.Services.AddScoped<IListingRepository, FirebaseListingRepository>();
    builder.Services.AddScoped<ICartRepository, FirebaseCartRepository>();
    builder.Services.AddScoped<IImageRepository, FirebaseImageRepository>();
    builder.Services.AddScoped<IOrderRepository, FirebaseOrderRepository>();
    builder.Services.AddScoped<IChatRepository, FirebaseChatRepository>();
    builder.Services.AddScoped<IMessageRepository, FirebaseMessageRepository>();
    builder.Services.AddScoped<IDataProvider, FirebaseDataProvider>();
    builder.Services.AddScoped<IUnitOfWork, FirestoreUnitOfWork>();
    builder.Services.AddScoped<IUserAnalyticsService, FirebaseUserAnalyticsService>();
}
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));

builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IUserOwnership, UserOwnership>();

// NEW: Shipping Service
builder.Services.AddScoped<IShippingService, DhlShippingService>();

builder.Services.AddSignalR();
builder.Services.AddScoped<IChatEvents, ChatEvents>();

builder.Services.AddSingleton<IClock, SystemClock>();

var filters = Path.Combine(builder.Environment.ContentRootPath, "Messaging", "Filters");
builder.Services.AddSingleton<HtmlTextSanitizer>();
builder.Services.AddSingleton(sp =>
    ProfanityTextSanitizer.FromSources(
        standalonePath: Path.Combine(filters, "profanity-standalone.txt")
    ));
builder.Services.AddSingleton<ITextSanitizer>(sp =>
    new SanitizationPipeline(new ITextSanitizer[] {
        sp.GetRequiredService<HtmlTextSanitizer>(),
        sp.GetRequiredService<ProfanityTextSanitizer>()
    })
);


builder.Services.AddControllers();
ConnectAuthenticators.connectAuthenticators(builder);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(o =>
{
    o.AddPolicy("AllowAll", p => p
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowAnyOrigin());
});

var app = builder.Build();

app.Use(async (ctx, next) =>
{
    var requestId = ctx.Request.Headers.TryGetValue("X-Request-ID", out var v)
        ? v.ToString()
        : Guid.NewGuid().ToString("N");

    if (!ctx.Response.Headers.ContainsKey("X-Request-ID"))
        ctx.Response.Headers.Append("X-Request-ID", requestId);

    var traceId = System.Diagnostics.Activity.Current?.TraceId.ToString() ?? ctx.TraceIdentifier;
    if (!ctx.Response.Headers.ContainsKey("X-Trace-ID"))
        ctx.Response.Headers.Append("X-Trace-ID", traceId);

    var sw = System.Diagnostics.Stopwatch.StartNew();
    try
    {
        await next();
    }
    finally
    {
        sw.Stop();
        app.Logger.LogInformation(
            "{method} {path} -> {status} in {elapsed}ms rid={rid} tid={tid}",
            ctx.Request.Method,
            ctx.Request.Path.Value,
            ctx.Response.StatusCode,
            sw.ElapsedMilliseconds,
            requestId,
            traceId
        );
    }
});

if (useEf && !app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
    db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsEnvironment("Testing"))
{
    app.UseHttpsRedirection();
}

app.UseRouting();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

app.MapGet("/health/live", () => Results.Ok(new { status = "ok" }));

if (useEf)
{
    app.MapGet("/health/ready", async (EfDbContext db, CancellationToken ct) =>
    {
        try
        {
            var can = await db.Database.CanConnectAsync(ct);
            return can
                ? Results.Ok(new { status = "ok", db = "up" })
                : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
        }
        catch
        {
            return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
        }
    });
}
else
{
    app.MapGet("/health/ready", async (FirestoreDb db, CancellationToken ct) =>
    {
        try
        {
            _ = await db.Collection("__health").Document("ping").GetSnapshotAsync(ct);
            return Results.Ok(new { status = "ok", db = "up" });
        }
        catch
        {
            return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
        }
    });
}

app.Run();

public partial class Program { }

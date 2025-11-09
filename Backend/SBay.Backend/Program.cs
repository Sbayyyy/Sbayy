using Microsoft.EntityFrameworkCore;
using SBay.Backend.Messaging;
using SBay.Domain.Database;
using SBay.Domain.ValueObjects;
using SBay.Domain.Authentication;
using SBay.Domain.Entities;

var builder = WebApplication.CreateBuilder(args);

// ───────────────────────────────────────────────
// CONFIGURATION
// ───────────────────────────────────────────────
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
    .AddEnvironmentVariables();

// ───────────────────────────────────────────────
// SERVICES
// ───────────────────────────────────────────────
var connStr = builder.Configuration.GetConnectionString("Default")
              ?? throw new InvalidOperationException("Missing connection string 'Default'.");
builder.Services.AddDbContext<EfDbContext>(opt =>
    opt.UseNpgsql(connStr).UseSnakeCaseNamingConvention());

builder.Services.AddScoped<IDataProvider, EfDataProvider>();
builder.Services.AddScoped<EfListingRepository>();
builder.Services.AddScoped<IListingRepository>(sp => sp.GetRequiredService<EfListingRepository>());
builder.Services.AddScoped<IReadStore<Listing>>(sp => sp.GetRequiredService<EfListingRepository>());
builder.Services.AddScoped<IWriteStore<Listing>>(sp => sp.GetRequiredService<EfListingRepository>());
builder.Services.AddScoped<IUnitOfWork, EfUnitOfWork>();
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IChatEvents, NoOpChatEvents>();
builder.Services.AddScoped<IUserOwnership, UserOwnership>();
builder.Services.AddSignalR();
builder.Services.AddScoped<IChatEvents, ChatEvents>();

// Controllers + Auth
builder.Services.AddControllers();
ConnectAuthenticators.connectAuthenticators(builder);

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS
builder.Services.AddCors(o =>
{
    o.AddPolicy("AllowAll", p => p
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowAnyOrigin());
});

// ───────────────────────────────────────────────
// BUILD PIPELINE
// ───────────────────────────────────────────────
var app = builder.Build();
app.MapHub<ChatHub>("/hubs/chat");

// ───────────────────────────────────────────────
// Request/Trace logging middleware (safe)
// ───────────────────────────────────────────────
app.Use(async (ctx, next) =>
{
    // Generate or propagate Request ID
    var requestId = ctx.Request.Headers.TryGetValue("X-Request-ID", out var v)
        ? v.ToString()
        : Guid.NewGuid().ToString("N");

    // Set headers early (before next middleware)
    if (!ctx.Response.Headers.ContainsKey("X-Request-ID"))
        ctx.Response.Headers.Append("X-Request-ID", requestId);

    var traceId = System.Diagnostics.Activity.Current?.TraceId.ToString() ?? ctx.TraceIdentifier;
    if (!ctx.Response.Headers.ContainsKey("X-Trace-ID"))
        ctx.Response.Headers.Append("X-Trace-ID", traceId);

    var sw = System.Diagnostics.Stopwatch.StartNew();
    try
    {
        await next(); // Continue through pipeline
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

// ───────────────────────────────────────────────
// Ensure database exists (dev-only)
// ───────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
    db.Database.EnsureCreated();
}

// ───────────────────────────────────────────────
// Middleware pipeline
// ───────────────────────────────────────────────
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

// Controllers
app.MapControllers();

// Health endpoints
app.MapGet("/health/live", () => Results.Ok(new { status = "ok" }));
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

// app.MapHub<ChatHub>("/hubs/chat"); // optional SignalR hub

app.Run();

// Make Program public & partial for WebApplicationFactory
public partial class Program { }

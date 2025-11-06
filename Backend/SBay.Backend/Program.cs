using Microsoft.EntityFrameworkCore;
using SBay.Domain.Database;
using SBay.Domain.ValueObjects;  // for ConnectAuthenticators
using SBay.Domain.Authentication;
using SBay.Domain.Entities; // for JwtOptions etc.

var builder = WebApplication.CreateBuilder(args);

// ───────────────────────────────────────────────
// CONFIGURATION
// ───────────────────────────────────────────────

// Load configuration files (appsettings.json, env vars, etc.)
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
    .AddEnvironmentVariables();

// ───────────────────────────────────────────────
// SERVICES
// ───────────────────────────────────────────────

// Database (PostgreSQL)
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

// Controllers
builder.Services.AddControllers();
// JWT & Authentication
ConnectAuthenticators.connectAuthenticators(builder);

// Swagger (optional but useful for testing manually)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS (optional)
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

app.Use(async (ctx, next) =>
{
    var requestId = ctx.Request.Headers.ContainsKey("X-Request-ID") ? (string?)ctx.Request.Headers["X-Request-ID"] : null;
    if (string.IsNullOrWhiteSpace(requestId))
    {
        requestId = Guid.NewGuid().ToString("N");
        ctx.Response.Headers["X-Request-ID"] = requestId;
    }
    var sw = System.Diagnostics.Stopwatch.StartNew();
    try
    {
        await next();
    }
    finally
    {
        sw.Stop();
        var traceId = System.Diagnostics.Activity.Current?.TraceId.ToString();
        if (!string.IsNullOrEmpty(traceId)) ctx.Response.Headers["X-Trace-Id"] = traceId;
        app.Logger.LogInformation("{method} {path} -> {status} in {elapsed}ms rid={rid} tid={tid}",
            ctx.Request.Method,
            ctx.Request.Path.Value,
            ctx.Response.StatusCode,
            sw.ElapsedMilliseconds,
            requestId,
            traceId);
    }
});

// Ensure DB created (optional; remove in prod)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
    db.Database.EnsureCreated();
}

// Middleware pipeline
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

// Map Controllers
app.MapControllers();

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

// Map SignalR hubs
// app.MapHub<ChatHub>("/hubs/chat"); // only if you have a ChatHub class

// Run
app.Run();

// Make Program public & partial so WebApplicationFactory can see it
public partial class Program { }

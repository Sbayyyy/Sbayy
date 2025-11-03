using Microsoft.EntityFrameworkCore;
using SBay.Domain.Database;
using SBay.Domain.ValueObjects;  // for ConnectAuthenticators
using SBay.Domain.Authentication; // for JwtOptions etc.

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

app.UseRouting();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

// Map Controllers
app.MapControllers();

// Map SignalR hubs
// app.MapHub<ChatHub>("/hubs/chat"); // only if you have a ChatHub class

// Run
app.Run();

// Make Program public & partial so WebApplicationFactory can see it
public partial class Program { }

using System.IO;
using System.Threading.RateLimiting;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SBay.Backend.DataBase.Ef;
using SBay.Backend.DataBase.Firebase;
using SBay.Backend.DataBase.Interfaces;
using SBay.Backend.Messaging;
using SBay.Backend.Services;
using SBay.Backend.Services.Payments;
using Amazon.Runtime;
using Amazon.S3;
using SBay.Backend.Utils;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;
using Sentry;

var builder = WebApplication.CreateBuilder(args);

var sentryDsn = builder.Configuration["Sentry:Dsn"];
var useSentry = !string.IsNullOrWhiteSpace(sentryDsn)
                && Uri.TryCreate(sentryDsn, UriKind.Absolute, out _)
                && sentryDsn.Contains('@');
if (useSentry)
{
    builder.WebHost.UseSentry(options =>
    {
        options.Dsn = sentryDsn;
        options.Debug = builder.Environment.IsDevelopment();
        if (double.TryParse(builder.Configuration["Sentry:TracesSampleRate"], out var sampleRate))
            options.TracesSampleRate = sampleRate;
    });
}

var providerName = builder.Configuration.GetValue<string>("Database:Provider") ?? "ef";
var useEf = !string.Equals(providerName, "firestore", StringComparison.OrdinalIgnoreCase);

if (!useEf)
{
    throw new InvalidOperationException("Firestore refresh-token repository not implemented; change Database:Provider or implement FirebaseRefreshTokenRepository.");
}

ProductionConfigurationGuard.Validate(builder.Configuration, builder.Environment);

if (useEf)
{
    var connStr = builder.Configuration.GetConnectionString("Default");
    if (string.IsNullOrWhiteSpace(connStr) && builder.Environment.IsEnvironment("Testing"))
    {
        connStr = "Host=localhost;Port=5432;Database=sbay_tests;Username=sbay;Password=sbay_tests";
    }
    if (string.IsNullOrWhiteSpace(connStr))
    {
        throw new InvalidOperationException("Missing connection string 'Default'.");
    }
    builder.Services.AddDbContext<EfDbContext>(opt =>
        opt.UseNpgsql(connStr).UseSnakeCaseNamingConvention());

    builder.Services.AddScoped<IDataProvider, EfDataProvider>();
    builder.Services.AddScoped<IUserRepository, EfUserRepository>();
    builder.Services.AddScoped<IListingRepository, EfListingRepository>();
    builder.Services.AddScoped<IReadStore<Listing>>(sp => sp.GetRequiredService<IListingRepository>());
    builder.Services.AddScoped<IWriteStore<Listing>>(sp => sp.GetRequiredService<IListingRepository>());
    builder.Services.AddScoped<ICartRepository, EfCartRepository>();
    builder.Services.AddScoped<IFavoriteRepository, EfFavoriteRepository>();
    builder.Services.AddScoped<IOrderRepository, EfOrderRepository>();
    builder.Services.AddScoped<IReviewRepository, EfReviewRepository>();
    builder.Services.AddScoped<IChatRepository, EfChatRepository>();
    builder.Services.AddScoped<IMessageRepository, EfMessageRepository>();
    builder.Services.AddScoped<IAddressRepository, EfAddressRepository>();  // NEW
    builder.Services.AddScoped<IPushTokenRepository, EfPushTokenRepository>();
    builder.Services.AddScoped<INotificationRepository, EfNotificationRepository>();
    builder.Services.AddScoped<IRefreshTokenRepository, EfRefreshTokenRepository>();
    builder.Services.AddScoped<IReportRepository, EfReportRepository>();
    builder.Services.AddScoped<IUserBlockRepository, EfUserBlockRepository>();
    builder.Services.AddScoped<IUnitOfWork, EfUnitOfWork>();
    builder.Services.AddScoped<IUserAnalyticsService, EfUserAnalyticsService>();
}
else
{
    var firestoreReportsEnabled = builder.Configuration.GetValue<bool>("EnableFirestoreReports");
    var firestoreBlocksEnabled = builder.Configuration.GetValue<bool>("EnableFirestoreUserBlocks");
    if (!firestoreReportsEnabled || !firestoreBlocksEnabled)
    {
        throw new InvalidOperationException(
            "Firestore provider selected but reports/user blocks are not supported. EnableFirestoreReports and EnableFirestoreUserBlocks must be true only if FirebaseReportRepository/FirebaseUserBlockRepository are fully implemented.");
    }

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
    builder.Services.AddScoped<IFavoriteRepository, FirebaseFavoriteRepository>();
    builder.Services.AddScoped<IOrderRepository, FirebaseOrderRepository>();
    builder.Services.AddScoped<IReviewRepository, FirebaseReviewRepository>();
    builder.Services.AddScoped<IChatRepository, FirebaseChatRepository>();
    builder.Services.AddScoped<IMessageRepository, FirebaseMessageRepository>();
    builder.Services.AddScoped<IAddressRepository, FirebaseAddressRepository>();
    builder.Services.AddScoped<IDataProvider, FirebaseDataProvider>();
    builder.Services.AddScoped<IPushTokenRepository, FirebasePushTokenRepository>();
    builder.Services.AddScoped<INotificationRepository, FirebaseNotificationRepository>();
    builder.Services.AddScoped<IUserBlockRepository, FirebaseUserBlockRepository>();
    builder.Services.AddScoped<IUnitOfWork, FirestoreUnitOfWork>();
    builder.Services.AddScoped<IUserAnalyticsService, FirebaseUserAnalyticsService>();
}
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));

builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IUserOwnership, UserOwnership>();
builder.Services.AddHttpClient<IPushNotificationService, ExpoPushNotificationService>();
builder.Services.AddScoped<IImageStorageProvider>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var provider = config.GetValue<string>("Storage:Provider") ?? "local";
    var env = sp.GetRequiredService<IWebHostEnvironment>();

    if (string.Equals(provider, "s3", StringComparison.OrdinalIgnoreCase))
    {
        var accessKey = config["Storage:S3:AccessKey"];
        var secretKey = config["Storage:S3:SecretKey"];
        var endpoint = config["Storage:S3:Endpoint"];
        var region = config["Storage:S3:Region"] ?? "us-east-1";
        var forcePathStyle = config.GetValue("Storage:S3:ForcePathStyle", true);

        if (string.IsNullOrWhiteSpace(accessKey) || string.IsNullOrWhiteSpace(secretKey))
            throw new InvalidOperationException("Storage:S3:AccessKey and Storage:S3:SecretKey are required.");
        if (string.IsNullOrWhiteSpace(endpoint))
            throw new InvalidOperationException("Storage:S3:Endpoint is required.");

        var s3Config = new AmazonS3Config
        {
            ServiceURL = endpoint,
            ForcePathStyle = forcePathStyle,
            RegionEndpoint = Amazon.RegionEndpoint.GetBySystemName(region)
        };

        var client = new AmazonS3Client(new BasicAWSCredentials(accessKey, secretKey), s3Config);
        var logger = sp.GetRequiredService<ILogger<S3ImageStorageProvider>>();
        return new S3ImageStorageProvider(client, config, logger);
    }

    return new LocalImageStorageProvider(env, config);
});
builder.Services.AddScoped<MonetizationService>();
builder.Services.AddScoped<ImageCleanupService>();
builder.Services.AddSingleton<IPaymentGateway, MockPaymentGateway>();
builder.Services.AddSingleton<PaymentGatewayRegistry>();

// NEW: Shipping Service
builder.Services.AddScoped<IShippingService, DhlShippingService>();

builder.Services.AddSignalR();
builder.Services.AddScoped<IChatEvents, ChatEvents>();

builder.Services.AddSingleton<IClock, SystemClock>();

var filters = Path.Combine(AppContext.BaseDirectory, "src", "Messaging", "Filters");

builder.Services.AddSingleton<HtmlTextSanitizer>();
builder.Services.AddSingleton(sp =>
    ProfanityTextSanitizer.FromSources(
        standalonePath: Path.Combine(filters, "profanity-standalone.txt"),
        substringPath: Path.Combine(filters, "profanity-substring.txt"),
        whitelistPath: Path.Combine(filters, "profanity-whitelist.txt")
    ));
builder.Services.AddSingleton<ITextSanitizer>(sp =>
    new SanitizationPipeline(new ITextSanitizer[] {
        sp.GetRequiredService<HtmlTextSanitizer>(),
        sp.GetRequiredService<ProfanityTextSanitizer>()
    })
);


builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .ToDictionary(
                    x => x.Key,
                    x => x.Value!.Errors.Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage)
                        ? "The input was invalid."
                        : e.ErrorMessage).ToArray());

            var details = new ValidationProblemDetails(errors)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Validation failed.",
                Type = "about:blank"
            };
            details.Extensions["code"] = "invalid_input";
            return new BadRequestObjectResult(details);
        };
    });
ConnectAuthenticators.connectAuthenticators(builder);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        RateLimitKeys.ForRequest(context),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = builder.Configuration.GetValue("RateLimits:Auth:PermitLimit", 10),
            Window = TimeSpan.FromMinutes(builder.Configuration.GetValue("RateLimits:Auth:WindowMinutes", 1)),
            QueueLimit = 0
        }));
    options.AddPolicy("registration", context => RateLimitPartition.GetFixedWindowLimiter(
        RateLimitKeys.ForRequest(context),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = builder.Configuration.GetValue("RateLimits:Registration:PermitLimit", 5),
            Window = TimeSpan.FromMinutes(builder.Configuration.GetValue("RateLimits:Registration:WindowMinutes", 10)),
            QueueLimit = 0
        }));
    options.AddPolicy("uploads", context => RateLimitPartition.GetFixedWindowLimiter(
        RateLimitKeys.ForRequest(context),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = builder.Configuration.GetValue("RateLimits:Uploads:PermitLimit", 20),
            Window = TimeSpan.FromMinutes(builder.Configuration.GetValue("RateLimits:Uploads:WindowMinutes", 10)),
            QueueLimit = 0
        }));
    options.AddPolicy("reports", context => RateLimitPartition.GetFixedWindowLimiter(
        RateLimitKeys.ForRequest(context),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = builder.Configuration.GetValue("RateLimits:Reports:PermitLimit", 10),
            Window = TimeSpan.FromMinutes(builder.Configuration.GetValue("RateLimits:Reports:WindowMinutes", 10)),
            QueueLimit = 0
        }));
    options.AddPolicy("chat", context => RateLimitPartition.GetFixedWindowLimiter(
        RateLimitKeys.ForRequest(context),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = builder.Configuration.GetValue("RateLimits:Chat:PermitLimit", 60),
            Window = TimeSpan.FromMinutes(builder.Configuration.GetValue("RateLimits:Chat:WindowMinutes", 1)),
            QueueLimit = 0
        }));
    options.AddPolicy("shipping", context => RateLimitPartition.GetFixedWindowLimiter(
        RateLimitKeys.ForRequest(context),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = builder.Configuration.GetValue("RateLimits:Shipping:PermitLimit", 60),
            Window = TimeSpan.FromMinutes(builder.Configuration.GetValue("RateLimits:Shipping:WindowMinutes", 1)),
            QueueLimit = 0
        }));
    options.AddPolicy("write", context => RateLimitPartition.GetFixedWindowLimiter(
        RateLimitKeys.ForRequest(context),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = builder.Configuration.GetValue("RateLimits:Write:PermitLimit", 60),
            Window = TimeSpan.FromMinutes(builder.Configuration.GetValue("RateLimits:Write:WindowMinutes", 1)),
            QueueLimit = 0
        }));
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(o =>
{
    o.AddPolicy("AllowAll", p =>
    {
        var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? Array.Empty<string>();
        var allowAnyOrigin = builder.Environment.IsDevelopment()
            && builder.Configuration.GetValue<bool>("Cors:AllowAnyOrigin");
        if (allowAnyOrigin)
        {
            p.AllowAnyHeader()
                .AllowAnyMethod()
                .AllowAnyOrigin();
            return;
        }

        var origins = configuredOrigins.Length > 0
            ? configuredOrigins
            : new[] { "http://localhost:3000", "https://localhost:3000" };
        p.AllowAnyHeader()
            .AllowAnyMethod()
            .WithOrigins(origins);
    });
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

// if (useEf && !app.Environment.IsEnvironment("Testing"))
// {
//     using var scope = app.Services.CreateScope();
//     var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
//     db.Database.EnsureCreated();
// }

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsEnvironment("Testing"))
{
    app.UseHttpsRedirection();
}

app.UseStaticFiles();
var webRoot = app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var uploadsPath = app.Configuration["Storage:Local:Path"];
if (string.IsNullOrWhiteSpace(uploadsPath))
    uploadsPath = Path.Combine(webRoot, "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

app.UseRouting();
app.UseMiddleware<ApiExceptionMiddleware>();
if (useSentry)
{
    app.UseSentryTracing();
}
app.UseCors("AllowAll");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

app.MapGet("/", () => Results.Content("ok", "text/html"));

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

internal static class ProductionConfigurationGuard
{
    public static void Validate(IConfiguration configuration, IWebHostEnvironment environment)
    {
        if (!environment.IsProduction()) return;

        var jwtSecret = configuration["Jwt:Secret"];
        var jwtExpMinutes = configuration.GetValue("Jwt:ExpMinutes", 60);
        if (string.IsNullOrWhiteSpace(jwtSecret) ||
            jwtSecret.Equals("REPLACE_ME", StringComparison.OrdinalIgnoreCase) ||
            jwtSecret.Contains("REPLACE_ME", StringComparison.OrdinalIgnoreCase) ||
            jwtSecret.Length < 32)
        {
            throw new InvalidOperationException("Jwt:Secret must be configured with a production-grade secret.");
        }
        if (jwtExpMinutes < 5 || jwtExpMinutes > 120)
            throw new InvalidOperationException("Jwt:ExpMinutes must be between 5 and 120 in production.");

        var connectionString = configuration.GetConnectionString("Default");
        if (string.IsNullOrWhiteSpace(connectionString) ||
            connectionString.Contains("postgres_password", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("ConnectionStrings:Default must be configured for production.");
        }

        if (string.Equals(configuration["Storage:Provider"], "s3", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(configuration["Storage:S3:AccessKey"]) ||
                string.IsNullOrWhiteSpace(configuration["Storage:S3:SecretKey"]) ||
                string.IsNullOrWhiteSpace(configuration["Storage:S3:Bucket"]) ||
                string.IsNullOrWhiteSpace(configuration["Storage:S3:PublicBaseUrl"]))
            {
                throw new InvalidOperationException("S3 storage credentials and public base URL must be configured for production.");
            }
        }
    }
}

internal static class RateLimitKeys
{
    public static string ForRequest(HttpContext context)
    {
        var subject = context.User?.FindFirst("sub")?.Value;
        if (!string.IsNullOrWhiteSpace(subject))
            return $"user:{subject}";

        var configuration = context.RequestServices.GetRequiredService<IConfiguration>();
        var trustForwardedFor = configuration.GetValue<bool>("RateLimits:TrustForwardedFor");
        var forwarded = trustForwardedFor
            ? context.Request.Headers["X-Forwarded-For"].FirstOrDefault()
            : null;
        var ip = string.IsNullOrWhiteSpace(forwarded)
            ? context.Connection.RemoteIpAddress?.ToString()
            : forwarded.Split(',')[0].Trim();

        return string.IsNullOrWhiteSpace(ip) ? "anonymous" : $"ip:{ip}";
    }
}

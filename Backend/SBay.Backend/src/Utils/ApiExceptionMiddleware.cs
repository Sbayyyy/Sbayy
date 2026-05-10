using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SBay.Backend.Exceptions;

namespace SBay.Backend.Utils;

public class ApiExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiExceptionMiddleware> _logger;

    public ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var (status, code, message, details) = MapException(ex);
            _logger.LogError(ex, "Request failed with {Status} {Code}", status, code);
            if (context.Response.HasStarted) throw;
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = status;
            var payload = new { status, code, message, details };
            await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
        }
    }

    private static (int Status, string Code, string Message, object? Details) MapException(Exception ex)
    {
        if (ex is ApiException api)
            return (api.StatusCode, api.Code, api.Message, api.Details);

        if (ex is UnauthorizedAccessException)
            return (401, "unauthorized", "Unauthorized.", null);

        if (ex is ArgumentException or ArgumentOutOfRangeException or FormatException)
            return (400, "invalid_input", ex.Message, null);

        if (ex is KeyNotFoundException)
            return (404, "not_found", ex.Message, null);

        if (ex is TimeoutException)
            return (408, "timeout", "The request timed out.", null);

        if (ex is DbUpdateException)
            return (409, "conflict", "A database conflict occurred.", null);

        if (ex is NotImplementedException)
            return (501, "method_not_allowed", "This operation is not available.", null);

        if (ex is NotSupportedException)
            return (400, "not_acceptable", ex.Message, null);

        if (ex is InvalidOperationException invalidOp)
        {
            var msg = invalidOp.Message ?? string.Empty;
            if (msg.Contains("Forbidden", StringComparison.OrdinalIgnoreCase))
                return (403, "forbidden", "Forbidden.", null);
            if (msg.Contains("not found", StringComparison.OrdinalIgnoreCase))
                return (404, "not_found", invalidOp.Message, null);
            if (msg.Contains("Rate limited", StringComparison.OrdinalIgnoreCase))
                return (429, "too_many_requests", invalidOp.Message, null);
            if (msg.Contains("Empty message", StringComparison.OrdinalIgnoreCase)
                || msg.Contains("Message too long", StringComparison.OrdinalIgnoreCase)
                || msg.Contains("Edit window expired", StringComparison.OrdinalIgnoreCase)
                || msg.Contains("Delete window expired", StringComparison.OrdinalIgnoreCase))
                return (400, "invalid_input", invalidOp.Message, null);
            if (msg.Contains("Invalid participants", StringComparison.OrdinalIgnoreCase))
                return (409, "conflict", invalidOp.Message, null);
            return (500, "internal_error", "An unexpected error occurred.", null);
        }

        return (500, "internal_error", "An unexpected error occurred.", null);
    }
}

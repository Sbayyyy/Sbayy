using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SBay.Backend.APIs.Records.Requests;
using SBay.Backend.APIs.Records.Responses;
using SBay.Backend.Exceptions;
using SBay.Backend.Services;
using SBay.Domain.Authentication;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/bug-reports")]
[Authorize]
public class BugReportsController : ControllerBase
{
    private static readonly HashSet<string> AllowedSeverities = new(StringComparer.OrdinalIgnoreCase)
    {
        "low",
        "medium",
        "high",
        "critical"
    };

    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _config;
    private readonly ILogger<BugReportsController> _logger;

    public BugReportsController(
        IEmailSender emailSender,
        IConfiguration config,
        ILogger<BugReportsController> logger)
    {
        _emailSender = emailSender;
        _config = config;
        _logger = logger;
    }

    [HttpPost]
    [Authorize(Policy = ScopePolicies.UsersRead)]
    [EnableRateLimiting("reports")]
    public async Task<ActionResult<BugReportResponse>> Create([FromBody] CreateBugReportRequest req, CancellationToken ct)
    {
        var title = RequiredTrim(req.Title, "Title", 120);
        var description = RequiredTrim(req.Description, "Description", 5000);
        var severity = OptionalTrim(req.Severity, 20)?.ToLowerInvariant() ?? "medium";

        if (!AllowedSeverities.Contains(severity))
            throw new BadRequestException("Severity must be one of: low, medium, high, critical.");

        var pageUrl = OptionalTrim(req.PageUrl, 1000);
        var steps = OptionalTrim(req.Steps, 3000);
        var expected = OptionalTrim(req.Expected, 2000);
        var actual = OptionalTrim(req.Actual, 2000);
        var browser = OptionalTrim(req.Browser, 200);
        var userAgent = OptionalTrim(req.UserAgent, 500);
        var reporterId = User.FindFirstValue("sub")
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? "unknown";
        var reporterEmail = User.FindFirstValue("email")
            ?? User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Email);
        var reportId = Guid.NewGuid();
        var createdAt = DateTimeOffset.UtcNow;

        _logger.LogWarning(
            "Bug report submitted {BugReportId} severity={Severity} reporter={ReporterId} email={ReporterEmail} page={PageUrl} title={Title}",
            reportId,
            severity,
            reporterId,
            reporterEmail,
            pageUrl,
            title);
        _logger.LogInformation(
            "Bug report details {BugReportId}: description={Description} steps={Steps} expected={Expected} actual={Actual} browser={Browser} userAgent={UserAgent}",
            reportId,
            description,
            steps,
            expected,
            actual,
            browser,
            userAgent);

        var supportEmail = _config["Support:Email"] ?? _config["Email:From"];
        if (!string.IsNullOrWhiteSpace(supportEmail))
        {
            try
            {
                await _emailSender.SendEmailAsync(
                    supportEmail,
                    $"[SBay Bug] {severity}: {title}",
                    BuildHtmlBody(reportId, createdAt, title, description, severity, reporterId, reporterEmail, pageUrl, steps, expected, actual, browser, userAgent),
                    BuildTextBody(reportId, createdAt, title, description, severity, reporterId, reporterEmail, pageUrl, steps, expected, actual, browser, userAgent),
                    ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to email bug report {BugReportId} to support.", reportId);
            }
        }

        return Ok(new BugReportResponse(reportId, createdAt));
    }

    private static string RequiredTrim(string? value, string fieldName, int maxLength)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new BadRequestException($"{fieldName} is required.");
        if (trimmed.Length > maxLength)
            throw new BadRequestException($"{fieldName} is too long.");
        return trimmed;
    }

    private static string? OptionalTrim(string? value, int maxLength)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            return null;
        if (trimmed.Length > maxLength)
            throw new BadRequestException("One or more fields are too long.");
        return trimmed;
    }

    private static string BuildHtmlBody(
        Guid id,
        DateTimeOffset createdAt,
        string title,
        string description,
        string severity,
        string reporterId,
        string? reporterEmail,
        string? pageUrl,
        string? steps,
        string? expected,
        string? actual,
        string? browser,
        string? userAgent)
    {
        return $"""
            <h2>Bug report {Html(id.ToString())}</h2>
            <p><strong>Created:</strong> {Html(createdAt.ToString("O"))}</p>
            <p><strong>Severity:</strong> {Html(severity)}</p>
            <p><strong>Reporter:</strong> {Html(reporterId)} {Html(reporterEmail ?? "")}</p>
            <p><strong>Page:</strong> {Html(pageUrl ?? "Not provided")}</p>
            <h3>{Html(title)}</h3>
            <p>{Html(description)}</p>
            <h3>Steps</h3><p>{Html(steps ?? "Not provided")}</p>
            <h3>Expected</h3><p>{Html(expected ?? "Not provided")}</p>
            <h3>Actual</h3><p>{Html(actual ?? "Not provided")}</p>
            <p><strong>Browser:</strong> {Html(browser ?? "Not provided")}</p>
            <p><strong>User agent:</strong> {Html(userAgent ?? "Not provided")}</p>
            """;
    }

    private static string BuildTextBody(
        Guid id,
        DateTimeOffset createdAt,
        string title,
        string description,
        string severity,
        string reporterId,
        string? reporterEmail,
        string? pageUrl,
        string? steps,
        string? expected,
        string? actual,
        string? browser,
        string? userAgent)
    {
        return $"""
            Bug report: {id}
            Created: {createdAt:O}
            Severity: {severity}
            Reporter: {reporterId} {reporterEmail}
            Page: {pageUrl ?? "Not provided"}

            Title: {title}
            Description:
            {description}

            Steps:
            {steps ?? "Not provided"}

            Expected:
            {expected ?? "Not provided"}

            Actual:
            {actual ?? "Not provided"}

            Browser: {browser ?? "Not provided"}
            User agent: {userAgent ?? "Not provided"}
            """;
    }

    private static string Html(string value) => WebUtility.HtmlEncode(value);
}

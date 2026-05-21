using System.Net;
using System.Net.Mail;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SBay.Backend.APIs.Records.Requests;
using SBay.Backend.APIs.Records.Responses;
using SBay.Backend.Exceptions;
using SBay.Backend.Services;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/contact")]
[AllowAnonymous]
public class ContactController : ControllerBase
{
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _config;
    private readonly ILogger<ContactController> _logger;

    public ContactController(
        IEmailSender emailSender,
        IConfiguration config,
        ILogger<ContactController> logger)
    {
        _emailSender = emailSender;
        _config = config;
        _logger = logger;
    }

    [HttpPost]
    [EnableRateLimiting("reports")]
    public async Task<ActionResult<ContactResponse>> Create([FromBody] CreateContactRequest req, CancellationToken ct)
    {
        var name = RequiredTrim(req.Name, "Name", 120);
        var email = RequiredTrim(req.Email, "Email", 254);
        var subject = RequiredTrim(req.Subject, "Subject", 160);
        var message = RequiredTrim(req.Message, "Message", 5000);
        var pageUrl = OptionalTrim(req.PageUrl, 1000);
        var userAgent = OptionalTrim(req.UserAgent, 500);

        if (!MailAddress.TryCreate(email, out var parsedEmail) ||
            !string.Equals(parsedEmail.Address, email, StringComparison.OrdinalIgnoreCase))
            throw new BadRequestException("A valid email address is required.");

        var contactId = Guid.NewGuid();
        var createdAt = DateTimeOffset.UtcNow;

        _logger.LogWarning(
            "Contact form submitted {ContactId} from={Email} name={Name} subject={Subject} page={PageUrl}",
            contactId,
            email,
            name,
            subject,
            pageUrl);
        _logger.LogInformation(
            "Contact form details {ContactId}: message={Message} userAgent={UserAgent}",
            contactId,
            message,
            userAgent);

        var supportEmail = _config["Support:Email"] ?? _config["Email:From"];
        if (!string.IsNullOrWhiteSpace(supportEmail))
        {
            try
            {
                await _emailSender.SendEmailAsync(
                    supportEmail,
                    $"[SBay Contact] {subject}",
                    BuildHtmlBody(contactId, createdAt, name, email, subject, message, pageUrl, userAgent),
                    BuildTextBody(contactId, createdAt, name, email, subject, message, pageUrl, userAgent),
                    ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to email contact form {ContactId} to support.", contactId);
            }
        }

        return Ok(new ContactResponse(contactId, createdAt));
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
        string name,
        string email,
        string subject,
        string message,
        string? pageUrl,
        string? userAgent)
    {
        return $"""
            <h2>Contact message {Html(id.ToString())}</h2>
            <p><strong>Created:</strong> {Html(createdAt.ToString("O"))}</p>
            <p><strong>Name:</strong> {Html(name)}</p>
            <p><strong>Email:</strong> {Html(email)}</p>
            <p><strong>Subject:</strong> {Html(subject)}</p>
            <p><strong>Page:</strong> {Html(pageUrl ?? "Not provided")}</p>
            <h3>Message</h3>
            <p>{Html(message)}</p>
            <p><strong>User agent:</strong> {Html(userAgent ?? "Not provided")}</p>
            """;
    }

    private static string BuildTextBody(
        Guid id,
        DateTimeOffset createdAt,
        string name,
        string email,
        string subject,
        string message,
        string? pageUrl,
        string? userAgent)
    {
        return $"""
            Contact message: {id}
            Created: {createdAt:O}
            Name: {name}
            Email: {email}
            Subject: {subject}
            Page: {pageUrl ?? "Not provided"}

            Message:
            {message}

            User agent: {userAgent ?? "Not provided"}
            """;
    }

    private static string Html(string value) => WebUtility.HtmlEncode(value);
}

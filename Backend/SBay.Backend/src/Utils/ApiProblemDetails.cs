using Microsoft.AspNetCore.Mvc;

namespace SBay.Backend.Utils;

public static class ApiProblemDetails
{
    private const string DefaultType = "about:blank";

    public static ValidationProblemDetails Validation(string error, string? field = null)
    {
        var details = new ValidationProblemDetails
        {
            Title = "Validation failed.",
            Detail = error,
            Status = StatusCodes.Status400BadRequest,
            Type = DefaultType
        };

        if (!string.IsNullOrWhiteSpace(field))
        {
            details.Errors.Add(field, new[] { error });
        }
        else
        {
            details.Errors.Add("error", new[] { error });
        }

        details.Extensions["code"] = "invalid_input";
        return details;
    }

    public static ProblemDetails BadRequest(string error, string? code = "invalid_request")
    {
        var details = new ProblemDetails
        {
            Title = "Bad Request",
            Detail = error,
            Status = StatusCodes.Status400BadRequest,
            Type = DefaultType
        };
        details.Extensions["code"] = code;
        return details;
    }

    public static ProblemDetails NotFound(string error, string? code = "not_found")
    {
        var details = new ProblemDetails
        {
            Title = "Not Found",
            Detail = error,
            Status = StatusCodes.Status404NotFound,
            Type = DefaultType
        };
        details.Extensions["code"] = code;
        return details;
    }

    public static ProblemDetails Forbidden(string error, string? code = "forbidden")
    {
        var details = new ProblemDetails
        {
            Title = "Forbidden",
            Detail = error,
            Status = StatusCodes.Status403Forbidden,
            Type = DefaultType
        };
        details.Extensions["code"] = code;
        return details;
    }
}

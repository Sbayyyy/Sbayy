namespace SBay.Backend.Exceptions;

public class BadRequestException : ApiException
{
    public BadRequestException(string message, object? details = null)
        : base(400, "bad_request", message, details) { }
}

public class UnauthorizedException : ApiException
{
    public UnauthorizedException(string message, object? details = null)
        : base(401, "unauthorized", message, details) { }
}

public class InvalidInputException : ApiException
{
    public InvalidInputException(string message, object? details = null)
        : base(402, "invalid_input", message, details) { }
}

public class ForbiddenException : ApiException
{
    public ForbiddenException(string message, object? details = null)
        : base(403, "forbidden", message, details) { }
}

public class NotFoundException : ApiException
{
    public NotFoundException(string message, object? details = null)
        : base(404, "not_found", message, details) { }
}

public class MethodNotAllowedException : ApiException
{
    public MethodNotAllowedException(string message, object? details = null)
        : base(405, "method_not_allowed", message, details) { }
}

public class NotAcceptableException : ApiException
{
    public NotAcceptableException(string message, object? details = null)
        : base(406, "not_acceptable", message, details) { }
}

public class RequestTimeoutException : ApiException
{
    public RequestTimeoutException(string message, object? details = null)
        : base(408, "timeout", message, details) { }
}

public class ConflictException : ApiException
{
    public ConflictException(string message, object? details = null)
        : base(409, "conflict", message, details) { }
}

public class TooManyRequestsException : ApiException
{
    public TooManyRequestsException(string message, object? details = null)
        : base(429, "too_many_requests", message, details) { }
}

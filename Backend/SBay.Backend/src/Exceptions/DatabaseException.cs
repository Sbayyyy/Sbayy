namespace SBay.Backend.Exceptions;

public class DatabaseException : Exception
{
    public DatabaseException()
        : base("Database Error") { }

    public DatabaseException(string message)
        : base(message) { }

    public DatabaseException(string message, Exception innerException)
        : base(message, innerException) { }
}

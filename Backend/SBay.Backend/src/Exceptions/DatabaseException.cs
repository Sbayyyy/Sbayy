namespace SBay.Backend.Exceptions;

public class DatabaseException : Exception, IException
{
    private string _errorMessage;

    public DatabaseException()
    {
        _errorMessage = "Database Error";
        
    }

    public DatabaseException(string message) : base(message)
    {
        _errorMessage = message;
    }

    public string what()
    {
        return _errorMessage;
        
    }

}
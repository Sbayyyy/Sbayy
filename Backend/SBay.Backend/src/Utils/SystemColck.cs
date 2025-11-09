
namespace SBay.Backend.Utils;

public sealed class SystemClock : IClock { public DateTime UtcNow => DateTime.UtcNow; }
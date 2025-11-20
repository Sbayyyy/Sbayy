using System.Reflection;
using System.Runtime.Serialization;

namespace SBay.Backend.DataBase.Firebase.Models;

internal static class DomainObjectFactory
{
    private const BindingFlags Flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;

    public static T Create<T>() where T : class
        => (T)FormatterServices.GetUninitializedObject(typeof(T));

    public static void SetProperty<T>(T target, string name, object? value)
    {
        var prop = typeof(T).GetProperty(name, Flags)
                   ?? throw new InvalidOperationException($"Property '{name}' not found on {typeof(T).Name}");
        prop.SetValue(target, value);
    }

    public static void SetField<T>(T target, string name, object? value)
    {
        var field = typeof(T).GetField(name, Flags)
                    ?? throw new InvalidOperationException($"Field '{name}' not found on {typeof(T).Name}");
        field.SetValue(target, value);
    }
}

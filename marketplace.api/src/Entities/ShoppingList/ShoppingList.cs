using System.Collections;

namespace SBay.Domain.Entities
{
    public class ShoppingList<T> : IEnumerable<T>
    {
        public List<T> Items { get; private set; } = new();
        public void Add(T item) => Items.Add(item);
        public IEnumerator<T> GetEnumerator() => Items.GetEnumerator();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }
}
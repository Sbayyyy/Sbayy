namespace SBay.Domain.Entities
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text.Json.Serialization;
    using SBay.Domain.ValueObjects;

    public class ShoppingCart
    {
        public Guid Id { get; private set; } = Guid.NewGuid();

        
        public Guid? UserId { get; private set; }

        
        [JsonInclude]                 
        private List<CartItem> _items { get; set; } = new();
        [JsonIgnore]
        public IReadOnlyList<CartItem> Items => _items;

        [JsonIgnore]
        public string Currency => _items.FirstOrDefault()?.UnitPrice.Currency ?? "EUR";

        [JsonIgnore]
        public Money Subtotal => _items.Count == 0
            ? new Money(0m, Currency)
            : _items.Select(i => i.LineTotal).Aggregate((a, b) => a + b); 

        public DateTime UpdatedAt { get; internal set; }


        private ShoppingCart() { } 
        public ShoppingCart(Guid? userId = null) => UserId = userId;

        public void AddItem(Listing listing, int quantity = 1)
        {
            if (listing is null) throw new ArgumentNullException(nameof(listing));
            if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity));

            
            if (_items.Count > 0 && _items[0].UnitPrice.Currency != listing.Price.Currency)
                throw new InvalidOperationException("All items in the cart must share the same currency.");

            var existing = _items.FirstOrDefault(i => i.ListingId == listing.Id);
            if (existing is not null)
            {
                existing.ChangeQuantity(existing.Quantity + quantity);
            }
            else
            {
                _items.Add(new CartItem(listing, quantity));
            }
        }

        public void SetQuantity(Guid listingId, int quantity)
        {
            if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity));
            var item = _items.FirstOrDefault(i => i.ListingId == listingId)
                       ?? throw new KeyNotFoundException("Listing not in cart.");
            item.ChangeQuantity(quantity);
        }

        
        public bool TrySetQuantity(Guid listingId, int quantity)
        {
            if (quantity <= 0) return false;
            var item = _items.FirstOrDefault(i => i.ListingId == listingId);
            if (item is null) return false;
            item.ChangeQuantity(quantity);
            return true;
        }

        public void Increment(Guid listingId, int delta = 1)
        {
            if (delta <= 0) throw new ArgumentOutOfRangeException(nameof(delta));
            var item = _items.FirstOrDefault(i => i.ListingId == listingId)
                       ?? throw new KeyNotFoundException("Listing not in cart.");
            item.ChangeQuantity(item.Quantity + delta);
        }

        public void Decrement(Guid listingId, int delta = 1)
        {
            if (delta <= 0) throw new ArgumentOutOfRangeException(nameof(delta));
            var item = _items.FirstOrDefault(i => i.ListingId == listingId)
                       ?? throw new KeyNotFoundException("Listing not in cart.");
            var next = item.Quantity - delta;
            if (next <= 0) _items.Remove(item);
            else item.ChangeQuantity(next);
        }

        public void RemoveItem(Guid listingId)
        {
            var item = _items.FirstOrDefault(i => i.ListingId == listingId);
            if (item != null) _items.Remove(item);
        }

        public bool TryRemove(Guid listingId)
        {
            var item = _items.FirstOrDefault(i => i.ListingId == listingId);
            return item != null && _items.Remove(item);
        }

        public void Clear() => _items.Clear();

        public CartTotals ComputeTotals(
            decimal taxRatePercent = 0m,
            Money? shipping = null,
            Money? discount = null)
        {
            var subtotal = Subtotal;
            var tax = Percent(subtotal, taxRatePercent);
            var ship = shipping ?? new Money(0m, subtotal.Currency);
            var disc = discount ?? new Money(0m, subtotal.Currency);

            if (ship.Currency != subtotal.Currency || disc.Currency != subtotal.Currency)
                throw new InvalidOperationException("Currency mismatch in totals.");

            var total = subtotal + tax + ship - disc;
            return new CartTotals(subtotal, tax, ship, disc, total);
        }

        private static Money Percent(Money baseAmount, decimal percent)
        {
            var value = Math.Round(baseAmount.Amount * (percent / 100m), 2, MidpointRounding.AwayFromZero);
            return new Money(value, baseAmount.Currency);
        }
    }

    public readonly record struct CartTotals(
        SBay.Domain.ValueObjects.Money Subtotal,
        SBay.Domain.ValueObjects.Money Tax,
        SBay.Domain.ValueObjects.Money Shipping,
        SBay.Domain.ValueObjects.Money Discount,
        SBay.Domain.ValueObjects.Money Total);
}

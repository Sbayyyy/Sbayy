using System;
using System.Text.Json.Serialization;
using SBay.Domain.ValueObjects;

namespace SBay.Domain.Entities
{
    public class CartItem
    {
        [JsonInclude]
        public Guid ListingId { get; private set; }

        [JsonInclude]
        public Listing Listing { get; private set; } = default!;

        [JsonInclude]
        public int Quantity { get; private set; }

        public Money UnitPrice { get; private set; }

        [JsonIgnore]
        public Money LineTotal => new(UnitPrice.Amount * Quantity, UnitPrice.Currency);
        private CartItem() { }

        public CartItem(Listing listing, int quantity)
        {
            if (listing == null)
                throw new ArgumentNullException(nameof(listing));
            if (quantity <= 0)
                throw new ArgumentOutOfRangeException(nameof(quantity));

            Listing = listing;
            ListingId = listing.Id;
            Quantity = quantity;
            UnitPrice = listing.Price;
        }

        public void ChangeQuantity(int newQuantity)
        {
            if (newQuantity <= 0)
                throw new ArgumentOutOfRangeException(nameof(newQuantity));
            Quantity = newQuantity;
        }
    }
}

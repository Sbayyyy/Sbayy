using System.Text.Json.Serialization;
namespace SBay.Domain.Entities
{
    public class CartItem
    {
        [JsonInclude]
        public Listing Listing { get; private set; }

        [JsonInclude]
        public int Quantity { get; private set; }

        [JsonInclude]
        public Money UnitPrice { get; private set; }

        [JsonIgnore]
        public decimal Total => Quantity * UnitPrice.Amount;

        // For deserialization
        private CartItem() { }

        public CartItem(Listing listing, int quantity)
        {
            if (listing == null)
                throw new ArgumentNullException(nameof(listing));
            if (quantity <= 0)
                throw new ArgumentOutOfRangeException(nameof(quantity));

            Listing = listing;
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
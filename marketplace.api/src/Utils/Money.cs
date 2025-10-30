using System;
using System.Text.Json.Serialization;

namespace SBay.Domain.ValueObjects
{
    /// <summary>
    /// Immutable value object representing a monetary amount and currency.
    /// </summary>
    public readonly record struct Money
    {
        public decimal Amount { get; init; }
        public string Currency { get; init; }
        [JsonConstructor]
        public Money(decimal amount, string currency)
        {
            if (string.IsNullOrWhiteSpace(currency))
                throw new ArgumentException("Currency required", nameof(currency));

            Amount = amount;
            Currency = currency.ToUpperInvariant();
        }

        // ───────────────────────────────
        // Operators
        // ───────────────────────────────
        public static Money operator +(Money a, Money b)
        {
            if (a.Currency != b.Currency)
                throw new InvalidOperationException("Currency mismatch in addition");
            return new Money(a.Amount + b.Amount, a.Currency);
        }

        public static Money operator -(Money a, Money b)
        {
            if (a.Currency != b.Currency)
                throw new InvalidOperationException("Currency mismatch in subtraction");
            return new Money(a.Amount - b.Amount, a.Currency);
        }

        public static Money operator *(Money a, int quantity)
            => new(a.Amount * quantity, a.Currency);

        public static Money operator *(int quantity, Money a)
            => a * quantity;

        // ───────────────────────────────
        // Helpers
        // ───────────────────────────────
        public Money Zero() => new(0m, Currency);

        public override string ToString() => $"{Amount:0.00} {Currency}";

        public static Money FromAmount(decimal amount, string currency = "EUR")
            => new(amount, currency);
    }
}

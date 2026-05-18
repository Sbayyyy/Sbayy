namespace SBay.Backend.APIs.Records;

public sealed record CreateOfferRequest(decimal Amount, string? Currency);

public sealed record CounterOfferRequest(decimal Amount, string? Currency);

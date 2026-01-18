namespace SBay.Backend.Messaging;

public sealed class NoOpChatEvents : IChatEvents
{
    public Task MessageNewAsync(Message _, CancellationToken __) => Task.CompletedTask;
    public Task MessagesReadAsync(Guid _, Guid __, CancellationToken ___) => Task.CompletedTask;
}
namespace SBay.Backend.Messaging;

public sealed class NoOpChatEvents : IChatEvents
{
    public Task MessageNewAsync(Message _, CancellationToken __) => Task.CompletedTask;
    public Task MessagesReadAsync(Guid _, Guid __, Guid? ___, CancellationToken ____) => Task.CompletedTask;
    public Task MessageUpdatedAsync(Message _, CancellationToken __) => Task.CompletedTask;
    public Task MessageDeletedAsync(Guid _, Guid __, Guid ___, Guid ____, bool _____, CancellationToken ______) => Task.CompletedTask;
}

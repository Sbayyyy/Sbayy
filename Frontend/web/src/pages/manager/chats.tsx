import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AdminGate from '@/components/manager/AdminGate';
import {
  deleteAdminChatMessage,
  getAdminChatMessages,
  getAdminChats,
  type AdminChat,
  type AdminChatMessage,
} from '@/lib/api/adminManagement';
import { useAuthStore } from '@/lib/store';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function ManagerChatsPage() {
  const { user } = useAuthStore();
  const [chats, setChats] = useState<AdminChat[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedChat, setSelectedChat] = useState<AdminChat | null>(null);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const loadChats = useCallback(async () => {
    if (user?.role !== 'admin') return;
    setIsLoading(true);
    setError(null);
    try {
      setChats(await getAdminChats({ q: query || undefined, take: 100 }));
    } catch {
      setError('Could not load chats.');
    } finally {
      setIsLoading(false);
    }
  }, [query, user?.role]);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  const openChat = useCallback(async (chat: AdminChat) => {
    setSelectedChat(chat);
    setMessages([]);
    setMessagesLoading(true);
    setError(null);
    try {
      setMessages(await getAdminChatMessages(chat.id));
    } catch {
      setError('Could not load messages for this chat.');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  async function handleDeleteMessage(messageId: string) {
    if (!selectedChat) return;
    if (!window.confirm('Delete this message? This cannot be undone.')) return;
    setError(null);
    try {
      await deleteAdminChatMessage(selectedChat.id, messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch {
      setError('Could not delete the message. Make sure your admin session is still valid.');
    }
  }

  return (
    <Layout title="Moderate Chats">
      <AdminGate>
        <div className="py-8">
          <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-blue-700">Managers</p>
              <h1 className="mt-2 text-3xl font-semibold text-gray-950">Chats</h1>
              <p className="mt-2 text-sm text-gray-600">Review conversations and remove abusive messages.</p>
            </div>
            <Link href="/manager/dashboard" className="text-sm font-semibold text-blue-700 hover:underline">
              Back to dashboard
            </Link>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by participant email"
              className="h-10 flex-1 rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="button"
              onClick={loadChats}
              disabled={isLoading}
              className="h-10 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-gray-400"
            >
              {isLoading ? 'Loading' : 'Search'}
            </button>
          </div>

          {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1.4fr]">
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Conversations
              </div>
              <ul className="divide-y divide-gray-100">
                {chats.map(chat => (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => openChat(chat)}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left text-sm hover:bg-gray-50 ${
                        selectedChat?.id === chat.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span className="font-semibold text-gray-950">
                        {(chat.buyerEmail || chat.buyerId)} ↔ {(chat.sellerEmail || chat.sellerId)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {chat.listingTitle ? `${chat.listingTitle} · ` : ''}
                        {chat.messageCount} messages · {formatDateTime(chat.lastMessageAt ?? chat.createdAt)}
                      </span>
                    </button>
                  </li>
                ))}
                {chats.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-gray-500">No chats found.</li>
                )}
              </ul>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {selectedChat ? 'Messages' : 'Select a conversation'}
              </div>
              <div className="max-h-[32rem] overflow-y-auto p-4">
                {messagesLoading ? (
                  <p className="text-sm text-gray-500">Loading messages…</p>
                ) : !selectedChat ? (
                  <p className="text-sm text-gray-500">Choose a conversation on the left to review its messages.</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-gray-500">No messages in this conversation.</p>
                ) : (
                  <ul className="space-y-3">
                    {messages.map(message => (
                      <li key={message.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-700">
                              {message.senderEmail || message.senderId}
                              {message.type !== 'text' ? ` · ${message.type}` : ''}
                            </div>
                            <div className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-900">{message.content}</div>
                            <div className="mt-1 text-[11px] text-gray-400">{formatDateTime(message.createdAt)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(message.id)}
                            className="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminGate>
    </Layout>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { getChatSummaries } from '@/lib/api/messages';
import { getListingById } from '@/lib/api/listings';
import { getSellerProfile } from '@/lib/api/users';
import { createChatConnection, onMessageNew, onMessagesRead, onMessageUpdated, onMessageDeleted, type RealtimeDelete } from '@/lib/realtime/chat';
import { User, Message } from '@sbay/shared';
import { useAuthStore } from '@/lib/store';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { HubConnectionState } from '@microsoft/signalr';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { 
  MessageSquare, 
  Search,
  Package,
  User as UserIcon,
  AlertCircle,
  Inbox
} from 'lucide-react';
import Head from 'next/head';

interface ChatWithParticipant {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId?: string;
  createdAt: string;
  lastMessageAt?: string;
  participant?: User;
  listingTitle?: string;
  listingImageUrl?: string;
  lastMessage?: {
    id?: string;
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const isAuthed = useRequireAuth();
  const { t, i18n } = useTranslation('common');
  
  const [chats, setChats] = useState<ChatWithParticipant[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatWithParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const connectionRef = useRef<Awaited<ReturnType<typeof createChatConnection>> | null>(null);
  const joinedRef = useRef<Set<string>>(new Set());
  const chatsRef = useRef<ChatWithParticipant[]>([]);

  const loadChats = useCallback(async (mode: 'initial' | 'silent' = 'initial') => {
    if (!user?.id) return;
    
    try {
      if (mode === 'initial') setLoading(true);
      const data = await getChatSummaries(50, 0);

      const otherUserIds = Array.from(
        new Set(
          data.map((chat) =>
            chat.buyerId === user?.id ? chat.sellerId : chat.buyerId,
          ),
        ),
      );

      const listingIds = Array.from(
        new Set(data.map((chat) => chat.listingId).filter(Boolean) as string[]),
      );

      const profileMap = new Map<string, { name: string; avatar?: string }>();
      await Promise.all(
        otherUserIds.map(async (userId) => {
          try {
            const profile = await getSellerProfile(userId);
            profileMap.set(userId, { name: profile.name, avatar: profile.avatar });
          } catch {
            profileMap.set(userId, { name: `User ${userId.substring(0, 8)}` });
          }
        }),
      );

      const listingMap = new Map<string, { title: string; imageUrl?: string }>();
      await Promise.all(
        listingIds.map(async (listingId) => {
          try {
            const listing = await getListingById(listingId);
            listingMap.set(listingId, {
              title: listing.title,
              imageUrl: listing.thumbnailUrl || listing.imageUrls?.[0],
            });
          } catch {
            listingMap.set(listingId, {
              title: t('messages.productFallback', { id: listingId.substring(0, 8) }),
            });
          }
        }),
      );
      
      const processedChats = data.map(chat => {
        const otherUserId = chat.buyerId === user?.id ? chat.sellerId : chat.buyerId;
        const lastMessage = chat.lastMessage;

        return {
          id: chat.chatId,
          buyerId: chat.buyerId,
          sellerId: chat.sellerId,
          listingId: chat.listingId,
          createdAt: chat.createdAt,
          lastMessageAt: chat.lastMessageAt,
          participant: {
            id: otherUserId,
            name: profileMap.get(otherUserId)?.name ?? t('messages.userFallback', { id: otherUserId.substring(0, 8) }),
            avatar: profileMap.get(otherUserId)?.avatar,
            email: '',
            verified: false,
            createdAt: ''
          },
          listingTitle: chat.listingId
            ? listingMap.get(chat.listingId)?.title ?? t('messages.productFallback', { id: chat.listingId.substring(0, 8) })
            : undefined,
          listingImageUrl: chat.listingId ? listingMap.get(chat.listingId)?.imageUrl : undefined,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId
          } : undefined,
          unreadCount: chat.unreadCount ?? 0
        };
      });

      // Sort by last message time
      processedChats.sort((a, b) => {
        const aTime = a.lastMessageAt || a.createdAt;
        const bTime = b.lastMessageAt || b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setChats(processedChats);
      setError('');
    } catch (err) {
      console.error('Error loading chats:', err);
      setError(t('messages.loadError'));
    } finally {
      if (mode === 'initial') setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthed) return;
    loadChats('initial');
  }, [isAuthed, loadChats]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    if (!isAuthed) return;
    let isMounted = true;

    const handleMessageNew = (incoming: Message) => {
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === incoming.chatId);
        if (idx === -1) {
          void loadChats('silent');
          return prev;
        }

        const chat = prev[idx];
        const unreadDelta = incoming.senderId === user?.id ? 0 : 1;
        const updated = {
          ...chat,
          lastMessageAt: incoming.createdAt,
          lastMessage: {
            id: incoming.id,
            content: incoming.content,
            createdAt: incoming.createdAt,
            senderId: incoming.senderId,
          },
          unreadCount: chat.unreadCount + unreadDelta,
        };

        const next = [...prev];
        next[idx] = updated;
        next.sort((a, b) => {
          const aTime = a.lastMessageAt || a.createdAt;
          const bTime = b.lastMessageAt || b.createdAt;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
        return next;
      });
    };

    const handleRead = (payload: { chatId: string; readerId: string }) => {
      if (payload.readerId !== user?.id) return;
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === payload.chatId
            ? {
                ...chat,
                unreadCount: 0,
              }
            : chat,
        ),
      );
    };

    const handleUpdate = (incoming: Message) => {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== incoming.chatId) return chat;
          if (chat.lastMessage?.id !== incoming.id) return chat;
          return {
            ...chat,
            lastMessage: { ...chat.lastMessage, content: incoming.content },
          };
        }),
      );
    };

    const handleDelete = (payload: RealtimeDelete) => {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== payload.chatId) return chat;
          const removedUnread =
            payload.receiverId === user?.id && !payload.isRead ? 1 : 0;
          const shouldClearLast = chat.lastMessage?.id === payload.id;
          return {
            ...chat,
            lastMessage: shouldClearLast ? undefined : chat.lastMessage,
            unreadCount: Math.max(0, chat.unreadCount - removedUnread),
          };
        }),
      );
    };

    const connect = async () => {
      try {
        const connection = await createChatConnection();
        if (!isMounted) return;
        connectionRef.current = connection;
        onMessageNew(connection, (msg) => handleMessageNew(msg as Message));
        onMessagesRead(connection, handleRead);
        onMessageUpdated(connection, (msg) => handleUpdate(msg as Message));
        onMessageDeleted(connection, handleDelete);
        await connection.start();
        const currentChats = chatsRef.current;
        if (currentChats.length > 0) {
          currentChats.forEach((chat) => {
            if (joinedRef.current.has(chat.id)) return;
            joinedRef.current.add(chat.id);
            void connection.invoke('Join', chat.id);
          });
        }
      } catch {
        // Silent fallback to REST if realtime fails.
      }
    };

    void connect();

    return () => {
      isMounted = false;
      const connection = connectionRef.current;
      connectionRef.current = null;
      joinedRef.current = new Set();
      if (!connection) return;
      void connection.stop();
    };
  }, [isAuthed, user?.id]);

  useEffect(() => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== HubConnectionState.Connected) return;
    chats.forEach((chat) => {
      if (joinedRef.current.has(chat.id)) return;
      joinedRef.current.add(chat.id);
      void connection.invoke('Join', chat.id);
    });
  }, [chats]);

  useEffect(() => {
    filterChats();
  }, [chats, searchQuery, filter]);

  const filterChats = () => {
    let filtered = chats;

    // Filter by unread
    if (filter === 'unread') {
      filtered = filtered.filter(chat => chat.unreadCount > 0);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(chat => 
        chat.listingTitle?.toLowerCase().includes(query) ||
        chat.participant?.name.toLowerCase().includes(query) ||
        chat.lastMessage?.content.toLowerCase().includes(query)
      );
    }

    setFilteredChats(filtered);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('messages.time.now');
    if (diffMins < 60) return t('messages.time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('messages.time.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('messages.time.daysAgo', { count: diffDays });

    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SY' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const truncateMessage = (text: string, maxLength = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  return (
    <Layout>
      <Head>
        <title>
          {totalUnread > 0 ? `(${totalUnread}) ` : ''}
          {t('messages.title')}
        </title>
        <meta name="description" content={t('messages.description')} />
      </Head>

      <div className="app-page">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h1 className="page-title">{t('messages.heading')}</h1>
              {totalUnread > 0 && (
                <span className="status-pill border-primary-600 bg-primary-600 text-white">
                  {totalUnread}
                </span>
              )}
            </div>
            <p className="page-subtitle">
              {t('messages.subtitle')}
            </p>
          </div>

          <div className="surface-card mb-6 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('messages.searchPlaceholder')}
                  className="input w-full pr-10"
                />
              </div>

              <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    filter === 'all'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {t('messages.filterAll', { count: chats.length })}
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    filter === 'unread'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {t('messages.filterUnread', { count: totalUnread })}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="surface-card divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-start gap-4 p-4">
                  <div className="skeleton h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <div className="skeleton mb-2 h-4 w-40" />
                    <div className="skeleton mb-2 h-3 w-56 max-w-full" />
                    <div className="skeleton h-3 w-72 max-w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredChats.length > 0 ? (
            <div className="surface-card divide-y divide-slate-100 overflow-hidden">
              {filteredChats.map(chat => (
                <Link
                  key={chat.id}
                  href={`/messages/${chat.id}`}
                  className={`block p-4 transition-colors hover:bg-slate-50 ${
                    chat.unreadCount > 0 ? 'bg-primary-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary-50 text-primary-700 ring-2 ring-white shadow-sm">
                        {chat.listingImageUrl ? (
                          <img
                            src={chat.listingImageUrl}
                            alt={chat.listingTitle ?? t('messages.productFallback', { id: chat.listingId?.substring(0, 8) ?? '' })}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="w-6 h-6" />
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={`font-semibold text-slate-950 ${
                          chat.unreadCount > 0 ? 'font-bold' : ''
                        }`}>
                          {chat.listingTitle ?? t('messages.generalChat')}
                        </h3>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {formatTime(chat.lastMessageAt || chat.createdAt)}
                        </span>
                      </div>

                      <div className="mb-1 flex items-center gap-2 text-sm text-slate-600">
                        <UserIcon className="w-4 h-4" />
                        <span className="truncate">
                          {chat.participant?.name ?? t('messages.unknownUser')}
                        </span>
                      </div>

                      {chat.lastMessage && (
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${
                            chat.unreadCount > 0 
                              ? 'text-slate-950 font-semibold' 
                              : 'text-slate-600'
                          }`}>
                            {chat.lastMessage.senderId === user?.id && (
                              <span className="text-slate-500 ml-1">{t('messages.you')}</span>
                            )}
                            {truncateMessage(chat.lastMessage.content)}
                          </p>
                          {chat.unreadCount > 0 && (
                            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="surface-card p-10 text-center sm:p-16">
              {searchQuery || filter === 'unread' ? (
                <>
                  <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-950 mb-2">
                    {t('messages.noResults')}
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {t('messages.noResultsSuggestion')}
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilter('all');
                    }}
                    className="btn btn-outline"
                  >
                    {t('messages.clearSearch')}
                  </button>
                </>
              ) : (
                <>
                  <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-950 mb-2">
                    {t('messages.emptyTitle')}
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {t('messages.emptyMessage')}
                  </p>
                  <Link href="/browse" className="btn btn-primary">
                    {t('messages.browseProducts')}
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common'])),
    },
  };
}

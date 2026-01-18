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
import { 
  MessageSquare, 
  Search,
  Package,
  User as UserIcon,
  AlertCircle,
  Loader2,
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

      const listingMap = new Map<string, string>();
      await Promise.all(
        listingIds.map(async (listingId) => {
          try {
            const listing = await getListingById(listingId);
            listingMap.set(listingId, listing.title);
          } catch {
            listingMap.set(listingId, `منتج ${listingId.substring(0, 8)}`);
          }
        }),
      );
      
      // Process chats to add derived fields
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
            name: profileMap.get(otherUserId)?.name ?? `User ${otherUserId.substring(0, 8)}`,
            avatar: profileMap.get(otherUserId)?.avatar,
            email: '',
            verified: false,
            createdAt: ''
          },
          listingTitle: chat.listingId
            ? listingMap.get(chat.listingId) ?? `?.?????? ${chat.listingId.substring(0, 8)}`
            : undefined,
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
      setError('حدث خطأ في تحميل المحادثات');
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

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    
    return date.toLocaleDateString('ar-SY', { month: 'short', day: 'numeric' });
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
          الرسائل - Sbay سباي
        </title>
        <meta name="description" content="محادثاتك مع البائعين والمشترين" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-gray-900">الرسائل</h1>
              {totalUnread > 0 && (
                <span className="px-3 py-1 bg-primary text-white rounded-full text-sm font-medium">
                  {totalUnread}
                </span>
              )}
            </div>
            <p className="text-gray-600">
              تواصل مع البائعين والمشترين
            </p>
          </div>

          {/* Search & Filter */}
          <div className="bg-white rounded-lg shadow mb-6 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في المحادثات..."
                  className="input w-full pr-10"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  الكل ({chats.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'unread'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  غير مقروءة ({totalUnread})
                </button>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="bg-white rounded-lg shadow p-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            </div>
          ) : filteredChats.length > 0 ? (
            /* Chats List */
            <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
              {filteredChats.map(chat => (
                <Link
                  key={chat.id}
                  href={`/messages/${chat.id}`}
                  className={`block p-4 hover:bg-gray-50 transition-colors ${
                    chat.unreadCount > 0 ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {chat.participant?.avatar ? (
                        <img
                          src={chat.participant.avatar}
                          alt={chat.participant.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={`font-medium text-gray-900 ${
                          chat.unreadCount > 0 ? 'font-bold' : ''
                        }`}>
                          {chat.participant?.name}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatTime(chat.lastMessageAt || chat.createdAt)}
                        </span>
                      </div>

                      {/* Product Reference */}
                      {chat.listingId && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Package className="w-4 h-4" />
                          <span className="truncate">
                            {chat.listingTitle ?? `منتج ${chat.listingId.substring(0, 8)}`}
                          </span>
                        </div>
                      )}

                      {/* Last Message */}
                      {chat.lastMessage && (
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${
                            chat.unreadCount > 0 
                              ? 'text-gray-900 font-medium' 
                              : 'text-gray-600'
                          }`}>
                            {chat.lastMessage.senderId === user?.id && (
                              <span className="text-gray-500 ml-1">أنت:</span>
                            )}
                            {truncateMessage(chat.lastMessage.content)}
                          </p>
                          {chat.unreadCount > 0 && (
                            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full text-xs flex items-center justify-center font-medium">
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
            /* Empty State */
            <div className="bg-white rounded-lg shadow p-16 text-center">
              {searchQuery || filter === 'unread' ? (
                <>
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    لا توجد نتائج
                  </h3>
                  <p className="text-gray-600 mb-6">
                    جرب تعديل البحث أو الفلاتر
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilter('all');
                    }}
                    className="btn-outline"
                  >
                    مسح البحث
                  </button>
                </>
              ) : (
                <>
                  <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    لا توجد محادثات بعد
                  </h3>
                  <p className="text-gray-600 mb-6">
                    ابدأ محادثة مع بائع أو مشتري من صفحة المنتج
                  </p>
                  <Link href="/browse" className="btn-primary">
                    تصفح المنتجات
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

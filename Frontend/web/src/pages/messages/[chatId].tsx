import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { getMessages, sendMessage, markAsRead, getChats, updateMessage, deleteMessage } from '@/lib/api/messages';
import { getListingById } from '@/lib/api/listings';
import { getSellerProfile } from '@/lib/api/users';
import { Message, Chat, defaultTextInputValidator, loadProfanityListFromUrl, sanitizeInput } from '@sbay/shared';
import { useAuthStore } from '@/lib/store';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { createChatConnection, onMessageNew, onMessagesRead, onMessageUpdated, onMessageDeleted } from '@/lib/realtime/chat';
import { 
  Send, 
  ArrowLeft,
  Package,
  User,
  Loader2,
  AlertCircle,
  Check,
  CheckCheck,
  MoreVertical
} from 'lucide-react';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const parseReplyContent = (content: string) => {
  const match = content.match(/^\[\[reply:([^\]]+)\]\]\n?/);
  if (!match) return { replyId: null as string | null, body: content };
  return { replyId: match[1], body: content.slice(match[0].length) };
};

export default function ChatPage() {
  const router = useRouter();
  const { chatId } = router.query;
  const chatIdValue =
    typeof chatId === 'string' ? chatId : Array.isArray(chatId) ? chatId[0] : undefined;
  const { user } = useAuthStore();
  const isAuthed = useRequireAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [otherUserName, setOtherUserName] = useState('');
  const [otherUserAvatar, setOtherUserAvatar] = useState<string | null>(null);
  const [listingTitle, setListingTitle] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const connectionRef = useRef<Awaited<ReturnType<typeof createChatConnection>> | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    if (!isAuthed) return;
    if (chatIdValue) {
      loadChat();
    }
  }, [chatIdValue, isAuthed, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    lastMessageIdRef.current = messages.length
      ? messages[messages.length - 1].id
      : null;
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    void loadProfanityListFromUrl('/profanities.txt');
  }, []);

  useEffect(() => {
    if (!menu) return;
    const handleClose = () => setMenu(null);
    window.addEventListener('click', handleClose);
    window.addEventListener('contextmenu', handleClose);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('contextmenu', handleClose);
    };
  }, [menu]);

  useEffect(() => {
    if (!isAuthed || !chatIdValue) return;
    let isMounted = true;
    let joined = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const fetchLatest = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const data = await getMessages(chatIdValue, 50);
        const ordered = [...data].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        const latestId = ordered.length ? ordered[ordered.length - 1].id : null;
        const current = messagesRef.current;
        const sameLatest = latestId === lastMessageIdRef.current;
        const sameLength = current.length === ordered.length;
        const readChanged =
          sameLength &&
          current.some((msg, index) => msg.isRead !== ordered[index]?.isRead);
        if (sameLatest && !readChanged) return;
        lastMessageIdRef.current = latestId;
        if (!isMounted) return;
        setMessages(ordered);
        const lastIncoming = [...ordered]
          .reverse()
          .find((m) => m.senderId !== user?.id);
        if (lastIncoming) {
          void markAsRead(chatIdValue, lastIncoming.id);
        }
      } catch {
        // ignore polling failures
      }
    };

    const attachMessage = (incoming: Message) => {
      if (incoming.chatId !== chatIdValue) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        const next = [...prev, incoming];
        next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return next;
      });

      if (incoming.senderId !== user?.id) {
        void markAsRead(chatIdValue, incoming.id);
      }
    };

    const attachRead = (payload: { chatId: string; readerId: string }) => {
      if (payload.chatId !== chatIdValue) return;
      if (payload.readerId === user?.id) return;
      setMessages((prev) =>
        prev.map((m) => (m.senderId === user?.id ? { ...m, isRead: true } : m)),
      );
      void fetchLatest();
    };

    const attachUpdate = (incoming: Message) => {
      if (incoming.chatId !== chatIdValue) return;
      setMessages((prev) => prev.map((m) => (m.id === incoming.id ? incoming : m)));
    };

    const attachDelete = (payload: { id: string; chatId: string }) => {
      if (payload.chatId !== chatIdValue) return;
      setMessages((prev) => prev.filter((m) => m.id !== payload.id));
    };

    const connect = async () => {
      try {
        const connection = await createChatConnection();
        if (!isMounted) return;
        connectionRef.current = connection;
        onMessageNew(connection, (msg) => attachMessage(msg as Message));
        onMessagesRead(connection, attachRead);
        onMessageUpdated(connection, (msg) => attachUpdate(msg as Message));
        onMessageDeleted(connection, attachDelete);
        connection.onreconnected(async () => {
          if (!chatIdValue) return;
          try {
            await connection.invoke('Join', chatIdValue);
            void fetchLatest();
          } catch {
            // ignore reconnect join failures
          }
        });
        await connection.start();
        await connection.invoke('Join', chatIdValue);
        joined = true;
      } catch {
        // Silent fallback to REST if realtime fails.
      }
    };

    void connect();
    void fetchLatest();
    pollTimer = setInterval(fetchLatest, 5000);

    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
      const connection = connectionRef.current;
      connectionRef.current = null;
      if (!connection) return;
      const leave = joined ? connection.invoke('Leave', chatIdValue) : Promise.resolve();
      void leave.finally(() => {
        void connection.stop();
      });
    };
  }, [chatIdValue, isAuthed, user?.id]);

  const loadChat = async () => {
    try {
      setLoading(true);
      
      // Load chat details
      const chats = await getChats(100, 0);
      const foundChat = chats.find(c => c.id === chatIdValue);
      if (foundChat) {
        setChat(foundChat);
        const otherUserId = user ? (foundChat.buyerId === user.id ? foundChat.sellerId : foundChat.buyerId) : '';
        const [profile, listing] = await Promise.all([
          otherUserId ? getSellerProfile(otherUserId).catch(() => null) : Promise.resolve(null),
          foundChat.listingId ? getListingById(foundChat.listingId).catch(() => null) : Promise.resolve(null),
        ]);

        if (profile) {
          setOtherUserName(profile.name || `User ${otherUserId.substring(0, 8)}`);
          setOtherUserAvatar(profile.avatar ?? null);
        } else if (otherUserId) {
          setOtherUserName(`User ${otherUserId.substring(0, 8)}`);
          setOtherUserAvatar(null);
        }

        if (listing) {
          setListingTitle(listing.title ?? null);
        } else if (foundChat.listingId) {
          setListingTitle(`منتج ${foundChat.listingId.substring(0, 8)}`);
        } else {
          setListingTitle(null);
        }
      }
      
      // Load messages
      const data = await getMessages(chatIdValue as string, 50);
      const ordered = [...data].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setMessages(ordered);
      
      // Mark as read
      if (ordered.length > 0) {
        const lastMessage = ordered[ordered.length - 1];
        await markAsRead(chatIdValue as string, lastMessage.id);
      }
      
      setError('');
    } catch (err) {
      console.error('Error loading chat:', err);
      setError('حدث خطأ في تحميل المحادثة');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;
    
    try {
      const trimmed = newMessage.trim();
      const validation = defaultTextInputValidator.validate(trimmed);
      if (!validation.isValid) {
        alert(validation.message ?? 'Input contains disallowed content');
        return;
      }

      setSending(true);
      if (editingMessageId) {
        const replyPrefix = editingReplyId ? `[[reply:${editingReplyId}]]\n` : '';
        const updated = await updateMessage(editingMessageId, `${replyPrefix}${sanitizeInput(trimmed)}`);
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setNewMessage('');
        setEditingMessageId(null);
        setEditingReplyId(null);
        inputRef.current?.focus();
        return;
      }

      const replyPrefix = replyTo ? `[[reply:${replyTo.id}]]\n` : '';
      const message = await sendMessage(chatIdValue as string, `${replyPrefix}${sanitizeInput(trimmed)}`);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      setNewMessage('');
      setReplyTo(null);
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('حدث خطأ في إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async (message: Message) => {
    try {
      const parsed = parseReplyContent(message.content);
      await navigator.clipboard.writeText(parsed.body);
    } catch {
      // ignore clipboard failures
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    setEditingMessageId(null);
    setEditingReplyId(null);
    setMenu(null);
    inputRef.current?.focus();
  };

  const handleEdit = (message: Message) => {
    const parsed = parseReplyContent(message.content);
    setEditingMessageId(message.id);
    setEditingReplyId(parsed.replyId);
    setReplyTo(null);
    setNewMessage(parsed.body);
    setMenu(null);
    inputRef.current?.focus();
  };

  const handleDelete = async (message: Message) => {
    try {
      await deleteMessage(message.id);
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
    } catch (err) {
      console.error('Error deleting message:', err);
    } finally {
      setMenu(null);
    }
  };

  const canEdit = (message: Message) => {
    if (message.senderId !== user?.id) return false;
    return Date.now() - new Date(message.createdAt).getTime() <= 15 * 60 * 1000;
  };

  const canDelete = (message: Message) => {
    if (message.senderId !== user?.id) return false;
    return Date.now() - new Date(message.createdAt).getTime() <= 15 * 60 * 1000;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-SY', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'اليوم';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'أمس';
    } else {
      return date.toLocaleDateString('ar-SY', { 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const shouldShowDateSeparator = (currentMsg: Message, prevMsg?: Message) => {
    if (!prevMsg) return true;
    
    const currentDate = new Date(currentMsg.createdAt).toDateString();
    const prevDate = new Date(prevMsg.createdAt).toDateString();
    
    return currentDate !== prevDate;
  };

  const getOtherUserId = () => {
    if (!chat || !user) return '';
    return chat.buyerId === user.id ? chat.sellerId : chat.buyerId;
  };

  const getOtherUserName = () => {
    if (otherUserName) return otherUserName;
    const otherUserId = getOtherUserId();
    return otherUserId ? `User ${otherUserId.substring(0, 8)}` : '';
  };

  if (loading) {
    return (
      <Layout hideHeader hideFooter>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !chat) {
    return (
      <Layout hideHeader hideFooter>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {error || 'المحادثة غير موجودة'}
            </h2>
            <Link href="/messages" className="btn-primary mt-4">
              العودة للرسائل
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideHeader hideFooter>
      <Head>
        <title>محادثة مع {getOtherUserName()} - Sbay سباي</title>
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link 
                  href="/messages"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>

                {/* User Info */}
                <div className="flex items-center gap-3">
                  {getOtherUserId() ? (
                    <Link
                      href={`/seller/${getOtherUserId()}`}
                      className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden"
                    >
                      {otherUserAvatar ? (
                        <img
                          src={otherUserAvatar}
                          alt={getOtherUserName()}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-gray-500" />
                      )}
                    </Link>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div>
                    {getOtherUserId() ? (
                      <Link
                        href={`/seller/${getOtherUserId()}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {getOtherUserName()}
                      </Link>
                    ) : (
                      <h2 className="font-medium text-gray-900">
                        {getOtherUserName()}
                      </h2>
                    )}
                    {listingTitle ? (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Package className="w-3 h-3" />
                        <span className="truncate">{listingTitle}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">لا توجد رسائل بعد</p>
              <p className="text-sm text-gray-400 mt-1">ابدأ المحادثة الآن</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isOwn = message.senderId === user?.id;
                const prevMessage = index > 0 ? messages[index - 1] : undefined;
                const showDate = shouldShowDateSeparator(message, prevMessage);

                return (
                  <div key={message.id}>
                    {/* Date Separator */}
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                          {formatDate(message.createdAt)}
                        </span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 pt-6 pb-2 ${
                          isOwn
                            ? 'message-bubble-primary'
                            : 'bg-white text-gray-900 shadow-sm'
                        } relative ${isOwn ? 'pl-8' : 'pr-8'}`}
                      >
                        <button
                          type="button"
                          className={`absolute top-2 ${
                            isOwn ? 'left-2' : 'right-2'
                          } rounded-full p-1 text-xs ${
                            isOwn ? 'text-white/80 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            setMenu({ id: message.id, x: rect.left, y: rect.bottom + 6 });
                          }}
                          aria-label="Message actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {(() => {
                          const parsed = parseReplyContent(message.content);
                          const replyTarget = parsed.replyId
                            ? messages.find((m) => m.id === parsed.replyId) ?? null
                            : null;
                          const replyBody = replyTarget
                            ? parseReplyContent(replyTarget.content).body
                            : null;
                          return (
                            <>
                              {parsed.replyId && (
                                <div
                                  className={`mb-2 rounded-lg px-3 py-2 text-xs ${
                                    isOwn
                                      ? 'bg-white/15 text-white/90'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  <div className={`text-[11px] font-semibold ${
                                    isOwn ? 'text-white/90' : 'text-blue-600'
                                  }`}>
                                    Reply
                                  </div>
                                  <div className="mt-0.5 whitespace-pre-wrap break-words">
                                    {replyBody ?? 'Original message unavailable'}
                                  </div>
                                </div>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {parsed.body}
                              </p>
                            </>
                          );
                        })()}
                        <div className={`flex items-center gap-1 mt-1 justify-end ${
                          isOwn ? 'text-white/80' : 'text-gray-500'
                        }`}>
                          <span className="text-xs">
                            {formatTime(message.createdAt)}
                          </span>
                          {isOwn && (
                            message.isRead ? (
                              <CheckCheck className="w-4 h-4" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {menu && (() => {
                const selected = messages.find((m) => m.id === menu.id);
                if (!selected) return null;
                return (
                  <div
                    className="fixed z-50 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                    style={{ top: menu.y, left: menu.x }}
                  >
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={() => handleCopy(selected)}
                    >
                      Copy
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={() => handleReply(selected)}
                    >
                      Reply
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 disabled:text-gray-400"
                      onClick={() => handleEdit(selected)}
                      disabled={!canEdit(selected)}
                    >
                      Edit
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 disabled:text-gray-400"
                      onClick={() => handleDelete(selected)}
                      disabled={!canDelete(selected)}
                    >
                      Delete
                    </button>
                  </div>
                );
              })()}
              <div ref={messagesEndRef} />
            </div>
          )}
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <form onSubmit={handleSend} className="flex flex-col gap-2">
              {(editingMessageId || replyTo) && (
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  <span>
                    {editingMessageId
                      ? 'Editing message'
                      : `Replying to: ${replyTo ? parseReplyContent(replyTo.content).body.slice(0, 60) : ''}`}
                  </span>
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      setEditingMessageId(null);
                      setEditingReplyId(null);
                      setReplyTo(null);
                      setNewMessage('');
                    }}
                  >
                    ?
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب رسالة..."
                className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent max-h-32"
                rows={1}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="btn-primary h-11 w-11 p-0 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
              </div>
            </form>
          </div>
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

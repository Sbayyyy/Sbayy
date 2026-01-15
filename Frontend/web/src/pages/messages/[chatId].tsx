import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { getMessages, sendMessage, markAsRead, getChats } from '@/lib/api/messages';
import { Message, Chat } from '@sbay/shared';
import { useAuthStore } from '@/lib/store';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { 
  Send, 
  ArrowLeft,
  Package,
  User,
  Loader2,
  AlertCircle,
  Check,
  CheckCheck
} from 'lucide-react';
import Head from 'next/head';

export default function ChatPage() {
  const router = useRouter();
  const { chatId } = router.query;
  const { user } = useAuthStore();
  const isAuthed = useRequireAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isAuthed) return;
    if (chatId) {
      loadChat();
    }
  }, [chatId, isAuthed]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChat = async () => {
    try {
      setLoading(true);
      
      // Load chat details
      const chats = await getChats(100, 0);
      const foundChat = chats.find(c => c.id === chatId);
      if (foundChat) {
        setChat(foundChat);
      }
      
      // Load messages
      const data = await getMessages(chatId as string, 50);
      setMessages(data);
      
      // Mark as read
      if (data.length > 0) {
        const lastMessage = data[data.length - 1];
        await markAsRead(chatId as string, lastMessage.id);
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
      setSending(true);
      const message = await sendMessage(chatId as string, newMessage.trim());
      
      setMessages([...messages, message]);
      setNewMessage('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('حدث خطأ في إرسال الرسالة');
    } finally {
      setSending(false);
    }
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
    const otherUserId = getOtherUserId();
    return `User ${otherUserId.substring(0, 8)}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !chat) {
    return (
      <Layout>
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
    <Layout>
      <Head>
        <title>محادثة مع {getOtherUserName()} - Sbay سباي</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
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
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <h2 className="font-medium text-gray-900">
                      {getOtherUserName()}
                    </h2>
                    {chat.listingId && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Package className="w-3 h-3" />
                        <span>منتج {chat.listingId.substring(0, 8)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Link */}
              {chat.listingId && (
                <Link 
                  href={`/product/${chat.listingId}`}
                  className="text-sm text-primary hover:underline"
                >
                  عرض المنتج
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="max-w-4xl mx-auto h-[calc(100vh-180px)] overflow-y-auto px-4 py-6">
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
                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-white text-gray-900 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
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
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <form onSubmit={handleSend} className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب رسالة..."
                className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent max-h-32"
                rows={1}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="btn-primary p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}

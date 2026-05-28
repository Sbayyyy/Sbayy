import { useEffect, useState } from 'react';
import type { Message } from '@sbay/shared';
import { getUnreadCount } from '@/lib/api/messages';
import { createChatConnection, onMessageDeleted, onMessageNew, onMessagesRead, type RealtimeDelete } from '@/lib/realtime/chat';

interface UseUnreadMessagesOptions {
  isAuthenticated: boolean;
  userId?: string;
}

export function useUnreadMessages({ isAuthenticated, userId }: UseUnreadMessagesOptions) {
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setUnreadTotal(0);
      return;
    }

    let isMounted = true;
    let connection: Awaited<ReturnType<typeof createChatConnection>> | null = null;

    const loadInitial = async () => {
      const total = await getUnreadCount();
      if (isMounted) setUnreadTotal(total);
    };

    const connect = async () => {
      try {
        connection = await createChatConnection();
        if (!isMounted) return;

        onMessageNew(connection, (incoming: Message) => {
          if (incoming.receiverId === userId) {
            setUnreadTotal(prev => prev + 1);
          }
        });

        onMessagesRead(connection, (payload) => {
          if (payload.readerId !== userId) return;
          void getUnreadCount().then(total => {
            if (isMounted) setUnreadTotal(total);
          });
        });

        onMessageDeleted(connection, (payload: RealtimeDelete) => {
          if (payload.receiverId !== userId || payload.isRead) return;
          setUnreadTotal(prev => Math.max(0, prev - 1));
        });

        await connection.start();
      } catch {
        // Realtime is best-effort; the messages page still refreshes counts.
      }
    };

    void loadInitial();
    void connect();

    return () => {
      isMounted = false;
      if (connection) {
        void connection.stop();
      }
    };
  }, [isAuthenticated, userId]);

  return unreadTotal;
}

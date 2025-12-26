import { api } from '../api';
import type { Chat, Message, OpenChatRequest, OpenChatResponse } from '@sbay/shared';

/**
 * Get all chats for current user (Inbox)
 * 
 * Backend Endpoint: GET /api/chats?take=20&skip=0
 */
export const getChats = async (take = 20, skip = 0): Promise<Chat[]> => {
  try {
    const response = await api.get<Chat[]>('/chats', {
      params: { take, skip }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch chats:', error);
    throw error;
  }
};

/**
 * Get messages for a specific chat
 * 
 * Backend Endpoint: GET /api/chats/{chatId}/messages?take=50&before=<timestamp>
 */
export const getMessages = async (
  chatId: string,
  take = 50,
  before?: Date
): Promise<Message[]> => {
  try {
    const params: any = { take };
    if (before) {
      params.before = before.toISOString();
    }
    const response = await api.get<Message[]>(
      `/chats/${chatId}/messages`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch messages for chat ${chatId}:`, error);
    throw error;
  }
};

/**
 * Send a message in a chat
 * 
 * Backend Endpoint: POST /api/chats/{chatId}/messages
 * Body: { content: string }
 */
export const sendMessage = async (chatId: string, content: string): Promise<Message> => {
  try {
    const response = await api.post<Message>(
      `/chats/${chatId}/messages`,
      { content }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
};

/**
 * Open or get existing chat
 * 
 * Backend Endpoint: POST /api/chats/open
 * Body: { otherUserId: string, listingId?: string }
 */
export const openChat = async (data: OpenChatRequest): Promise<OpenChatResponse> => {
  try {
    const response = await api.post<OpenChatResponse>('/chats/open', data);
    return response.data;
  } catch (error) {
    console.error('Failed to open chat:', error);
    throw error;
  }
};

/**
 * Mark messages as read
 * 
 * Backend Endpoint: POST /api/chats/{chatId}/read?upToMessageId=<guid>
 */
export const markAsRead = async (chatId: string, upToMessageId?: string): Promise<number> => {
  try {
    const params: any = {};
    if (upToMessageId) {
      params.upToMessageId = upToMessageId;
    }
    const response = await api.post<number>(`/chats/${chatId}/read`, null, { params });
    return response.data;
  } catch (error) {
    console.error(`Failed to mark chat ${chatId} as read:`, error);
    throw error;
  }
};

/**
 * Get unread count (calculated from chats)
 */
export const getUnreadCount = async (): Promise<number> => {
  try {
    const chats = await getChats(100, 0);
    // Count unread messages from other users
    return chats.reduce((sum, chat) => {
      // This would need to be calculated from messages or added to backend
      return sum;
    }, 0);
  } catch (error) {
    console.error('Failed to fetch unread count:', error);
    return 0;
  }
};

/**
 * Export all messaging API functions
 */
export const messagesApi = {
  getChats,
  getMessages,
  sendMessage,
  openChat,
  markAsRead,
  getUnreadCount
};


export default messagesApi;

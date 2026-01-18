import {
  HubConnection,
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
} from '@microsoft/signalr';

import config from '@/lib/config';

export type RealtimeMessage = {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
};

export type RealtimeDelete = {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  isRead: boolean;
};

type RawMessage = {
  id?: string;
  chatId?: string;
  senderId?: string;
  receiverId?: string;
  content?: string;
  createdAt?: string;
  isRead?: boolean;
  Id?: string;
  ChatId?: string;
  SenderId?: string;
  ReceiverId?: string;
  Content?: string;
  CreatedAt?: string;
  IsRead?: boolean;
};

type RawDelete = {
  id?: string;
  chatId?: string;
  senderId?: string;
  receiverId?: string;
  isRead?: boolean;
  Id?: string;
  ChatId?: string;
  SenderId?: string;
  ReceiverId?: string;
  IsRead?: boolean;
};

type ReadEvent = {
  chatId?: string;
  readerId?: string;
  ChatId?: string;
  ReaderId?: string;
};

function normalizeMessage(payload: RawMessage): RealtimeMessage | null {
  const id = payload.id ?? payload.Id;
  const chatId = payload.chatId ?? payload.ChatId;
  const senderId = payload.senderId ?? payload.SenderId;
  const receiverId = payload.receiverId ?? payload.ReceiverId;
  const content = payload.content ?? payload.Content;
  const createdAt = payload.createdAt ?? payload.CreatedAt;
  const isRead = payload.isRead ?? payload.IsRead ?? false;

  if (!id || !chatId || !senderId || !receiverId || !content || !createdAt) return null;
  return { id, chatId, senderId, receiverId, content, createdAt, isRead };
}

function normalizeRead(payload: ReadEvent): { chatId: string; readerId: string } | null {
  const chatId = payload.chatId ?? payload.ChatId;
  const readerId = payload.readerId ?? payload.ReaderId;
  if (!chatId || !readerId) return null;
  return { chatId, readerId };
}

function normalizeDelete(payload: RawDelete): RealtimeDelete | null {
  const id = payload.id ?? payload.Id;
  const chatId = payload.chatId ?? payload.ChatId;
  const senderId = payload.senderId ?? payload.SenderId;
  const receiverId = payload.receiverId ?? payload.ReceiverId;
  const isRead = payload.isRead ?? payload.IsRead ?? false;
  if (!id || !chatId || !senderId || !receiverId) return null;
  return { id, chatId, senderId, receiverId, isRead };
}

function resolveBaseUrl(raw: string): string {
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return `${window.location.origin}${raw}`.replace(/\/+$/, '');
  return raw.replace(/\/+$/, '');
}

function resolveHubUrl(): string {
  const base = resolveBaseUrl(config.apiUrl);
  const hubBase = base.replace(/\/api\/?$/, '');
  return `${hubBase}/hubs/chat`;
}

export async function createChatConnection(): Promise<HubConnection> {
  return new HubConnectionBuilder()
    .withUrl(resolveHubUrl(), {
      transport: HttpTransportType.WebSockets,
      accessTokenFactory: () => localStorage.getItem('token') ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();
}

export function onMessageNew(
  connection: HubConnection,
  handler: (message: RealtimeMessage) => void,
) {
  connection.on('message:new', (payload: RawMessage) => {
    const msg = normalizeMessage(payload);
    if (msg) handler(msg);
  });
}

export function onMessageUpdated(
  connection: HubConnection,
  handler: (message: RealtimeMessage) => void,
) {
  connection.on('message:updated', (payload: RawMessage) => {
    const msg = normalizeMessage(payload);
    if (msg) handler(msg);
  });
}

export function onMessageDeleted(
  connection: HubConnection,
  handler: (payload: RealtimeDelete) => void,
) {
  connection.on('message:deleted', (payload: RawDelete) => {
    const data = normalizeDelete(payload);
    if (data) handler(data);
  });
}

export function onMessagesRead(
  connection: HubConnection,
  handler: (payload: { chatId: string; readerId: string }) => void,
) {
  connection.on('message:read', (payload: ReadEvent) => {
    const data = normalizeRead(payload);
    if (data) handler(data);
  });
}

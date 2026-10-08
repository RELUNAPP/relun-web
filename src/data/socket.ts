import { io, type Socket } from 'socket.io-client';
import type { MessageDto } from './dtos';
import { baseUrl } from './network';
import { session } from './session';
import { Emitter } from '../util/emitter';

export type SocketEvent =
  | { type: 'newMessage'; message: MessageDto; clientId: string | null }
  /** Sent to the recipient's own room, whether or not the chat is open. */
  | { type: 'messageNotification'; message: MessageDto }
  | { type: 'typing'; userId: string; isTyping: boolean }
  | { type: 'read'; conversationId: string; readBy: string }
  | { type: 'presence'; userId: string; isOnline: boolean }
  | { type: 'error'; message: string; code: string | null; clientId: string | null };

type MessagePayload = { message?: MessageDto; clientId?: string };

/**
 * The one Socket.IO connection for chat. Connected while signed in and the tab
 * is visible; screens join and leave conversation rooms and read [events].
 * Mirrors Android ChatSocket.
 */
class ChatSocket {
  private socket: Socket | null = null;
  private token: string | null = null;
  private joined = new Set<string>();

  readonly events = new Emitter<SocketEvent>();
  readonly connectedChanges = new Emitter<boolean>();
  connected = false;

  private setConnected(value: boolean) {
    if (this.connected === value) return;
    this.connected = value;
    this.connectedChanges.emit(value);
  }

  connect() {
    const token = session.current.accessToken;
    if (!token) return;
    if (this.socket?.connected && this.token === token) return;
    this.teardown();

    this.token = token;
    const created = io(baseUrl.replace(/\/$/, ''), {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
      auth: { token },
    });
    this.socket = created;

    created.on('connect', () => {
      this.setConnected(true);
      // Rooms do not survive a reconnect.
      this.joined.forEach((id) => created.emit('join_conversation', id));
    });
    created.on('disconnect', () => this.setConnected(false));
    created.on('connect_error', () => {
      this.setConnected(false);
      // The access token rotates on refresh; rebuild with the current one.
      const fresh = session.current.accessToken;
      if (fresh && fresh !== token && this.socket === created) {
        this.teardown();
        this.connect();
      }
    });

    created.on('new_message', (p: MessagePayload) => {
      if (p?.message) this.events.emit({ type: 'newMessage', message: p.message, clientId: p.clientId || null });
    });
    created.on('message_notification', (p: MessagePayload) => {
      if (p?.message) this.events.emit({ type: 'messageNotification', message: p.message });
    });
    created.on('user_typing', (p: { userId?: string; isTyping?: boolean }) =>
      this.events.emit({ type: 'typing', userId: p?.userId ?? '', isTyping: !!p?.isTyping }),
    );
    created.on('messages_read', (p: { conversationId?: string; readBy?: string }) =>
      this.events.emit({ type: 'read', conversationId: p?.conversationId ?? '', readBy: p?.readBy ?? '' }),
    );
    created.on('presence_changed', (p: { userId?: string; isOnline?: boolean }) =>
      this.events.emit({ type: 'presence', userId: p?.userId ?? '', isOnline: !!p?.isOnline }),
    );
    created.on('error', (p: { message?: string; code?: string; clientId?: string }) =>
      this.events.emit({
        type: 'error',
        message: p?.message || 'Something went wrong',
        code: p?.code || null,
        clientId: p?.clientId || null,
      }),
    );
  }

  private teardown() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
    this.socket = null;
    this.token = null;
    this.setConnected(false);
  }

  /** Signs out: drops the connection and forgets every room. */
  disconnect() {
    this.joined.clear();
    this.teardown();
  }

  /** Tab hidden: drops the connection but remembers rooms for the next [connect]. */
  pause() {
    this.teardown();
  }

  join(userId: string) {
    this.joined.add(userId);
    if (this.socket?.connected) this.socket.emit('join_conversation', userId);
  }

  leave(userId: string) {
    this.joined.delete(userId);
    this.socket?.emit('leave_conversation', userId);
  }

  /** Returns false when there is no live connection, so the caller can mark the message failed. */
  send(recipientId: string, content: string, clientId: string): boolean {
    if (!this.socket?.connected) return false;
    this.socket.emit('send_message', { recipientId, content, clientId });
    return true;
  }

  typing(recipientId: string, isTyping: boolean) {
    this.socket?.emit('typing', { recipientId, isTyping });
  }

  markRead(recipientId: string) {
    this.socket?.emit('mark_read', { recipientId });
  }
}

export const chatSocket = new ChatSocket();

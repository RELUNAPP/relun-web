import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, MessageRequest, MessageStatus, Person } from '../../data/models';
import { chat, people } from '../../data/repositories';
import type { SocketEvent } from '../../data/socket';
import { messenger, useApp } from '../../data/store';

/** Port of Android ChatViewModel. */

export type ChatState = {
  name: string;
  person: Person | null;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  otherTyping: boolean;
  otherOnline: boolean;
  draft: string;
  /** Set while this chat runs on a message request rather than a match. */
  request: MessageRequest | null;
  declining: boolean;
};

/** Why the sender of a message request can't write right now, if they can't. */
export const requestBlock = (s: ChatState): 'declined' | 'waiting' | null => {
  const r = s.request;
  if (!r?.outgoing) return null;
  if (r.status === 'declined') return 'declined';
  return r.remaining <= 0 ? 'waiting' : null;
};

/** The request was accepted (a reply either way): the two are now a match with the chat open. */
const accepted = (s: ChatState): ChatState => ({
  ...s,
  request: null,
  person: s.person ? { ...s.person, isMatch: true, liked: true, messageRequest: null } : null,
});

const uuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

const isNotBlank = (t: string) => /\S/.test(t);

export function useChatViewModel(userId: string, initialName: string) {
  const [state, setState] = useState<ChatState>(() => ({
    name: initialName,
    person: null,
    messages: [],
    loading: true,
    error: null,
    otherTyping: false,
    otherOnline: false,
    draft: '',
    request: null,
    declining: false,
  }));
  /** The live state, for timers and socket handlers (Android's _state.value). */
  const ref = useRef(state);
  const alive = useRef(true);
  const update = useCallback((fn: (s: ChatState) => ChatState) => {
    if (!alive.current) return;
    ref.current = fn(ref.current);
    setState(ref.current);
  }, []);

  const connected = useApp((s) => s.socketConnected);

  const typingSent = useRef(false);
  const typingJob = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const later = useCallback((ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
    return t;
  }, []);

  const setStatus = useCallback(
    (clientId: string, status: MessageStatus) =>
      update((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.clientId === clientId && m.status !== 'sent' && m.status !== 'read' ? { ...m, status } : m,
        ),
      })),
    [update],
  );

  const load = useCallback(async () => {
    update((s) => ({ ...s, loading: s.messages.length === 0, error: null }));
    try {
      const p = await people.person(userId);
      update((s) => ({ ...s, person: p, name: p.name, otherOnline: p.isOnline }));
    } catch {
      // The header keeps the name it was opened with.
    }
    try {
      const thread = await chat.thread(userId);
      if (!alive.current) return;
      update((s) => {
        // Keep any unsent bubbles from this session.
        const pending = s.messages.filter((m) => m.status === 'sending' || m.status === 'failed');
        return { ...s, messages: [...thread.messages, ...pending], request: thread.request, loading: false };
      });
      chat.socket.markRead(userId);
      chat.refreshUnread();
    } catch (e) {
      update((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'Something went wrong' }));
    }
  }, [userId, update]);

  const signalTyping = useCallback(
    (typing: boolean) => {
      if (typingJob.current) clearTimeout(typingJob.current);
      typingJob.current = null;
      if (typing) {
        if (!typingSent.current) {
          chat.socket.typing(userId, true);
          typingSent.current = true;
        }
        typingJob.current = setTimeout(() => {
          typingJob.current = null;
          chat.socket.typing(userId, false);
          typingSent.current = false;
        }, 2_500);
      } else if (typingSent.current) {
        chat.socket.typing(userId, false);
        typingSent.current = false;
      }
    },
    [userId],
  );

  const dispatch = useCallback(
    (message: ChatMessage) => {
      const clientId = message.clientId;
      if (!clientId) return;
      if (!chat.socket.send(userId, message.text, clientId)) {
        setStatus(clientId, 'failed');
        return;
      }
      // No echo within 10s means it didn't land.
      later(10_000, () => {
        const still = ref.current.messages.find((m) => m.clientId === clientId);
        if (still?.status === 'sending') setStatus(clientId, 'failed');
      });
    },
    [userId, setStatus, later],
  );

  const setDraft = useCallback(
    (text: string) => {
      update((s) => ({ ...s, draft: text.slice(0, 5000) }));
      signalTyping(isNotBlank(text));
    },
    [update, signalTyping],
  );

  const send = useCallback(
    (textOverride?: string) => {
      const text = (textOverride ?? ref.current.draft).trim();
      if (!text || requestBlock(ref.current)) return;
      const clientId = uuid();
      const bubble: ChatMessage = { id: clientId, clientId, mine: true, text, sentAt: new Date(), status: 'sending' };
      update((s) => ({
        ...s,
        messages: [...s.messages, bubble],
        draft: textOverride == null ? '' : s.draft,
        // One fewer message left on a request; the server has the final say.
        request: s.request?.outgoing ? { ...s.request, remaining: s.request.remaining - 1 } : s.request,
      }));
      signalTyping(false);
      dispatch(bubble);
    },
    [update, signalTyping, dispatch],
  );

  const retry = useCallback(
    (message: ChatMessage) => {
      update((s) => ({ ...s, messages: s.messages.map((m) => (m.id === message.id ? { ...m, status: 'sending' } : m)) }));
      dispatch(message);
    },
    [update, dispatch],
  );

  // init {} / onCleared()
  useEffect(() => {
    alive.current = true;
    chat.openChatUserId = userId;
    chat.socket.join(userId);
    void load();

    const onSocketEvent = (event: SocketEvent) => {
      switch (event.type) {
        case 'newMessage': {
          const m = event.message;
          if (m.senderId !== userId && m.receiverId !== userId) return;
          const incoming = chat.toChatMessage(m, event.clientId);
          // A reply on a request accepts it, whichever side this device is.
          const req = ref.current.request;
          const replied = req?.status === 'pending' && incoming.mine !== req.outgoing;
          update((s) => {
            const mine = event.clientId != null ? s.messages.findIndex((x) => x.clientId === event.clientId) : -1;
            let messages: ChatMessage[];
            if (mine >= 0) {
              messages = [...s.messages];
              messages[mine] = { ...incoming, status: 'sent' };
            } else if (s.messages.some((x) => x.id === incoming.id)) {
              messages = s.messages;
            } else {
              messages = [...s.messages, incoming];
            }
            const next = { ...s, messages, otherTyping: !incoming.mine ? false : s.otherTyping };
            return replied ? accepted(next) : next;
          });
          if (!incoming.mine) chat.socket.markRead(userId);
          if (replied) people.emit({ type: 'matched', userId });
          break;
        }
        case 'typing':
          if (event.userId !== userId) return;
          update((s) => ({ ...s, otherTyping: event.isTyping }));
          if (typingTimeout.current) clearTimeout(typingTimeout.current);
          typingTimeout.current = null;
          if (event.isTyping) {
            typingTimeout.current = setTimeout(() => {
              typingTimeout.current = null;
              update((s) => ({ ...s, otherTyping: false }));
            }, 6_000);
          }
          break;
        case 'read':
          if (event.readBy !== userId) return;
          update((s) => ({
            ...s,
            messages: s.messages.map((m) => (m.mine && m.status === 'sent' ? { ...m, status: 'read' } : m)),
          }));
          break;
        case 'presence':
          if (event.userId === userId) update((s) => ({ ...s, otherOnline: event.isOnline }));
          break;
        case 'error':
          if (event.clientId) setStatus(event.clientId, 'failed');
          if (event.code === 'REQUEST_LIMIT') {
            update((s) => ({ ...s, request: s.request ? { ...s.request, remaining: 0 } : null }));
          } else if (event.code === 'REQUEST_DECLINED') {
            update((s) => ({ ...s, request: s.request ? { ...s.request, status: 'declined', remaining: 0 } : null }));
          }
          break;
        case 'messageNotification':
          break;
      }
    };

    const offSocket = chat.socket.events.on(onSocketEvent);
    const offPeople = people.events.on((e) => {
      if (e.type === 'matched' && e.userId === userId) {
        update((s) => ({ ...s, person: s.person ? { ...s.person, isMatch: true } : null }));
      }
    });

    const pending = timers.current;
    return () => {
      offSocket();
      offPeople();
      if (typingJob.current) clearTimeout(typingJob.current);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingJob.current = null;
      typingTimeout.current = null;
      pending.forEach(clearTimeout);
      pending.clear();
      if (typingSent.current) chat.socket.typing(userId, false);
      typingSent.current = false;
      chat.socket.leave(userId);
      if (chat.openChatUserId === userId) chat.openChatUserId = null;
      chat.refreshUnread();
      alive.current = false;
    };
  }, [userId, load, update, setStatus]);

  /** Turns down an incoming message request. Resolves true once it's gone. */
  const decline = useCallback(async () => {
    if (ref.current.declining) return false;
    update((s) => ({ ...s, declining: true }));
    try {
      await chat.declineRequest(userId);
      return true;
    } catch (e) {
      update((s) => ({ ...s, declining: false }));
      messenger.error(e instanceof Error && e.message ? e.message : 'Couldn’t decline. Try again.');
      return false;
    }
  }, [userId, update]);

  return { state, blocked: requestBlock(state), connected, load, setDraft, send, retry, decline };
}

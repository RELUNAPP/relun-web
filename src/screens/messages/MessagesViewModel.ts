import { useEffect } from 'react';
import { create } from 'zustand';
import type { Conversation, Person } from '../../data/models';
import { ApiException } from '../../data/network';
import { chat, people } from '../../data/repositories';
import { useApp } from '../../data/store';
import type { LoadState } from '../main/TabCommon';

/*
 * Port of Android MessagesViewModel. The state lives at module level so it
 * survives tab switches, the way the Android view model outlives the tab's
 * composition; it is reset on sign-out.
 */

export type MessagesView = 'matches' | 'likes';

export type ConversationRow = { conversation: Conversation; person: Person | null };

export type MessagesState = {
  view: MessagesView;
  load: LoadState;
  offline: boolean;
  newMatches: Person[];
  conversations: ConversationRow[];
  likesLocked: boolean;
  likesCount: number;
  likers: Person[];
};

const initialState: MessagesState = {
  view: 'matches',
  load: 'loading',
  offline: false,
  newMatches: [],
  conversations: [],
  likesLocked: true,
  likesCount: 0,
  likers: [],
};

const useMessagesStore = create<MessagesState>(() => initialState);
const update = (fn: (s: MessagesState) => Partial<MessagesState>) => useMessagesStore.setState(fn);

let started = false;
let unsubscribers: (() => void)[] = [];
/** The last `showLikes` request handled, so a remount doesn't reopen Likes. */
let lastShowLikes = 0;

const setView = (view: MessagesView) => update(() => ({ view }));

let inFlight = 0;

async function load(quiet = false) {
  inFlight++;
  try {
    await loadNow(quiet);
  } finally {
    inFlight--;
  }
}

/** ON_RESUME: a quiet refresh, unless one is already running. */
const resume = () => {
  if (started && inFlight === 0) void load(true);
};

async function loadNow(quiet: boolean) {
  if (!quiet) update((s) => (s.load === 'ready' ? {} : { load: 'loading' }));
  const [matches, conversations, likes] = await Promise.allSettled([
    people.matches(),
    chat.conversations(),
    people.receivedLikes(),
  ]);
  if (!started) return;

  const failed = matches.status === 'rejected' ? matches : conversations.status === 'rejected' ? conversations : null;
  if (failed || matches.status !== 'fulfilled' || conversations.status !== 'fulfilled') {
    const error = failed?.reason;
    const network = error instanceof ApiException && error.isNetwork;
    update((s) => (s.load === 'ready' && network ? { offline: true } : { load: 'error', offline: network }));
    return;
  }
  const list = matches.value;
  const byId = new Map(list.map((p) => [p.id, p]));
  const convs = conversations.value.filter((c) => byId.has(c.userId));
  const talking = new Set(convs.map((c) => c.userId));
  const l = likes.status === 'fulfilled' ? likes.value : null;
  update((s) => ({
    load: list.length === 0 ? 'empty' : 'ready',
    offline: false,
    newMatches: list.filter((p) => !talking.has(p.id)),
    conversations: convs.map((conv) => ({ conversation: conv, person: byId.get(conv.userId) ?? null })),
    likesLocked: l?.locked ?? s.likesLocked,
    likesCount: l?.count ?? s.likesCount,
    likers: l?.people ?? s.likers,
  }));
}

/** Android's `init {}`: first load plus the socket and people subscriptions. */
function start() {
  if (started) return;
  started = true;
  void load();
  unsubscribers = [
    chat.socket.events.on((e) => {
      if (e.type === 'messageNotification' || e.type === 'newMessage') void load(true);
    }),
    people.events.on((e) => {
      if (e.type !== 'passed') void load(true);
    }),
  ];
}

function stop() {
  started = false;
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
  lastShowLikes = 0;
  useMessagesStore.setState(initialState, true);
}

// The view model belongs to the signed-in session.
useApp.subscribe((s, prev) => {
  if (prev.auth.kind === 'signedIn' && s.auth.kind !== 'signedIn') stop();
});

export function useMessagesViewModel() {
  useEffect(start, []);
  const state = useMessagesStore();
  return {
    state,
    setView,
    load,
    resume,
    /** LaunchedEffect(showLikes): switch to Likes for each new request. */
    handleShowLikes(showLikes: number) {
      if (showLikes > 0 && showLikes !== lastShowLikes) setView('likes');
      lastShowLikes = showLikes;
    },
  };
}

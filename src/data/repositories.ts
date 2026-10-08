import type * as D from './dtos';
import { defaultSettings } from './dtos';
import {
  emptyWallet,
  parseDate,
  segmentFrom,
  toDatePost,
  toEntitlements,
  toMessageRequest,
  toPerson,
  type ChatMessage,
  type Conversation,
  type Person,
  type Photo,
} from './models';
import { api, ApiException, setSessionExpiredHandler } from './network';
import { session } from './session';
import { chatSocket } from './socket';
import { getApp, setApp, type MyProfile, type OnboardingStart } from './store';
import { Emitter } from '../util/emitter';

/*
 * The web counterpart of Android's repositories + AppContainer. Functions throw
 * ApiException on failure (Android returns Result); callers use try/catch.
 */

export const MIN_PHOTOS = 2;
export const MAX_PHOTOS = 3;

export type ContactMethod = 'phone' | 'email';

const contactBody = (method: ContactMethod, contact: string): D.ContactBody =>
  method === 'phone' ? { phone: contact } : { email: contact.trim().toLowerCase() };

// ---------- Auth ----------

export const auth = {
  /** Decides where a cold start lands. Offline with a saved session goes straight in. */
  async bootstrap() {
    if (!session.isSignedIn) {
      setApp({ auth: { kind: 'signedOut' } });
      return;
    }
    try {
      const me = await api.myProfile();
      setApp({ segment: segmentFrom(me.profile?.segment) });
      if (!me.user?.fullName?.trim() || !me.user?.dateOfBirth) auth.enterOnboarding('segment');
      else if ((me.photos ?? []).length < MIN_PHOTOS) auth.enterOnboarding('photos');
      else setSignedIn();
    } catch (e) {
      if (e instanceof ApiException && e.isUnauthorized) await auth.signOutLocally();
      else setSignedIn();
    }
  },

  requestCode: (method: ContactMethod, contact: string) => api.requestOtp(contactBody(method, contact)),

  async verifyCode(method: ContactMethod, contact: string, code: string) {
    const res = await api.verifyOtp({ ...contactBody(method, contact), otp: code });
    session.saveSignIn(res.accessToken, res.refreshToken, res.user.id, method);
    setApp({ segment: segmentFrom(res.user.profile?.segment) });
    return {
      needsProfile: res.needsProfileCompletion ?? true,
      needsPhotos: (res.photoCount ?? 0) < MIN_PHOTOS,
    };
  },

  setSegment: (segment: 'relationship' | 'fun') => setApp({ segment }),
  enterOnboarding: (start: OnboardingStart) => setApp({ auth: { kind: 'onboarding', start } }),
  finishOnboarding: () => setSignedIn(),

  async signOut() {
    try {
      await api.logout();
    } catch {
      // Signing out locally is what matters.
    }
    await auth.signOutLocally();
  },

  async deleteAccount() {
    await api.deleteAccount();
    await auth.signOutLocally();
  },

  /** Clears everything on this device. Safe to call more than once. */
  async signOutLocally() {
    chatSocket.disconnect();
    chat.openChatUserId = null;
    session.clear();
    setApp({
      auth: { kind: 'signedOut' },
      segment: 'relationship',
      me: null,
      wallet: emptyWallet,
      settings: defaultSettings,
      unreadTotal: 0,
    });
  },
};

setSessionExpiredHandler(() => {
  if (getApp().auth.kind !== 'signedOut') void auth.signOutLocally();
});

/** Everything a signed-in session needs, started once per sign-in. */
function setSignedIn() {
  const already = getApp().auth.kind === 'signedIn';
  setApp({ auth: { kind: 'signedIn' } });
  if (already) return;
  if (document.visibilityState === 'visible') chatSocket.connect();
  void coins.refresh().catch(() => {});
  void profile.refresh().catch(() => {});
  void settings.refresh().catch(() => {});
  chat.refreshUnread();
  inbox.refreshUnread();
}

// A refreshed access token means the socket's handshake token is stale.
let lastToken = session.current.accessToken;
session.subscribe((s) => {
  if (s.accessToken !== lastToken) {
    lastToken = s.accessToken;
    if (s.accessToken && getApp().auth.kind === 'signedIn' && document.visibilityState === 'visible') {
      chatSocket.pause();
      chatSocket.connect();
    }
  }
});

// The server pushes only to users with no live socket, so drop it while hidden.
document.addEventListener('visibilitychange', () => {
  if (getApp().auth.kind !== 'signedIn') return;
  if (document.visibilityState === 'visible') {
    chatSocket.connect();
    chat.refreshUnread();
    inbox.refreshUnread();
    void coins.refresh().catch(() => {});
  } else {
    chatSocket.pause();
  }
});

chatSocket.connectedChanges.on((connected) => setApp({ socketConnected: connected }));

// ---------- My profile ----------

const toMyProfile = (r: D.MyProfileResponse): MyProfile => ({
  name: r.user?.fullName ?? '',
  dateOfBirth: r.user?.dateOfBirth?.slice(0, 10) ?? null,
  bio: r.profile?.bio ?? '',
  occupation: r.profile?.occupation ?? null,
  education: r.profile?.education ?? null,
  city: r.profile?.city ?? null,
  interests: r.profile?.interests ?? [],
  segment: segmentFrom(r.profile?.segment),
  photos: [...(r.photos ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((p) => ({ id: p._id, url: p.url })),
  email: r.user?.email ?? null,
  phone: r.user?.phone ?? null,
});

const updateMe = (fn: (me: MyProfile) => MyProfile) => {
  const me = getApp().me;
  if (me) setApp({ me: fn(me) });
};

export const profile = {
  async refresh(): Promise<MyProfile> {
    const me = toMyProfile(await api.myProfile());
    setApp({ me });
    return me;
  },
  completeProfile: (body: D.CompleteProfileBody) => api.completeProfile(body),
  updateLocation: (latitude: number, longitude: number, city: string | null) =>
    api.updateProfile({ latitude, longitude, city: city ?? undefined }),
  updateCity: (city: string) => api.updateProfile({ city }),
  async updateDetails(body: D.UpdateProfileBody) {
    await api.updateProfile(body);
    await profile.refresh().catch(() => {});
  },
  async uploadPhoto(jpeg: Blob): Promise<Photo> {
    const dto = await api.uploadPhoto(jpeg);
    const photo = { id: dto._id, url: dto.url };
    updateMe((me) => ({ ...me, photos: [...me.photos, photo] }));
    return photo;
  },
  async replacePhoto(photoId: string, jpeg: Blob): Promise<Photo> {
    const dto = await api.replacePhoto(photoId, jpeg);
    const photo = { id: dto._id, url: dto.url };
    updateMe((me) => ({ ...me, photos: me.photos.map((p) => (p.id === photoId ? photo : p)) }));
    return photo;
  },
  async deletePhoto(photoId: string) {
    await api.deletePhoto(photoId);
    updateMe((me) => ({ ...me, photos: me.photos.filter((p) => p.id !== photoId) }));
  },
};

/** Age from a yyyy-mm-dd date of birth. */
export const calculateAge = (dob: string | Date, today = new Date()): number => {
  const d = typeof dob === 'string' ? new Date(`${dob.slice(0, 10)}T00:00:00`) : dob;
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
};

/** Same weighting the profile ring shows: basics, bio, photos, details. */
export const completeness = (me: MyProfile): number => {
  let score = 30;
  if (me.bio.trim()) score += 15;
  score += me.photos.length * 10;
  if (me.name.trim()) score += 5;
  if (me.occupation?.trim()) score += 5;
  if (me.interests.length) score += 5;
  if (me.city?.trim()) score += 10;
  return Math.min(score, 100);
};

// ---------- People ----------

export type LockedPeople = {
  locked: boolean;
  count: number;
  people: Person[];
  /** Profile views only: when each person (by id) last viewed the user. */
  viewedAt?: Record<string, Date>;
};

/** Something changed between the user and another person; open lists update from these. */
export type PeopleEvent =
  | { type: 'liked'; userId: string; isMatch: boolean }
  | { type: 'unliked'; userId: string }
  | { type: 'passed'; userId: string }
  | { type: 'blocked'; userId: string }
  | { type: 'unblocked'; userId: string }
  /** Became a match some other way than a like on screen (a reply, a request). */
  | { type: 'matched'; userId: string }
  | { type: 'requestSent'; userId: string }
  | { type: 'requestDeclined'; userId: string }
  | { type: 'insightsUnlocked' }
  | { type: 'plusChanged' }
  | { type: 'matchesChanged' };

/** A like refused because today's free likes are used up. */
export const isLikeLimit = (e: unknown): boolean => e instanceof ApiException && e.code === 'LIKE_LIMIT';

export const people = {
  /** Emits when a like is mutual; the shell shows the match celebration. */
  newMatches: new Emitter<Person>(),
  events: new Emitter<PeopleEvent>(),
  /** Emits when a like hits the daily limit; the shell offers Plus. */
  likeLimitReached: new Emitter<void>(),

  discover: async (latitude: number | null, longitude: number | null) =>
    ((await api.discover(latitude, longitude)).users ?? []).map(toPerson),
  person: async (userId: string) => toPerson(await api.person(userId)),

  /** Likes [person]. Returns true when it made a match. Throws isLikeLimit errors when out of likes. */
  async like(person: Person): Promise<boolean> {
    let res: D.LikeResponse;
    try {
      res = await api.like(person.id);
    } catch (e) {
      if (isLikeLimit(e)) {
        const wallet = getApp().wallet;
        setApp({ wallet: { ...wallet, likes: { ...wallet.likes, left: 0 } } });
        people.likeLimitReached.emit();
      }
      throw e;
    }
    if (res.likesLeft !== undefined) {
      const wallet = getApp().wallet;
      setApp({ wallet: { ...wallet, likes: { ...wallet.likes, left: res.likesLeft, resetAt: parseDate(res.likesResetAt) } } });
    }
    const mutual = res.isMutual ?? false;
    if (mutual && !res.alreadyLiked) people.newMatches.emit({ ...person, isMatch: true, liked: true });
    people.events.emit({ type: 'liked', userId: person.id, isMatch: mutual });
    return mutual;
  },
  async unlike(userId: string) {
    await api.unlike(userId);
    people.events.emit({ type: 'unliked', userId });
  },
  async pass(userId: string) {
    await api.pass(userId);
    people.events.emit({ type: 'passed', userId });
  },
  matches: async () => ((await api.matches()).matches ?? []).map((c) => ({ ...toPerson(c), isMatch: true })),
  async receivedLikes(): Promise<LockedPeople> {
    const r = await api.receivedLikes();
    return { locked: r.locked ?? true, count: r.count ?? 0, people: (r.likes ?? []).map(toPerson) };
  },
  async profileViews(): Promise<LockedPeople> {
    const r = await api.profileViews();
    const viewedAt: Record<string, Date> = {};
    for (const card of r.views ?? []) {
      const at = parseDate(card.viewedAt);
      if (at) viewedAt[card.user._id] = at;
    }
    return { locked: r.locked ?? true, count: r.count ?? 0, people: (r.views ?? []).map(toPerson), viewedAt };
  },
  emit: (event: PeopleEvent) => people.events.emit(event),
};

// ---------- Chat ----------

const myId = () => session.current.userId ?? '';

const toChatMessage = (m: D.MessageDto, clientId: string | null = null): ChatMessage => ({
  id: m._id,
  clientId,
  mine: m.senderId === myId(),
  text: m.content,
  sentAt: parseDate(m.createdAt) ?? new Date(),
  status: m.senderId === myId() && m.isRead ? 'read' : 'sent',
});

export const chat = {
  socket: chatSocket,
  /** The chat currently on screen, so incoming messages there don't count as unread. */
  openChatUserId: null as string | null,

  async conversations(): Promise<Conversation[]> {
    const res = await api.conversations();
    const list = (res.conversations ?? []).flatMap((conv) => {
      const other = conv.otherUser;
      if (!other) return [];
      return [
        {
          userId: other._id,
          name: other.fullName || 'Relun user',
          lastMessage: conv.lastMessage.content,
          lastFromMe: conv.lastMessage.senderId === myId(),
          lastAt: parseDate(conv.lastMessage.createdAt) ?? new Date(),
          unread: conv.unreadCount ?? 0,
          request: toMessageRequest(conv.request),
        },
      ];
    });
    setApp({ unreadTotal: list.filter((c) => c.unread > 0).length });
    return list;
  },
  refreshUnread() {
    void chat.conversations().catch(() => {});
  },
  /** The conversation's messages, and the message request it runs on, if any. */
  async thread(userId: string) {
    const res = await api.messages(userId);
    return { messages: (res.messages ?? []).map((m) => toChatMessage(m)), request: toMessageRequest(res.request) };
  },
  toChatMessage,

  /**
   * Messages [person] without a match, using a free request if one is left,
   * otherwise coins. If they already liked the user it becomes a match instead,
   * for free.
   */
  async sendRequest(person: Person, content: string) {
    const res = await api.sendMessageRequest(person.id, content.trim());
    setApp({ wallet: { ...getApp().wallet, balance: res.balance ?? getApp().wallet.balance } });
    // The free allowance changed; the server has the count.
    void coins.refresh().catch(() => {});
    const matched = res.matched ?? false;
    if (matched) {
      people.emit({ type: 'liked', userId: person.id, isMatch: true });
      people.emit({ type: 'matched', userId: person.id });
    } else {
      people.emit({ type: 'requestSent', userId: person.id });
    }
    return { matched, charged: res.charged ?? 0, free: res.freeAllowance ?? null };
  },
  async declineRequest(userId: string) {
    await api.declineMessageRequest(userId);
    people.emit({ type: 'requestDeclined', userId });
    chat.refreshUnread();
  },
};

chatSocket.events.on((event) => {
  if (event.type === 'messageNotification' && event.message.senderId !== chat.openChatUserId) chat.refreshUnread();
});

// ---------- Coins ----------

const updateWallet = (patch: Partial<ReturnType<typeof getApp>['wallet']>) =>
  setApp({ wallet: { ...getApp().wallet, ...patch } });

/** Coin balance and the things coins buy. The balance always comes from the server. */
export const coins = {
  async refresh() {
    const res = await api.wallet();
    setApp({
      wallet: {
        balance: res.balance ?? 0,
        insightsActive: res.insightsActive ?? false,
        messageRequestCost: res.costs?.messageRequest ?? 200,
        insights7Cost: res.costs?.insights7 ?? 700,
        insights30Cost: res.costs?.insights30 ?? 1500,
        datePostCost: res.costs?.datePost ?? 100,
        packages: res.packages ?? [],
        pendingBonus: res.pendingBonus ?? null,
        ...toEntitlements(res),
      },
    });
  },
  /** The welcome sheet was shown; the server stops reporting this bonus. */
  async markBonusSeen(id: string) {
    updateWallet({ pendingBonus: null });
    await api.markBonusSeen(id).catch(() => {});
  },
  /** Likes & Views for coins, for 7 or 30 days. */
  async buyInsights(days: 7 | 30) {
    const res = await api.buyInsights(days);
    updateWallet({ balance: res.balance ?? 0, insightsActive: true });
  },
  /** Hands a Paystack reference to the server, which verifies it and credits coins. */
  async confirmPaystack(reference: string) {
    const res = await api.paystackVerify(reference);
    updateWallet({ balance: res.balance ?? 0 });
    return res.credited ?? 0;
  },
};

// ---------- Notifications ----------

/** The notification list behind the bell. Chat messages have their own badge. */
export const inbox = {
  async list() {
    const res = await api.notifications();
    setApp({ notificationsUnread: res.unreadCount ?? 0 });
    return (res.notifications ?? []).map((n) => ({ ...n, createdAt: parseDate(n.createdAt) ?? new Date() }));
  },
  refreshUnread() {
    api
      .notificationsUnread()
      .then((res) => setApp({ notificationsUnread: res.unreadCount ?? 0 }))
      .catch(() => {});
  },
  /** Opening the list reads everything. */
  async markAllRead() {
    setApp({ notificationsUnread: 0 });
    await api.markNotificationsRead().catch(() => {});
  },
};

chatSocket.events.on((event) => {
  if (event.type === 'notification') setApp({ notificationsUnread: event.unreadCount });
});

// ---------- Relun Plus ----------

/** Relun Plus on the web: Paystack plans and one-time passes. */
export const plus = {
  /** Hands a Paystack reference to the server, which verifies it and starts or extends Plus. */
  async confirmPaystack(reference: string) {
    updateWallet(toEntitlements(await api.plusVerify(reference)));
    // Plus includes Likes & Views; the wallet says so.
    await coins.refresh().catch(() => {});
    people.emit({ type: 'plusChanged' });
  },
  /** Stops a renewing plan; Plus lasts until the paid period ends. */
  async cancel() {
    updateWallet(toEntitlements(await api.plusCancel()));
    people.emit({ type: 'plusChanged' });
  },
};

// ---------- Dates, safety, settings ----------

export const dates = {
  browse: async () => ((await api.browseDates()).dates ?? []).map(toDatePost),
  mine: async () => ((await api.myDates()).dates ?? []).map(toDatePost),
  /** Posts a date: free while a free slot is left, otherwise it costs coins. */
  async create(activity: string, place: string, at: Date, description: string | null) {
    const res = await api.createDate({
      activity: activity.trim(),
      place: place.trim(),
      scheduledFor: at.toISOString(),
      description: description?.trim() || undefined,
    });
    if (res.balance !== undefined) setApp({ wallet: { ...getApp().wallet, balance: res.balance } });
    // A free slot was used, or coins spent; the server has the counts.
    void coins.refresh().catch(() => {});
    return { post: toDatePost(res.date), charged: res.charged ?? 0 };
  },
  async delete(dateId: string) {
    await api.deleteDate(dateId);
    // Frees one of the free active slots.
    void coins.refresh().catch(() => {});
  },
  join: (dateId: string) => api.requestToJoin(dateId),
  respond: (dateId: string, requestId: string, accept: boolean) =>
    api.respondToRequest(dateId, requestId, accept ? 'accepted' : 'declined'),
};

export const safety = {
  async block(userId: string) {
    await api.block(userId);
    people.emit({ type: 'blocked', userId });
  },
  async unblock(userId: string) {
    await api.unblock(userId);
    people.emit({ type: 'unblocked', userId });
  },
  report: (userId: string, reason: string, details: string | null) => api.report(userId, reason, details),
  blocked: async () => (await api.blocks()).blocks ?? [],
};

export const settings = {
  async refresh() {
    const res = await api.settings();
    setApp({ settings: { ...defaultSettings, ...res.settings } });
  },
  /** Applies [patch] locally first so toggles feel instant, then reconciles. */
  async update(patch: D.SettingsPatch, optimistic: D.SettingsDto) {
    const previous = getApp().settings;
    setApp({ settings: optimistic });
    try {
      const res = await api.updateSettings(patch);
      const next = { ...defaultSettings, ...res.settings };
      setApp({ settings: next });
      return next;
    } catch (e) {
      setApp({ settings: previous });
      throw e;
    }
  },
};

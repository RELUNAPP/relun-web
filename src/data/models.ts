import type { CoinPackageDto, DatePostDto, MessageRequestDto, PendingBonusDto, PersonCardDto, PlusDto, PlusPlanDto } from './dtos';

/** Relationship intention. Fixed at signup; Discover and likes never cross it. */
export type Segment = 'relationship' | 'fun';
export const segmentFrom = (value?: string | null): Segment => (value === 'fun' ? 'fun' : 'relationship');

export type Photo = { id: string; url: string };

export type Person = {
  id: string;
  name: string;
  age: number | null;
  photos: Photo[];
  distanceKm: number | null;
  isOnline: boolean;
  lastActive: Date | null;
  bio: string;
  occupation: string | null;
  education: string | null;
  heightCm: number | null;
  drinking: string | null;
  smoking: string | null;
  religion: string | null;
  city: string | null;
  interests: string[];
  liked: boolean;
  /** Matches chat for free. */
  isMatch: boolean;
  /** Whether the user can pay to message them without a match. */
  acceptsMessageRequests: boolean;
  /** Set while the two are talking through a message request rather than a match. */
  messageRequest: MessageRequest | null;
};

/**
 * A paid message to someone the sender hasn't matched with. Accepted requests
 * are just matches, so only pending and declined ones are kept.
 */
export type MessageRequest = {
  status: 'pending' | 'declined';
  /** True for the person who paid to send it. */
  outgoing: boolean;
  /** Messages the sender can still send before a reply. */
  remaining: number;
};

export const toMessageRequest = (dto?: MessageRequestDto | null): MessageRequest | null =>
  dto && dto.status !== 'accepted' ? { status: dto.status, outgoing: dto.outgoing, remaining: dto.remaining } : null;

export const firstName = (p: { name: string }): string => p.name.split(' ')[0] || p.name;
export const initialOf = (p: { name: string }): string => p.name.charAt(0).toUpperCase() || '?';
export const mainPhotoUrl = (p: Person): string | null => p.photos[0]?.url ?? null;

const blankToNull = (v?: string | null): string | null => (v && v.trim() ? v : null);
export const parseDate = (v?: string | null): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export const toPerson = (card: PersonCardDto): Person => {
  const { user, profile, photos, relationship } = card;
  return {
    id: user._id,
    name: user.fullName?.trim() ? user.fullName : 'Relun user',
    age: user.age ?? null,
    photos: [...(photos ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((p) => ({ id: p._id, url: p.url })),
    distanceKm: profile?.distance ?? null,
    isOnline: user.isOnline ?? false,
    lastActive: parseDate(user.lastActive),
    bio: (profile?.bio ?? '').trim(),
    occupation: blankToNull(profile?.occupation),
    education: blankToNull(profile?.education ?? profile?.school),
    heightCm: profile?.height ?? null,
    drinking: blankToNull(profile?.drinking),
    smoking: blankToNull(profile?.smoking),
    religion: blankToNull(profile?.religion),
    city: blankToNull(profile?.city),
    interests: (profile?.interests ?? []).filter((i) => i.trim()),
    liked: relationship?.liked ?? false,
    isMatch: relationship?.isMutual ?? false,
    acceptsMessageRequests: relationship?.acceptsMessageRequests ?? true,
    messageRequest: toMessageRequest(relationship?.messageRequest),
  };
};

export type MessageStatus = 'sending' | 'sent' | 'read' | 'failed';

export type ChatMessage = {
  id: string;
  /** Set on messages this device sent, until the server echoes them back. */
  clientId: string | null;
  mine: boolean;
  text: string;
  sentAt: Date;
  status: MessageStatus;
};

export type Conversation = {
  userId: string;
  name: string;
  lastMessage: string;
  lastFromMe: boolean;
  lastAt: Date;
  unread: number;
  request: MessageRequest | null;
};

export type Plus = Omit<PlusDto, 'until' | 'active'> & { until: Date };
export type PlusPlan = PlusPlanDto;

/** Free likes or message requests left. `left` is null when unlimited (Plus likes). */
export type Allowance = { limit: number | null; left: number | null; resetAt: Date | null };

export type Wallet = {
  balance: number;
  /** Likes & Views, from a coin pass or from Plus. */
  insightsActive: boolean;
  messageRequestCost: number;
  insights7Cost: number;
  insights30Cost: number;
  /** A date post beyond the free active ones. */
  datePostCost: number;
  packages: CoinPackageDto[];
  /** Shown once on the main screen, then marked seen. */
  pendingBonus: PendingBonusDto | null;
  /** Null without Plus (never had it, or it lapsed). */
  plus: Plus | null;
  plans: PlusPlan[];
  /** What Plus includes, so copy never hard-codes it. */
  plusPerks: { monthlyRequests: number; activeDates: number };
  likes: Allowance;
  requests: Allowance;
  /** Free active date posts left. */
  dates: Allowance;
};

const noAllowance: Allowance = { limit: null, left: null, resetAt: null };

export const emptyWallet: Wallet = {
  balance: 0,
  insightsActive: false,
  messageRequestCost: 200,
  insights7Cost: 700,
  insights30Cost: 1500,
  datePostCost: 100,
  packages: [],
  pendingBonus: null,
  plus: null,
  plans: [],
  plusPerks: { monthlyRequests: 5, activeDates: 3 },
  likes: noAllowance,
  requests: { limit: 1, left: 0, resetAt: null },
  dates: { limit: 1, left: 1, resetAt: null },
};

const toAllowance = (dto?: { limit: number | null; left: number | null; resetAt: string | null }): Allowance =>
  dto ? { limit: dto.limit, left: dto.left, resetAt: parseDate(dto.resetAt) } : noAllowance;

/** The Plus and allowance part of the wallet, from the wallet or GET /api/plus. */
type AllowanceWire = { limit: number | null; left: number | null; resetAt: string | null };

export const toEntitlements = (dto: {
  plus?: PlusDto | null;
  plusPerks?: { monthlyRequests: number; activeDates: number };
  plans?: PlusPlanDto[];
  allowances?: { likes?: AllowanceWire; requests?: AllowanceWire; dates?: AllowanceWire };
}): Pick<Wallet, 'plus' | 'plans' | 'plusPerks' | 'likes' | 'requests' | 'dates'> => ({
  plus: dto.plus?.active
    ? { plan: dto.plus.plan, source: dto.plus.source, autoRenew: dto.plus.autoRenew, until: parseDate(dto.plus.until) ?? new Date() }
    : null,
  plans: dto.plans ?? [],
  plusPerks: dto.plusPerks ?? emptyWallet.plusPerks,
  likes: toAllowance(dto.allowances?.likes),
  requests: toAllowance(dto.allowances?.requests),
  dates: dto.allowances?.dates ? toAllowance(dto.allowances.dates) : emptyWallet.dates,
});

export type DateRequestStatus = 'pending' | 'accepted' | 'declined';
const requestStatusFrom = (v?: string | null): DateRequestStatus | null =>
  v === 'pending' || v === 'accepted' || v === 'declined' ? v : null;

export type DateRequest = { id: string; person: Person; status: DateRequestStatus };

export type DatePost = {
  id: string;
  activity: string;
  place: string;
  scheduledFor: Date;
  description: string | null;
  createdAt: Date | null;
  owner: Person | null;
  myRequestStatus: DateRequestStatus | null;
  requests: DateRequest[];
};

export const toDatePost = (dto: DatePostDto): DatePost => ({
  id: dto.id,
  activity: dto.activity,
  place: dto.place,
  scheduledFor: parseDate(dto.scheduledFor) ?? new Date(),
  description: blankToNull(dto.description),
  createdAt: parseDate(dto.createdAt),
  owner: dto.owner ? toPerson(dto.owner) : null,
  myRequestStatus: requestStatusFrom(dto.myRequestStatus),
  requests: (dto.requests ?? []).flatMap((r) =>
    r.requester ? [{ id: r.id, person: toPerson(r.requester), status: requestStatusFrom(r.status) ?? 'pending' }] : [],
  ),
});

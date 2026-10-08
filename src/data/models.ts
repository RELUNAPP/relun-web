import type { CoinPackageDto, DatePostDto, PendingBonusDto, PersonCardDto } from './dtos';

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
  isMatch: boolean;
  chatUnlocked: boolean;
};

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
  const { user, profile, photos, relationship, chatUnlocked } = card;
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
    isMatch: relationship?.isMutual ?? (chatUnlocked != null),
    chatUnlocked: relationship?.chatUnlocked ?? chatUnlocked ?? false,
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
  chatUnlocked: boolean;
};

export type Wallet = {
  balance: number;
  insightsActive: boolean;
  chatUnlockCost: number;
  insightsCost: number;
  packages: CoinPackageDto[];
  /** Shown once on the main screen, then marked seen. */
  pendingBonus: PendingBonusDto | null;
};

export const emptyWallet: Wallet = {
  balance: 0,
  insightsActive: false,
  chatUnlockCost: 15,
  insightsCost: 20,
  packages: [],
  pendingBonus: null,
};

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

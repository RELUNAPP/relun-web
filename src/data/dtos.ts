// Wire types for the Relun API. Field names follow the backend exactly; the
// app works with the mapped types in models.ts instead. Mirrors Android Dtos.kt.

// ---------- Auth ----------

export type ContactBody = { email?: string; phone?: string };
export type VerifyOtpBody = ContactBody & { otp: string };
export type RequestOtpResponse = { message?: string; isNewUser?: boolean };

export type VerifyOtpResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserDto;
  needsProfileCompletion?: boolean;
  photoCount?: number;
};

export type AuthUserDto = {
  id: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  coins?: number;
  profile?: ProfileDto | null;
};

export type TokenPair = { accessToken: string; refreshToken: string };

// ---------- People ----------

export type PhotoDto = { _id: string; url: string; order?: number };

export type UserDto = {
  _id: string;
  fullName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  lastActive?: string | null;
  age?: number | null;
  isOnline?: boolean;
};

export type ProfileDto = {
  bio?: string | null;
  segment?: string | null;
  occupation?: string | null;
  education?: string | null;
  company?: string | null;
  school?: string | null;
  city?: string | null;
  height?: number | null;
  drinking?: string | null;
  smoking?: string | null;
  religion?: string | null;
  interests?: string[] | null;
  distance?: number | null;
  isVisible?: boolean;
  showAge?: boolean;
  showDistance?: boolean;
};

/** A paid message to someone the sender hasn't matched with, from the viewer's side. */
export type MessageRequestDto = {
  status: 'pending' | 'accepted' | 'declined';
  /** True for the person who paid to send it. */
  outgoing: boolean;
  /** Messages the sender can still send before a reply. */
  remaining: number;
};

export type RelationshipDto = {
  liked?: boolean;
  isMutual?: boolean;
  /** Whether the viewer can pay to message this person without a match. */
  acceptsMessageRequests?: boolean;
  messageRequest?: MessageRequestDto | null;
};

/** The {user, profile, photos} envelope every person-listing endpoint returns. */
export type PersonCardDto = {
  user: UserDto;
  profile?: ProfileDto | null;
  photos?: PhotoDto[] | null;
  relationship?: RelationshipDto | null;
  /** Profile views only: when this person last viewed the user. */
  viewedAt?: string | null;
};

export type DiscoverResponse = { users?: PersonCardDto[] };
export type MatchesResponse = { matches?: PersonCardDto[] };
export type LockedPeopleResponse = {
  locked?: boolean;
  count?: number;
  likes?: PersonCardDto[];
  views?: PersonCardDto[];
};
export type LikeResponse = {
  liked?: boolean;
  isMutual?: boolean;
  alreadyLiked?: boolean;
  /** Free likes left today; null with Plus (no limit). */
  likesLeft?: number | null;
  likesResetAt?: string | null;
};

// ---------- My profile ----------

export type MyProfileResponse = { user?: UserDto | null; profile?: ProfileDto | null; photos?: PhotoDto[] };

export type CompleteProfileBody = {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  segment: string;
  bio?: string;
  email?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
};

export type UpdateProfileBody = {
  fullName?: string;
  bio?: string;
  city?: string;
  occupation?: string;
  education?: string;
  interests?: string[];
  latitude?: number;
  longitude?: number;
};

// ---------- Chat ----------

export type MessageDto = {
  _id: string;
  conversationId?: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead?: boolean;
  createdAt: string;
};

export type MessagesResponse = { messages?: MessageDto[]; request?: MessageRequestDto | null };
export type ConversationDto = {
  conversationId: string;
  otherUser?: { _id: string; fullName?: string | null } | null;
  lastMessage: MessageDto;
  unreadCount?: number;
  /** Set while the two are talking through a message request, not a match. */
  request?: MessageRequestDto | null;
};
export type ConversationsResponse = { conversations?: ConversationDto[] };
export type SendRequestResponse = {
  /** They already liked the sender, so it became a match instead of a request. */
  matched?: boolean;
  request?: MessageRequestDto | null;
  charged?: number;
  /** Which free allowance paid for it: 'free' (weekly) or 'plus'; null if coins did. */
  freeAllowance?: 'free' | 'plus' | null;
  balance?: number;
  message?: MessageDto;
};

// ---------- Coins ----------

export type CoinPackageDto = {
  id: string;
  productId: string;
  coins: number;
  priceUsd: number;
  best?: boolean;
  /** Web price in the currency's minor unit (kobo for NGN). */
  paystackAmount?: number;
  paystackCurrency?: string;
};

// ---------- Relun Plus ----------

export type PlusDto = {
  active: boolean;
  plan: 'weekly' | 'monthly';
  /** paystack: renewing plan; paystack_pass: one-time; play: Google Play. */
  source: 'paystack' | 'paystack_pass' | 'play';
  until: string;
  autoRenew: boolean;
};

export type PlusPlanDto = {
  id: 'weekly' | 'monthly';
  days: number;
  /** Paystack price in minor units (kobo). */
  amount: number;
  currency: string;
  /** Whether the web can sell it as an auto-renewing plan; one-time passes always work. */
  autoRenewAvailable: boolean;
  playProductId: string;
  playBasePlanId: string;
};

export type AllowanceDto = { limit: number | null; left: number | null; resetAt: string | null };

/** Plus status and the free allowances. GET /api/plus, and part of the wallet. */
export type EntitlementsResponse = {
  plus?: PlusDto | null;
  /** What Plus includes, from the server's settings. */
  plusPerks?: { monthlyRequests: number; activeDates: number };
  plans?: PlusPlanDto[];
  /** dates: free active date posts left (no reset; a slot frees when a post passes or is deleted). */
  allowances?: { likes?: AllowanceDto; requests?: AllowanceDto; dates?: AllowanceDto };
};

export type WalletResponse = EntitlementsResponse & {
  balance?: number;
  /** Likes & Views, from a coin pass or from Plus. */
  insightsActive?: boolean;
  insightsUntil?: string | null;
  costs?: { messageRequest?: number; insights7?: number; insights30?: number; datePost?: number };
  packages?: CoinPackageDto[];
  pendingBonus?: PendingBonusDto | null;
};

/** Coins the user was given but hasn't been told about yet. */
export type PendingBonusDto = { id: string; coins: number; kind: 'signup' | 'gift' };

export type PurchaseResponse = { credited?: number; balance?: number; alreadyProcessed?: boolean };
export type PaystackInitResponse = { reference: string; accessCode: string; authorizationUrl: string };
export type InsightsResponse = { insightsActive?: boolean; insightsUntil?: string | null; balance?: number };

// ---------- Dates ----------

export type DateRequestDto = { id: string; status: string; requester?: PersonCardDto | null };

export type DatePostDto = {
  id: string;
  activity: string;
  place: string;
  scheduledFor: string;
  description?: string | null;
  createdAt?: string | null;
  owner?: PersonCardDto | null;
  myRequestStatus?: string | null;
  requests?: DateRequestDto[];
};

export type DatesResponse = { dates?: DatePostDto[] };
export type CreateDateBody = { activity: string; place: string; scheduledFor: string; description?: string };
export type CreateDateResponse = { date: DatePostDto; charged?: number; balance?: number };
export type JoinResponse = { status?: string; alreadyRequested?: boolean };

// ---------- Safety & settings ----------

export type BlockedUserDto = { userId: string; fullName: string; photoUrl?: string | null };
export type BlocksResponse = { blocks?: BlockedUserDto[] };

export type SettingsDto = {
  isVisible: boolean;
  showAge: boolean;
  showDistance: boolean;
  notificationsEnabled: boolean;
  allowMessageRequests: boolean;
  maxDistanceKm: number;
  ageMin: number;
  ageMax: number;
  segment: string;
};

export const defaultSettings: SettingsDto = {
  isVisible: true,
  showAge: true,
  showDistance: true,
  notificationsEnabled: true,
  allowMessageRequests: true,
  maxDistanceKm: 35,
  ageMin: 18,
  ageMax: 99,
  segment: 'relationship',
};

export type SettingsResponse = { settings: Partial<SettingsDto> };
export type SettingsPatch = Partial<Omit<SettingsDto, 'segment'>>;

// ---------- Notifications ----------

export type NotificationType =
  | 'match'
  | 'like'
  | 'view'
  | 'message_request'
  | 'date_request'
  | 'date_accepted'
  | 'plus'
  | 'coins';

export type NotificationDto = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** Null when there's no other person, or it's hidden (likes and views without Likes & Views). */
  actor: { id: string; name: string | null; photoUrl: string | null } | null;
  /** Where a tap goes, e.g. { userId }. */
  data: { userId?: string };
};

export type NotificationsResponse = { notifications?: NotificationDto[]; unreadCount?: number };
export type UnreadNotificationsResponse = { unreadCount?: number };

// ---------- Errors ----------

export type ApiErrorBody = {
  error?: string;
  code?: string;
  errors?: { msg?: string }[];
  required?: number;
  balance?: number;
};

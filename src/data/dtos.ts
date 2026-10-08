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

export type RelationshipDto = { liked?: boolean; isMutual?: boolean; chatUnlocked?: boolean };

/** The {user, profile, photos} envelope every person-listing endpoint returns. */
export type PersonCardDto = {
  user: UserDto;
  profile?: ProfileDto | null;
  photos?: PhotoDto[] | null;
  chatUnlocked?: boolean | null;
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
export type LikeResponse = { liked?: boolean; isMutual?: boolean; alreadyLiked?: boolean };

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

export type MessagesResponse = { messages?: MessageDto[] };
export type ConversationDto = {
  conversationId: string;
  otherUser?: { _id: string; fullName?: string | null } | null;
  lastMessage: MessageDto;
  unreadCount?: number;
  chatUnlocked?: boolean;
};
export type ConversationsResponse = { conversations?: ConversationDto[] };

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

export type WalletResponse = {
  balance?: number;
  insightsActive?: boolean;
  insightsUntil?: string | null;
  costs?: { chatUnlock?: number; insights?: number };
  packages?: CoinPackageDto[];
  pendingBonus?: PendingBonusDto | null;
};

/** Coins the user was given but hasn't been told about yet. */
export type PendingBonusDto = { id: string; coins: number; kind: 'signup' | 'gift' };

export type PurchaseResponse = { credited?: number; balance?: number; alreadyProcessed?: boolean };
export type PaystackInitResponse = { reference: string; accessCode: string; authorizationUrl: string };
export type UnlockChatResponse = { unlocked?: boolean; charged?: number; balance?: number };
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
export type CreateDateResponse = { date: DatePostDto };
export type JoinResponse = { status?: string; alreadyRequested?: boolean };

// ---------- Safety & settings ----------

export type BlockedUserDto = { userId: string; fullName: string; photoUrl?: string | null };
export type BlocksResponse = { blocks?: BlockedUserDto[] };

export type SettingsDto = {
  isVisible: boolean;
  showAge: boolean;
  showDistance: boolean;
  notificationsEnabled: boolean;
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
  maxDistanceKm: 35,
  ageMin: 18,
  ageMax: 99,
  segment: 'relationship',
};

export type SettingsResponse = { settings: Partial<SettingsDto> };
export type SettingsPatch = Partial<Omit<SettingsDto, 'segment'>>;

// ---------- Errors ----------

export type ApiErrorBody = {
  error?: string;
  code?: string;
  errors?: { msg?: string }[];
  required?: number;
  balance?: number;
};

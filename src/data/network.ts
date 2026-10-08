import type * as D from './dtos';
import { session } from './session';

// Defaults to the page's own origin: the Vite dev server proxies /api and
// /socket.io to the backend. Set VITE_API_BASE_URL when the API lives elsewhere.
const rawBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || `${window.location.origin}/`;
export const baseUrl = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

/** A failed call, reduced to what screens need: a message to show and a few flags. */
export class ApiException extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
    readonly code: string | null = null,
    readonly isNetwork = false,
  ) {
    super(message);
  }
  get isInsufficientCoins(): boolean {
    return this.code === 'INSUFFICIENT_COINS' || this.status === 402;
  }
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

export const toApiException = (e: unknown): ApiException => {
  if (e instanceof ApiException) return e;
  if (e instanceof TypeError) return new ApiException('You’re offline. Check your connection and try again.', null, null, true);
  return new ApiException((e as Error)?.message || 'Something went wrong. Try again.');
};

const fallbackMessage = (status: number): string => {
  if (status === 401) return 'Your session has ended. Please sign in again.';
  if (status === 403) return 'You can’t do that.';
  if (status === 404) return 'We couldn’t find that.';
  if (status >= 500) return 'Something went wrong on our side. Try again.';
  return 'Something went wrong. Try again.';
};

let onSessionExpired: () => void = () => {};
export const setSessionExpiredHandler = (fn: () => void) => {
  onSessionExpired = fn;
};

// One refresh at a time; concurrent 401s wait for the same promise.
let refreshing: Promise<boolean> | null = null;

const refreshTokens = (): Promise<boolean> => {
  if (refreshing) return refreshing;
  const refreshToken = session.current.refreshToken;
  if (!refreshToken) return Promise.resolve(false);
  refreshing = fetch(`${baseUrl}api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) return false;
      const pair = (await res.json()) as D.TokenPair;
      session.saveTokens(pair.accessToken, pair.refreshToken);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Sends a request with the bearer token. On a 401, swaps the refresh token for
 * a new pair once and retries; if that fails the session is over.
 */
async function request<T>(method: Method, path: string, body?: unknown, retried = false): Promise<T> {
  const headers: Record<string, string> = {};
  const token = session.current.accessToken;
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(baseUrl + path, { method, headers, body: payload });
  } catch (e) {
    throw toApiException(e);
  }

  if (res.status === 401 && !retried && !path.startsWith('api/auth/')) {
    if (await refreshTokens()) return request<T>(method, path, body, true);
    onSessionExpired();
  }

  const text = await res.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  if (!res.ok) {
    const parsed = (json ?? {}) as D.ApiErrorBody;
    const message = parsed.error ?? parsed.errors?.[0]?.msg ?? fallbackMessage(res.status);
    throw new ApiException(message, res.status, parsed.code ?? null);
  }
  return json as T;
}

const q = (params: Record<string, string | number | null | undefined>) => {
  const s = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return s ? `?${s}` : '';
};

const photoForm = (field: string, jpeg: Blob) => {
  const form = new FormData();
  form.append(field, jpeg, 'photo.jpg');
  return form;
};

/** Every endpoint the app uses; same list as Android ApiService. */
export const api = {
  // ---------- Auth ----------
  requestOtp: (body: D.ContactBody) => request<D.RequestOtpResponse>('POST', 'api/auth/request-otp', body),
  verifyOtp: (body: D.VerifyOtpBody) => request<D.VerifyOtpResponse>('POST', 'api/auth/verify-otp', body),
  logout: () => request<unknown>('POST', 'api/auth/logout'),
  deleteAccount: () => request<unknown>('DELETE', 'api/auth/account'),

  // ---------- My profile ----------
  myProfile: () => request<D.MyProfileResponse>('GET', 'api/profiles'),
  completeProfile: (body: D.CompleteProfileBody) => request<unknown>('POST', 'api/profiles/complete-profile', body),
  updateProfile: (body: D.UpdateProfileBody) => request<D.ProfileDto>('PUT', 'api/profiles', body),
  uploadPhoto: (jpeg: Blob) => request<D.PhotoDto>('POST', 'api/profiles/photos', photoForm('photos', jpeg)),
  replacePhoto: (photoId: string, jpeg: Blob) =>
    request<D.PhotoDto>('PATCH', `api/profiles/photos/${photoId}`, photoForm('photo', jpeg)),
  deletePhoto: (photoId: string) => request<unknown>('DELETE', `api/profiles/photos/${photoId}`),

  // ---------- People ----------
  discover: (latitude: number | null, longitude: number | null, limit = 50) =>
    request<D.DiscoverResponse>('GET', `api/profiles/discover${q({ latitude, longitude, limit })}`),
  person: (userId: string) => request<D.PersonCardDto>('GET', `api/profiles/${userId}`),
  like: (userId: string) => request<D.LikeResponse>('POST', `api/profiles/likes/${userId}`),
  unlike: (userId: string) => request<unknown>('DELETE', `api/profiles/likes/${userId}`),
  pass: (userId: string) => request<unknown>('POST', `api/profiles/passes/${userId}`),
  matches: () => request<D.MatchesResponse>('GET', 'api/profiles/matches'),
  receivedLikes: () => request<D.LockedPeopleResponse>('GET', 'api/profiles/likes/received'),
  profileViews: () => request<D.LockedPeopleResponse>('GET', 'api/profiles/views'),

  // ---------- Chat ----------
  conversations: () => request<D.ConversationsResponse>('GET', 'api/chat'),
  messages: (userId: string, page = 1, limit = 50) =>
    request<D.MessagesResponse>('GET', `api/chat/${userId}${q({ page, limit })}`),

  // ---------- Coins ----------
  wallet: () => request<D.WalletResponse>('GET', 'api/coins'),
  paystackInitialize: (productId: string) =>
    request<D.PaystackInitResponse>('POST', 'api/coins/paystack/initialize', { productId }),
  paystackVerify: (reference: string) => request<D.PurchaseResponse>('POST', 'api/coins/paystack/verify', { reference }),
  unlockChat: (userId: string) => request<D.UnlockChatResponse>('POST', `api/coins/unlock-chat/${userId}`),
  buyInsights: () => request<D.InsightsResponse>('POST', 'api/coins/insights'),
  markBonusSeen: (id: string) => request<unknown>('POST', `api/coins/bonus/${id}/seen`),

  // ---------- Dates ----------
  browseDates: () => request<D.DatesResponse>('GET', 'api/dates'),
  myDates: () => request<D.DatesResponse>('GET', 'api/dates/mine'),
  createDate: (body: D.CreateDateBody) => request<D.CreateDateResponse>('POST', 'api/dates', body),
  deleteDate: (dateId: string) => request<unknown>('DELETE', `api/dates/${dateId}`),
  requestToJoin: (dateId: string) => request<D.JoinResponse>('POST', `api/dates/${dateId}/requests`),
  respondToRequest: (dateId: string, requestId: string, status: 'accepted' | 'declined') =>
    request<unknown>('PATCH', `api/dates/${dateId}/requests/${requestId}`, { status }),

  // ---------- Safety ----------
  block: (userId: string) => request<unknown>('POST', `api/safety/blocks/${userId}`),
  unblock: (userId: string) => request<unknown>('DELETE', `api/safety/blocks/${userId}`),
  blocks: () => request<D.BlocksResponse>('GET', 'api/safety/blocks'),
  report: (userId: string, reason = 'other', details?: string | null) =>
    request<unknown>('POST', `api/safety/reports/${userId}`, { reason, details: details ?? undefined }),

  // ---------- Settings ----------
  settings: () => request<D.SettingsResponse>('GET', 'api/settings'),
  updateSettings: (body: D.SettingsPatch) => request<D.SettingsResponse>('PATCH', 'api/settings', body),
};

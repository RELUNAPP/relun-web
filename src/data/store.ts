import { create } from 'zustand';
import { defaultSettings, type SettingsDto } from './dtos';
import { emptyWallet, type Photo, type Segment, type Wallet } from './models';

export type OnboardingStart = 'segment' | 'photos';

export type AuthState =
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'onboarding'; start: OnboardingStart }
  | { kind: 'signedIn' };

export type MyProfile = {
  name: string;
  /** yyyy-mm-dd */
  dateOfBirth: string | null;
  bio: string;
  occupation: string | null;
  education: string | null;
  city: string | null;
  interests: string[];
  segment: Segment;
  photos: Photo[];
  email: string | null;
  phone: string | null;
};

export type ToastKind = 'success' | 'error' | 'warning' | 'info';
export type Toast = { kind: ToastKind; text: string; id: number };

/**
 * App-wide state that Android keeps in repository StateFlows: auth, segment,
 * wallet, my profile, settings, unread count and the current toast.
 */
type AppStore = {
  auth: AuthState;
  segment: Segment;
  wallet: Wallet;
  me: MyProfile | null;
  settings: SettingsDto;
  unreadTotal: number;
  /** Unread notifications; the bell's badge. */
  notificationsUnread: number;
  toast: Toast | null;
  socketConnected: boolean;
};

export const useApp = create<AppStore>(() => ({
  auth: { kind: 'loading' },
  segment: 'relationship',
  wallet: emptyWallet,
  me: null,
  settings: defaultSettings,
  unreadTotal: 0,
  notificationsUnread: 0,
  toast: null,
  socketConnected: false,
}));

export const setApp = useApp.setState;
export const getApp = useApp.getState;

let toastId = 0;
const post = (kind: ToastKind, text: string) => setApp({ toast: { kind, text, id: ++toastId } });

/** App-wide toasts. Any screen can post; the root shows them. */
export const messenger = {
  success: (text: string) => post('success', text),
  error: (text: string) => post('error', text),
  info: (text: string) => post('info', text),
  warning: (text: string) => post('warning', text),
};

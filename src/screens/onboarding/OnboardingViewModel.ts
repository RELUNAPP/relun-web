import { createContext, useContext } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import type { Photo, Segment } from '../../data/models';
import { auth, calculateAge, MAX_PHOTOS, MIN_PHOTOS, people, profile } from '../../data/repositories';
import { session } from '../../data/session';
import { getApp, messenger } from '../../data/store';
import { compressForUpload } from '../../util/images';
import { location, type Coordinates } from '../../util/location';

export type Gender = { label: string; wire: string };
export const GENDERS: Gender[] = [
  { label: 'Female', wire: 'female' },
  { label: 'Male', wire: 'male' },
];

export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied';

export type PhotoSlot = { kind: 'empty' } | { kind: 'uploading' } | { kind: 'done'; photo: Photo };
const EMPTY: PhotoSlot = { kind: 'empty' };

export type OnboardingState = {
  segment: Segment;
  name: string;
  day: string;
  month: string;
  year: string;
  gender: Gender | null;
  recovery: string;
  bio: string;
  nameTouched: boolean;
  submitting: boolean;
  location: LocationStatus;
  cityLabel: string | null;
  cityInput: string;
  slots: PhotoSlot[];
  nearbyCount: number | null;
  /** Whether the user signed in by phone, so recovery asks for an email. */
  signedInByPhone: boolean;
};

// ---------- Derived values (OnboardingState getters) ----------

export const nameError = (s: OnboardingState): string | null => (s.nameTouched && !s.name.trim() ? 'Enter your name' : null);

const toInt = (v: string): number | null => (/^\d+$/.test(v) ? parseInt(v, 10) : null);

/** LocalDate.of: null when the day doesn't exist in that month. */
const localDate = (y: number, m: number, d: number): Date | null => {
  const date = new Date(y, m - 1, d);
  if (y < 100) date.setFullYear(y);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
};

export const dobError = (s: OnboardingState): string | null => {
  const d = toInt(s.day);
  const m = toInt(s.month);
  const y = toInt(s.year);
  const thisYear = new Date().getFullYear();
  if (s.month && (m == null || m < 1 || m > 12)) return 'Invalid month';
  if (s.day && (d == null || d < 1 || d > 31)) return 'Invalid day';
  if (s.year.length === 4 && (y == null || y < 1940 || y > thisYear)) return `Invalid year. Use 1940–${thisYear}`;
  if (d != null && m != null && y != null && s.year.length === 4) {
    const date = localDate(y, m, d);
    if (!date) return 'Invalid day for that month';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (date > today) return 'That date is in the future';
    if (calculateAge(date) < 18) return 'You must be 18 or older to use Relun';
  }
  return null;
};

/** yyyy-mm-dd, or null until the date is complete and valid. */
export const dateOfBirth = (s: OnboardingState): string | null => {
  if (s.year.length !== 4 || dobError(s) != null) return null;
  const y = toInt(s.year);
  const m = toInt(s.month);
  const d = toInt(s.day);
  if (y == null || m == null || d == null || !localDate(y, m, d)) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

export const detailsValid = (s: OnboardingState): boolean => !!s.name.trim() && dateOfBirth(s) != null && s.gender != null;

export const uploadedPhotos = (s: OnboardingState): Photo[] =>
  s.slots.flatMap((x) => (x.kind === 'done' ? [x.photo] : []));

export const photosValid = (s: OnboardingState): boolean =>
  uploadedPhotos(s).length >= MIN_PHOTOS && !s.slots.some((x) => x.kind === 'uploading');

// ---------- View model ----------

export type OnboardingActions = {
  chooseSegment: (segment: Segment) => void;
  setName: (v: string) => void;
  touchName: () => void;
  setDay: (v: string) => void;
  setMonth: (v: string) => void;
  setYear: (v: string) => void;
  setGender: (g: Gender) => void;
  setRecovery: (v: string) => void;
  setBio: (v: string) => void;
  submitDetails: (onDone: () => void) => void;
  /** Web stand-in for the permission launcher: asks the browser, then follows Android's granted/denied paths. */
  enableLocation: () => void;
  onLocationPermission: (granted: boolean) => void;
  setCityInput: (v: string) => void;
  useCity: (onDone: () => void) => void;
  addPhoto: (index: number, file: File) => void;
  removePhoto: (index: number) => void;
  loadNearbyCount: () => void;
  finish: () => void;
};

export type OnboardingStore = StoreApi<OnboardingState & OnboardingActions>;

const digits = (v: string) => v.replace(/\D/g, '');

/** Port of Android OnboardingViewModel. One per OnboardingFlow, shared by every step. */
export function createOnboardingStore(): OnboardingStore {
  let coordinates: Coordinates | null = null;

  const store = createStore<OnboardingState & OnboardingActions>()((set, get) => {
    const setSlot = (index: number, slot: PhotoSlot) =>
      set((s) => ({ slots: s.slots.map((x, i) => (i === index ? slot : x)) }));

    const locate = async () => {
      set({ location: 'loading' });
      const coords = await location.current();
      if (coords == null) {
        // A refused prompt is Android's "denied" result; anything else is a failed fix.
        let refused = false;
        try {
          refused = (await navigator.permissions.query({ name: 'geolocation' })).state === 'denied';
        } catch {
          refused = false;
        }
        if (!refused) messenger.warning('We couldn’t find your location. Enter your city instead.');
        set({ location: 'denied' });
        return;
      }
      coordinates = coords;
      const city = await location.cityName(coords);
      try {
        await profile.updateLocation(coords.latitude, coords.longitude, city);
      } catch {
        // Android ignores this result too; Discover sends coordinates again.
      }
      set({ location: 'granted', cityLabel: city });
    };

    return {
      segment: getApp().segment,
      name: '',
      day: '',
      month: '',
      year: '',
      gender: null,
      recovery: '',
      bio: '',
      nameTouched: false,
      submitting: false,
      location: 'idle',
      cityLabel: null,
      cityInput: '',
      slots: Array.from({ length: MAX_PHOTOS }, () => EMPTY),
      nearbyCount: null,
      signedInByPhone: session.current.authMethod !== 'email',

      // ---------- Segment ----------
      chooseSegment: (segment) => {
        set({ segment });
        auth.setSegment(segment);
      },

      // ---------- Details ----------
      setName: (v) => set({ name: v.slice(0, 100) }),
      touchName: () => set({ nameTouched: true }),
      setDay: (v) => set({ day: digits(v).slice(0, 2) }),
      setMonth: (v) => set({ month: digits(v).slice(0, 2) }),
      setYear: (v) => set({ year: digits(v).slice(0, 4) }),
      setGender: (gender) => set({ gender }),
      setRecovery: (v) => set({ recovery: v.slice(0, 80) }),
      setBio: (v) => set({ bio: v.slice(0, 150) }),

      submitDetails: (onDone) => {
        const s = get();
        if (!detailsValid(s)) {
          set({ nameTouched: true });
          return;
        }
        const recovery = s.recovery.trim() || null;
        set({ submitting: true });
        void (async () => {
          try {
            await profile.completeProfile({
              fullName: s.name.trim(),
              dateOfBirth: dateOfBirth(s)!,
              gender: s.gender!.wire,
              segment: s.segment,
              bio: s.bio.trim() || undefined,
              email: s.signedInByPhone ? recovery?.toLowerCase() : undefined,
              phone: !s.signedInByPhone ? recovery?.replace(/[^\d+]/g, '') : undefined,
            });
            set({ submitting: false });
            onDone();
          } catch (e) {
            set({ submitting: false });
            messenger.error((e as Error)?.message || 'Couldn’t save your details.');
          }
        })();
      },

      // ---------- Location ----------
      enableLocation: () => void locate(),

      onLocationPermission: (granted) => {
        if (!granted) set({ location: 'denied' });
        else void locate();
      },

      setCityInput: (v) => set({ cityInput: v.slice(0, 80) }),

      useCity: (onDone) => {
        const city = get().cityInput.trim();
        if (city.length < 2) return;
        set({ submitting: true });
        void (async () => {
          let error: unknown = null;
          try {
            const coords = await location.geocodeCity(city);
            if (coords != null) {
              coordinates = coords;
              await profile.updateLocation(coords.latitude, coords.longitude, city);
            } else {
              await profile.updateCity(city);
            }
          } catch (e) {
            error = e;
          }
          set({ submitting: false });
          if (error == null) onDone();
          else messenger.error((error as Error)?.message || 'Couldn’t save your city.');
        })();
      },

      // ---------- Photos ----------
      addPhoto: (index, file) => {
        if (get().slots[index]?.kind !== 'empty') return;
        setSlot(index, { kind: 'uploading' });
        void (async () => {
          let jpeg: Blob;
          try {
            jpeg = await compressForUpload(file);
          } catch {
            setSlot(index, EMPTY);
            messenger.error('We couldn’t read that photo. Try another one.');
            return;
          }
          try {
            const photo = await profile.uploadPhoto(jpeg);
            setSlot(index, { kind: 'done', photo });
          } catch (e) {
            setSlot(index, EMPTY);
            messenger.error((e as Error)?.message || 'Upload failed. Try again.');
          }
        })();
      },

      removePhoto: (index) => {
        const slot = get().slots[index];
        if (slot?.kind !== 'done') return;
        setSlot(index, EMPTY);
        void profile.deletePhoto(slot.photo.id).catch((e: unknown) => {
          setSlot(index, slot);
          messenger.error((e as Error)?.message || 'Couldn’t remove that photo.');
        });
      },

      // ---------- You're in ----------
      loadNearbyCount: () => {
        const coords = coordinates ?? location.last;
        people
          .discover(coords?.latitude ?? null, coords?.longitude ?? null)
          .then((list) => set({ nearbyCount: list.length }))
          .catch(() => {});
      },

      finish: () => auth.finishOnboarding(),
    };
  });

  // Resuming at the photo step: show what is already uploaded.
  profile
    .refresh()
    .then((me) => {
      store.setState((s) => {
        const done: PhotoSlot[] = me.photos.slice(0, MAX_PHOTOS).map((photo) => ({ kind: 'done', photo }));
        return {
          slots: [...done, ...Array.from({ length: MAX_PHOTOS - done.length }, () => EMPTY)],
          name: s.name.trim() ? s.name : me.name,
        };
      });
    })
    .catch(() => {});

  return store;
}

export const OnboardingContext = createContext<OnboardingStore | null>(null);

/** The flow's shared view model: state plus actions, surviving moves between steps. */
export function useOnboardingViewModel(): OnboardingState & OnboardingActions {
  const store = useContext(OnboardingContext);
  if (!store) throw new Error('useOnboardingViewModel outside OnboardingFlow');
  return useStore(store);
}

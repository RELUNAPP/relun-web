import { useEffect, useRef, useState } from 'react';
import { ApiException } from '../../data/network';
import { auth, type ContactMethod } from '../../data/repositories';
import { messenger } from '../../data/store';

export const COUNTRY_CODES = ['+234', '+233', '+254', '+27', '+44', '+1', '+91'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type CodeSignInState = {
  method: ContactMethod;
  countryCode: string;
  contact: string;
  step: 1 | 2;
  code: string;
  codeError: string | null;
  sendError: string | null;
  busy: boolean;
  resendIn: number;
};

const digitsOf = (s: string) => s.replace(/\D/g, '');

export const contactValid = (s: CodeSignInState): boolean =>
  s.method === 'email' ? EMAIL.test(s.contact.trim()) : digitsOf(s.contact).length >= 10;

/** Shown once the user has typed enough to be judged. */
export const contactError = (s: CodeSignInState): string | null => {
  if (s.contact.length <= 4 || contactValid(s)) return null;
  return s.method === 'email' ? 'Enter a valid email address' : 'Phone numbers need at least 10 digits';
};

/** What gets sent: E.164 for phones, e.g. +2348012345678. */
const normalizedContact = (s: CodeSignInState): string =>
  s.method === 'email' ? s.contact.trim().toLowerCase() : s.countryCode + digitsOf(s.contact).replace(/^0+/, '');

export const sentTo = (s: CodeSignInState): string => (s.method === 'phone' ? `${s.countryCode} ${s.contact}` : s.contact.trim());

const RESEND_SECONDS = 45;
/** Matches the backend's OTP lifetime; a saved "code sent" step is useless after it. */
const CODE_LIFETIME_MS = 10 * 60 * 1000;

/*
 * Progress is kept in sessionStorage because phones often discard a background
 * tab and reload it, and leaving to fetch the code from email is exactly when
 * that happens. sessionStorage survives the reload but stays with this tab.
 */
const SAVED_KEY = 'relun.codeSignIn';

type Saved = { method: ContactMethod; countryCode: string; contact: string; step: 1 | 2; sentAt: number };

const readSaved = (method: ContactMethod): Saved | null => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SAVED_KEY) ?? 'null') as Saved | null;
    if (!saved || saved.method !== method) return null;
    if (saved.step === 2 && Date.now() - saved.sentAt > CODE_LIFETIME_MS) return { ...saved, step: 1 };
    return saved;
  } catch {
    return null;
  }
};

const writeSaved = (saved: Saved | null) => {
  try {
    if (saved) sessionStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    else sessionStorage.removeItem(SAVED_KEY);
  } catch {
    // Storage blocked: a reload just starts over, as before.
  }
};

const resendLeft = (sentAt: number) => Math.max(0, RESEND_SECONDS - Math.floor((Date.now() - sentAt) / 1000));

/** Port of Android CodeSignInViewModel. */
export function useCodeSignInViewModel(initialMethod: 'phone' | 'email') {
  const method: ContactMethod = initialMethod === 'email' ? 'email' : 'phone';
  const [initial] = useState(() => readSaved(method));
  const [state, setStateRaw] = useState<CodeSignInState>(() => ({
    method,
    countryCode: initial?.countryCode ?? COUNTRY_CODES[0],
    contact: initial?.contact ?? '',
    step: initial?.step ?? 1,
    code: '',
    codeError: null,
    sendError: null,
    busy: false,
    resendIn: initial?.step === 2 ? resendLeft(initial.sentAt) : 0,
  }));
  // Mirror of the latest state so actions read it synchronously, like StateFlow.value.
  const ref = useRef(state);
  const sentAt = useRef(initial?.sentAt ?? 0);
  const alive = useRef(true);
  const countdown = useRef<ReturnType<typeof setInterval> | null>(null);

  const update = (fn: (s: CodeSignInState) => CodeSignInState) => {
    if (!alive.current) return;
    ref.current = fn(ref.current);
    setStateRaw(ref.current);
    const s = ref.current;
    writeSaved({ method: s.method, countryCode: s.countryCode, contact: s.contact, step: s.step, sentAt: sentAt.current });
  };

  const stopCountdown = () => {
    if (countdown.current) clearInterval(countdown.current);
    countdown.current = null;
  };

  useEffect(() => {
    alive.current = true;
    // Back from a reload mid-countdown: carry on from where it was.
    if (ref.current.step === 2 && ref.current.resendIn > 0) startCountdown(ref.current.resendIn);
    return () => {
      alive.current = false;
      stopCountdown();
    };
  }, []);

  const startCountdown = (seconds = RESEND_SECONDS) => {
    stopCountdown();
    update((s) => ({ ...s, resendIn: seconds }));
    countdown.current = setInterval(() => {
      if (ref.current.resendIn <= 0) {
        stopCountdown();
        return;
      }
      update((s) => ({ ...s, resendIn: s.resendIn - 1 }));
      if (ref.current.resendIn <= 0) stopCountdown();
    }, 1000);
  };

  const verify = async () => {
    const s = ref.current;
    if (s.code.length !== 6 || s.busy) return;
    update((x) => ({ ...x, busy: true }));
    try {
      const outcome = await auth.verifyCode(s.method, normalizedContact(s), s.code);
      writeSaved(null);
      if (outcome.needsProfile) auth.enterOnboarding('segment');
      else if (outcome.needsPhotos) auth.enterOnboarding('photos');
      else auth.finishOnboarding();
    } catch (e) {
      const message =
        e instanceof ApiException && e.status === 401
          ? 'That code is wrong or has expired. Try again or resend.'
          : (e as Error)?.message || 'Couldn’t verify the code.';
      update((x) => ({ ...x, busy: false, codeError: message }));
    }
  };

  const actions = {
    setMethod: (method: ContactMethod) => update((s) => ({ ...s, method, contact: '', sendError: null })),
    nextCountryCode: () =>
      update((s) => ({
        ...s,
        countryCode: COUNTRY_CODES[(COUNTRY_CODES.indexOf(s.countryCode) + 1) % COUNTRY_CODES.length],
      })),
    setContact: (value: string) => update((s) => ({ ...s, contact: value.slice(0, 80), sendError: null })),
    setCode: (value: string) => {
      const digits = digitsOf(value).slice(0, 6);
      update((s) => ({ ...s, code: digits, codeError: null }));
      if (digits.length === 6) void verify();
    },
    async sendCode() {
      const s = ref.current;
      if (!contactValid(s) || s.busy) return;
      update((x) => ({ ...x, busy: true, sendError: null }));
      try {
        await auth.requestCode(s.method, normalizedContact(s));
        sentAt.current = Date.now();
        update((x) => ({ ...x, busy: false, step: 2, code: '', codeError: null }));
        startCountdown();
      } catch (e) {
        update((x) => ({ ...x, busy: false, sendError: (e as Error)?.message ?? null }));
      }
    },
    async resend() {
      const s = ref.current;
      update((x) => ({ ...x, code: '', codeError: null }));
      try {
        await auth.requestCode(s.method, normalizedContact(s));
        sentAt.current = Date.now();
        messenger.info('New code sent');
        if (alive.current) startCountdown();
      } catch (e) {
        messenger.error((e as Error)?.message || 'Couldn’t resend the code.');
      }
    },
    changeContact: () => {
      stopCountdown();
      update((s) => ({ ...s, step: 1, code: '', codeError: null }));
    },
    verify: () => void verify(),
  };

  return { state, ...actions };
}

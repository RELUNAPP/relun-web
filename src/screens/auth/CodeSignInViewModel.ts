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

/** Port of Android CodeSignInViewModel. */
export function useCodeSignInViewModel(initialMethod: 'phone' | 'email') {
  const [state, setStateRaw] = useState<CodeSignInState>(() => ({
    method: initialMethod === 'email' ? 'email' : 'phone',
    countryCode: COUNTRY_CODES[0],
    contact: '',
    step: 1,
    code: '',
    codeError: null,
    sendError: null,
    busy: false,
    resendIn: 0,
  }));
  // Mirror of the latest state so actions read it synchronously, like StateFlow.value.
  const ref = useRef(state);
  const alive = useRef(true);
  const countdown = useRef<ReturnType<typeof setInterval> | null>(null);

  const update = (fn: (s: CodeSignInState) => CodeSignInState) => {
    if (!alive.current) return;
    ref.current = fn(ref.current);
    setStateRaw(ref.current);
  };

  const stopCountdown = () => {
    if (countdown.current) clearInterval(countdown.current);
    countdown.current = null;
  };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopCountdown();
    };
  }, []);

  const startCountdown = () => {
    stopCountdown();
    update((s) => ({ ...s, resendIn: 45 }));
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

import { create } from 'zustand';
import type { DialogSpec } from '../components/Controls';
import type { PendingBonusDto } from '../data/dtos';
import { firstName, type Person } from '../data/models';
import { ApiException } from '../data/network';
import { api } from '../data/network';
import { chat, coins, people, safety } from '../data/repositories';
import { getApp, messenger } from '../data/store';
import { Emitter } from '../util/emitter';
import { openPaystack } from '../util/paystack';

/*
 * The signed-in shell: tab selection, the coin and safety sheets, the match
 * celebration, and the purchase flow. Port of Android MainViewModel; screens
 * reach it through useAppActions().
 */

export type Tab = 'discover' | 'dates' | 'messages' | 'me';

export type MainSheet =
  /** `then` is the person whose chat the user was trying to unlock, if any. */
  | { kind: 'coins'; then: Person | null }
  | { kind: 'unlock'; person: Person }
  | { kind: 'insights' }
  | { kind: 'more'; person: Person }
  | { kind: 'bonus'; bonus: PendingBonusDto };

export type NavEvent = { type: 'openChat'; userId: string; name: string } | { type: 'backToMain' };

type ShellState = {
  tab: Tab;
  sheet: MainSheet | null;
  match: Person | null;
  dialog: DialogSpec | null;
  selectedPackage: number;
  buying: boolean;
  unlocking: boolean;
  /** Bumped to ask the Dates tab to show "My Dates". */
  showMyDates: number;
  /** Bumped to ask the Messages tab to show "Likes You". */
  showLikes: number;
};

const initial: ShellState = {
  tab: 'discover',
  sheet: null,
  match: null,
  dialog: null,
  selectedPackage: 1,
  buying: false,
  unlocking: false,
  showMyDates: 0,
  showLikes: 0,
};

export const useShell = create<ShellState>(() => initial);
const set = useShell.setState;
const get = useShell.getState;

export const shellNav = new Emitter<NavEvent>();

people.newMatches.on((p) => set({ match: p }));

const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message) || fallback;

export const shell = {
  reset: () => set(initial),
  selectTab: (tab: Tab) => set({ tab }),
  showDates: () => set((s) => ({ tab: 'dates', showMyDates: s.showMyDates + 1 })),
  showLikes: () => set((s) => ({ tab: 'messages', showLikes: s.showLikes + 1 })),

  openCoins(then: Person | null = null) {
    set({ sheet: { kind: 'coins', then } });
    void coins.refresh().catch(() => {});
  },
  openInsights: () => set({ sheet: { kind: 'insights' } }),
  openMore: (person: Person) => set({ sheet: { kind: 'more', person } }),
  closeSheet() {
    const sheet = get().sheet;
    if (sheet?.kind === 'bonus') void coins.markBonusSeen(sheet.bonus.id);
    set({ sheet: null, buying: false });
  },
  /** Shows the "you got coins" sheet once the main screen has nothing else open. */
  offerBonus(bonus: PendingBonusDto | null) {
    const s = get();
    if (bonus && !s.sheet && !s.match) set({ sheet: { kind: 'bonus', bonus } });
  },
  dismissMatch: () => set({ match: null }),
  dismissDialog: () => set({ dialog: null }),
  showDialog: (spec: DialogSpec) => set({ dialog: spec }),
  selectPackage: (index: number) => set({ selectedPackage: index }),

  /** Opens the chat if it is already paid for; otherwise asks to unlock it. */
  async openChat(person: Person) {
    set({ match: null });
    if (person.chatUnlocked) {
      shellNav.emit({ type: 'openChat', userId: person.id, name: person.name });
      return;
    }
    // The card may be stale; ask the server before charging anything.
    const fresh = await people.person(person.id).catch(() => person);
    if (!fresh.isMatch) messenger.info(`You can message ${firstName(person)} once you match.`);
    else if (fresh.chatUnlocked) shellNav.emit({ type: 'openChat', userId: fresh.id, name: fresh.name });
    else set({ sheet: { kind: 'unlock', person: fresh } });
  },

  async unlock(person: Person) {
    const wallet = getApp().wallet;
    if (wallet.balance < wallet.chatUnlockCost) {
      shell.openCoins(person);
      return;
    }
    set({ unlocking: true });
    try {
      const res = await coins.unlockChat(person.id);
      set({ unlocking: false, sheet: null });
      if (res.charged > 0) messenger.success(`Chat with ${firstName(person)} unlocked · −${res.charged} coins`);
      people.emit({ type: 'chatUnlocked', userId: person.id });
      shellNav.emit({ type: 'openChat', userId: person.id, name: person.name });
    } catch (e) {
      set({ unlocking: false });
      if (e instanceof ApiException && e.isInsufficientCoins) shell.openCoins(person);
      else messenger.error(errorText(e, 'Couldn’t unlock this chat.'));
    }
  },

  async buyInsights() {
    const wallet = getApp().wallet;
    if (wallet.balance < wallet.insightsCost) {
      shell.openCoins();
      return;
    }
    try {
      await coins.buyInsights();
      set({ sheet: null });
      messenger.success('Likes & Views unlocked for 30 days');
      people.emit({ type: 'insightsUnlocked' });
    } catch (e) {
      messenger.error(errorText(e, 'Couldn’t unlock insights.'));
    }
  },

  /** Paystack checkout for the selected pack; Android uses Play Billing here. */
  async buy() {
    const pkg = getApp().wallet.packages[get().selectedPackage];
    if (!pkg || get().buying) return;
    set({ buying: true });
    try {
      const init = await api.paystackInitialize(pkg.productId);
      const result = await openPaystack(init.accessCode);
      if (result.kind === 'cancelled') {
        set({ buying: false });
        return;
      }
      const credited = await coins.confirmPaystack(result.reference);
      const sheet = get().sheet;
      const then = sheet?.kind === 'coins' ? sheet.then : null;
      set({ buying: false, sheet: then ? { kind: 'unlock', person: then } : null });
      if (credited > 0) messenger.success(`${credited} coins added`);
    } catch (e) {
      set({ buying: false });
      if (e instanceof ApiException && e.code === 'PURCHASE_NOT_VERIFIED') {
        messenger.info('Your payment is pending. Coins arrive as soon as it clears.');
      } else {
        messenger.error(errorText(e, 'Payment failed. Try again.'));
      }
    }
  },

  confirmReport: (person: Person) =>
    set({
      sheet: null,
      dialog: {
        title: `Report ${firstName(person)}?`,
        body: 'We review every report within 24 hours. They won’t know it was you.',
        confirm: 'Send report',
        destructive: true,
        icon: null,
        onConfirm: () => {
          safety
            .report(person.id, 'other', null)
            .then(() => messenger.success('Report sent. Thanks for keeping Relun safe.'))
            .catch((e) => messenger.error(errorText(e, 'Couldn’t send the report.')));
        },
      },
    }),

  confirmBlock: (person: Person) =>
    set({
      sheet: null,
      dialog: {
        title: `Block ${firstName(person)}?`,
        body: 'They won’t be able to see your profile or message you. You can unblock in Settings.',
        confirm: 'Block',
        destructive: true,
        onConfirm: () => {
          safety
            .block(person.id)
            .then(() => {
              messenger.info(`${firstName(person)} is blocked. They can’t see or message you.`);
              shellNav.emit({ type: 'backToMain' });
              chat.refreshUnread();
            })
            .catch((e) => messenger.error(errorText(e, 'Couldn’t block.')));
        },
      },
    }),
};

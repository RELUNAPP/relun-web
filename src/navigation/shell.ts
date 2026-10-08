import { create } from 'zustand';
import type { DialogSpec } from '../components/Controls';
import type { PendingBonusDto } from '../data/dtos';
import { firstName, type Person } from '../data/models';
import { ApiException } from '../data/network';
import { api } from '../data/network';
import { chat, coins, people, plus, safety } from '../data/repositories';
import { getApp, messenger } from '../data/store';
import { Emitter } from '../util/emitter';
import { openPaystack } from '../util/paystack';

/*
 * The signed-in shell: tab selection, the coin, Plus and safety sheets, the
 * match celebration, and the purchase flows. Port of Android MainViewModel; screens
 * reach it through useAppActions().
 */

export type Tab = 'discover' | 'dates' | 'messages' | 'me';

export type MainSheet =
  /** `then` is the sheet to go back to once coins are bought, e.g. the request the user was writing. */
  | { kind: 'coins'; then: MainSheet | null }
  /** Messaging someone without a match. */
  | { kind: 'request'; person: Person }
  /** Likes & Views: Plus, or a coin pass. */
  | { kind: 'insights' }
  /** Relun Plus: plans, or the user's own status. */
  | { kind: 'plus' }
  /** Out of free likes for today. */
  | { kind: 'likeLimit' }
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
  /** Plus being paid for or cancelled. */
  plusBusy: boolean;
  /** Likes & Views pass being bought. */
  buyingInsights: boolean;
  /** The message request being written; kept while the user tops up coins. */
  requestDraft: string;
  sendingRequest: boolean;
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
  plusBusy: false,
  buyingInsights: false,
  requestDraft: '',
  sendingRequest: false,
  showMyDates: 0,
  showLikes: 0,
};

export const useShell = create<ShellState>(() => initial);
const set = useShell.setState;
const get = useShell.getState;

export const shellNav = new Emitter<NavEvent>();

people.newMatches.on((p) => set({ match: p }));
people.likeLimitReached.on(() => {
  if (!get().sheet) set({ sheet: { kind: 'likeLimit' } });
});

const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message) || fallback;

export const shell = {
  reset: () => set(initial),
  selectTab: (tab: Tab) => set({ tab }),
  showDates: () => set((s) => ({ tab: 'dates', showMyDates: s.showMyDates + 1 })),
  showLikes: () => set((s) => ({ tab: 'messages', showLikes: s.showLikes + 1 })),

  openCoins(then: MainSheet | null = null) {
    set({ sheet: { kind: 'coins', then } });
    void coins.refresh().catch(() => {});
  },
  openInsights: () => set({ sheet: { kind: 'insights' } }),
  openPlus() {
    set({ sheet: { kind: 'plus' } });
    void coins.refresh().catch(() => {});
  },
  openMore: (person: Person) => set({ sheet: { kind: 'more', person } }),
  closeSheet() {
    const sheet = get().sheet;
    if (sheet?.kind === 'bonus') void coins.markBonusSeen(sheet.bonus.id);
    set({ sheet: null, buying: false, plusBusy: false });
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

  /**
   * Opens the chat with a match or over a message request; for anyone else,
   * offers to send a request.
   */
  async openChat(person: Person) {
    set({ match: null });
    if (person.isMatch || person.messageRequest) {
      shellNav.emit({ type: 'openChat', userId: person.id, name: person.name });
      return;
    }
    // The card may be stale; ask the server before offering to charge anything.
    const fresh = await people.person(person.id).catch(() => person);
    if (fresh.isMatch || fresh.messageRequest) shellNav.emit({ type: 'openChat', userId: fresh.id, name: fresh.name });
    else if (fresh.acceptsMessageRequests) set({ sheet: { kind: 'request', person: fresh }, requestDraft: '' });
    else messenger.info(`${firstName(fresh)} only gets messages from matches. Like them, and you can chat once they like you back.`);
  },

  setRequestDraft: (text: string) => set({ requestDraft: text.slice(0, 1000) }),

  async sendRequest(person: Person) {
    const text = get().requestDraft.trim();
    if (!text || get().sendingRequest) return;
    const wallet = getApp().wallet;
    const free = (wallet.requests.left ?? 0) > 0;
    if (!free && wallet.balance < wallet.messageRequestCost) {
      shell.openCoins({ kind: 'request', person });
      return;
    }
    set({ sendingRequest: true });
    try {
      const res = await chat.sendRequest(person, text);
      set({ sendingRequest: false, sheet: null, requestDraft: '' });
      if (res.matched) messenger.success(`It's a match! ${firstName(person)} already liked you`);
      else if (res.charged > 0) messenger.success(`Message sent to ${firstName(person)} · −${res.charged} coins`);
      else messenger.success(`Message sent to ${firstName(person)} · free`);
      shellNav.emit({ type: 'openChat', userId: person.id, name: person.name });
    } catch (e) {
      set({ sendingRequest: false });
      if (e instanceof ApiException && e.isInsufficientCoins) shell.openCoins({ kind: 'request', person });
      else if (e instanceof ApiException && (e.code === 'REQUEST_EXISTS' || e.code === 'ALREADY_MATCHED')) {
        set({ sheet: null });
        shellNav.emit({ type: 'openChat', userId: person.id, name: person.name });
      } else messenger.error(errorText(e, 'Couldn’t send your message.'));
    }
  },

  /** Likes & Views for coins, for people who'd rather not subscribe. */
  async buyInsights(days: 7 | 30) {
    const wallet = getApp().wallet;
    if (wallet.balance < (days === 7 ? wallet.insights7Cost : wallet.insights30Cost)) {
      shell.openCoins({ kind: 'insights' });
      return;
    }
    if (get().buyingInsights) return;
    set({ buyingInsights: true });
    try {
      await coins.buyInsights(days);
      set({ sheet: null, buyingInsights: false });
      messenger.success(`Likes & Views unlocked for ${days} days`);
      people.emit({ type: 'insightsUnlocked' });
    } catch (e) {
      set({ buyingInsights: false });
      if (e instanceof ApiException && e.isInsufficientCoins) shell.openCoins({ kind: 'insights' });
      else messenger.error(errorText(e, 'Couldn’t unlock Likes & Views.'));
    }
  },

  /**
   * Paystack checkout for Plus. renew: an auto-renewing card plan; otherwise a
   * one-time pass that can be paid by card, transfer or USSD.
   */
  async buyPlus(planId: 'weekly' | 'monthly', renew: boolean) {
    if (get().plusBusy) return;
    set({ plusBusy: true });
    try {
      const init = await api.plusInitialize(planId, renew);
      const result = await openPaystack(init.accessCode);
      if (result.kind === 'cancelled') {
        set({ plusBusy: false });
        return;
      }
      await plus.confirmPaystack(result.reference);
      set({ plusBusy: false, sheet: null });
      messenger.success('Welcome to Relun Plus');
    } catch (e) {
      set({ plusBusy: false });
      if (e instanceof ApiException && e.code === 'PURCHASE_NOT_VERIFIED') {
        messenger.info('Your payment is pending. Plus starts as soon as it clears.');
      } else {
        messenger.error(errorText(e, 'Payment failed. Try again.'));
      }
    }
  },

  confirmCancelPlus: () =>
    set({
      dialog: {
        title: 'Turn off auto-renew?',
        body: 'You keep Relun Plus until the end of the period you’ve paid for. It won’t renew after that.',
        confirm: 'Turn off',
        destructive: true,
        icon: null,
        onConfirm: () => {
          set({ plusBusy: true });
          plus
            .cancel()
            .then(() => messenger.info('Auto-renew is off'))
            .catch((e) => messenger.error(errorText(e, 'Couldn’t turn off auto-renew.')))
            .finally(() => set({ plusBusy: false }));
        },
      },
    }),

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
      set({ buying: false, sheet: then });
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

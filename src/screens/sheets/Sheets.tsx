import { useState, type CSSProperties } from 'react';
import { LinkButton, OutlineButton, PrimaryButton } from '../../components/Buttons';
import { RelunSheet, Switch } from '../../components/Controls';
import { Icon } from '../../components/Icon';
import { RelunTextField } from '../../components/Inputs';
import { useSegment } from '../../components/segment';
import { Avatar, CoinIcon } from '../../components/Visuals';
import type { CoinPackageDto, PendingBonusDto } from '../../data/dtos';
import { firstName, initialOf, mainPhotoUrl, type Person, type PlusPlan, type Wallet } from '../../data/models';
import { RelunColors, T } from '../../theme';
import { formatCoins, formatMoney } from '../../util/format';

/** Paystack price when the server sends one; the USD figure is only a fallback. */
const priceOf = (pkg: CoinPackageDto): string =>
  pkg.paystackAmount != null && pkg.paystackCurrency
    ? formatMoney(pkg.paystackAmount, pkg.paystackCurrency)
    : `$${pkg.priceUsd.toFixed(2)}`;

const center: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' };

export function CoinsSheet(props: {
  wallet: Wallet;
  selected: number;
  buying: boolean;
  onSelect: (i: number) => void;
  onBuy: () => void;
  onDismiss: () => void;
}) {
  const { wallet, selected, buying, onSelect, onBuy, onDismiss } = props;
  const seg = useSegment();
  const rows: CoinPackageDto[][] = [];
  wallet.packages.forEach((p, i) => (i % 2 === 0 ? rows.push([p]) : rows[rows.length - 1].push(p)));
  const pkg = wallet.packages[selected] as CoinPackageDto | undefined;

  return (
    <RelunSheet onDismiss={onDismiss}>
      <span style={{ ...T.headlineSmall, color: RelunColors.Ink }}>Get Coins</span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          width: '100%',
          borderRadius: 20,
          background: RelunColors.CoinPanel,
          border: `1px solid ${RelunColors.CoinPanelBorder}`,
          padding: 16,
        }}
      >
        <CoinIcon size={48} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={{ ...T.bodySmall, color: RelunColors.WarningText }}>Your balance</span>
          <span style={{ ...T.headlineMedium, color: RelunColors.Ink }}>{formatCoins(wallet.balance)}</span>
        </div>
        {wallet.balance < wallet.messageRequestCost && (
          <span style={{ ...T.labelSmall, color: RelunColors.Error, borderRadius: 999, background: RelunColors.ErrorFill, padding: '4px 10px' }}>
            Low
          </span>
        )}
      </div>
      <span style={{ ...T.labelMedium, fontSize: 15, color: RelunColors.Ink }}>Select a Package</span>
      {rows.map((pair, row) => (
        <div key={row} style={{ display: 'flex', gap: 10 }}>
          {pair.map((p, col) => {
            const index = row * 2 + col;
            const on = index === selected;
            return (
              <div key={p.id ?? p.productId} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <button
                  type="button"
                  className="press"
                  aria-pressed={on}
                  onClick={() => onSelect(index)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 4,
                    borderRadius: 20,
                    background: on ? seg.tint : '#FFFFFF',
                    border: `2px solid ${on ? seg.fill : RelunColors.Border}`,
                    padding: '16px 14px',
                    textAlign: 'left',
                    color: RelunColors.Ink,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CoinIcon size={20} />
                    <span style={T.titleMedium}>{formatCoins(p.coins)}</span>
                  </span>
                  <span style={{ ...T.bodyMedium, color: RelunColors.Body }}>{priceOf(p)}</span>
                </button>
                {p.best && (
                  <span
                    style={{
                      ...T.labelSmall,
                      fontSize: 11,
                      color: '#FFFFFF',
                      position: 'absolute',
                      top: -10,
                      right: 12,
                      borderRadius: 999,
                      background: RelunColors.Ink,
                      padding: '3px 9px',
                      pointerEvents: 'none',
                    }}
                  >
                    Best Value
                  </span>
                )}
              </div>
            );
          })}
          {pair.length === 1 && <div style={{ flex: 1 }} />}
        </div>
      ))}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Perk icon="mark_chat_unread" text={`Message someone without matching · ${wallet.messageRequestCost} coins`} />
        <Perk icon="visibility" text={`See Likes & Views · ${wallet.insights7Cost} coins / 7 days`} />
      </div>
      <PrimaryButton
        text={pkg ? `Buy ${formatCoins(pkg.coins)} coins · ${priceOf(pkg)}` : 'Loading packages…'}
        onClick={onBuy}
        enabled={pkg != null}
        loading={buying}
        loadingText="Waiting for Paystack…"
      />
      <span style={{ ...T.bodySmall, fontSize: 12, color: RelunColors.Muted, textAlign: 'center', width: '100%' }}>
        Prices in your local currency. Charged through Paystack.
      </span>
    </RelunSheet>
  );
}

function Perk({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon name={icon} outline size={16} color={RelunColors.Body} />
      <span style={{ ...T.bodySmall, fontSize: 14, color: RelunColors.Body }}>{text}</span>
    </div>
  );
}

/**
 * Messaging someone without a match. Free while the weekly (or Plus monthly)
 * allowance lasts; after that it costs coins, and says plainly that the coins
 * are gone even if they decline or never answer.
 */
export function MessageRequestSheet(props: {
  person: Person;
  wallet: Wallet;
  draft: string;
  sending: boolean;
  onDraft: (text: string) => void;
  onSend: () => void;
  onPlus: () => void;
  onDismiss: () => void;
}) {
  const { person, wallet, draft, sending, onDraft, onSend, onPlus, onDismiss } = props;
  const name = firstName(person);
  const cost = wallet.messageRequestCost;
  const freeLeft = wallet.requests.left ?? 0;
  const free = freeLeft > 0;
  const enough = free || wallet.balance >= cost;
  // The allowance resets on Lagos time: Monday for the free one, the 1st for Plus.
  const resetAt = wallet.requests.resetAt;
  const usedUp = wallet.plus
    ? `You’ve used your ${wallet.requests.limit ?? wallet.plusPerks.monthlyRequests} Plus message requests this month.${
        resetAt ? ` More on ${resetAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })}.` : ''
      }`
    : `You’ve used your free message request this week.${
        resetAt ? ` Your next free one is on ${resetAt.toLocaleDateString(undefined, { weekday: 'long', timeZone: 'Africa/Lagos' })}.` : ''
      }`;
  const small: CSSProperties = { ...T.bodySmall, fontSize: 14, color: RelunColors.Body, whiteSpace: 'pre' };
  return (
    <RelunSheet onDismiss={onDismiss}>
      <div style={center}>
        <Avatar url={mainPhotoUrl(person)} seed={person.id} initial={initialOf(person)} size={80} />
        <span style={{ ...T.titleLarge, color: RelunColors.Ink, textAlign: 'center' }}>{`Message ${name} without matching?`}</span>
        <span style={{ ...T.bodyMedium, color: RelunColors.Muted, textAlign: 'center' }}>
          {`You can send up to 3 messages. If ${name} replies, you match and keep chatting for free.`}
        </span>
      </div>
      <RelunTextField
        value={draft}
        onChange={onDraft}
        placeholder={`Say something to ${name}…`}
        singleLine={false}
        minLines={3}
        maxLength={1000}
        autoFocus
      />
      {free ? (
        <div
          style={{
            display: 'flex',
            gap: 8,
            width: '100%',
            borderRadius: 14,
            background: RelunColors.SuccessFill,
            padding: '12px 14px',
          }}
        >
          <Icon name="redeem" size={17} color={RelunColors.SuccessText} style={{ marginTop: 1 }} />
          <span style={{ ...T.bodySmall, lineHeight: '18px', color: RelunColors.SuccessText }}>
            {wallet.plus
              ? `Free with Relun Plus · ${freeLeft} of ${wallet.requests.limit} left this month.`
              : 'Free: you get 1 free message request a week.'}
          </span>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: 8,
            width: '100%',
            borderRadius: 14,
            background: RelunColors.WarningFill,
            padding: '12px 14px',
          }}
        >
          <Icon name="info" size={17} color={RelunColors.WarningText} style={{ marginTop: 1 }} />
          <span style={{ ...T.bodySmall, lineHeight: '18px', color: RelunColors.WarningText }}>
            {`This costs ${cost} coins. Coins are not refunded if ${name} declines or doesn’t reply.`}
          </span>
        </div>
      )}
      {!free && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          <span style={{ ...T.bodySmall, color: RelunColors.Body }}>{usedUp}</span>
          {!wallet.plus && wallet.plans.length > 0 && (
            <button
              type="button"
              className="press-plain"
              onClick={onPlus}
              style={{ ...T.bodySmall, fontWeight: 600, color: RelunColors.Ink, textAlign: 'left', textDecoration: 'underline' }}
            >
              {`Get ${wallet.plusPerks.monthlyRequests} free message requests a month with Relun Plus`}
            </button>
          )}
        </div>
      )}
      <div style={{ ...center, gap: 10 }}>
        {!free && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={small}>{'Balance '}</span>
            <span style={{ ...T.labelMedium, color: RelunColors.Ink }}>{formatCoins(wallet.balance)}</span>
            <span style={small}>{' coins'}</span>
          </div>
        )}
        <PrimaryButton
          text={free ? 'Send for free' : enough ? `Send for ${cost} coins` : 'Top Up'}
          onClick={onSend}
          enabled={!enough || /\S/.test(draft)}
          loading={sending}
        />
        <LinkButton text="Not now" onClick={onDismiss} style={{ width: '100%' }} />
      </div>
    </RelunSheet>
  );
}

/**
 * Likes & Views: Relun Plus (cheaper, and more), or a coin pass for people who
 * would rather not subscribe.
 */
export function InsightsSheet(props: {
  wallet: Wallet;
  buying: boolean;
  onPlus: () => void;
  onBuy: (days: 7 | 30) => void;
  onDismiss: () => void;
}) {
  const { wallet, buying, onPlus, onBuy, onDismiss } = props;
  const seg = useSegment();
  const weekly = wallet.plans.find((p) => p.id === 'weekly');
  const small: CSSProperties = { ...T.bodySmall, fontSize: 14, color: RelunColors.Body, whiteSpace: 'pre' };
  return (
    <RelunSheet onDismiss={onDismiss}>
      <div style={center}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: seg.tint,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="favorite" size={30} color={seg.text} />
        </div>
        <span style={{ ...T.titleLarge, color: RelunColors.Ink, textAlign: 'center' }}>See who likes you</span>
        <span style={{ ...T.bodyMedium, color: RelunColors.Muted, textAlign: 'center' }}>
          See who liked you and who viewed your profile.
        </span>
      </div>
      <button
        type="button"
        className="press"
        onClick={onPlus}
        style={{
          width: '100%',
          borderRadius: 20,
          border: `2px solid ${seg.fill}`,
          background: seg.tint,
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textAlign: 'left',
        }}
      >
        <Icon name="workspace_premium" size={28} color={seg.text} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ ...T.titleSmall, color: RelunColors.Ink }}>Get Relun Plus</span>
          <span style={{ ...T.bodySmall, color: RelunColors.Body }}>
            {`Likes & Views, unlimited likes and free message requests${weekly ? ` · from ${formatMoney(weekly.amount, weekly.currency)}/week` : ''}`}
          </span>
        </div>
        <Icon name="chevron_right" size={22} color={seg.text} />
      </button>
      <span style={{ ...T.labelMedium, fontSize: 15, color: RelunColors.Ink }}>Or use coins</span>
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        {([7, 30] as const).map((days) => {
          const cost = days === 7 ? wallet.insights7Cost : wallet.insights30Cost;
          return (
            <button
              key={days}
              type="button"
              className="press"
              disabled={buying}
              onClick={() => onBuy(days)}
              style={{
                flex: 1,
                borderRadius: 18,
                border: `1.5px solid ${RelunColors.Border}`,
                background: '#FFFFFF',
                padding: '14px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ ...T.titleSmall, color: RelunColors.Ink }}>{`${days} days`}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CoinIcon size={18} />
                <span style={{ ...T.labelMedium, color: RelunColors.Ink }}>{formatCoins(cost)}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ ...center, gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={small}>{'Balance '}</span>
          <span style={{ ...T.labelMedium, color: RelunColors.Ink }}>{formatCoins(wallet.balance)}</span>
          <span style={small}>{' coins'}</span>
        </div>
        <LinkButton text="Not now" onClick={onDismiss} style={{ width: '100%' }} />
      </div>
    </RelunSheet>
  );
}

const shortDate = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });


/**
 * Relun Plus. Without it: the perks, the two plans, and on the web the choice
 * between an auto-renewing card plan and a one-time pass (card, transfer or
 * USSD). With it: what it is, when it renews or ends, and turning renewal off.
 */
export function PlusSheet(props: {
  wallet: Wallet;
  busy: boolean;
  onBuy: (plan: 'weekly' | 'monthly', renew: boolean) => void;
  onCancelRenew: () => void;
  onDismiss: () => void;
}) {
  const { wallet, busy, onBuy, onCancelRenew, onDismiss } = props;
  const seg = useSegment();
  const plus = wallet.plus;
  const [planId, setPlanId] = useState<'weekly' | 'monthly'>('monthly');
  const plan = wallet.plans.find((p) => p.id === planId) ?? wallet.plans[0];
  const [renewChoice, setRenew] = useState(true);
  const renew = renewChoice && !!plan?.autoRenewAvailable;
  const canBuy = !plus?.autoRenew;
  const period = (p: PlusPlan) => (p.id === 'weekly' ? 'week' : 'month');

  return (
    <RelunSheet onDismiss={onDismiss}>
      <div style={center}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: seg.fill,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="workspace_premium" size={32} color={seg.onFill} />
        </div>
        <span style={{ ...T.titleLarge, color: RelunColors.Ink, textAlign: 'center' }}>Relun Plus</span>
      </div>

      {plus && (
        <div
          style={{
            width: '100%',
            borderRadius: 18,
            background: RelunColors.SuccessFill,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{ ...T.titleSmall, color: RelunColors.SuccessText }}>
            {`You’re on Plus · ${plus.plan === 'weekly' ? 'Weekly' : 'Monthly'}`}
          </span>
          <span style={{ ...T.bodySmall, color: RelunColors.SuccessText }}>
            {plus.autoRenew ? `Renews ${shortDate(plus.until)}` : `Ends ${shortDate(plus.until)}`}
            {plus.source === 'play' ? ' · Manage it in Google Play' : ''}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        <Perk icon="favorite" text="Unlimited likes" />
        <Perk icon="visibility" text="See who likes you and who viewed you" />
        <Perk icon="mark_chat_unread" text={`${wallet.plusPerks.monthlyRequests} free message requests a month`} />
        <Perk icon="event" text={`Up to ${wallet.plusPerks.activeDates} date plans live at once`} />
      </div>

      {canBuy && plan && (
        <>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            {wallet.plans.map((p) => {
              const on = p.id === plan.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className="press"
                  onClick={() => setPlanId(p.id)}
                  aria-pressed={on}
                  style={{
                    flex: 1,
                    position: 'relative',
                    borderRadius: 18,
                    border: `2px solid ${on ? seg.fill : RelunColors.Border}`,
                    background: on ? seg.tint : '#FFFFFF',
                    // Room for the "Best value" tag, which sits inside the card (buttons clip overflow).
                    padding: '30px 12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {p.id === 'monthly' && (
                    <span
                      style={{
                        ...T.labelSmall,
                        fontSize: 10,
                        color: seg.onFill,
                        background: seg.fill,
                        borderRadius: 999,
                        padding: '2px 8px',
                        position: 'absolute',
                        top: 8,
                      }}
                    >
                      Best value
                    </span>
                  )}
                  <span style={{ ...T.labelMedium, color: RelunColors.Body }}>{p.id === 'weekly' ? 'Weekly' : 'Monthly'}</span>
                  <span style={{ ...T.titleMedium, color: RelunColors.Ink }}>{formatMoney(p.amount, p.currency)}</span>
                  <span style={{ ...T.bodySmall, fontSize: 12, color: RelunColors.Muted }}>{`per ${period(p)}`}</span>
                </button>
              );
            })}
          </div>

          {plan.autoRenewAvailable && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ ...T.titleSmall, fontSize: 15, color: RelunColors.Ink }}>Renew automatically</span>
                <span style={{ ...T.bodySmall, color: RelunColors.Muted }}>
                  {renew
                    ? `Charged to your card each ${period(plan)}. Cancel anytime.`
                    : 'Pay once by card, bank transfer or USSD. Doesn’t renew.'}
                </span>
              </div>
              <Switch checked={renew} onToggle={() => setRenew(!renewChoice)} label="Renew automatically" />
            </div>
          )}

          <PrimaryButton
            text={
              renew
                ? `Subscribe · ${formatMoney(plan.amount, plan.currency)}/${period(plan)}`
                : `${plus ? 'Add' : 'Get'} ${plan.days} days · ${formatMoney(plan.amount, plan.currency)}`
            }
            onClick={() => onBuy(plan.id, renew)}
            loading={busy}
          />
        </>
      )}

      {plus?.autoRenew && plus.source === 'paystack' && (
        <OutlineButton text={busy ? 'Turning off…' : 'Turn off auto-renew'} onClick={onCancelRenew} height={48} />
      )}
      <LinkButton text={plus ? 'Close' : 'Not now'} onClick={onDismiss} style={{ width: '100%' }} />
    </RelunSheet>
  );
}

/** Out of free likes for today: when they come back, and Plus for unlimited. */
export function LikeLimitSheet(props: { wallet: Wallet; onPlus: () => void; onDismiss: () => void }) {
  const { wallet, onPlus, onDismiss } = props;
  const seg = useSegment();
  const resetAt = wallet.likes.resetAt;
  const ms = resetAt ? resetAt.getTime() - Date.now() : 0;
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.max(1, Math.floor((ms % 3_600_000) / 60_000));
  const when = !resetAt || ms <= 0 ? 'soon' : hours > 0 ? `in ${hours}h ${minutes}m` : `in ${minutes}m`;
  return (
    <RelunSheet onDismiss={onDismiss}>
      <div style={center}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: seg.tint,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="heart_broken" size={30} color={seg.text} />
        </div>
        <span style={{ ...T.titleLarge, color: RelunColors.Ink, textAlign: 'center' }}>You’re out of likes for today</span>
        <span style={{ ...T.bodyMedium, color: RelunColors.Muted, textAlign: 'center' }}>
          {`You get ${wallet.likes.limit ?? 15} free likes a day. New ones arrive ${when}.`}
        </span>
        <PrimaryButton text="Get unlimited likes with Plus" onClick={onPlus} leadingIcon="workspace_premium" />
        <LinkButton text="Not now" onClick={onDismiss} style={{ width: '100%' }} />
      </div>
    </RelunSheet>
  );
}

/**
 * "You got coins": shown once on the main screen after signup (or a gift), with
 * what coins are for. Closing it in any way marks the bonus as seen.
 */
export function WelcomeCoinsSheet(props: { bonus: PendingBonusDto; wallet: Wallet; onDismiss: () => void }) {
  const { bonus, wallet, onDismiss } = props;
  const coins = formatCoins(bonus.coins);
  const signup = bonus.kind === 'signup';
  return (
    <RelunSheet onDismiss={onDismiss}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 28,
            background: RelunColors.CoinPanel,
            border: `1px solid ${RelunColors.CoinPanelBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CoinIcon size={56} />
        </div>
        <span style={{ ...T.titleLarge, textAlign: 'center', marginTop: 6 }}>
          {signup ? `Welcome gift: ${coins} coins` : `You got ${coins} coins`}
        </span>
        <span style={{ ...T.bodyMedium, color: RelunColors.Muted, textAlign: 'center' }}>
          {signup
            ? `Here are ${coins} coins on us to help you get started. They’re already in your balance.`
            : 'A gift from Relun. They’re already in your balance.'}
        </span>
      </div>
      <span style={{ ...T.labelMedium, fontSize: 15, marginTop: 4 }}>What coins are for</span>
      <CoinUse
        icon="mark_chat_unread"
        title="Message without matching"
        body={`Send someone a message request before you match. ${wallet.messageRequestCost} coins.`}
      />
      <CoinUse
        icon="visibility"
        title="See who likes you"
        body={`Who liked you and who viewed your profile. ${wallet.insights7Cost} coins for 7 days.`}
      />
      <PrimaryButton text="Start exploring" onClick={onDismiss} style={{ marginTop: 4 }} />
    </RelunSheet>
  );
}

function CoinUse({ icon, title, body }: { icon: string; title: string; body: string }) {
  const seg = useSegment();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', borderRadius: 18, background: RelunColors.ChipFill, padding: 14 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: seg.tint,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={icon} outline size={20} color={seg.text} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ ...T.titleSmall }}>{title}</span>
        <span style={{ ...T.bodySmall, color: RelunColors.Body }}>{body}</span>
      </div>
    </div>
  );
}

export function MoreSheet(props: { person: Person; onReport: () => void; onBlock: () => void; onDismiss: () => void }) {
  const { person, onReport, onBlock, onDismiss } = props;
  return (
    <RelunSheet onDismiss={onDismiss}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <SheetAction icon="flag" text={`Report ${firstName(person)}`} color={RelunColors.Ink} onClick={onReport} />
        <SheetAction icon="block" text={`Block ${firstName(person)}`} color={RelunColors.Error} onClick={onBlock} />
      </div>
      <OutlineButton text="Cancel" onClick={onDismiss} height={52} />
    </RelunSheet>
  );
}

function SheetAction({ icon, text, color, onClick }: { icon: string; text: string; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="press"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        minHeight: 56,
        borderRadius: 12,
        padding: '0 4px',
        color,
        textAlign: 'left',
      }}
    >
      <Icon name={icon} outline size={22} color={color} />
      <span style={{ ...T.bodyLarge, fontWeight: 500, color }}>{text}</span>
    </button>
  );
}

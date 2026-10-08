import type { CSSProperties } from 'react';
import { LinkButton, OutlineButton, PrimaryButton } from '../../components/Buttons';
import { RelunSheet } from '../../components/Controls';
import { Icon } from '../../components/Icon';
import { useSegment } from '../../components/segment';
import { Avatar, CoinIcon } from '../../components/Visuals';
import type { CoinPackageDto, PendingBonusDto } from '../../data/dtos';
import { firstName, initialOf, mainPhotoUrl, type Person, type Wallet } from '../../data/models';
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
        {wallet.balance < wallet.chatUnlockCost && (
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
        <Perk icon="chat_bubble" text={`Start a chat with a match · ${wallet.chatUnlockCost} coins`} />
        <Perk icon="visibility" text={`See Likes & Views · ${wallet.insightsCost} coins / 30 days`} />
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

export function UnlockChatSheet(props: {
  person: Person;
  wallet: Wallet;
  unlocking: boolean;
  onUnlock: () => void;
  onDismiss: () => void;
}) {
  const { person, wallet, unlocking, onUnlock, onDismiss } = props;
  const enough = wallet.balance >= wallet.chatUnlockCost;
  const small: CSSProperties = { ...T.bodySmall, fontSize: 14, color: RelunColors.Body, whiteSpace: 'pre' };
  return (
    <RelunSheet onDismiss={onDismiss}>
      <div style={center}>
        <Avatar url={mainPhotoUrl(person)} seed={person.id} initial={initialOf(person)} size={80} />
        <span style={{ ...T.titleLarge, color: RelunColors.Ink, textAlign: 'center' }}>Start Conversation?</span>
        <span style={{ ...T.bodyMedium, color: RelunColors.Muted, textAlign: 'center' }}>
          {`Unlock chat with ${firstName(person)} for ${wallet.chatUnlockCost} coins. It stays open for good, for both of you.`}
        </span>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={small}>{'Balance '}</span>
          <span style={{ ...T.labelMedium, color: RelunColors.Ink }}>{formatCoins(wallet.balance)}</span>
          <span style={small}>{' coins'}</span>
        </div>
        {!enough && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              borderRadius: 14,
              background: RelunColors.ErrorFill,
              padding: 10,
            }}
          >
            <Icon name="error" size={16} color={RelunColors.Error} />
            <span style={{ ...T.bodySmall, fontSize: 14, fontWeight: 500, color: RelunColors.Error, whiteSpace: 'pre' }}>
              {'  Not enough coins'}
            </span>
          </div>
        )}
        <PrimaryButton text={enough ? `Unlock for ${wallet.chatUnlockCost} coins` : 'Top Up'} onClick={onUnlock} loading={unlocking} />
        <LinkButton text="Not now" onClick={onDismiss} style={{ width: '100%' }} />
      </div>
    </RelunSheet>
  );
}

export function InsightsSheet(props: { wallet: Wallet; onUnlock: () => void; onDismiss: () => void }) {
  const { wallet, onUnlock, onDismiss } = props;
  const seg = useSegment();
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
          Unlock Who Liked You and Profile Views for 30 days.
        </span>
        <PrimaryButton
          text={wallet.balance >= wallet.insightsCost ? `Unlock for ${wallet.insightsCost} coins` : 'Get coins to unlock'}
          onClick={onUnlock}
        />
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
      <CoinUse icon="chat_bubble" title="Start a chat" body={`Unlock a conversation with a match. ${wallet.chatUnlockCost} coins, open for good.`} />
      <CoinUse icon="visibility" title="See who likes you" body={`Who liked you and who viewed your profile, for 30 days. ${wallet.insightsCost} coins.`} />
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

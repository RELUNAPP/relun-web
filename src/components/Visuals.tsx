import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { RelunColors, SegmentColorSets, T } from '../theme';
import { formatCoins } from '../util/format';
import { Icon } from './Icon';
import { useSegment } from './segment';

let ringsId = 0;

/**
 * The Relun mark: a rose ring (Relationship) linked with an orange one (Fun).
 * Same drawing as the launcher icon and favicon; `width` is the width of both rings.
 */
export function RingsMark({ width, style }: { width: number; style?: CSSProperties }) {
  const [clip] = useState(() => `rings-top-${++ringsId}`);
  const rose = SegmentColorSets.relationship.fill;
  const orange = SegmentColorSets.fun.fill;
  return (
    <svg width={width} height={(width * 51) / 73} viewBox="17.5 28.5 73 51" aria-hidden style={{ display: 'block', flexShrink: 0, ...style }}>
      <defs>
        <clipPath id={clip}>
          <path d="M43 0H108V54H43Z" />
        </clipPath>
      </defs>
      <g fill="none" strokeWidth={9}>
        <circle cx={43} cy={54} r={21} stroke={rose} />
        <circle cx={65} cy={54} r={21} stroke={orange} />
        {/* Linked: rose passes over orange at the top crossing, under it at the bottom. */}
        <circle cx={43} cy={54} r={21} stroke={rose} clipPath={`url(#${clip})`} />
      </g>
    </svg>
  );
}

/** The single coin mark: a gold disc with a star. */
export function CoinIcon({ size = 24 }: { size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(circle, ${RelunColors.CoinLight} 0%, ${RelunColors.Coin} 55%, ${RelunColors.CoinDark} 100%)`,
        border: `${Math.max(size / 16, 1)}px solid ${RelunColors.CoinRim}`,
      }}
    >
      <Icon name="star" size={size * 0.48} color={RelunColors.CoinText} />
    </span>
  );
}

/** Balance pill in the Discover header. Turns red when a chat unlock is no longer affordable. */
export function CoinPill({ balance, low, onClick, style }: { balance: number; low: boolean; onClick: () => void; style?: CSSProperties }) {
  return (
    <button
      type="button"
      className="press"
      onClick={onClick}
      aria-label={`${balance} coins`}
      style={{
        height: 40,
        borderRadius: 999,
        background: low ? RelunColors.ErrorFill : '#FFFFFF',
        border: `1px solid ${low ? RelunColors.ErrorBorder : '#EDEDED'}`,
        padding: '0 12px 0 6px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
        ...style,
      }}
    >
      <CoinIcon size={26} />
      <span style={{ ...T.labelMedium, fontSize: 15, color: low ? RelunColors.Error : RelunColors.Ink }}>{formatCoins(balance)}</span>
    </button>
  );
}

export function SegmentPill({ text, small = false, style }: { text?: string; small?: boolean; style?: CSSProperties }) {
  const s = useSegment();
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        borderRadius: 999,
        background: s.tint,
        padding: small ? '3px 9px 3px 7px' : '5px 12px 5px 10px',
        alignSelf: 'flex-start',
        ...style,
      }}
    >
      <Icon name={s.icon} size={small ? 12 : 14} color={s.text} />
      <span style={{ color: s.text, fontFamily: 'Outfit', fontWeight: 600, fontSize: small ? 11 : 13 }}>{text ?? s.pill}</span>
    </span>
  );
}

/** Java's String.hashCode, so a person gets the same colour as on Android. */
const javaHash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
};

const hsv = (h: number, s: number, v: number): string => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return `rgb(${f(5)},${f(3)},${f(1)})`;
};

/**
 * Soft two-tone gradient used where a photo is missing or still loading. Stable
 * per person, so the same person always gets the same colour.
 */
export const placeholderBrush = (seed: string, step = 0): string => {
  const hue = ((Math.abs(javaHash(seed)) % 360) + step * 45) % 360;
  const top = hsv(hue, 0.22, 0.9);
  const bottom = hsv((hue + 25) % 360, 0.42, 0.62);
  // Compose draws it from (0,0) to (400,900) px regardless of size.
  return `linear-gradient(156deg, ${top} 0px, ${bottom} 985px)`;
};

/**
 * A person's photo with a stable gradient and initial behind it. If the image
 * fails, shows "Photo unavailable" instead of a blank box.
 */
export function PersonPhoto({
  url,
  seed,
  initial,
  style,
  radius = 16,
  initialSize = 44,
  step = 0,
  blur = false,
  failureLabel = 'Photo unavailable',
  children,
}: {
  url: string | null | undefined;
  seed: string;
  initial: string;
  style?: CSSProperties;
  radius?: number | string;
  initialSize?: number;
  step?: number;
  blur?: boolean;
  failureLabel?: string | null;
  children?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: radius,
        background: placeholderBrush(seed, step),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      {!url || failed ? (
        failed && failureLabel != null ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#E3E3E3',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Icon name="broken_image" size={22} color={RelunColors.Muted} />
            <span style={{ color: RelunColors.Muted, fontSize: 11, fontFamily: 'Outfit' }}>{failureLabel}</span>
          </div>
        ) : !blur ? (
          <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Outfit', fontWeight: 700, fontSize: initialSize }}>{initial}</span>
        ) : null
      ) : (
        <img
          src={url}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: blur ? 'blur(28px)' : undefined,
            transform: blur ? 'scale(1.15)' : undefined,
          }}
        />
      )}
      {children}
    </div>
  );
}

export const Avatar = ({
  url,
  seed,
  initial,
  size,
  style,
}: {
  url: string | null | undefined;
  seed: string;
  initial: string;
  size: number;
  style?: CSSProperties;
}) => (
  <PersonPhoto
    url={url}
    seed={seed}
    initial={initial}
    radius="50%"
    initialSize={size * 0.38}
    failureLabel={null}
    style={{ width: size, height: size, ...style }}
  />
);

/** Animated grey shimmer for loading placeholders. */
export const Shimmer = ({ style, radius = 16 }: { style?: CSSProperties; radius?: number | string }) => (
  <div className="shimmer" style={{ borderRadius: radius, ...style }} />
);

export function EmptyState({
  icon,
  title,
  body,
  error = false,
  outline = false,
  action,
  style,
}: {
  icon: string;
  /** Icons.Outlined.* on Android. */
  outline?: boolean;
  title: string;
  body?: string | null;
  error?: boolean;
  action?: ReactNode;
  style?: CSSProperties;
}) {
  const s = useSegment();
  return (
    <div
      style={{
        width: '100%',
        padding: '60px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        ...style,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 24,
          background: error ? RelunColors.ErrorFill : s.tint,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={34} outline={outline} color={error ? RelunColors.Error : s.text} />
      </div>
      <span style={{ ...T.titleMedium, color: RelunColors.Ink, marginTop: 6, textAlign: 'center' }}>{title}</span>
      {body && <span style={{ ...T.bodyMedium, color: RelunColors.Muted, textAlign: 'center' }}>{body}</span>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export const SectionHeader = ({ text, style }: { text: string; style?: CSSProperties }) => (
  <span style={{ ...T.sectionLabel, color: RelunColors.Muted, display: 'block', ...style }}>{text.toUpperCase()}</span>
);

export function IconTile({
  icon,
  size = 40,
  background = '#FFFFFF',
  tint = RelunColors.Ink,
  outline = false,
  style,
}: {
  icon: string;
  size?: number;
  background?: string;
  tint?: string;
  outline?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background,
        border: `0.5px solid ${RelunColors.BorderSoft}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      <Icon name={icon} size={size / 2} color={tint} outline={outline} />
    </div>
  );
}

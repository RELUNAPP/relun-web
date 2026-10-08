import type { CSSProperties, ReactNode } from 'react';
import { RelunColors, T } from '../theme';
import { useSegment } from './segment';
import { Icon, Spinner } from './Icon';

type PrimaryProps = {
  text: string;
  onClick: () => void;
  style?: CSSProperties;
  enabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  container?: string;
  content?: string;
  leadingIcon?: string;
  /** Icons.Outlined.* on Android. */
  leadingIconOutline?: boolean;
  height?: number;
  type?: 'button' | 'submit';
};

/** Filled 54px button. Defaults to the segment accent; pass colours for ink or white variants. */
export function PrimaryButton({
  text,
  onClick,
  style,
  enabled = true,
  loading = false,
  loadingText,
  container,
  content,
  leadingIcon,
  leadingIconOutline = false,
  height = 54,
  type = 'button',
}: PrimaryProps) {
  const s = useSegment();
  const active = enabled && !loading;
  const bg = active ? (container ?? s.fill) : RelunColors.Disabled;
  const fg = active ? (content ?? s.onFill) : RelunColors.DisabledText;
  return (
    <button
      type={type}
      className="press"
      disabled={!active}
      onClick={onClick}
      style={{
        width: '100%',
        height,
        borderRadius: 16,
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        flexShrink: 0,
        ...T.labelLarge,
        ...style,
      }}
    >
      {loading ? <Spinner size={18} color={fg} /> : leadingIcon ? <Icon name={leadingIcon} size={20} color={fg} outline={leadingIconOutline} /> : null}
      <span>{loading && loadingText ? loadingText : text}</span>
    </button>
  );
}

/** Black button used before a segment exists (sign-in) and on neutral screens. */
export const InkButton = (props: Omit<PrimaryProps, 'container' | 'content'>) => (
  <PrimaryButton {...props} container={RelunColors.Ink} content="#FFFFFF" />
);

/** White button with a 1.5px border. */
export function OutlineButton({
  text,
  onClick,
  style,
  leadingIcon,
  leadingIconOutline = false,
  height = 54,
  textColor = RelunColors.Ink,
}: {
  text: string;
  onClick: () => void;
  style?: CSSProperties;
  leadingIcon?: string;
  /** Icons.Outlined.* on Android. */
  leadingIconOutline?: boolean;
  height?: number;
  textColor?: string;
}) {
  return (
    <button
      type="button"
      className="press"
      onClick={onClick}
      style={{
        width: '100%',
        height,
        borderRadius: 16,
        background: '#FFFFFF',
        border: `1.5px solid ${RelunColors.Border}`,
        color: textColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        flexShrink: 0,
        ...T.labelLarge,
        ...style,
      }}
    >
      {leadingIcon && <Icon name={leadingIcon} size={20} color={textColor} outline={leadingIconOutline} />}
      <span>{text}</span>
    </button>
  );
}

/** Plain text action, 44px tall for touch. */
export function LinkButton({
  text,
  onClick,
  style,
  color = RelunColors.Ink,
  underline = false,
  textStyle = { fontFamily: 'Outfit', fontWeight: 600, fontSize: 15 },
}: {
  text: string;
  onClick: () => void;
  style?: CSSProperties;
  color?: string;
  underline?: boolean;
  textStyle?: CSSProperties;
}) {
  return (
    <button
      type="button"
      className="press"
      onClick={onClick}
      style={{
        height: 44,
        borderRadius: 8,
        padding: '0 6px',
        color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...textStyle,
        textDecoration: underline ? 'underline' : undefined,
        ...style,
      }}
    >
      {text}
    </button>
  );
}

export type CircleStyle = 'raised' | 'outlined' | 'glass' | 'flat';

/** 44px round icon button: back, settings, more, close. */
export function CircleIconButton({
  icon,
  label,
  onClick,
  style,
  variant = 'outlined',
  size = 44,
  iconSize = 20,
  tint,
  outline = false,
  children,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  style?: CSSProperties;
  variant?: CircleStyle;
  size?: number;
  iconSize?: number;
  tint?: string;
  outline?: boolean;
  children?: ReactNode;
}) {
  const color = tint ?? (variant === 'glass' ? '#FFFFFF' : RelunColors.Ink);
  const look: CSSProperties =
    variant === 'raised'
      ? { background: '#FFFFFF', border: `0.5px solid ${RelunColors.BorderSoft}` }
      : variant === 'outlined'
        ? { background: '#FFFFFF', border: '1px solid #EDEDED' }
        : variant === 'glass'
          ? { background: 'rgba(0,0,0,0.35)' }
          : {};
  return (
    <button
      type="button"
      className="press"
      aria-label={label}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color,
        ...look,
        ...style,
      }}
    >
      <Icon name={icon} size={iconSize} color={color} outline={outline} />
      {children}
    </button>
  );
}

export const BackButton = ({
  onClick,
  style,
  variant = 'raised',
}: {
  onClick: () => void;
  style?: CSSProperties;
  variant?: CircleStyle;
}) => <CircleIconButton icon="arrow_back_ios_new" label="Back" onClick={onClick} style={style} variant={variant} iconSize={18} />;

import type { CSSProperties } from 'react';

/**
 * Material Symbols Rounded. Android's Icons.Rounded.X is `<Icon name="x" />`
 * (filled) and Icons.Outlined.X is `<Icon name="x" outline />`. Names are the
 * snake_case symbol names, e.g. ChatBubbleOutline → "chat_bubble" outline.
 */
export function Icon({
  name,
  size = 24,
  color,
  outline = false,
  style,
  label,
}: {
  name: string;
  size?: number;
  color?: string;
  outline?: boolean;
  style?: CSSProperties;
  /** Accessible name; icons are decorative when omitted. */
  label?: string;
}) {
  return (
    <span
      className={outline ? 'ms ms-outline' : 'ms'}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      style={{ fontSize: size, width: size, height: size, color, ...style }}
    >
      {name}
    </span>
  );
}

export function Spinner({ size = 18, color = 'currentColor', stroke = 2 }: { size?: number; color?: string; stroke?: number }) {
  return (
    <span
      className="spinner"
      role="progressbar"
      style={{ width: size, height: size, borderWidth: stroke, borderColor: color, display: 'inline-block' }}
    />
  );
}

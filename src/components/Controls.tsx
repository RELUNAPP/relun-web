import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useApp, type Toast } from '../data/store';
import { RelunColors, T } from '../theme';
import { LinkButton, PrimaryButton } from './Buttons';
import { Icon } from './Icon';
import { useSegment } from './segment';

/** Renders above everything inside the phone column (sheets, dialogs, overlays). */
export function Overlay({ children }: { children: ReactNode }) {
  const root = document.getElementById('overlay-root');
  return root ? createPortal(children, root) : <>{children}</>;
}

/** Closes on Escape, like the Android back gesture on a sheet or dialog. */
const useEscape = (onEscape: () => void) => {
  const ref = useRef(onEscape);
  ref.current = onEscape;
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && ref.current();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
};

/** Grey track with a white pill on the selected option. */
export function SegmentedControl<V extends string>({
  options,
  selected,
  onSelect,
  style,
}: {
  options: [V, string][];
  selected: V;
  onSelect: (value: V) => void;
  style?: CSSProperties;
}) {
  return (
    <div
      role="tablist"
      style={{ display: 'flex', gap: 4, width: '100%', borderRadius: 14, background: RelunColors.Track, padding: 4, ...style }}
    >
      {options.map(([value, label]) => {
        const on = value === selected;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(value)}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 11,
              background: on ? '#FFFFFF' : 'transparent',
              boxShadow: on ? '0 1px 2px rgba(0,0,0,0.12)' : undefined,
              color: on ? RelunColors.Ink : RelunColors.Muted,
              ...T.labelMedium,
              fontSize: 15,
              transition: 'background 0.15s ease',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** White rounded card holding settings-style rows. */
export const RowGroup = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      width: '100%',
      borderRadius: 24,
      background: '#FFFFFF',
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(70,30,20,0.10)',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}
  >
    {children}
  </div>
);

export function ListRow({
  title,
  onClick,
  leading,
  subtitle,
  value,
  showChevron = onClick != null,
  titleColor = RelunColors.Ink,
  divider = true,
  trailing,
  style,
}: {
  title: string;
  onClick?: (() => void) | null;
  leading?: ReactNode;
  subtitle?: string | null;
  value?: string | null;
  showChevron?: boolean;
  titleColor?: string;
  divider?: boolean;
  trailing?: ReactNode;
  style?: CSSProperties;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Tag
        type={onClick ? 'button' : undefined}
        className={onClick ? 'press' : undefined}
        onClick={onClick ?? undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          width: '100%',
          minHeight: 56,
          padding: '8px 16px',
          textAlign: 'left',
          color: RelunColors.Ink,
          ...style,
        }}
      >
        {leading}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ ...T.bodyLarge, fontSize: 16, fontWeight: 500, color: titleColor }}>{title}</span>
          {subtitle && <span style={{ ...T.bodySmall, color: RelunColors.Muted }}>{subtitle}</span>}
        </div>
        {value && <span style={{ ...T.bodyMedium, color: RelunColors.Muted }}>{value}</span>}
        {trailing}
        {showChevron && <Icon name="keyboard_arrow_right" size={20} color={RelunColors.Faint} />}
      </Tag>
      {divider && <div style={{ height: 1, background: RelunColors.Divider }} />}
    </div>
  );
}

/** Material 3 switch in the segment colour. */
export function Switch({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label?: string }) {
  const s = useSegment();
  return (
    <span
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      style={{ background: checked ? s.fill : '#D6D6D6', cursor: 'pointer' }}
    >
      <span />
    </span>
  );
}

export const ToggleRow = ({
  title,
  checked,
  onToggle,
  subtitle,
  divider = true,
}: {
  title: string;
  checked: boolean;
  onToggle: () => void;
  subtitle?: string;
  divider?: boolean;
}) => (
  <ListRow
    title={title}
    subtitle={subtitle}
    onClick={onToggle}
    showChevron={false}
    divider={divider}
    trailing={<Switch checked={checked} onToggle={onToggle} label={title} />}
  />
);

export type DialogSpec = {
  title: string;
  body: string;
  confirm: string;
  destructive?: boolean;
  /** Material Symbols name; shown in a green tile. */
  icon?: string | null;
  onConfirm: () => void;
};

export function ConfirmDialog({ spec, onDismiss }: { spec: DialogSpec; onDismiss: () => void }) {
  const s = useSegment();
  useEscape(onDismiss);
  return (
    <Overlay>
      <div
        className="anim-fade-in"
        onClick={onDismiss}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 60,
          background: 'rgba(0,0,0,0.32)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          role="alertdialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 360,
            borderRadius: 24,
            background: '#FFFFFF',
            padding: '24px 20px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            animation: 'dialog-in 200ms cubic-bezier(0.2,0,0,1) both',
          }}
        >
          {spec.icon && (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: RelunColors.SuccessFill,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={spec.icon} size={28} color={RelunColors.SuccessText} />
            </div>
          )}
          <span style={{ ...T.titleMedium, textAlign: 'center' }}>{spec.title}</span>
          <span style={{ ...T.bodyMedium, color: RelunColors.Body, textAlign: 'center' }}>{spec.body}</span>
          <div style={{ height: 2 }} />
          <PrimaryButton
            text={spec.confirm}
            onClick={() => {
              onDismiss();
              spec.onConfirm();
            }}
            height={50}
            container={spec.destructive ? RelunColors.Error : s.fill}
            content={spec.destructive ? '#FFFFFF' : s.onFill}
          />
          <LinkButton text="Cancel" onClick={onDismiss} style={{ width: '100%' }} textStyle={{ ...T.labelLarge, fontSize: 16 }} />
        </div>
      </div>
    </Overlay>
  );
}

/** Bottom sheet with the design's 32px corners and drag handle. */
export function RelunSheet({ onDismiss, children }: { onDismiss: () => void; children: ReactNode }) {
  const [closing, setClosing] = useState(false);
  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onDismiss, 220);
  };
  useEscape(close);
  return (
    <Overlay>
      <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
        <div
          onClick={close}
          style={{
            position: 'absolute',
            inset: 0,
            background: RelunColors.Scrim,
            animation: `${closing ? 'fade-out' : 'fade-in'} 220ms ease both`,
          }}
        />
        <div
          role="dialog"
          aria-modal="true"
          className="scroll"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: 'calc(100% - 48px)',
            background: '#FFFFFF',
            borderRadius: '32px 32px 0 0',
            animation: `${closing ? 'sheet-down' : 'sheet-up'} ${closing ? 220 : 320}ms cubic-bezier(0.2,0,0,1) both`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
            <div style={{ width: 40, height: 5, borderRadius: 3, background: '#DADADA' }} />
          </div>
          <div
            className="nav-pad"
            style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 20px 24px', width: '100%' }}
          >
            {children}
          </div>
        </div>
      </div>
    </Overlay>
  );
}

export function OfflineBanner({ text, style }: { text: string; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        borderRadius: 14,
        background: RelunColors.Ink,
        padding: '12px 14px',
        ...style,
      }}
    >
      <Icon name="cloud_off" size={18} color="#FFFFFF" />
      <span style={{ ...T.bodySmall, fontSize: 14, color: '#FFFFFF' }}>{text}</span>
    </div>
  );
}

export function InfoNote({
  text,
  icon,
  background = '#F1F1F1',
  color = RelunColors.Body,
  style,
}: {
  text: ReactNode;
  icon: string;
  background?: string;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, width: '100%', borderRadius: 14, background, padding: '12px 14px', ...style }}>
      <Icon name={icon} size={17} color={color} style={{ marginTop: 1 }} />
      <span style={{ ...T.bodySmall, lineHeight: '18px', color }}>{text}</span>
    </div>
  );
}

const TOAST_LOOK: Record<Toast['kind'], [string, string]> = {
  success: ['check_circle', '#3DDC84'],
  error: ['error', '#FF8A80'],
  warning: ['warning', '#FFC94D'],
  info: ['info', '#8AB4FF'],
};

/** Dark banner that drops in from the top for 2.8s. */
export function ToastHost() {
  const toast = useApp((s) => s.toast);
  const [visible, setVisible] = useState<Toast | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(toast);
    setLeaving(false);
    const hide = setTimeout(() => setLeaving(true), 2800);
    return () => clearTimeout(hide);
  }, [toast]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setVisible(null), 250);
    return () => clearTimeout(t);
  }, [leaving]);

  if (!visible) return null;
  const [icon, tint] = TOAST_LOOK[visible.kind];
  return (
    <div
      className="status-pad"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, pointerEvents: 'none' }}
    >
      <div
        role="status"
        onClick={() => setLeaving(true)}
        style={{
          pointerEvents: 'auto',
          margin: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 16,
          background: RelunColors.Ink,
          boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
          padding: '14px 16px',
          cursor: 'pointer',
          animation: `${leaving ? 'toast-out' : 'toast-in'} 250ms cubic-bezier(0.2,0,0,1) both`,
        }}
      >
        <Icon name={icon} size={20} color={tint} />
        <span style={{ width: 10, flexShrink: 0 }} />
        <span style={{ ...T.bodySmall, fontSize: 14, lineHeight: '19px', color: '#FFFFFF' }}>{visible.text}</span>
      </div>
    </div>
  );
}

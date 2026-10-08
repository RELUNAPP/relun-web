import { useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import { RelunColors, T } from '../theme';
import { Icon } from './Icon';

/**
 * The one text input: 54px, 16px corners, grey border that turns ink on focus
 * and red on error. Multi-line when `singleLine` is false.
 */
export function RelunTextField({
  value,
  onChange,
  placeholder = '',
  isError = false,
  singleLine = true,
  minLines = 1,
  leading,
  trailing,
  textAlign = 'left',
  minHeight = 54,
  fill = '#FFFFFF',
  radius = 16,
  textStyle = { fontFamily: 'Outfit', fontWeight: 500, fontSize: 17 },
  style,
  inputMode,
  type = 'text',
  autoComplete,
  autoFocus,
  maxLength,
  onEnter,
  onFocusChange,
  inputProps,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isError?: boolean;
  singleLine?: boolean;
  minLines?: number;
  leading?: ReactNode;
  trailing?: ReactNode;
  textAlign?: 'left' | 'center';
  minHeight?: number;
  fill?: string;
  radius?: number;
  textStyle?: CSSProperties;
  style?: CSSProperties;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  type?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  maxLength?: number;
  /** Keyboard "done"/"next"/"send". */
  onEnter?: () => void;
  onFocusChange?: (focused: boolean) => void;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
}) {
  const [focused, setFocused] = useState(false);
  const border = isError ? RelunColors.Error : focused ? RelunColors.Ink : RelunColors.Border;
  const common = {
    value,
    placeholder,
    autoFocus,
    maxLength,
    onFocus: () => {
      setFocused(true);
      onFocusChange?.(true);
    },
    onBlur: () => {
      setFocused(false);
      onFocusChange?.(false);
    },
    style: { ...textStyle, color: RelunColors.Ink, textAlign, width: '100%', minWidth: 0 } as CSSProperties,
  };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: singleLine ? 'center' : 'flex-start',
        gap: 10,
        width: '100%',
        minHeight,
        background: fill,
        border: `1.5px solid ${border}`,
        borderRadius: radius,
        padding: singleLine ? '0 16px' : '14px 16px',
        transition: 'border-color 0.15s ease',
        ...style,
      }}
    >
      {leading}
      <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
        {singleLine ? (
          <input
            {...common}
            {...inputProps}
            type={type}
            inputMode={inputMode}
            autoComplete={autoComplete}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onEnter) {
                e.preventDefault();
                onEnter();
              }
            }}
            style={{ ...common.style, height: minHeight - 3 }}
          />
        ) : (
          <textarea
            {...common}
            rows={minLines}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...common.style, lineHeight: 1.4, fieldSizing: 'content' } as CSSProperties}
          />
        )}
      </div>
      {trailing}
    </div>
  );
}

export function FieldLabel({ text, trailing, style }: { text: string; trailing?: string; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', ...style }}>
      <span style={{ ...T.labelMedium, color: RelunColors.Ink }}>{text}</span>
      {trailing != null && <span style={{ ...T.bodySmall, color: RelunColors.Muted }}>{trailing}</span>}
    </div>
  );
}

export function ErrorLine({ text, style }: { text: string; style?: CSSProperties }) {
  return (
    <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, ...style }}>
      <Icon name="error" size={16} color={RelunColors.Error} />
      <span style={{ ...T.bodySmall, fontSize: 14, color: RelunColors.Error }}>{text}</span>
    </div>
  );
}

export function LabeledField({
  label,
  trailingLabel,
  error,
  children,
  style,
}: {
  label: string;
  trailingLabel?: string;
  error?: string | null;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      <FieldLabel text={label} trailing={trailingLabel} />
      {children}
      {error?.trim() ? <ErrorLine text={error} /> : null}
    </div>
  );
}

import type { CSSProperties, ReactNode } from 'react';
import { useSegment } from '../../components/segment';
import { RelunColors, T } from '../../theme';

/** Loading state shared by the data-driven tabs. */
export type LoadState = 'loading' | 'ready' | 'empty' | 'error';

/** Space reserved under scrolling tab content so the floating bar never hides the last item. */
export const TabBarClearance = 120;

/** Tab background: the segment wash fading into the page grey. */
export function TabSurface({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const s = useSegment();
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(to bottom, ${s.wash} 0px, ${RelunColors.Background} 315px) no-repeat, ${RelunColors.Background}`,
        backgroundSize: '100% 900px',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function TabTitle({
  title,
  below,
  actions,
  style,
}: {
  title: string;
  below?: ReactNode;
  actions?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px 14px 20px', ...style }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ ...T.headlineLarge, color: RelunColors.Ink }}>{title}</span>
        {below}
      </div>
      {actions}
    </div>
  );
}

import type { CSSProperties, ReactNode } from 'react';
import { CircleIconButton } from '../../components/Buttons';
import { useSegment } from '../../components/segment';
import { useApp } from '../../data/store';
import { useAppActions } from '../../navigation/actions';
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
      <NotificationBell />
      {actions}
    </div>
  );
}

/** The bell in every tab's header, with the unread count. */
function NotificationBell() {
  const actions = useAppActions();
  const seg = useSegment();
  const unread = useApp((s) => s.notificationsUnread);
  // The badge sits beside the button, not inside it: buttons clip overflow.
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <CircleIconButton
        icon="notifications"
        outline
        label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        onClick={actions.openNotifications}
      />
      {unread > 0 && (
        <span
          aria-hidden
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            borderRadius: 9,
            background: seg.fill,
            color: seg.onFill,
            border: `2px solid ${RelunColors.Background}`,
            fontSize: 10,
            fontWeight: 700,
            lineHeight: '14px',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </div>
  );
}

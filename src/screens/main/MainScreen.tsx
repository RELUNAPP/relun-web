import { Icon } from '../../components/Icon';
import { useSegment } from '../../components/segment';
import { useApp } from '../../data/store';
import { shell, useShell, type Tab } from '../../navigation/shell';
import { RelunColors, T } from '../../theme';
import { DatesTab } from '../dates/DatesTab';
import { DiscoverTab } from '../discover/DiscoverTab';
import { MeTab } from '../me/MeTab';
import { MessagesTab } from '../messages/MessagesTab';

/** Four tabs under a floating tab bar. Tab content stays put while pushed screens come and go. */
export function MainScreen() {
  const tab = useShell((s) => s.tab);
  const showMyDates = useShell((s) => s.showMyDates);
  const showLikes = useShell((s) => s.showLikes);
  const unread = useApp((s) => s.unreadTotal);

  return (
    <div style={{ position: 'absolute', inset: 0, background: RelunColors.Background }}>
      <div key={tab} className="anim-fade-in" style={{ position: 'absolute', inset: 0 }}>
        {tab === 'discover' && <DiscoverTab />}
        {tab === 'dates' && <DatesTab showMine={showMyDates} />}
        {tab === 'messages' && <MessagesTab showLikes={showLikes} />}
        {tab === 'me' && <MeTab />}
      </div>
      <TabBar selected={tab} unread={unread} onSelect={shell.selectTab} />
    </div>
  );
}

const TABS: { tab: Tab; label: string; icon: string }[] = [
  { tab: 'discover', label: 'Discover', icon: 'explore' },
  { tab: 'dates', label: 'Dates', icon: 'calendar_month' },
  { tab: 'messages', label: 'Messages', icon: 'chat_bubble' },
  { tab: 'me', label: 'Profile', icon: 'person' },
];

function TabBar({ selected, unread, onSelect }: { selected: Tab; unread: number; onSelect: (t: Tab) => void }) {
  const s = useSegment();
  return (
    <nav
      className="nav-pad"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', zIndex: 5 }}
    >
      <div
        role="tablist"
        style={{
          margin: '0 16px 12px',
          maxWidth: 520,
          width: '100%',
          height: 68,
          display: 'flex',
          alignItems: 'center',
          padding: '0 6px',
          borderRadius: 24,
          background: 'rgba(255,255,255,0.94)',
          border: '1px solid rgba(70,30,20,0.05)',
          boxShadow: '0 10px 30px rgba(70,30,20,0.22)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {TABS.map((spec) => {
          const on = spec.tab === selected;
          return (
            <button
              key={spec.tab}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={spec.label}
              onClick={() => onSelect(spec.tab)}
              style={{
                flex: 1,
                height: 60,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  position: 'relative',
                  width: 54,
                  height: 30,
                  borderRadius: 15,
                  background: on ? s.tint : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s ease',
                }}
              >
                <Icon name={spec.icon} size={22} outline={!on} color={on ? s.text : RelunColors.Muted} />
                {spec.tab === 'messages' && unread > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: 2,
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontWeight: 600,
                      lineHeight: '14px',
                      borderRadius: 9,
                      background: RelunColors.Error,
                      border: '2px solid #FFFFFF',
                      padding: '1px 6px',
                    }}
                  >
                    {unread}
                  </span>
                )}
              </span>
              <span
                style={{
                  ...T.labelSmall,
                  fontSize: 11,
                  fontWeight: on ? 600 : 500,
                  color: on ? s.text : RelunColors.Muted,
                  marginTop: 3,
                }}
              >
                {spec.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

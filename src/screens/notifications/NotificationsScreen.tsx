import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton, OutlineButton } from '../../components/Buttons';
import { useSegment } from '../../components/segment';
import { Avatar, EmptyState, IconTile, Shimmer } from '../../components/Visuals';
import type { NotificationDto, NotificationType } from '../../data/dtos';
import { inbox, people } from '../../data/repositories';
import { useAppActions } from '../../navigation/actions';
import { shell } from '../../navigation/shell';
import { RelunColors, T } from '../../theme';
import { formatShortAgo } from '../../util/format';

type Item = Omit<NotificationDto, 'createdAt'> & { createdAt: Date };

/** The icon for notifications without a person's photo. */
const ICONS: Record<NotificationType, string> = {
  match: 'favorite',
  like: 'favorite',
  view: 'visibility',
  message_request: 'mark_chat_unread',
  date_request: 'event',
  date_accepted: 'event_available',
  plus: 'workspace_premium',
  coins: 'paid',
};

/**
 * The list behind the bell: matches, likes, views, message and date requests,
 * and Plus or coin updates. Opening it marks everything read.
 */
export function NotificationsScreen() {
  const actions = useAppActions();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    inbox
      .list()
      .then((list) => {
        if (!alive) return;
        setItems(list);
        if (list.some((n) => !n.read)) void inbox.markAllRead();
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [attempt]);

  // Buying Likes & Views or Plus reveals who liked or viewed.
  useEffect(
    () => people.events.on((e) => (e.type === 'insightsUnlocked' || e.type === 'plusChanged') && setAttempt((a) => a + 1)),
    [],
  );

  const open = (n: Item) => {
    const userId = n.data.userId;
    switch (n.type) {
      case 'match':
      case 'message_request':
      case 'date_accepted':
        if (userId) navigate(`/chat/${userId}`, { state: { name: n.actor?.name ?? '' } });
        break;
      case 'like':
      case 'view':
        if (userId) actions.openProfile(userId);
        else actions.openInsights();
        break;
      case 'date_request':
        // Their own dates, where requests are answered.
        actions.back();
        shell.showDates();
        break;
      case 'plus':
        actions.openPlus();
        break;
      case 'coins':
        actions.openCoins();
        break;
    }
  };

  return (
    <div
      className="status-pad nav-pad"
      style={{ position: 'absolute', inset: 0, background: RelunColors.Background, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 16px 10px', flexShrink: 0 }}>
        <BackButton onClick={actions.back} />
        <span style={{ ...T.headlineSmall, color: RelunColors.Ink, paddingLeft: 12 }}>Notifications</span>
      </div>

      <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
        {failed && items == null ? (
          <EmptyState
            icon="error"
            outline
            title="Couldn’t load notifications"
            error
            action={
              <OutlineButton
                text="Try again"
                onClick={() => setAttempt((a) => a + 1)}
                leadingIcon="refresh"
                height={48}
                style={{ width: 180 }}
              />
            }
          />
        ) : items == null ? (
          [0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px' }}>
              <Shimmer radius="50%" style={{ width: 48, height: 48, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Shimmer radius={6} style={{ width: '55%', height: 12 }} />
                <Shimmer radius={5} style={{ width: '85%', height: 10 }} />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyState
            icon="notifications"
            outline
            title="No notifications yet"
            body="Matches, likes, message requests and date requests will show up here."
          />
        ) : (
          items.map((n) => <Row key={n.id} item={n} onClick={() => open(n)} />)
        )}
      </div>
    </div>
  );
}

function Row({ item, onClick }: { item: Item; onClick: () => void }) {
  const seg = useSegment();
  const unread = !item.read;
  return (
    <button
      type="button"
      className="press"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 20px',
        textAlign: 'left',
        background: unread ? seg.tint : 'transparent',
      }}
    >
      {item.actor ? (
        <Avatar url={item.actor.photoUrl} seed={item.actor.id} initial={(item.actor.name ?? '?').charAt(0).toUpperCase()} size={48} />
      ) : (
        <IconTile icon={ICONS[item.type]} size={48} background={seg.tint} tint={seg.text} style={{ borderRadius: '50%' }} />
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ ...T.titleSmall, fontWeight: unread ? 700 : 600, color: RelunColors.Ink }}>{item.title}</span>
        <span style={{ ...T.bodySmall, fontSize: 14, color: RelunColors.Body }}>{item.body}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <span style={{ ...T.bodySmall, fontSize: 12, color: RelunColors.Muted }}>{formatShortAgo(item.createdAt)}</span>
        {unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.fill }} />}
      </div>
    </button>
  );
}

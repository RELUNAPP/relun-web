import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { OutlineButton } from '../../components/Buttons';
import { InfoNote, OfflineBanner, SegmentedControl } from '../../components/Controls';
import { Icon } from '../../components/Icon';
import { useSegment } from '../../components/segment';
import { Avatar, EmptyState, PersonPhoto, SectionHeader, Shimmer, placeholderBrush } from '../../components/Visuals';
import { firstName, initialOf, mainPhotoUrl, type Person } from '../../data/models';
import { useAppActions } from '../../navigation/actions';
import { Outfit, RelunColors, T } from '../../theme';
import { formatShortAgo } from '../../util/format';
import { TabBarClearance, TabSurface, TabTitle } from '../main/TabCommon';
import { useMessagesViewModel, type ConversationRow, type MessagesState, type MessagesView } from './MessagesViewModel';

const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

export function MessagesTab({ showLikes }: { showLikes: number }) {
  const vm = useMessagesViewModel();
  const s = vm.state;
  const actions = useAppActions();
  const { pathname } = useLocation();

  // LaunchedEffect(showLikes)
  useEffect(() => vm.handleShowLikes(showLikes), [showLikes]); // eslint-disable-line react-hooks/exhaustive-deps

  // LifecycleEventEffect(ON_RESUME): on entering, on returning from a pushed screen, and on tab visibility.
  const wasTop = useRef(false);
  useEffect(() => {
    const top = pathname === '/';
    if (top && !wasTop.current) vm.resume();
    wasTop.current = top;
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && wasTop.current) vm.resume();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TabSurface>
      <div className="scroll status-pad" style={{ flex: 1, paddingBottom: TabBarClearance }}>
        <TabTitle title="Messages" />
        <div style={{ padding: '0 16px 16px' }}>
          <SegmentedControl<MessagesView>
            options={[
              ['matches', 'Matches'],
              ['likes', `Likes You · ${s.likesCount}`],
            ]}
            selected={s.view}
            onSelect={vm.setView}
          />
        </div>
        {s.offline && (
          <div style={{ padding: '0 16px 12px' }}>
            <OfflineBanner text="You’re offline. New messages will appear when you reconnect." />
          </div>
        )}

        {s.view === 'likes' ? (
          <LikesYou s={s} />
        ) : s.load === 'loading' ? (
          [0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)
        ) : s.load === 'empty' ? (
          <EmptyState
            icon="chat_bubble"
            outline
            title="No Matches Yet"
            body="Like people in Discover. When they like you back, they’ll show up here."
          />
        ) : s.load === 'error' ? (
          <EmptyState
            icon="error"
            outline
            title="Could not load matches"
            error
            action={
              <OutlineButton text="Try again" onClick={() => void vm.load()} style={{ width: 180 }} leadingIcon="refresh" height={48} />
            }
          />
        ) : (
          <>
            {s.requests.length > 0 && (
              <>
                <SectionHeader text={`Message requests · ${s.requests.length}`} style={{ paddingLeft: 20, paddingBottom: 8 }} />
                <div style={{ padding: '0 16px 4px' }}>
                  <InfoNote
                    icon="mark_chat_unread"
                    text={
                      <>
                        {'These people haven’t matched with you. Reply to match, or decline. '}
                        <button
                          type="button"
                          className="press-plain"
                          onClick={actions.openSettings}
                          style={{ ...T.bodySmall, lineHeight: '18px', fontWeight: 600, color: RelunColors.Ink, textDecoration: 'underline' }}
                        >
                          Turn off message requests
                        </button>
                      </>
                    }
                  />
                </div>
                {s.requests.map((row) => (
                  <ConversationItem
                    key={row.conversation.userId}
                    row={row}
                    onClick={() => row.person && actions.openChat(row.person)}
                  />
                ))}
                <div style={{ height: 14 }} />
              </>
            )}
            {s.newMatches.length > 0 && (
              <>
                <SectionHeader text="New matches" style={{ paddingLeft: 20, paddingBottom: 8 }} />
                <div className="hscroll" style={{ display: 'flex', gap: 14, padding: '4px 20px 18px' }}>
                  {s.newMatches.map((p) => (
                    <NewMatch key={p.id} person={p} onClick={() => actions.openChat(p)} />
                  ))}
                </div>
              </>
            )}
            {s.conversations.length > 0 ? (
              <>
                <SectionHeader text="Conversations" style={{ paddingLeft: 20, paddingBottom: 4 }} />
                {s.conversations.map((row) => (
                  <ConversationItem
                    key={row.conversation.userId}
                    row={row}
                    onClick={() => row.person && actions.openChat(row.person)}
                  />
                ))}
              </>
            ) : s.newMatches.length > 0 ? (
              <p style={{ ...T.bodyMedium, color: RelunColors.Muted, padding: '0 20px' }}>Tap a new match to start the conversation.</p>
            ) : null}
          </>
        )}
      </div>
    </TabSurface>
  );
}

function NewMatch({ person, onClick }: { person: Person; onClick: () => void }) {
  const seg = useSegment();
  return (
    <button
      type="button"
      className="press-plain"
      onClick={onClick}
      aria-label={`Message ${firstName(person)}`}
      style={{ width: 72, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
    >
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: seg.fill, padding: 3 }}>
        <Avatar
          url={mainPhotoUrl(person)}
          seed={person.id}
          initial={initialOf(person)}
          size={66}
          style={{ border: `3px solid ${RelunColors.Background}` }}
        />
      </div>
      <span style={{ ...T.bodySmall, fontWeight: 500, color: RelunColors.Ink, maxWidth: 72, ...ellipsis }}>{firstName(person)}</span>
    </button>
  );
}

function ConversationItem({ row, onClick }: { row: ConversationRow; onClick: () => void }) {
  const seg = useSegment();
  const c = row.conversation;
  const unread = c.unread > 0;
  const tag = !c.request
    ? null
    : !c.request.outgoing
      ? 'Request'
      : c.request.status === 'declined'
        ? 'Not accepted'
        : 'Request sent';
  const title = [c.name, row.person?.age?.toString()].filter((v): v is string => v != null).join(', ');
  return (
    <button
      type="button"
      className="press"
      onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', textAlign: 'left' }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar url={row.person ? mainPhotoUrl(row.person) : null} seed={c.userId} initial={c.name.slice(0, 1).toUpperCase()} size={58} />
        {row.person?.isOnline && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: 15,
              height: 15,
              borderRadius: '50%',
              background: RelunColors.Background,
              padding: 3,
            }}
          >
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: RelunColors.OnlineDot }} />
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
          <span style={{ ...T.titleSmall, color: RelunColors.Ink, flex: 1, minWidth: 0, ...ellipsis }}>{title}</span>
          <span style={{ ...T.bodySmall, fontSize: 12, color: RelunColors.Muted, flexShrink: 0 }}>{formatShortAgo(c.lastAt)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {tag && (
            <span
              style={{
                ...T.labelSmall,
                fontSize: 11,
                color: c.request?.status === 'declined' ? RelunColors.Muted : seg.text,
                background: c.request?.status === 'declined' ? RelunColors.ChipFill : seg.tint,
                borderRadius: 999,
                padding: '2px 8px',
                flexShrink: 0,
              }}
            >
              {tag}
            </span>
          )}
          <span
            style={{
              ...T.bodySmall,
              fontSize: 14,
              fontWeight: unread ? 600 : 400,
              color: unread ? RelunColors.Ink : RelunColors.Muted,
              flex: 1,
              minWidth: 0,
              ...ellipsis,
            }}
          >
            {(c.lastFromMe ? 'You: ' : '') + c.lastMessage}
          </span>
          {unread && (
            <span
              style={{
                color: seg.onFill,
                fontFamily: Outfit,
                fontWeight: 600,
                fontSize: 11,
                borderRadius: 10,
                background: seg.fill,
                padding: '2px 7px',
                flexShrink: 0,
              }}
            >
              {c.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px' }}>
      <Shimmer radius="50%" style={{ width: 58, height: 58, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Shimmer radius={6} style={{ width: '45%', height: 12 }} />
        <Shimmer radius={5} style={{ width: '80%', height: 10 }} />
      </div>
    </div>
  );
}

function LikesYou({ s }: { s: MessagesState }) {
  const actions = useAppActions();
  const seg = useSegment();
  const tiles: (Person | null)[] = s.likesLocked ? Array.from({ length: Math.min(s.likesCount, 8) }, () => null) : s.likers;
  const pairs: (Person | null)[][] = [];
  for (let i = 0; i < tiles.length; i += 2) pairs.push(tiles.slice(i, i + 2));
  const buttonText = { ...T.labelLarge, fontSize: 16, color: seg.onFill, whiteSpace: 'pre' } as const;

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {s.likesLocked && (
        <div
          style={{
            width: '100%',
            borderRadius: 24,
            background: '#FFFFFF',
            border: `1px solid ${RelunColors.BorderSoft}`,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <span style={{ ...T.titleMedium, color: RelunColors.Ink }}>
            {s.likesCount === 1 ? '1 person already likes you' : `${s.likesCount} people already like you`}
          </span>
          <span style={{ ...T.bodySmall, fontSize: 14, color: RelunColors.Muted }}>
            See who they are and match instantly. Included with Relun Plus, or unlock with coins.
          </span>
          <button
            type="button"
            className="press"
            onClick={actions.openInsights}
            style={{
              width: '100%',
              height: 50,
              borderRadius: 16,
              background: seg.fill,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={buttonText}>See who likes you</span>
          </button>
        </div>
      )}
      {s.likesCount === 0 ? (
        <EmptyState icon="favorite" outline title="No likes yet" body="When someone likes you, they’ll show up here." />
      ) : (
        pairs.map((pair, row) => (
          <div key={row} style={{ display: 'flex', gap: 10 }}>
            {pair.map((person, i) => (
              <button
                key={person?.id ?? `locked-${row}-${i}`}
                type="button"
                className="press"
                aria-label={person ? firstName(person) : 'Locked'}
                onClick={() => (person == null ? actions.openInsights() : actions.openProfile(person.id))}
                style={{ flex: 1, minWidth: 0, aspectRatio: '0.75', borderRadius: 20, position: 'relative', overflow: 'hidden' }}
              >
                {person == null ? (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: placeholderBrush(`locked-${i}-${pair.length}`, i),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="lock" size={20} color="#FFFFFF" label="Locked" />
                    </div>
                  </div>
                ) : (
                  <>
                    <PersonPhoto
                      url={mainPhotoUrl(person)}
                      seed={person.id}
                      initial={initialOf(person)}
                      radius={20}
                      initialSize={56}
                      style={{ position: 'absolute', inset: 0 }}
                    />
                    <span
                      style={{
                        ...T.labelMedium,
                        fontSize: 15,
                        color: '#FFFFFF',
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        textAlign: 'left',
                        background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.6))',
                        padding: '30px 12px 12px',
                      }}
                    >
                      {[firstName(person), person.age?.toString()].filter((v): v is string => v != null).join(', ')}
                    </span>
                  </>
                )}
              </button>
            ))}
            {pair.length === 1 && <div style={{ flex: 1 }} />}
          </div>
        ))
      )}
    </div>
  );
}

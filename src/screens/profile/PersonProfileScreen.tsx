import { useState, type CSSProperties } from 'react';
import { BackButton, CircleIconButton, OutlineButton } from '../../components/Buttons';
import { Icon, Spinner } from '../../components/Icon';
import { useSegment } from '../../components/segment';
import { CoinIcon, EmptyState, PersonPhoto, SectionHeader, SegmentPill } from '../../components/Visuals';
import { initialOf, type Person } from '../../data/models';
import { useAppActions } from '../../navigation/actions';
import { RelunColors, T } from '../../theme';
import { formatDistance, formatHeight, formatLastActive } from '../../util/format';
import { LikeButton } from '../discover/DiscoverTab';
import { usePersonProfileViewModel } from './PersonProfileViewModel';

export function PersonProfileScreen(props: { userId: string }) {
  const vm = usePersonProfileViewModel(props.userId);
  const s = vm.state;
  const actions = useAppActions();
  const seg = useSegment();

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#FFFFFF' }}>
      {s.person ? (
        <Content person={s.person} onLike={vm.like} onPass={() => vm.pass(actions.back)} />
      ) : s.loading ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size={40} stroke={4} color={seg.fill} />
        </div>
      ) : (
        <div className="status-pad" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
          <BackButton onClick={actions.back} style={{ margin: 16 }} />
          <EmptyState
            icon="person"
            title="Profile unavailable"
            body={s.error ?? 'This profile can’t be shown right now.'}
            error
            action={
              <OutlineButton
                text="Try again"
                onClick={vm.load}
                leadingIcon="refresh"
                height={48}
                // Fills the EmptyState column (its 40px side padding), as on Android.
                style={{ width: 'min(calc(100vw - 80px), 350px)' }}
              />
            }
          />
        </div>
      )}
    </div>
  );
}

function Content({ person, onLike, onPass }: { person: Person; onLike: () => void; onPass: () => void }) {
  const actions = useAppActions();
  const seg = useSegment();
  const [photo, setPhoto] = useState(0);
  const count = Math.max(person.photos.length, 1);

  const height = formatHeight(person.heightCm);
  const distance = formatDistance(person.distanceKm);
  const details: [string, string][] = [];
  if (person.occupation) details.push(['work', person.occupation]);
  if (person.education) details.push(['school', person.education]);
  if (height) details.push(['straighten', height]);
  if (person.drinking) details.push(['wine_bar', person.drinking]);
  if (person.smoking) details.push(['smoke_free', `Smoking: ${person.smoking}`]);
  if (person.religion) details.push(['auto_awesome', person.religion]);
  if (person.city) details.push(['location_on', person.city]);

  const meta: CSSProperties = { ...T.bodyMedium, fontSize: 16, color: RelunColors.Body };
  const flow: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 };
  const enabled = person.isMatch;
  const fg = enabled ? seg.onFill : RelunColors.DisabledText;
  const msgText: CSSProperties = { ...T.labelLarge, fontSize: 16, color: fg };

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div className="scroll" style={{ position: 'absolute', inset: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 120 }}>
          <div style={{ position: 'relative', width: '100%', height: 540, flexShrink: 0 }}>
            <PersonPhoto
              url={person.photos[photo]?.url}
              seed={person.id}
              initial={initialOf(person)}
              radius={0}
              initialSize={140}
              step={photo}
              failureLabel="Photo couldn’t load"
              style={{ position: 'absolute', inset: 0 }}
            />
            {/* Tap the left side for the previous photo, the right side for the next. */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
              <div style={{ flex: 0.4, cursor: 'pointer' }} onClick={() => setPhoto((p) => Math.max(p - 1, 0))} />
              <div style={{ flex: 0.6, cursor: 'pointer' }} onClick={() => setPhoto((p) => Math.min(p + 1, count - 1))} />
            </div>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 120,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent)',
                pointerEvents: 'none',
              }}
            />
            <div className="status-pad" style={{ position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px' }}>
                <BackButton onClick={actions.back} variant="glass" style={{ pointerEvents: 'auto' }} />
                <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                  {count > 1 &&
                    Array.from({ length: count }, (_, i) => (
                      <div
                        key={i}
                        style={{ flex: 1, height: 3, borderRadius: 2, background: i === photo ? '#FFFFFF' : 'rgba(255,255,255,0.45)' }}
                      />
                    ))}
                </div>
                <CircleIconButton
                  icon="more_horiz"
                  label="More options"
                  onClick={() => actions.openMore(person)}
                  variant="glass"
                  iconSize={22}
                  style={{ pointerEvents: 'auto' }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              top: -32,
              borderRadius: '32px 32px 0 0',
              background: '#FFFFFF',
              padding: '28px 24px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 30,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ ...T.displayMedium, color: RelunColors.Ink }}>
                {[person.name, person.age?.toString()].filter((x) => x != null).join(', ')}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 16, rowGap: 8 }}>
                {distance && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="location_on" outline size={15} color={RelunColors.Body} />
                    <span style={meta}>{distance}</span>
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {person.isOnline && <span style={{ width: 8, height: 8, borderRadius: '50%', background: RelunColors.OnlineDot }} />}
                  <span style={meta}>{formatLastActive(person.isOnline, person.lastActive)}</span>
                </span>
              </div>
              <SegmentPill />
            </div>

            {person.bio.trim() !== '' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SectionHeader text="About" />
                <span style={{ ...T.bodyLarge, fontSize: 19, lineHeight: '29px', color: RelunColors.Ink, whiteSpace: 'pre-wrap' }}>
                  {person.bio}
                </span>
              </div>
            )}

            {details.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionHeader text="Details" />
                <div style={flow}>
                  {details.map(([icon, value]) => (
                    <DetailChip key={`${icon}-${value}`} icon={icon} value={value} />
                  ))}
                </div>
              </div>
            )}

            {person.interests.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionHeader text="Interests" />
                <div style={flow}>
                  {person.interests.map((it) => (
                    <span
                      key={it}
                      style={{
                        ...T.bodyMedium,
                        fontWeight: 500,
                        color: RelunColors.Ink,
                        borderRadius: 999,
                        border: `1.5px solid ${RelunColors.Border}`,
                        padding: '10px 16px',
                      }}
                    >
                      {it}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ alignSelf: 'stretch', height: 1, background: RelunColors.BorderSoft }} />
              <button
                type="button"
                className="press"
                onClick={() => actions.openMore(person)}
                style={{ marginTop: 8, height: 44, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Icon name="flag" outline size={16} color={RelunColors.Body} />
                <span style={{ ...T.bodySmall, fontSize: 14, fontWeight: 500, color: RelunColors.Body }}>Report or block</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action bar. */}
      <div
        className="nav-pad"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, #FFFFFF 30%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px' }}>
          <CircleIconButton
            icon="close"
            label="Pass"
            onClick={onPass}
            size={56}
            iconSize={26}
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
          />
          <LikeButton liked={person.liked || person.isMatch} onClick={onLike} size={56} />
          <button
            type="button"
            className="press"
            disabled={!enabled}
            onClick={() => actions.openChat(person)}
            style={{
              flex: 1,
              height: 56,
              borderRadius: 18,
              background: enabled ? seg.fill : RelunColors.Disabled,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: fg,
              whiteSpace: 'pre',
            }}
          >
            {!person.isMatch ? (
              <>
                <Icon name="lock" size={17} color={fg} />
                <span style={{ width: 8 }} />
                <span style={msgText}>Match to message</span>
              </>
            ) : !person.chatUnlocked ? (
              <>
                <Icon name="chat_bubble" outline size={18} color={fg} />
                <span style={{ width: 8 }} />
                <span style={msgText}>{'Message · '}</span>
                <CoinIcon size={20} />
                <span style={msgText}>{' 15'}</span>
              </>
            ) : (
              <>
                <Icon name="chat_bubble" size={18} color={fg} />
                <span style={{ width: 8 }} />
                <span style={msgText}>Message</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailChip({ icon, value }: { icon: string; value: string }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 14,
        background: RelunColors.ChipFill,
        padding: '10px 14px',
      }}
    >
      <Icon name={icon} outline size={16} color={RelunColors.Body} />
      <span style={{ ...T.bodyMedium, color: RelunColors.Ink }}>{value}</span>
    </span>
  );
}

import { useEffect, useState } from 'react';
import { BackButton, OutlineButton, PrimaryButton } from '../../components/Buttons';
import { EmptyState, PersonPhoto, Shimmer } from '../../components/Visuals';
import { firstName, initialOf, mainPhotoUrl } from '../../data/models';
import { people, type LockedPeople } from '../../data/repositories';
import { useAppActions } from '../../navigation/actions';
import { RelunColors, T } from '../../theme';
import { formatAgo } from '../../util/format';

const grid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
  padding: 16,
} as const;

/** Who viewed my profile, newest first. Opened from the Views card on the Me tab. */
export function ProfileViewsScreen() {
  const actions = useAppActions();
  const [views, setViews] = useState<LockedPeople | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    people
      .profileViews()
      .then((v) => alive && setViews(v))
      .catch(() => alive && setFailed((f) => f || views == null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Buying insights from the locked state reloads the list.
  useEffect(() => people.events.on((e) => e.type === 'insightsUnlocked' && setAttempt((a) => a + 1)), []);

  const v = views;
  return (
    <div
      className="status-pad nav-pad"
      style={{ position: 'absolute', inset: 0, background: RelunColors.Background, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', flexShrink: 0 }}>
        <BackButton onClick={actions.back} />
        <div style={{ paddingLeft: 12, display: 'flex', flexDirection: 'column' }}>
          <span style={{ ...T.headlineSmall, color: RelunColors.Ink }}>Profile views</span>
          {v && !v.locked && v.count > 0 && (
            <span style={{ ...T.bodySmall, color: RelunColors.Muted }}>
              {v.count === 1 ? '1 person viewed your profile' : `${v.count} people viewed your profile`}
            </span>
          )}
        </div>
      </div>

      <div className="scroll" style={{ flex: 1 }}>
        {failed ? (
          <EmptyState
            icon="error"
            outline
            title="Couldn’t load your views"
            error
            action={
              <OutlineButton
                text="Try again"
                onClick={() => setAttempt((a) => a + 1)}
                style={{ maxWidth: 180 }}
                leadingIcon="refresh"
                height={48}
              />
            }
          />
        ) : v == null ? (
          <div style={grid}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Shimmer key={i} radius={20} style={{ aspectRatio: '0.75' }} />
            ))}
          </div>
        ) : v.locked ? (
          <EmptyState
            icon="lock"
            title="See who viewed you"
            body={
              v.count === 1
                ? '1 person viewed your profile. Unlock to see who.'
                : `${v.count} people viewed your profile. Unlock to see who.`
            }
            action={
              <PrimaryButton
                text="See who viewed you"
                onClick={actions.openInsights}
                style={{ maxWidth: 240 }}
                height={48}
              />
            }
          />
        ) : v.people.length === 0 ? (
          <EmptyState
            icon="visibility"
            outline
            title="No views yet"
            body="When someone views your profile, they’ll show up here."
          />
        ) : (
          <div style={grid}>
            {v.people.map((person) => {
              const at = v.viewedAt?.[person.id];
              return (
                <button
                  key={person.id}
                  type="button"
                  className="press"
                  onClick={() => actions.openProfile(person.id)}
                  aria-label={`${person.name}'s profile`}
                  style={{ position: 'relative', aspectRatio: '0.75', borderRadius: 20, overflow: 'hidden', display: 'block' }}
                >
                  <PersonPhoto
                    url={mainPhotoUrl(person)}
                    seed={person.id}
                    initial={initialOf(person)}
                    radius={20}
                    initialSize={56}
                    style={{ position: 'absolute', inset: 0 }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      padding: '30px 12px 12px',
                      background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.6))',
                      display: 'flex',
                      flexDirection: 'column',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ ...T.labelMedium, fontSize: 15, color: '#FFFFFF' }}>
                      {[firstName(person), person.age].filter((x) => x != null).join(', ')}
                    </span>
                    {at && (
                      <span style={{ ...T.bodySmall, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>Viewed {formatAgo(at)}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

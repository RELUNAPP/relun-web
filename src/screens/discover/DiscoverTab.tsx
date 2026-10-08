import { useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { CircleIconButton, OutlineButton, PrimaryButton } from '../../components/Buttons';
import { OfflineBanner, RelunSheet } from '../../components/Controls';
import { Icon, Spinner } from '../../components/Icon';
import { useSegment } from '../../components/segment';
import { CoinPill, EmptyState, PersonPhoto, SegmentPill } from '../../components/Visuals';
import { initialOf, mainPhotoUrl, type Person } from '../../data/models';
import { useApp } from '../../data/store';
import { useAppActions } from '../../navigation/actions';
import { Outfit, RelunColors, T } from '../../theme';
import { formatDistance } from '../../util/format';
import { TabBarClearance, TabSurface, TabTitle } from '../main/TabCommon';
import { useDiscoverViewModel, type DiscoverView } from './DiscoverViewModel';

const nameAndAge = (p: Person) => [p.name, p.age?.toString()].filter((x) => x != null).join(', ');

/** Keyboard activation for card surfaces that hold their own buttons (and so can't be <button>s). */
const activate = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.target !== e.currentTarget) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

export function DiscoverTab() {
  const wallet = useApp((s) => s.wallet);
  const [s, vm] = useDiscoverViewModel();
  const actions = useAppActions();
  const seg = useSegment();

  const header = (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <TabTitle
        title="Discover"
        below={<SegmentPill text={`${seg.label} · nearby`} small />}
        actions={
          <>
            <CoinPill balance={wallet.balance} low={wallet.balance < wallet.chatUnlockCost} onClick={actions.openCoins} />
            <CircleIconButton icon="tune" outline label="Filters" onClick={() => vm.openFilters(true)} />
          </>
        }
      />
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0 16px 14px' }}>
        <span style={{ ...T.bodySmall, color: RelunColors.Muted, flex: 1 }}>
          {`Within ${s.maxDistanceKm} km · ages ${s.ageMin}–${s.ageMax}`}
        </span>
        <ViewToggle view={s.view} onChange={vm.setView} />
      </div>
      {s.offline && <OfflineBanner text="You’re offline. Showing saved profiles." style={{ margin: '0 16px 12px', width: 'auto' }} />}
    </div>
  );

  let content: ReactNode;
  if (s.load === 'loading') {
    content = <SkeletonGrid header={header} />;
  } else if (s.load === 'empty') {
    content = (
      <>
        {header}
        <EmptyState
          icon="explore"
          title="No profiles found yet"
          body="Try widening your distance or age range to see more people."
          action={<PrimaryButton text="Adjust filters" onClick={() => vm.openFilters(true)} style={{ width: 200 }} height={48} />}
        />
      </>
    );
  } else if (s.load === 'error') {
    content = (
      <>
        {header}
        <EmptyState
          icon="cloud_off"
          title="Couldn’t load people"
          body="Check your connection and try again."
          error
          action={<OutlineButton text="Try again" onClick={() => vm.load()} style={{ width: 180 }} leadingIcon="refresh" height={48} />}
        />
      </>
    );
  } else if (s.view === 'grid') {
    content = (
      <div style={{ padding: `0 16px ${TabBarClearance}px` }}>
        {/* The header sits inside the grid's 16px content padding, as on Android. */}
        <div style={{ paddingBottom: 8 }}>{header}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {s.people.map((person) => (
            <GridCard key={person.id} person={person} onOpen={() => actions.openProfile(person.id)} onLike={() => vm.like(person)} />
          ))}
        </div>
      </div>
    );
  } else {
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: TabBarClearance }}>
        {header}
        {s.people.map((person) => (
          <ListCard
            key={person.id}
            person={person}
            onOpen={() => actions.openProfile(person.id)}
            onLike={() => vm.like(person)}
            onPass={() => vm.pass(person)}
            style={{ margin: '0 16px' }}
          />
        ))}
      </div>
    );
  }

  return (
    <TabSurface>
      <PullToRefresh
        refreshing={s.refreshing}
        onRefresh={() => vm.load(true)}
        enabled={s.load !== 'loading'}
        color={seg.fill}
      >
        {content}
      </PullToRefresh>
      {s.filtersOpen && (
        <FiltersSheet
          distance={s.maxDistanceKm}
          ageMin={s.ageMin}
          ageMax={s.ageMax}
          onApply={vm.applyFilters}
          onDismiss={() => vm.openFilters(false)}
        />
      )}
    </TabSurface>
  );
}

/**
 * Material 3 PullToRefreshBox: drag down at the top of the list to reload. Works
 * with touch and with a mouse drag.
 */
function PullToRefresh({
  refreshing,
  onRefresh,
  enabled,
  color,
  children,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  enabled: boolean;
  color: string;
  children: ReactNode;
}) {
  const THRESHOLD = 80;
  const scroller = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);

  const begin = (y: number) => {
    if (!enabled || refreshing || (scroller.current?.scrollTop ?? 0) > 0) return;
    startY.current = y;
  };
  const move = (y: number) => {
    if (startY.current == null) return;
    const dy = y - startY.current;
    if (dy <= 0 || (scroller.current?.scrollTop ?? 0) > 0) {
      if (pull !== 0) setPull(0);
      return;
    }
    setDragging(true);
    // Resistance, like Compose's pull: half the finger travel, capped.
    setPull(Math.min(dy * 0.5, THRESHOLD * 1.6));
  };
  const end = () => {
    if (startY.current == null) return;
    startY.current = null;
    setDragging(false);
    if (pull >= THRESHOLD) onRefresh();
    setPull(0);
  };

  const shown = refreshing ? THRESHOLD * 0.7 : pull;
  const progress = Math.min(pull / THRESHOLD, 1);
  const visible = refreshing || pull > 0;

  return (
    <div className="status-pad" style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        ref={scroller}
        className="scroll"
        style={{ flex: 1, minHeight: 0 }}
        onTouchStart={(e) => begin(e.touches[0].clientY)}
        onTouchMove={(e) => move(e.touches[0].clientY)}
        onTouchEnd={end}
        onTouchCancel={end}
        onMouseDown={(e) => e.button === 0 && begin(e.clientY)}
        onMouseMove={(e) => (e.buttons & 1 ? move(e.clientY) : startY.current != null && end())}
        onMouseUp={end}
        onMouseLeave={end}
      >
        {children}
      </div>
      <div
        aria-hidden={!visible}
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          width: 40,
          height: 40,
          marginLeft: -20,
          marginTop: 'max(env(safe-area-inset-top), 12px)',
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 3,
          opacity: visible ? 1 : 0,
          transform: `translateY(${shown - 40}px)`,
          transition: dragging ? 'none' : 'transform 0.25s ease, opacity 0.2s ease',
        }}
      >
        {refreshing ? (
          <Spinner size={20} color={color} stroke={2.5} />
        ) : (
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `2.5px solid ${color}`,
              borderRightColor: 'transparent',
              opacity: 0.4 + progress * 0.6,
              transform: `rotate(${progress * 270}deg)`,
            }}
          />
        )}
      </div>
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: DiscoverView; onChange: (v: DiscoverView) => void }) {
  const options: [DiscoverView, string, string][] = [
    ['grid', 'grid_view', 'Grid view'],
    ['list', 'view_agenda', 'List view'],
  ];
  return (
    <div role="tablist" style={{ display: 'flex', gap: 2, borderRadius: 12, background: RelunColors.Track, padding: 3 }}>
      {options.map(([v, icon, label]) => {
        const on = v === view;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={label}
            className="press"
            onClick={() => onChange(v)}
            style={{
              width: 44,
              height: 34,
              borderRadius: 9,
              background: on ? '#FFFFFF' : 'transparent',
              boxShadow: on ? '0 1px 2px rgba(0,0,0,0.14)' : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: on ? RelunColors.Ink : RelunColors.Muted,
            }}
          >
            <Icon name={icon} size={17} color={on ? RelunColors.Ink : RelunColors.Muted} />
          </button>
        );
      })}
    </div>
  );
}

const ONLINE_GREEN = '#3DDC84';

function GridCard({ person, onOpen, onLike }: { person: Person; onOpen: () => void; onLike: () => void }) {
  const s = useSegment();
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={nameAndAge(person)}
      className="press"
      onClick={onOpen}
      onKeyDown={activate(onOpen)}
      style={{
        position: 'relative',
        aspectRatio: '0.75',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 5px 20px rgba(70,30,20,0.16)',
        color: RelunColors.Ink,
      }}
    >
      <PersonPhoto
        url={mainPhotoUrl(person)}
        seed={person.id}
        initial={initialOf(person)}
        radius={16}
        style={{ position: 'absolute', inset: 0 }}
      />
      {person.isOnline && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            borderRadius: 999,
            background: 'rgba(0,0,0,0.5)',
            padding: '3px 7px 3px 5px',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: ONLINE_GREEN }} />
          <span style={{ color: '#FFFFFF', fontSize: 10, fontFamily: Outfit, fontWeight: 500, lineHeight: 'normal' }}>Online</span>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.92)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={s.icon} size={12} color={s.text} label={s.label} />
      </div>
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          color: '#FFFFFF',
          fontFamily: Outfit,
          fontWeight: 600,
          fontSize: 13,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.62))',
          padding: '28px 44px 9px 9px',
        }}
      >
        {nameAndAge(person)}
      </span>
      <LikeButton liked={person.liked} onClick={onLike} small style={{ position: 'absolute', right: 0, bottom: 0 }} />
    </div>
  );
}

const HEART_POP = `@keyframes relun-heart-pop{0%{transform:scale(.9)}35%{transform:scale(1.12)}60%{transform:scale(.96)}80%{transform:scale(1.03)}100%{transform:scale(1)}}`;

/** Heart that pops when liked. 44px touch area around a smaller visible disc. */
export function LikeButton({
  liked,
  onClick,
  small = false,
  size,
  style,
}: {
  liked: boolean;
  onClick: () => void;
  small?: boolean;
  /** Overrides the touch area (Android passes Modifier.size(56.dp) on the profile). */
  size?: number;
  style?: CSSProperties;
}) {
  const s = useSegment();
  const box = size ?? (small ? 44 : 52);
  const disc = small ? 32 : 52;
  return (
    <button
      type="button"
      aria-label={liked ? 'Unlike' : 'Like'}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      style={{
        width: box,
        height: box,
        display: 'flex',
        alignItems: small ? 'flex-end' : 'center',
        justifyContent: small ? 'flex-end' : 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      <style>{HEART_POP}</style>
      <span
        className="press"
        style={{
          margin: small ? 6 : 0,
          width: disc,
          height: disc,
          borderRadius: '50%',
          background: liked ? s.fill : 'rgba(255,255,255,0.92)',
          border: small ? undefined : `1.5px solid ${s.fill}`,
          boxShadow: small ? '0 1px 4px rgba(0,0,0,0.22)' : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: liked ? s.onFill : RelunColors.Ink,
        }}
      >
        <Icon
          key={liked ? 'on' : 'off'}
          name="favorite"
          outline={!liked}
          size={small ? 17 : 24}
          color={liked ? s.onFill : RelunColors.Ink}
          style={liked ? { animation: 'relun-heart-pop 420ms ease-out both' } : undefined}
        />
      </span>
    </button>
  );
}

function ListCard({
  person,
  onOpen,
  onLike,
  onPass,
  style,
}: {
  person: Person;
  onOpen: () => void;
  onLike: () => void;
  onPass: () => void;
  style?: CSSProperties;
}) {
  const distance = formatDistance(person.distanceKm);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={nameAndAge(person)}
      className="press"
      onClick={onOpen}
      onKeyDown={activate(onOpen)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 24,
        overflow: 'hidden',
        background: '#FFFFFF',
        boxShadow: '0 8px 28px rgba(70,30,20,0.22)',
        color: RelunColors.Ink,
        ...style,
      }}
    >
      <div style={{ position: 'relative', width: '100%', aspectRatio: '0.8' }}>
        <PersonPhoto
          url={mainPhotoUrl(person)}
          seed={person.id}
          initial={initialOf(person)}
          radius={0}
          initialSize={96}
          failureLabel="Photo couldn’t load"
          style={{ position: 'absolute', inset: 0 }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.65))',
            padding: '60px 18px 16px',
          }}
        >
          <span style={{ ...T.headlineSmall, fontSize: 26, color: '#FFFFFF' }}>{nameAndAge(person)}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 6 }}>
            {distance && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="location_on" outline size={15} color="#FFFFFF" />
                <span style={{ color: '#FFFFFF', fontFamily: Outfit, fontWeight: 500, fontSize: 14 }}>{distance}</span>
              </span>
            )}
            {person.isOnline && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ONLINE_GREEN }} />
                <span style={{ color: '#FFFFFF', fontFamily: Outfit, fontWeight: 500, fontSize: 14 }}>Online</span>
              </span>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 16px' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SegmentPill small />
          <span
            style={{
              ...T.bodySmall,
              fontSize: 14,
              color: person.bio.trim() ? RelunColors.Muted : RelunColors.Faint,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {person.bio.trim() ? person.bio : 'No bio yet'}
          </span>
        </div>
        <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} style={{ display: 'flex' }}>
          <CircleIconButton icon="close" label="Pass" onClick={onPass} size={52} iconSize={24} />
        </span>
        <LikeButton liked={person.liked} onClick={onLike} />
      </div>
    </div>
  );
}

function SkeletonGrid({ header }: { header: ReactNode }) {
  return (
    <div style={{ padding: `0 16px ${TabBarClearance}px`, overflow: 'hidden' }}>
      <div style={{ paddingBottom: 8 }}>{header}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="shimmer" style={{ position: 'relative', aspectRatio: '0.75' }}>
            <div
              style={{
                position: 'absolute',
                left: 9,
                bottom: 9,
                width: 'calc((100% - 18px) * 0.55)',
                height: 10,
                borderRadius: 5,
                background: '#D9D9D9',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Material slider look: a 4px track filled in the segment colour up to the thumb. */
const trackFill = (from: number, to: number, fill: string) =>
  `linear-gradient(to right, ${RelunColors.Track} ${from}%, ${fill} ${from}%, ${fill} ${to}%, ${RelunColors.Track} ${to}%)`;

function FiltersSheet({
  distance,
  ageMin,
  ageMax,
  onApply,
  onDismiss,
}: {
  distance: number;
  ageMin: number;
  ageMax: number;
  onApply: (distance: number, ageMin: number, ageMax: number) => void;
  onDismiss: () => void;
}) {
  const s = useSegment();
  const [km, setKm] = useState(distance);
  const [lo, setLo] = useState(ageMin);
  const [hi, setHi] = useState(Math.min(ageMax, 70));

  const kmPct = ((km - 1) / 99) * 100;
  const loPct = ((lo - 18) / 52) * 100;
  const hiPct = ((hi - 18) / 52) * 100;
  const label: CSSProperties = { ...T.labelMedium, fontSize: 15, flex: 1 };
  const value: CSSProperties = { ...T.bodyMedium, color: RelunColors.Muted };
  const sliderBox: CSSProperties = { position: 'relative', height: 48, display: 'flex', alignItems: 'center' };

  return (
    <RelunSheet onDismiss={onDismiss}>
      <span style={T.titleLarge}>Filters</span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex' }}>
          <span style={label}>Maximum distance</span>
          <span style={value}>{`${km} km`}</span>
        </div>
        <div style={sliderBox}>
          <input
            type="range"
            className="range"
            aria-label="Maximum distance"
            min={1}
            max={100}
            step={1}
            value={km}
            onChange={(e) => setKm(Number(e.target.value))}
            style={{ background: trackFill(0, kmPct, s.fill) }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex' }}>
          <span style={label}>Age range</span>
          <span style={value}>{`${lo}–${hi >= 70 ? '70+' : hi}`}</span>
        </div>
        <div style={sliderBox}>
          <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, background: trackFill(loPct, hiPct, s.fill) }} />
          {(
            [
              ['Minimum age', lo, (v: number) => setLo(Math.min(v, hi))],
              ['Maximum age', hi, (v: number) => setHi(Math.max(v, lo))],
            ] as const
          ).map(([name, v, onChange]) => (
            <input
              key={name}
              type="range"
              className="range"
              aria-label={name}
              min={18}
              max={70}
              step={1}
              value={v}
              onChange={(e) => onChange(Number(e.target.value))}
              style={{ position: 'absolute', left: 0, right: 0, pointerEvents: 'none' }}
            />
          ))}
        </div>
      </div>
      <PrimaryButton text="Show people" onClick={() => onApply(km, lo, hi >= 70 ? 99 : hi)} />
    </RelunSheet>
  );
}

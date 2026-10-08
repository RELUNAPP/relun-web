import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CircleIconButton, OutlineButton, PrimaryButton } from '../../components/Buttons';
import { ConfirmDialog, OfflineBanner, Overlay, RelunSheet, SegmentedControl } from '../../components/Controls';
import { Icon } from '../../components/Icon';
import { LabeledField, RelunTextField } from '../../components/Inputs';
import { useSegment } from '../../components/segment';
import { Avatar, EmptyState, SegmentPill, Shimmer } from '../../components/Visuals';
import { firstName, initialOf, mainPhotoUrl, type DatePost } from '../../data/models';
import { useAppActions } from '../../navigation/actions';
import { RelunColors, T } from '../../theme';
import { formatAgo, formatWhen } from '../../util/format';
import { TabBarClearance, TabSurface, TabTitle } from '../main/TabCommon';
import { useDatesViewModel, type DatesView } from './DatesViewModel';

const ACTIVITIES = ['Coffee', 'Dinner', 'Drinks', 'Movie', 'Walk'];

const cardStyle: CSSProperties = {
  width: '100%',
  borderRadius: 24,
  background: '#FFFFFF',
  boxShadow: '0 5px 20px rgba(70,30,20,0.16)',
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
};

const pad16: CSSProperties = { margin: '0 16px', width: 'auto' };

type Vm = ReturnType<typeof useDatesViewModel>['vm'];

export function DatesTab({ showMine }: { showMine: number }) {
  const { state: s, vm } = useDatesViewModel();
  const actions = useAppActions();
  const seg = useSegment();

  useEffect(() => {
    if (showMine > 0) vm.setView('mine');
  }, [showMine, vm]);

  return (
    <TabSurface>
      <div
        className="scroll status-pad"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: TabBarClearance }}
      >
        <TabTitle
          title="Date Requests"
          actions={
            <button
              type="button"
              className="press"
              onClick={() => vm.openCreate(true)}
              style={{
                height: 44,
                borderRadius: 999,
                background: seg.fill,
                padding: '0 16px 0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
              }}
            >
              <Icon name="add" size={20} color={seg.onFill} />
              <span style={{ ...T.labelMedium, fontSize: 15, color: seg.onFill }}>Post</span>
            </button>
          }
        />
        <SegmentedControl<DatesView>
          options={[
            ['browse', 'Browse'],
            ['mine', 'My Dates'],
          ]}
          selected={s.view}
          onSelect={vm.setView}
          style={pad16}
        />
        {s.offline && <OfflineBanner text="You’re offline. Showing saved dates." style={pad16} />}

        {s.view === 'browse' ? (
          <>
            {s.browseLoad === 'loading' &&
              [0, 1].map((i) => <Shimmer key={i} radius={24} style={{ ...pad16, height: 220, flexShrink: 0 }} />)}
            {s.browseLoad === 'empty' && (
              <EmptyState
                icon="calendar_month"
                title="No dates found."
                body="Be the first: post a plan and let people ask to join."
                action={<PrimaryButton text="Post a Date" onClick={() => vm.openCreate(true)} style={{ width: 200 }} height={48} />}
              />
            )}
            {s.browseLoad === 'error' && (
              <EmptyState
                icon="error"
                title="Couldn’t load dates"
                error
                action={
                  <OutlineButton
                    text="Try again"
                    onClick={() => vm.loadBrowse()}
                    style={{ width: 180 }}
                    leadingIcon="refresh"
                    height={48}
                  />
                }
              />
            )}
            {s.browseLoad === 'ready' &&
              s.browse.map((post) => (
                <BrowseCard
                  key={post.id}
                  post={post}
                  onOwner={() => post.owner && actions.openProfile(post.owner.id)}
                  onJoin={() => vm.interested(post)}
                />
              ))}
          </>
        ) : (
          <>
            {s.mine.length === 0 && s.mineLoaded && (
              <EmptyState
                icon="calendar_month"
                title="You haven’t posted any dates yet."
                action={<PrimaryButton text="Post a Date" onClick={() => vm.openCreate(true)} style={{ width: 200 }} height={48} />}
              />
            )}
            {s.mine.map((post) => (
              <MineCard key={post.id} post={post} vm={vm} />
            ))}
          </>
        )}
      </div>

      {s.creating && <CreateDateSheet posting={s.posting} onPost={vm.post} onDismiss={() => vm.openCreate(false)} />}
      {s.dialog && <ConfirmDialog spec={s.dialog} onDismiss={vm.dismissDialog} />}
    </TabSurface>
  );
}

function Meta({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon name={icon} outline size={16} color={RelunColors.Body} />
      <span style={{ ...T.bodySmall, fontSize: 14, color: RelunColors.Body }}>{text}</span>
    </div>
  );
}

const nameAge = (name: string, age: number | null) => [name, age?.toString()].filter(Boolean).join(', ');

function BrowseCard({ post, onOwner, onJoin }: { post: DatePost; onOwner: () => void; onJoin: () => void }) {
  const seg = useSegment();
  const owner = post.owner;
  if (!owner) return null;
  return (
    <div style={{ ...cardStyle, ...pad16, gap: 14, flexShrink: 0 }}>
      <button
        type="button"
        className="press"
        onClick={onOwner}
        style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%' }}
      >
        <Avatar url={mainPhotoUrl(owner)} seed={owner.id} initial={initialOf(owner)} size={44} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              ...T.labelMedium,
              fontSize: 15,
              color: RelunColors.Ink,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {nameAge(owner.name, owner.age)}
          </span>
          <span style={{ ...T.bodySmall, fontSize: 12, color: RelunColors.Muted }}>{formatAgo(post.createdAt)}</span>
        </div>
        <SegmentPill text={seg.label} small style={{ alignSelf: 'center' }} />
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ ...T.titleMedium, color: RelunColors.Ink }}>{post.activity}</span>
        <Meta icon="location_on" text={post.place} />
        <Meta icon="calendar_month" text={formatWhen(post.scheduledFor)} />
        {post.description && (
          <span style={{ ...T.bodySmall, fontSize: 14, color: RelunColors.Muted, paddingTop: 2 }}>{post.description}</span>
        )}
      </div>
      {post.myRequestStatus == null && <PrimaryButton text="I’m Interested" onClick={onJoin} height={48} />}
      {post.myRequestStatus === 'pending' && <StatusBar text="Interest sent · waiting for reply" />}
      {post.myRequestStatus === 'accepted' && <StatusBar text="Accepted · check Messages" />}
      {post.myRequestStatus === 'declined' && (
        <div
          style={{
            width: '100%',
            height: 48,
            borderRadius: 16,
            background: '#F1F1F1',
            paddingTop: 14,
            textAlign: 'center',
            ...T.labelMedium,
            color: RelunColors.Muted,
          }}
        >
          Not this time
        </div>
      )}
    </div>
  );
}

function StatusBar({ text }: { text: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: 48,
        borderRadius: 16,
        background: RelunColors.SuccessFill,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="check_circle" size={18} color={RelunColors.SuccessText} />
      <span style={{ ...T.labelMedium, fontSize: 15, color: RelunColors.SuccessText, whiteSpace: 'pre' }}>{`  ${text}`}</span>
    </div>
  );
}

function MineCard({ post, vm }: { post: DatePost; vm: Vm }) {
  const actions = useAppActions();
  const seg = useSegment();
  return (
    <div style={{ ...cardStyle, ...pad16, gap: 12, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ ...T.titleMedium, color: RelunColors.Ink }}>{post.activity}</span>
          <Meta icon="location_on" text={post.place} />
          <Meta icon="calendar_month" text={formatWhen(post.scheduledFor)} />
        </div>
        <CircleIconButton
          icon="delete"
          outline
          label="Delete date"
          onClick={() => vm.confirmDelete(post)}
          variant="flat"
          iconSize={18}
          style={{ background: '#F4F4F4' }}
        />
      </div>
      <div style={{ width: '100%', height: 1, background: RelunColors.BorderSoft }} />
      <span style={{ ...T.labelMedium, color: RelunColors.Ink }}>{`Requests (${post.requests.length})`}</span>
      {post.requests.length === 0 && (
        <span style={{ ...T.bodySmall, fontSize: 14, color: RelunColors.Muted }}>
          No requests yet. We’ll notify you when someone asks to join.
        </span>
      )}
      {post.requests.map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="press"
            onClick={() => actions.openProfile(r.person.id)}
            style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}
          >
            <Avatar url={mainPhotoUrl(r.person)} seed={r.person.id} initial={initialOf(r.person)} size={40} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ ...T.labelMedium, fontSize: 15, color: RelunColors.Ink }}>
                {nameAge(firstName(r.person), r.person.age)}
              </span>
              {r.status === 'pending' && (
                <span style={{ ...T.bodySmall, fontSize: 12, color: RelunColors.Muted }}>Wants to join</span>
              )}
              {r.status === 'accepted' && (
                <span style={{ ...T.bodySmall, fontSize: 12, fontWeight: 600, color: RelunColors.SuccessText }}>Accepted</span>
              )}
              {r.status === 'declined' && (
                <span style={{ ...T.bodySmall, fontSize: 12, color: RelunColors.Muted }}>Declined</span>
              )}
            </div>
          </button>
          {r.status === 'pending' && (
            <>
              <CircleIconButton
                icon="close"
                label="Decline"
                onClick={() => vm.respond(post, r.id, false)}
                variant="flat"
                style={{ border: `1.5px solid ${RelunColors.Border}` }}
              />
              <button
                type="button"
                className="press"
                aria-label="Accept"
                onClick={() => vm.respond(post, r.id, true)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: seg.fill,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="check" size={20} color={seg.onFill} />
              </button>
            </>
          )}
          {r.status === 'accepted' && (
            <button
              type="button"
              className="press"
              onClick={() => actions.openChat({ ...r.person, isMatch: true, chatUnlocked: true })}
              style={{
                height: 40,
                borderRadius: 999,
                background: seg.tint,
                border: `1.5px solid ${seg.fill}`,
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
              }}
            >
              <Icon name="chat_bubble" size={15} color={seg.text} />
              <span style={{ ...T.labelMedium, color: seg.text }}>Chat</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- Create sheet ----------

const pad2 = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** "EEE d MMM", e.g. "Sat 12 Oct". */
const formatPickedDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const wd = date.toLocaleDateString(undefined, { weekday: 'short' });
  const mon = date.toLocaleDateString(undefined, { month: 'short' });
  return `${wd} ${d} ${mon}`;
};

type Time = { hour: number; minute: number };

function CreateDateSheet({
  posting,
  onPost,
  onDismiss,
}: {
  posting: boolean;
  onPost: (activity: string, place: string, at: Date, description: string | null) => void;
  onDismiss: () => void;
}) {
  const seg = useSegment();
  const [activity, setActivity] = useState('');
  const [place, setPlace] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<Time | null>(null);
  const [desc, setDesc] = useState('');
  const [pickTime, setPickTime] = useState(false);
  const dateInput = useRef<HTMLInputElement>(null);

  let at: Date | null = null;
  if (date && time) {
    const [y, m, d] = date.split('-').map(Number);
    at = new Date(y, m - 1, d, time.hour, time.minute);
  }
  const inPast = at != null && at.getTime() < Date.now();
  const valid = activity.trim() !== '' && place.trim() !== '' && at != null && !inPast;

  const openDatePicker = () => {
    const input = dateInput.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
      input.click();
    }
  };

  return (
    <>
      <RelunSheet onDismiss={onDismiss}>
        <span style={{ ...T.headlineSmall, color: RelunColors.Ink }}>Post a Date</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ACTIVITIES.map((a) => {
            const on = activity === a;
            return (
              <button
                key={a}
                type="button"
                className="press"
                onClick={() => setActivity(a)}
                style={{
                  height: 40,
                  borderRadius: 999,
                  background: on ? seg.tint : '#FFFFFF',
                  border: `1.5px solid ${on ? seg.fill : RelunColors.Border}`,
                  padding: '0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  ...T.labelMedium,
                  color: on ? seg.text : RelunColors.Ink,
                }}
              >
                {a}
              </button>
            );
          })}
        </div>
        <LabeledField label="Activity">
          <RelunTextField
            value={activity}
            onChange={(v) => setActivity(v.slice(0, 80))}
            placeholder="e.g. Sunset drinks"
            inputProps={{ autoCapitalize: 'sentences' }}
          />
        </LabeledField>
        <LabeledField label="Place">
          <RelunTextField
            value={place}
            onChange={(v) => setPlace(v.slice(0, 120))}
            placeholder="A public spot"
            inputProps={{ autoCapitalize: 'words' }}
          />
        </LabeledField>
        <div style={{ display: 'flex', gap: 8 }}>
          <LabeledField label="Date" style={{ flex: 1.3, minWidth: 0 }}>
            <div style={{ position: 'relative' }}>
              <PickerField text={date ? formatPickedDay(date) : 'Pick a day'} onClick={openDatePicker} />
              <input
                ref={dateInput}
                type="date"
                tabIndex={-1}
                aria-hidden
                min={isoDay(new Date())}
                value={date ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && v >= isoDay(new Date())) setDate(v);
                }}
                style={{
                  position: 'absolute',
                  left: 0,
                  bottom: 0,
                  width: '100%',
                  height: 1,
                  opacity: 0,
                  pointerEvents: 'none',
                  border: 0,
                  padding: 0,
                }}
              />
            </div>
          </LabeledField>
          <LabeledField label="Time" error={inPast ? 'In the past' : null} style={{ flex: 1, minWidth: 0 }}>
            <PickerField text={time ? `${time.hour}:${pad2(time.minute)}` : 'Pick a time'} onClick={() => setPickTime(true)} />
          </LabeledField>
        </div>
        <LabeledField label="Description" trailingLabel="Optional">
          <RelunTextField
            value={desc}
            onChange={(v) => setDesc(v.slice(0, 500))}
            placeholder="Anything they should know?"
            singleLine={false}
            minLines={2}
            textStyle={T.bodyMedium}
          />
        </LabeledField>
        <PrimaryButton
          text="Post Request"
          onClick={() => at && onPost(activity, place, at, desc)}
          enabled={valid}
          loading={posting}
        />
      </RelunSheet>
      {pickTime && (
        <TimeDialog
          initial={time ?? { hour: 19, minute: 0 }}
          onCancel={() => setPickTime(false)}
          onPick={(t) => {
            setTime(t);
            setPickTime(false);
          }}
        />
      )}
    </>
  );
}

function PickerField({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="press"
      onClick={onClick}
      style={{
        width: '100%',
        height: 52,
        borderRadius: 16,
        background: '#FFFFFF',
        border: `1.5px solid ${RelunColors.Border}`,
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        textAlign: 'left',
      }}
    >
      <span
        style={{
          ...T.bodyMedium,
          fontWeight: 500,
          color: RelunColors.Ink,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {text}
      </span>
    </button>
  );
}

/** Material 3 TimeInput (24-hour) in a white dialog, as on Android. */
function TimeDialog({ initial, onCancel, onPick }: { initial: Time; onCancel: () => void; onPick: (t: Time) => void }) {
  const seg = useSegment();
  const [hour, setHour] = useState(pad2(initial.hour));
  const [minute, setMinute] = useState(pad2(initial.minute));
  const [focus, setFocus] = useState<'h' | 'm' | null>('h');

  useEffect(() => {
    // Capture phase, so Escape closes only this dialog and not the sheet under it.
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onCancel();
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onCancel]);

  const clean = (v: string, max: number) => {
    const digits = v.replace(/\D/g, '').slice(-2);
    if (digits === '') return '';
    return Number(digits) > max ? digits.slice(-1) : digits;
  };
  const h = Math.min(Number(hour || 0), 23);
  const m = Math.min(Number(minute || 0), 59);

  const field = (which: 'h' | 'm', value: string, set: (v: string) => void, max: number, label: string) => {
    const on = focus === which;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <input
          aria-label={label}
          inputMode="numeric"
          value={value}
          autoFocus={which === 'h'}
          onFocus={(e) => {
            setFocus(which);
            e.target.select();
          }}
          onBlur={() => {
            setFocus((f) => (f === which ? null : f));
            set(pad2(Math.min(Number(value || 0), max)));
          }}
          onChange={(e) => set(clean(e.target.value, max))}
          style={{
            width: 96,
            height: 72,
            borderRadius: 8,
            textAlign: 'center',
            background: on ? seg.tint : '#F1F1F1',
            color: on ? seg.text : RelunColors.Ink,
            border: on ? `2px solid ${seg.fill}` : '2px solid transparent',
            ...T.displayMedium,
          }}
        />
        <span style={{ ...T.bodySmall, color: RelunColors.Muted }}>{label}</span>
      </div>
    );
  };

  return (
    <Overlay>
    <div
      className="anim-fade-in"
      onClick={onCancel}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 70,
        background: 'rgba(0,0,0,0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderRadius: 24,
          background: '#FFFFFF',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          animation: 'dialog-in 200ms cubic-bezier(0.2,0,0,1) both',
        }}
      >
        <span style={{ ...T.titleMedium, color: RelunColors.Ink }}>Pick a time</span>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
          {field('h', hour, setHour, 23, 'Hour')}
          <span style={{ ...T.displayMedium, width: 24, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            :
          </span>
          {field('m', minute, setMinute, 59, 'Minute')}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <TextButton text="Cancel" color={RelunColors.Ink} onClick={onCancel} />
          <TextButton text="OK" color={seg.text} onClick={() => onPick({ hour: h, minute: m })} />
        </div>
      </div>
    </div>
    </Overlay>
  );
}

/** Material 3 TextButton. */
function TextButton({ text, color, onClick }: { text: string; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="press"
      onClick={onClick}
      style={{ height: 40, minWidth: 58, padding: '0 12px', borderRadius: 20, ...T.labelLarge, fontSize: 14, color }}
    >
      {text}
    </button>
  );
}

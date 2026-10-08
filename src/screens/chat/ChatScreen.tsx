import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { BackButton, CircleIconButton } from '../../components/Buttons';
import { Icon, Spinner } from '../../components/Icon';
import { useSegment } from '../../components/segment';
import { Avatar, CoinIcon } from '../../components/Visuals';
import { mainPhotoUrl, type ChatMessage } from '../../data/models';
import { useAppActions } from '../../navigation/actions';
import { Outfit, RelunColors, T } from '../../theme';
import { formatClock, formatDay } from '../../util/format';
import { useChatViewModel, type ChatState } from './ChatViewModel';

const OPENERS = [
  'What’s the best thing you ate this week?',
  'Coffee or cocktails for a first date?',
  'Your second photo has a story. Spill.',
];

type ChatItem = { kind: 'day'; label: string; key: string } | { kind: 'bubble'; message: ChatMessage; key: string };

const TYPING_CSS = `@keyframes relun-typing-dot { from { transform: translateY(0); } to { transform: translateY(-4px); } }`;

export function ChatScreen({ userId, initialName }: { userId: string; initialName: string }) {
  const vm = useChatViewModel(userId, initialName);
  const s = vm.state;
  const actions = useAppActions();
  const seg = useSegment();

  const items: ChatItem[] = [];
  let lastDay: string | null = null;
  s.messages.forEach((m) => {
    const day = m.sentAt.toDateString();
    if (day !== lastDay) {
      items.push({ kind: 'day', label: formatDay(m.sentAt), key: `day-${day}` });
      lastDay = day;
    }
    items.push({ kind: 'bubble', message: m, key: m.id });
  });

  // LaunchedEffect(items.size, otherTyping): follow the newest message.
  const listRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const scrolledOnce = useRef(false);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || items.length === 0) return;
    el.scrollTo({ top: el.scrollHeight, behavior: scrolledOnce.current ? 'smooth' : 'auto' });
    scrolledOnce.current = true;
    atBottom.current = true;
  }, [items.length, s.otherTyping]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the keyboard opens the list shrinks; keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (atBottom.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const name = s.name.trim() ? s.name : 'Chat';
  const title = [name, s.person?.age?.toString()].filter((v): v is string => v != null).join(', ');
  const status = s.otherTyping ? 'typing…' : s.otherOnline ? 'Online' : 'Offline';
  const person = s.person;
  const canSend = /\S/.test(s.draft);
  const bigText: CSSProperties = { ...T.labelLarge, fontSize: 16, color: seg.onFill, whiteSpace: 'pre' };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: RelunColors.Background }}>
      <style>{TYPING_CSS}</style>

      {/* Header */}
      <div className="status-pad" style={{ background: '#FFFFFF', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px 10px' }}>
          <BackButton onClick={actions.back} variant="flat" />
          <button
            type="button"
            className="press"
            onClick={() => actions.openProfile(userId)}
            style={{ flex: 1, minWidth: 0, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
          >
            <Avatar url={person ? mainPhotoUrl(person) : null} seed={userId} initial={s.name.slice(0, 1).toUpperCase()} size={42} />
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span style={{ ...T.titleSmall, color: RelunColors.Ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title}
              </span>
              <span
                style={{
                  ...T.bodySmall,
                  fontSize: 12,
                  fontWeight: 500,
                  color: s.otherTyping || s.otherOnline ? RelunColors.Success : RelunColors.Muted,
                }}
              >
                {status}
              </span>
            </div>
          </button>
          {person && <CircleIconButton icon="more_vert" label="Report or block" onClick={() => actions.openMore(person)} variant="flat" />}
        </div>
      </div>
      <div style={{ height: 1, flexShrink: 0, background: RelunColors.BorderSoft }} />

      {!vm.connected && (
        <div
          role="status"
          style={{
            flexShrink: 0,
            background: RelunColors.WarningFill,
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="sync" size={15} color={RelunColors.WarningText} />
          <span style={{ ...T.bodySmall, fontWeight: 500, color: RelunColors.WarningText, whiteSpace: 'pre' }}>{'  Reconnecting…'}</span>
        </div>
      )}

      {/* Messages */}
      <div
        ref={listRef}
        className="scroll"
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        style={{ flex: 1, minHeight: 0, width: '100%' }}
      >
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
            <div
              style={{
                borderRadius: 12,
                background: '#F1F1F1',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="verified_user" outline size={14} color={RelunColors.Body} />
              <span style={{ ...T.bodySmall, fontSize: 12, color: RelunColors.Body, textAlign: 'center' }}>
                Keep your conversations safe. Report any suspicious behaviour.
              </span>
            </div>
          </div>

          {s.loading ? (
            <div style={{ width: '100%', padding: 40, display: 'flex', justifyContent: 'center' }}>
              <Spinner size={40} stroke={4} color={seg.fill} />
            </div>
          ) : s.messages.length === 0 && !vm.locked ? (
            <EmptyChat s={s} onOpener={(line) => vm.send(line)} />
          ) : null}

          {items.map((item) =>
            item.kind === 'day' ? (
              <span
                key={item.key}
                style={{ ...T.labelSmall, color: RelunColors.Muted, textAlign: 'center', width: '100%', padding: '10px 0 6px' }}
              >
                {item.label}
              </span>
            ) : (
              <Bubble key={item.key} m={item.message} onRetry={() => vm.retry(item.message)} />
            ),
          )}

          {s.otherTyping && <TypingBubble />}
        </div>
      </div>

      {/* Composer, or the unlock prompt when the chat isn't paid for yet. */}
      <div className="nav-pad" style={{ background: '#FFFFFF', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 12px' }}>
          {vm.locked && person ? (
            <button
              type="button"
              className="press"
              onClick={() => actions.openChat(person)}
              style={{
                flex: 1,
                minHeight: 50,
                borderRadius: 16,
                background: seg.fill,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={bigText}>Unlock chat · </span>
              <CoinIcon size={20} />
              <span style={bigText}> 15</span>
            </button>
          ) : (
            <>
              <Composer value={s.draft} onChange={vm.setDraft} onSend={() => vm.send()} />
              <button
                type="button"
                className="press"
                disabled={!canSend}
                onClick={() => vm.send()}
                aria-label="Send"
                style={{
                  width: 46,
                  height: 46,
                  flexShrink: 0,
                  borderRadius: '50%',
                  background: canSend ? seg.fill : RelunColors.Disabled,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="arrow_upward" size={22} color={canSend ? seg.onFill : RelunColors.DisabledText} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Android's multi-line RelunTextField (46px min, 23px corners, grey fill, max
 * 120px tall). Enter sends; Shift+Enter starts a new line.
 */
function Composer({ value, onChange, onSend }: { value: string; onChange: (v: string) => void; onSend: () => void }) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const MAX = 120;
  const PAD = 14 * 2 + 3; // vertical padding + 1.5px borders

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    const h = Math.min(el.scrollHeight, MAX - PAD);
    el.style.height = `${h}px`;
    el.style.overflowY = el.scrollHeight > MAX - PAD ? 'auto' : 'hidden';
  }, [value]);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 46,
        maxHeight: MAX,
        display: 'flex',
        alignItems: 'flex-start',
        background: RelunColors.Background,
        border: `1.5px solid ${focused ? RelunColors.Ink : RelunColors.Border}`,
        borderRadius: 23,
        padding: '14px 16px',
        transition: 'border-color 0.15s ease',
        cursor: 'text',
      }}
      onClick={() => ref.current?.focus()}
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        placeholder="Type a message…"
        aria-label="Message"
        autoCapitalize="sentences"
        enterKeyHint="send"
        maxLength={5000}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSend();
          }
        }}
        style={{
          ...T.bodyLarge,
          fontSize: 16,
          lineHeight: '21px',
          color: RelunColors.Ink,
          width: '100%',
          minWidth: 0,
          display: 'block',
          scrollbarWidth: 'none',
        }}
      />
    </div>
  );
}

function EmptyChat({ s, onOpener }: { s: ChatState; onOpener: (line: string) => void }) {
  const first = s.name.split(' ')[0];
  return (
    <div style={{ width: '100%', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <Avatar
        url={s.person ? mainPhotoUrl(s.person) : null}
        seed={s.person?.id ?? s.name}
        initial={s.name.slice(0, 1).toUpperCase()}
        size={96}
      />
      <span style={{ ...T.titleMedium, color: RelunColors.Ink, textAlign: 'center' }}>{`You matched with ${first}. Say hello!`}</span>
      <span style={{ ...T.bodySmall, color: RelunColors.Muted }}>Need a nudge? Tap one to send it.</span>
      {OPENERS.map((line) => (
        <button
          key={line}
          type="button"
          className="press"
          onClick={() => onOpener(line)}
          style={{
            ...T.bodySmall,
            fontSize: 14,
            fontWeight: 500,
            color: RelunColors.Ink,
            width: '100%',
            minHeight: 44,
            borderRadius: 16,
            border: `1.5px solid ${RelunColors.Border}`,
            background: '#FFFFFF',
            padding: '12px 14px',
            textAlign: 'left',
          }}
        >
          {line}
        </button>
      ))}
    </div>
  );
}

function Bubble({ m, onRetry }: { m: ChatMessage; onRetry: () => void }) {
  const seg = useSegment();
  const radius = m.mine ? '20px 20px 6px 20px' : '20px 20px 20px 6px';
  const read = m.status === 'read';
  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: 300,
          paddingBottom: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: m.mine ? 'flex-end' : 'flex-start',
          gap: 3,
        }}
      >
        <div
          style={{
            ...T.bodyLarge,
            fontSize: 16,
            lineHeight: '22px',
            color: m.mine ? seg.onFill : RelunColors.Ink,
            borderRadius: radius,
            background: m.mine ? seg.fill : '#FFFFFF',
            border: m.mine ? undefined : '1px solid #ECECEC',
            padding: '10px 14px',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
          }}
        >
          {m.text}
        </div>
        {m.status === 'failed' ? (
          <button
            type="button"
            className="press"
            onClick={onRetry}
            style={{ borderRadius: 8, padding: 4, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Icon name="error" size={15} color={RelunColors.Error} />
            <span style={{ color: RelunColors.Error, fontFamily: Outfit, fontWeight: 600, fontSize: 12 }}>Not delivered · Tap to retry</span>
          </button>
        ) : m.status === 'sending' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="schedule" size={13} color={RelunColors.Muted} />
            <span style={{ color: RelunColors.Muted, fontSize: 11, fontFamily: Outfit }}>Sending…</span>
          </div>
        ) : (
          <div style={{ padding: '0 4px', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ color: RelunColors.Muted, fontSize: 11, fontFamily: Outfit }}>{formatClock(m.sentAt)}</span>
            {m.mine && (
              <Icon
                name={read ? 'done_all' : 'done'}
                label={read ? 'Read' : 'Sent'}
                size={15}
                color={read ? seg.text : RelunColors.Faint}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  const shape = '20px 20px 20px 6px';
  return (
    <div style={{ display: 'flex' }}>
      <div
        role="status"
        aria-label="typing"
        style={{
          borderRadius: shape,
          background: '#FFFFFF',
          border: '1px solid #ECECEC',
          padding: '14px 16px',
          display: 'flex',
          gap: 4,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: RelunColors.Muted,
              animation: `relun-typing-dot 400ms ease-in-out ${i * 150}ms infinite alternate`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

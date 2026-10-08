import { useEffect, useRef, useState } from 'react';
import { LinkButton, PrimaryButton } from '../../components/Buttons';
import { Overlay } from '../../components/Controls';
import { Icon } from '../../components/Icon';
import { useSegment } from '../../components/segment';
import { PersonPhoto } from '../../components/Visuals';
import { firstName, initialOf, mainPhotoUrl, type Person } from '../../data/models';
import { useApp } from '../../data/store';
import { RelunColors, T } from '../../theme';

/**
 * Compose animates some values in raw pixels (graphicsLayer translation, the
 * glow radius). This converts them at a typical phone density so they look the same.
 */
const PX = 1 / 2.75;

/** Compose spring() integrated per frame: target 1, starting at rest at 0. */
type SpringState = { x: number; v: number; done: boolean };
const stepSpring = (s: SpringState, dt: number, damping: number, stiffness: number) => {
  if (s.done) return;
  const c = 2 * damping * Math.sqrt(stiffness);
  // Small fixed substeps keep the bouncy spring stable.
  const n = Math.max(1, Math.ceil(dt / 0.002));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const a = -stiffness * (s.x - 1) - c * s.v;
    s.v += a * h;
    s.x += s.v * h;
  }
  if (Math.abs(s.x - 1) < 0.01 && Math.abs(s.v) < 0.05) {
    s.x = 1;
    s.v = 0;
    s.done = true;
  }
};

/** FastOutSlowInEasing = cubic-bezier(0.4, 0, 0.2, 1). */
const fastOutSlowIn = (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const bx = (u: number) => 3 * (1 - u) * (1 - u) * u * 0.4 + 3 * (1 - u) * u * u * 0.2 + u * u * u;
  const by = (u: number) => 3 * (1 - u) * u * u + u * u * u;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (bx(mid) < t) lo = mid;
    else hi = mid;
  }
  return by((lo + hi) / 2);
};

const STIFFNESS_LOW = 200;
const STIFFNESS_MEDIUM = 1500;
const DAMPING_HIGH_BOUNCY = 0.2;

export function MatchOverlay(props: { person: Person; onMessage: () => void; onKeepBrowsing: () => void }) {
  const { person, onMessage, onKeepBrowsing } = props;
  const s = useSegment();
  const me = useApp((st) => st.me);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [anim, setAnim] = useState({ fly: 0, pop: 0, rise: 0 });

  // Back gesture on Android: Escape here.
  const keep = useRef(onKeepBrowsing);
  keep.current = onKeepBrowsing;
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && keep.current();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    const fly: SpringState = { x: 0, v: 0, done: false };
    const pop: SpringState = { x: 0, v: 0, done: false };
    let flyDoneAt: number | null = null;
    let start: number | null = null;
    let last = 0;
    let raf = 0;
    const frame = (now: number) => {
      if (start == null) {
        start = now;
        last = now;
      }
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      stepSpring(fly, dt, 0.7, STIFFNESS_LOW);
      if (fly.done && flyDoneAt == null) flyDoneAt = now;
      if (flyDoneAt != null) stepSpring(pop, dt, DAMPING_HIGH_BOUNCY, STIFFNESS_MEDIUM);
      const rise = flyDoneAt == null ? 0 : fastOutSlowIn((now - flyDoneAt - 120) / 450);
      const fall = Math.min((now - start) / 3000, 1);
      setAnim({ fly: fly.x, pop: pop.x, rise });
      drawConfetti(canvas.current, fall, s.brand);
      if (fall < 1 || !pop.done || rise < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [person.id, s.brand]);

  const glow = Math.round(900 * PX);

  return (
    <Overlay>
      <div
        className="anim-fade-in"
        // Swallow taps so the screen underneath stays inert.
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="It’s a match!"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 40,
          background: `radial-gradient(circle ${glow}px at center, ${RelunColors.HeroGlow}, transparent), ${RelunColors.HeroGradient}`,
          overflow: 'hidden',
        }}
      >
        <canvas ref={canvas} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
        <div
          className="status-pad nav-pad"
          style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 28px' }}>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex' }}>
              <Card
                url={me?.photos[0]?.url ?? null}
                seed="me"
                initial={me ? initialOf(me) : ''}
                rotation={-7}
                from={-240}
                progress={anim.fly}
                shift={16}
              />
              <Card
                url={mainPhotoUrl(person)}
                seed={person.id}
                initial={initialOf(person)}
                rotation={7}
                from={240}
                progress={anim.fly}
                shift={-16}
              />
            </div>
            <div
              style={{
                width: 56,
                height: 56,
                flexShrink: 0,
                borderRadius: '50%',
                background: '#FFFFFF',
                boxShadow: '0 5px 20px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `translateY(-28px) scale(${anim.pop})`,
              }}
            >
              <Icon name={s.icon} size={28} color={s.fill} />
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                opacity: anim.rise,
                transform: `translateY(${(1 - anim.rise) * 40 * PX}px)`,
              }}
            >
              <span style={{ ...T.displayLarge, color: '#FFFFFF', textAlign: 'center' }}>It’s a match!</span>
              <span style={{ ...T.bodyLarge, fontWeight: 500, color: '#FFFFFF', paddingTop: 10, textAlign: 'center' }}>
                {`You and ${firstName(person)} like each other.`}
              </span>
            </div>
            <div style={{ flex: 1 }} />
            <PrimaryButton
              text="Send a message"
              onClick={onMessage}
              container="#FFFFFF"
              content={RelunColors.Ink}
              leadingIcon="chat_bubble"
              leadingIconOutline
            />
            <LinkButton
              text="Keep browsing"
              onClick={onKeepBrowsing}
              color="#FFFFFF"
              style={{ marginTop: 8 }}
              textStyle={{ ...T.labelLarge, fontSize: 16 }}
            />
          </div>
        </div>
      </div>
    </Overlay>
  );
}

function Card({
  url,
  seed,
  initial,
  rotation,
  from,
  progress,
  shift,
}: {
  url: string | null;
  seed: string;
  initial: string;
  rotation: number;
  from: number;
  progress: number;
  shift: number;
}) {
  const rot = rotation * progress + rotation * 4 * (1 - progress);
  return (
    <PersonPhoto
      url={url}
      seed={seed}
      initial={initial}
      radius={28}
      initialSize={48}
      style={{
        width: 140,
        aspectRatio: '0.8',
        border: '4px solid #FFFFFF',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        opacity: Math.min(Math.max(progress, 0), 1),
        transform: `translateX(${shift + from * PX * (1 - progress)}px) rotate(${rot}deg)`,
      }}
    />
  );
}

/** Thirty falling paper pieces in white, gold, brand and pink. */
function drawConfetti(canvas: HTMLCanvasElement | null, progress: number, accent: string) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const colors = ['#FFFFFF', '#FFD700', accent, '#FFC2D4'];
  for (let i = 0; i < 30; i++) {
    const delay = (i % 8) * 0.04;
    const p = Math.min(Math.max((progress - delay) / (1 - delay), 0), 1);
    if (p <= 0) continue;
    const x = (((i * 37) % 100) / 100) * w;
    const y = -30 * PX + p * (h + 60 * PX);
    const pw = 6 + (i % 3) * 3;
    const ph = 10 + (i % 4) * 3;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((p * 620 * (i % 2 === 0 ? 1 : -1)) * Math.PI) / 180);
    ctx.globalAlpha = 1 - p * 0.3;
    ctx.fillStyle = colors[i % 4];
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.restore();
  }
}

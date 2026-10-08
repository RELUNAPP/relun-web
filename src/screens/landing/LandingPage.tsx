import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../../components/Icon';
import { CoinIcon, RingsMark } from '../../components/Visuals';
import { Pacifico, SegmentColorSets } from '../../theme';
import { isIos, promptInstall, useInstallMode, type InstallMode } from '../../util/install';
import './landing.css';

/**
 * What signed-out visitors see first on the web: what Relun is, that the native
 * apps are coming, and a one-tap install of the web app. "Continue on web"
 * drops them into the normal Welcome screen.
 */
export function LandingPage({ onContinue }: { onContinue: () => void }) {
  const mode = useInstallMode();
  const [sheet, setSheet] = useState(false);

  const install = () => {
    if (mode === 'prompt') void promptInstall();
    else if (mode !== 'installed') setSheet(true);
  };

  return (
    <div className="lp">
      <header className="lp-bar">
        <div className="lp-wrap lp-bar-inner">
          <div className="lp-brand">
            <RingsMark width={34} />
            <span style={{ fontFamily: Pacifico }}>relun</span>
          </div>
          <button type="button" className="lp-bar-link press-plain" onClick={onContinue}>
            Open web app
            <Icon name="arrow_forward" size={18} />
          </button>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-wrap lp-hero-inner">
          <div className="lp-hero-copy">
            <span className="lp-chip">
              <Icon name="smartphone" size={16} />
              Mobile app coming soon
            </span>
            <h1>Find your match, your way.</h1>
            <p>
              Relun connects you with people nearby who want the same thing you do, whether that's something serious or
              just a bit of fun.
            </p>
            <div className="lp-actions">
              <InstallButton mode={mode} onClick={install} variant="light" />
              <button type="button" className="lp-btn lp-btn-ghost press" onClick={onContinue}>
                Continue on web
              </button>
            </div>
            <p className="lp-fine">Free to join · Works on Android and iPhone · No app store needed</p>
          </div>
          <PhoneMock />
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-wrap">
          <h2>Two ways to Relun</h2>
          <p className="lp-lead">Pick what you're here for. You'll only meet people who picked the same.</p>
          <div className="lp-grid lp-grid-2">
            {(['relationship', 'fun'] as const).map((seg) => {
              const c = SegmentColorSets[seg];
              return (
                <div key={seg} className="lp-card" style={{ background: c.tint, borderColor: c.wash }}>
                  <div className="lp-icon" style={{ background: c.fill }}>
                    <Icon name={c.icon} size={26} color={c.onFill} />
                  </div>
                  <h3>{c.label}</h3>
                  <p>{c.description}.</p>
                  <span className="lp-pill" style={{ color: c.text }}>
                    {c.pill}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="lp-section lp-soft">
        <div className="lp-wrap">
          <h2>How it works</h2>
          <ol className="lp-grid lp-grid-4 lp-steps">
            <Step n={1} icon="person" title="Make your profile">
              Add a few photos and the basics. It takes a couple of minutes.
            </Step>
            <Step n={2} icon="near_me" title="Discover people nearby">
              Browse people close to you. Set the distance and age range you want.
            </Step>
            <Step n={3} icon="favorite" title="Match when it's mutual">
              Like someone, and if they like you back, it's a match.
            </Step>
            <Step n={4} icon="chat_bubble" title="Chat and meet up">
              Open a chat with your match, or post a date plan and let people ask to join.
            </Step>
          </ol>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-wrap">
          <h2>Made for real connections</h2>
          <div className="lp-grid lp-grid-2 lp-features">
            <Feature icon="lock" title="Only matches can message you">
              No inbox full of strangers. A chat opens only after you both like each other.
            </Feature>
            <Feature icon="event" title="Date plans">
              Post a plan, say dinner on Friday, and pick from the people who ask to join.
            </Feature>
            <Feature icon="coin" title="Coins open chats">
              Use coins to unlock a conversation with a match. New accounts start with free coins.
            </Feature>
            <Feature icon="shield" title="You're in control">
              Block or report anyone, any time, right from their profile.
            </Feature>
          </div>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-wrap">
          <div className="lp-soon">
            <div className="lp-soon-copy">
              <span className="lp-chip lp-chip-dark">
                <Icon name="rocket_launch" size={16} />
                Coming soon
              </span>
              <h2>The Relun app is on its way</h2>
              <p>
                Native apps for Android and iPhone are in the works. You don't have to wait: add Relun to your home
                screen now and it opens full-screen, just like an app.
              </p>
              <div className="lp-actions">
                <InstallButton mode={mode} onClick={install} variant="dark" />
                <button type="button" className="lp-btn lp-btn-outline press" onClick={onContinue}>
                  Continue on web
                </button>
              </div>
            </div>
            <div className="lp-soon-art" aria-hidden>
              <div className="lp-homeicon">
                <RingsMark width={58} />
              </div>
              <span>Relun</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner">
          <div className="lp-brand lp-brand-sm">
            <RingsMark width={26} />
            <span style={{ fontFamily: Pacifico }}>relun</span>
          </div>
          <span>© {new Date().getFullYear()} Relun</span>
        </div>
      </footer>

      {sheet && <InstallSheet mode={mode} onDismiss={() => setSheet(false)} />}
    </div>
  );
}

function InstallButton({ mode, onClick, variant }: { mode: InstallMode; onClick: () => void; variant: 'light' | 'dark' }) {
  const done = mode === 'installed';
  return (
    <button
      type="button"
      className={`lp-btn lp-btn-${variant} press`}
      onClick={onClick}
      aria-disabled={done}
    >
      <Icon name={done ? 'check_circle' : 'install_mobile'} size={20} />
      {done ? 'Installed on this device' : 'Install the app'}
    </button>
  );
}

function Step({ n, icon, title, children }: { n: number; icon: string; title: string; children: ReactNode }) {
  return (
    <li className="lp-step">
      <div className="lp-step-head">
        <span className="lp-step-n">{n}</span>
        <Icon name={icon} size={22} outline />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </li>
  );
}

function Feature({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className="lp-feature">
      <div className="lp-feature-icon">{icon === 'coin' ? <CoinIcon size={24} /> : <Icon name={icon} size={24} />}</div>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}

/** A Discover card in a phone outline, drawn in CSS so it needs no screenshots. */
function PhoneMock() {
  const rose = SegmentColorSets.relationship;
  return (
    <div className="lp-phone" aria-hidden>
      <div className="lp-phone-screen">
        <div className="lp-phone-top">
          <span style={{ fontFamily: Pacifico }}>relun</span>
          <span className="lp-phone-coins">
            <CoinIcon size={16} />
            500
          </span>
        </div>
        <div className="lp-phone-card">
          <div className="lp-phone-photo">
            <Icon name="person" size={120} color="rgba(255,255,255,0.55)" />
          </div>
          <div className="lp-phone-info">
            <span className="lp-phone-pill" style={{ background: rose.tint, color: rose.text }}>
              <Icon name="favorite" size={13} />
              {rose.pill}
            </span>
            <strong>Tola, 27</strong>
            <span>
              <Icon name="location_on" size={14} />
              3 km away
            </span>
          </div>
        </div>
        <div className="lp-phone-buttons">
          <span className="lp-round">
            <Icon name="close" size={26} />
          </span>
          <span className="lp-round lp-round-like">
            <Icon name="favorite" size={28} />
          </span>
        </div>
      </div>
    </div>
  );
}

/** Steps for browsers that can't install from a button: iOS, or Android/desktop without the prompt. */
function InstallSheet({ mode, onDismiss }: { mode: InstallMode; onDismiss: () => void }) {
  const [closing, setClosing] = useState(false);
  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onDismiss, 200);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const mobile = isIos() || /Android|Mobi/i.test(navigator.userAgent);
  let title: string;
  let steps: { icon: string; text: ReactNode }[];
  let note: string | null = null;

  if (mode === 'ios') {
    title = 'Add Relun to your Home Screen';
    steps = [
      { icon: 'ios_share', text: <>Tap the <b>Share</b> button in your browser's toolbar.</> },
      { icon: 'add_box', text: <>Scroll down and tap <b>Add to Home Screen</b>.</> },
      { icon: 'check_circle', text: <>Tap <b>Add</b>. Relun appears on your Home Screen.</> },
    ];
    note = 'On older iPhones this only works in Safari.';
  } else if (mobile) {
    title = 'Install Relun';
    steps = [
      { icon: 'more_vert', text: <>Open your browser's menu (<b>⋮</b>).</> },
      { icon: 'install_mobile', text: <>Tap <b>Install app</b> or <b>Add to Home screen</b>.</> },
      { icon: 'check_circle', text: <>Confirm. Relun appears with your other apps.</> },
    ];
    note = 'Chrome, Edge and Samsung Internet all support this.';
  } else {
    title = 'Install Relun on your phone';
    steps = [
      { icon: 'smartphone', text: <>Open <b>{window.location.host}</b> in your phone's browser.</> },
      { icon: 'install_mobile', text: <>Tap <b>Install the app</b> on this page.</> },
    ];
    note = "On a computer, look for the install icon in your browser's address bar.";
  }

  return (
    <div className="lp-sheet-root">
      <div className={`lp-scrim ${closing ? 'out' : ''}`} onClick={close} />
      <div role="dialog" aria-modal="true" aria-label={title} className={`lp-sheet ${closing ? 'out' : ''}`}>
        <div className="lp-sheet-grip" />
        <div className="lp-sheet-icon">
          <RingsMark width={44} />
        </div>
        <h3>{title}</h3>
        <ol className="lp-sheet-steps">
          {steps.map((s, i) => (
            <li key={i}>
              <span className="lp-sheet-step-icon">
                <Icon name={s.icon} size={22} />
              </span>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
        {note && <p className="lp-sheet-note">{note}</p>}
        <button type="button" className="lp-btn lp-btn-dark press" onClick={close} style={{ width: '100%' }}>
          Got it
        </button>
      </div>
    </div>
  );
}

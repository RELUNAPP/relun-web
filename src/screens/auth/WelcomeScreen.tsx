import { InkButton, LinkButton, OutlineButton } from '../../components/Buttons';
import { RingsMark } from '../../components/Visuals';
import { Pacifico, RelunColors, T } from '../../theme';

export function WelcomeScreen(props: { onPhone: () => void; onEmail: () => void; onSignIn: () => void }) {
  const strong = { color: RelunColors.Ink, fontWeight: 600 };
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      <HeroArt />
      <div
        style={{
          // offset(y = -32.dp): moves up over the hero without changing layout.
          position: 'relative',
          top: -32,
          borderRadius: '32px 32px 0 0',
          background: '#FFFFFF',
          padding: '28px 24px env(safe-area-inset-bottom)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <h1 style={{ ...T.headlineMedium, color: RelunColors.Ink }}>Find Your Match, Your Way</h1>
        <p style={{ ...T.bodyMedium, color: RelunColors.Muted, paddingBottom: 6 }}>
          Connect with people who share your relationship intentions.
        </p>
        <InkButton text="Continue with Phone" onClick={props.onPhone} leadingIcon="call" leadingIconOutline />
        <OutlineButton text="Continue with Email" onClick={props.onEmail} leadingIcon="mail" leadingIconOutline />
        <LinkButton text="I already have an account" onClick={props.onSignIn} underline style={{ width: '100%' }} />
        <p style={{ ...T.bodySmall, fontSize: 12, color: RelunColors.Muted, textAlign: 'center', width: '100%' }}>
          By continuing you agree to our <span style={strong}>Terms of Service</span> and{' '}
          <span style={strong}>Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}

function HeroArt() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        background: `radial-gradient(circle 330px at center, ${RelunColors.HeroGlow}, transparent), ${RelunColors.HeroGradient}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="status-pad"
        style={{ paddingBottom: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
      >
        <div
          style={{
            width: 112,
            height: 112,
            borderRadius: 30,
            background: '#FFFFFF',
            boxShadow: '0 12px 40px rgba(70,30,20,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RingsMark width={76} />
        </div>
        <span style={{ fontFamily: Pacifico, fontSize: 64, color: '#FFFFFF', lineHeight: 1.3 }}>relun</span>
      </div>
    </div>
  );
}

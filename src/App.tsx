import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ToastHost } from './components/Controls';
import { RingsMark } from './components/Visuals';
import { auth } from './data/repositories';
import { useApp } from './data/store';
import { MainFlow } from './navigation/MainFlow';
import { Stack, useBack } from './navigation/Stack';
import { CodeSignInScreen } from './screens/auth/CodeSignInScreen';
import { LandingPage } from './screens/landing/LandingPage';
import { WelcomeScreen } from './screens/auth/WelcomeScreen';
import { OnboardingFlow } from './screens/onboarding/OnboardingFlow';
import { segmentColors } from './theme';
import { isStandalone } from './util/install';

/**
 * The whole app. Auth state picks one of three trees (signed out, onboarding,
 * signed in); the user's segment picks the accent colours for all of them.
 * Port of Android RelunRoot.
 */
export function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}

/** Set once a visitor picks "Continue on web", so the landing page doesn't greet them again. */
const CONTINUED_KEY = 'relun.web.continued';

const readContinued = () => {
  try {
    return localStorage.getItem(CONTINUED_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Signed-out visitors arriving at / in a browser see the full-width landing page
 * first. The installed app, deep links and anyone who already continued go
 * straight to the phone column.
 */
function Shell() {
  const signedOut = useApp((s) => s.auth.kind === 'signedOut');
  const [landing, setLanding] = useState(() => window.location.pathname === '/' && !isStandalone() && !readContinued());

  useEffect(() => {
    void auth.bootstrap();
  }, []);

  if (landing && signedOut) {
    return (
      <LandingPage
        onContinue={() => {
          try {
            localStorage.setItem(CONTINUED_KEY, '1');
          } catch {
            // Private mode: they'll just see the landing page again next visit.
          }
          setLanding(false);
        }}
      />
    );
  }

  return (
    <div className="app-frame">
      <Root />
      <div id="overlay-root" />
      <ToastHost />
    </div>
  );
}

function Root() {
  const state = useApp((s) => s.auth);
  const segment = useApp((s) => s.segment);
  const navigate = useNavigate();

  // CSS variables for the few styles that can't take inline colours (sliders).
  useEffect(() => {
    const c = segmentColors(segment);
    const root = document.documentElement.style;
    root.setProperty('--seg-fill', c.fill);
    root.setProperty('--seg-text', c.text);
    root.setProperty('--seg-tint', c.tint);
  }, [segment]);

  // Each tree starts at its own root. A cold start keeps the URL, so a reload stays put.
  const kind = state.kind === 'onboarding' ? `onboarding-${state.start}` : state.kind;
  const lastKind = useRef(kind);
  useEffect(() => {
    if (lastKind.current !== kind) {
      const fromLoading = lastKind.current === 'loading';
      lastKind.current = kind;
      if (!fromLoading || kind !== 'signedIn') navigate('/', { replace: true });
    }
  }, [kind, navigate]);

  switch (state.kind) {
    case 'loading':
      // Rings on white, like the Android splash and the app icon.
      return (
        <div style={{ position: 'absolute', inset: 0, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RingsMark width={164} />
        </div>
      );
    case 'signedOut':
      return <SignedOutFlow />;
    case 'onboarding':
      return <OnboardingFlow key={state.start} start={state.start} />;
    case 'signedIn':
      return <MainFlow />;
  }
}

function CodeRoute() {
  const { method = 'phone' } = useParams();
  const [params] = useSearchParams();
  const back = useBack();
  return (
    <CodeSignInScreen
      initialMethod={method === 'email' ? 'email' : 'phone'}
      returning={params.get('returning') === '1'}
      onBack={back}
    />
  );
}

function SignedOutFlow() {
  const navigate = useNavigate();
  return (
    <Stack
      base={
        <WelcomeScreen
          onPhone={() => navigate('/code/phone')}
          onEmail={() => navigate('/code/email')}
          onSignIn={() => navigate('/code/phone?returning=1')}
        />
      }
      routes={[{ path: '/code/:method', element: <CodeRoute /> }]}
    />
  );
}

import { useEffect, useRef } from 'react';
import { BackButton, InkButton, LinkButton } from '../../components/Buttons';
import { SegmentedControl } from '../../components/Controls';
import { Icon } from '../../components/Icon';
import { ErrorLine, RelunTextField } from '../../components/Inputs';
import type { ContactMethod } from '../../data/repositories';
import { Outfit, RelunColors, T } from '../../theme';
import { contactError, contactValid, sentTo, useCodeSignInViewModel, type CodeSignInState } from './CodeSignInViewModel';

type VM = ReturnType<typeof useCodeSignInViewModel>;

export function CodeSignInScreen(props: { initialMethod: 'phone' | 'email'; returning: boolean; onBack: () => void }) {
  const vm = useCodeSignInViewModel(props.initialMethod);
  const s = vm.state;
  const back = () => (s.step === 2 ? vm.changeContact() : props.onBack());

  return (
    <div
      className="status-pad nav-pad"
      style={{
        position: 'absolute',
        inset: 0,
        background: RelunColors.Background,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        className="scroll"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px 24px 24px' }}
      >
        <BackButton onClick={back} />
        <div style={{ height: 24, flexShrink: 0 }} />
        {s.step === 1 ? <ContactStep s={s} returning={props.returning} vm={vm} /> : <CodeStep s={s} vm={vm} />}
      </div>
    </div>
  );
}

function ContactStep({ s, returning, vm }: { s: CodeSignInState; returning: boolean; vm: VM }) {
  // Each method's field is keyed, so switching remounts it and autoFocus refocuses (LaunchedEffect(s.method)).
  const error = contactError(s) ?? s.sendError;

  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {returning && (
          <span style={{ ...T.labelMedium, fontSize: 13, letterSpacing: '0.5px', color: RelunColors.Muted }}>WELCOME BACK</span>
        )}
        <h1 style={{ ...T.headlineLarge, color: RelunColors.Ink }}>
          {s.method === 'phone' ? 'What’s your number?' : 'What’s your email?'}
        </h1>
        <p style={{ ...T.bodyMedium, color: RelunColors.Muted }}>We’ll send you a 6-digit code. No password, ever.</p>
        <SegmentedControl<ContactMethod>
          options={[
            ['phone', 'Phone'],
            ['email', 'Email'],
          ]}
          selected={s.method}
          onSelect={vm.setMethod}
        />
        {s.method === 'phone' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="press"
              onClick={vm.nextCountryCode}
              aria-label={`Country code ${s.countryCode}. Change country code`}
              style={{
                height: 54,
                borderRadius: 16,
                background: '#FFFFFF',
                border: `1.5px solid ${RelunColors.Border}`,
                padding: '0 12px 0 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
              }}
            >
              <span style={{ ...T.labelLarge, fontSize: 16, color: RelunColors.Ink }}>{s.countryCode}</span>
              <Icon name="keyboard_arrow_down" size={16} color={RelunColors.Muted} />
            </button>
            <RelunTextField
              key="phone"
              value={s.contact}
              onChange={vm.setContact}
              placeholder="801 234 5678"
              isError={contactError(s) != null}
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              onEnter={() => void vm.sendCode()}
              style={{ flex: 1 }}
              autoFocus
              inputProps={{ 'aria-label': 'Phone number' }}
            />
          </div>
        ) : (
          <RelunTextField
            key="email"
            value={s.contact}
            onChange={vm.setContact}
            placeholder="you@example.com"
            isError={contactError(s) != null}
            type="email"
            inputMode="email"
            autoComplete="email"
            onEnter={() => void vm.sendCode()}
            autoFocus
            inputProps={{ 'aria-label': 'Email address', autoCapitalize: 'none', spellCheck: false }}
          />
        )}
        {error && <ErrorLine text={error} />}
      </div>
      <InkButton
        text="Send Code"
        onClick={() => void vm.sendCode()}
        enabled={contactValid(s)}
        loading={s.busy}
        loadingText="Sending…"
      />
    </>
  );
}

function CodeStep({ s, vm }: { s: CodeSignInState; vm: VM }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const small = { ...T.bodySmall, fontSize: 14, color: RelunColors.Muted };

  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ ...T.headlineLarge, color: RelunColors.Ink }}>Enter the code</h1>
        <p style={{ ...T.bodyMedium, color: RelunColors.Muted }}>
          Sent to <span style={{ color: RelunColors.Ink, fontWeight: 600 }}>{sentTo(s)}</span>
        </p>

        {/* Six visible boxes over one invisible field, so paste and SMS autofill just work. */}
        <div style={{ position: 'relative', paddingTop: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {Array.from({ length: 6 }, (_, i) => {
              const digit = s.code[i] ?? '';
              const active = i === Math.min(s.code.length, 5) && s.codeError == null;
              const border =
                s.codeError != null ? RelunColors.Error : active ? RelunColors.Ink : digit ? '#BDBDBD' : RelunColors.Border;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    aspectRatio: '5 / 6',
                    borderRadius: 14,
                    background: s.codeError != null ? RelunColors.ErrorFill : '#FFFFFF',
                    border: `2px solid ${border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: Outfit,
                    fontWeight: 600,
                    fontSize: 26,
                    color: RelunColors.Ink,
                  }}
                >
                  {digit}
                </div>
              );
            })}
          </div>
          <input
            ref={inputRef}
            value={s.code}
            onChange={(e) => vm.setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                vm.verify();
              }
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            aria-label="6-digit code"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 8,
              bottom: 0,
              width: '100%',
              height: 'calc(100% - 8px)',
              color: 'transparent',
              caretColor: 'transparent',
              background: 'transparent',
              fontSize: 16,
              letterSpacing: 0,
              cursor: 'text',
            }}
          />
        </div>

        {s.codeError && <ErrorLine text={s.codeError} />}

        <div style={{ display: 'flex', minHeight: 44, justifyContent: 'space-between', alignItems: 'center' }}>
          {s.resendIn > 0 ? (
            <span style={small}>Resend code in 0:{String(s.resendIn).padStart(2, '0')}</span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ ...small, whiteSpace: 'pre' }}>Didn’t receive it? </span>
              <LinkButton text="Resend" onClick={() => void vm.resend()} underline textStyle={T.labelMedium} />
            </div>
          )}
          <LinkButton
            text={s.method === 'phone' ? 'Change number' : 'Change email'}
            onClick={vm.changeContact}
            textStyle={T.labelMedium}
          />
        </div>
      </div>
      <InkButton
        text="Verify"
        onClick={vm.verify}
        enabled={s.code.length === 6}
        loading={s.busy}
        loadingText="Verifying…"
      />
    </>
  );
}

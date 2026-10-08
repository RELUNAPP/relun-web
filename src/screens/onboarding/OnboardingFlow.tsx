import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton, LinkButton, OutlineButton, PrimaryButton } from '../../components/Buttons';
import { InfoNote } from '../../components/Controls';
import { Icon } from '../../components/Icon';
import { LabeledField, RelunTextField } from '../../components/Inputs';
import { useSegment } from '../../components/segment';
import { IconTile, PersonPhoto } from '../../components/Visuals';
import type { Segment } from '../../data/models';
import { location } from '../../util/location';
import { pickImage } from '../../util/images';
import { Stack, useBack } from '../../navigation/Stack';
import { RelunColors, segmentColors, T } from '../../theme';
import { openAppSettings } from './Intents';
import {
  createOnboardingStore,
  detailsValid,
  dobError,
  GENDERS,
  nameError,
  OnboardingContext,
  photosValid,
  uploadedPhotos,
  useOnboardingViewModel,
  type PhotoSlot,
} from './OnboardingViewModel';

export function OnboardingFlow(props: { start: 'segment' | 'photos' }) {
  const [store] = useState(createOnboardingStore);
  const photosBase = props.start === 'photos';

  return (
    <OnboardingContext.Provider value={store}>
      <Stack
        base={photosBase ? <PhotosRoute canGoBack={false} /> : <SegmentRoute />}
        routes={[
          { path: '/details', element: <DetailsRoute /> },
          { path: '/location', element: <LocationRoute /> },
          { path: '/photos', element: <PhotosRoute canGoBack /> },
          { path: '/youre-in', element: <YoureInStep /> },
        ]}
      />
    </OnboardingContext.Provider>
  );
}

function SegmentRoute() {
  const navigate = useNavigate();
  return (
    <StepScaffold step={1} canGoBack={false}>
      <SegmentStep onNext={() => navigate('/details')} />
    </StepScaffold>
  );
}

function DetailsRoute() {
  const navigate = useNavigate();
  return (
    <StepScaffold step={2} canGoBack>
      <DetailsStep onNext={() => navigate('/location')} />
    </StepScaffold>
  );
}

function LocationRoute() {
  const navigate = useNavigate();
  return (
    <StepScaffold step={3} canGoBack>
      <LocationStep onNext={() => navigate('/photos')} />
    </StepScaffold>
  );
}

function PhotosRoute({ canGoBack }: { canGoBack: boolean }) {
  const navigate = useNavigate();
  return (
    <StepScaffold step={4} canGoBack={canGoBack}>
      <PhotosStep onNext={() => navigate('/youre-in')} />
    </StepScaffold>
  );
}

/** Back button, 4-segment progress bar and "Step n of 4" above each setup step. */
function StepScaffold({ step, canGoBack, children }: { step: number; canGoBack: boolean; children: ReactNode }) {
  const s = useSegment();
  const back = useBack();
  return (
    <div
      className="status-pad nav-pad"
      style={{ position: 'absolute', inset: 0, background: RelunColors.Background, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 20px 10px', flexShrink: 0 }}>
        {canGoBack ? <BackButton onClick={back} /> : <div style={{ width: 0, height: 0 }} />}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? s.fill : RelunColors.Border }}
              />
            ))}
          </div>
          <span style={{ ...T.bodySmall, fontSize: 12, fontWeight: 500, color: RelunColors.Muted }}>Step {step} of 4</span>
        </div>
      </div>
      <div
        className="scroll"
        style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 16, padding: '10px 24px 24px' }}
      >
        {children}
      </div>
    </div>
  );
}

const Weight = () => <div style={{ flex: 1 }} />;

const Heading = ({ text }: { text: string }) => <h1 style={{ ...T.headlineLarge, color: RelunColors.Ink }}>{text}</h1>;

// ---------- Step 1: segment ----------

function SegmentStep({ onNext }: { onNext: () => void }) {
  const s = useSegment();
  const vm = useOnboardingViewModel();
  return (
    <>
      <Heading text="What are you looking for?" />
      <p style={{ ...T.bodyMedium, color: RelunColors.Muted, paddingBottom: 4 }}>
        Choose your relationship intention. You’ll only see people with the same goal.
      </p>
      <div role="radiogroup" style={{ display: 'contents' }}>
        {(['relationship', 'fun'] as Segment[]).map((seg) => {
          const g = segmentColors(seg);
          const on = vm.segment === seg;
          return (
            <button
              key={seg}
              type="button"
              role="radio"
              aria-checked={on}
              className="press"
              onClick={() => vm.chooseSegment(seg)}
              style={{
                width: '100%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                borderRadius: 24,
                background: on ? g.tint : '#FFFFFF',
                border: `2px solid ${on ? g.fill : g.wash}`,
                padding: '22px 20px',
                textAlign: 'left',
                color: RelunColors.Ink,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: on ? g.fill : g.tint,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name={g.icon} size={28} color={on ? g.onFill : g.text} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...T.titleMedium, color: RelunColors.Ink }}>{g.label}</div>
                <div style={{ ...T.bodySmall, fontSize: 14, color: RelunColors.Muted, paddingTop: 3 }}>{g.description}</div>
              </div>
              {on ? (
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: g.fill,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="check" size={17} color={g.onFill} />
                </div>
              ) : (
                <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${g.fill}59`, flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>
      <InfoNote text="This choice is permanent. It keeps both spaces honest, so pick the one that fits you now." icon="lock" />
      <Weight />
      <PrimaryButton text={`Continue as ${s.label}`} onClick={onNext} />
    </>
  );
}

// ---------- Step 2: details ----------

function DetailsStep({ onNext }: { onNext: () => void }) {
  const vm = useOnboardingViewModel();
  const s = useSegment();
  const nError = nameError(vm);
  const dError = dobError(vm);
  const numeric = { inputMode: 'numeric' as const, textAlign: 'center' as const, isError: dError != null };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Heading text="About you" />
        <p style={{ ...T.bodyMedium, color: RelunColors.Muted }}>
          Use your real name and birthday. Authentic profiles get more matches.
        </p>
      </div>
      <LabeledField label="Full name" error={nError}>
        <RelunTextField
          value={vm.name}
          onChange={vm.setName}
          placeholder="e.g. Ada Okafor"
          isError={nError != null}
          autoComplete="name"
          onFocusChange={(focused) => {
            if (!focused) vm.touchName();
          }}
          inputProps={{ autoCapitalize: 'words', 'aria-label': 'Full name' }}
          trailing={vm.name.trim().length > 1 ? <Icon name="check_circle" size={22} color={RelunColors.Success} /> : undefined}
        />
      </LabeledField>
      <LabeledField label="Date of birth" error={dError}>
        <div style={{ display: 'flex', gap: 8 }}>
          <RelunTextField
            {...numeric}
            value={vm.day}
            onChange={vm.setDay}
            placeholder="DD"
            autoComplete="bday-day"
            style={{ flex: 1, minWidth: 0 }}
            inputProps={{ 'aria-label': 'Day' }}
          />
          <RelunTextField
            {...numeric}
            value={vm.month}
            onChange={vm.setMonth}
            placeholder="MM"
            autoComplete="bday-month"
            style={{ flex: 1, minWidth: 0 }}
            inputProps={{ 'aria-label': 'Month' }}
          />
          <RelunTextField
            {...numeric}
            value={vm.year}
            onChange={vm.setYear}
            placeholder="YYYY"
            autoComplete="bday-year"
            style={{ flex: 1.6, minWidth: 0 }}
            inputProps={{ 'aria-label': 'Year' }}
          />
        </div>
        <InfoNote
          text="Your date of birth can only be set once and cannot be changed later."
          icon="info"
          background={RelunColors.WarningFill}
          color={RelunColors.WarningText}
        />
      </LabeledField>
      <LabeledField label="Gender">
        <div role="radiogroup" aria-label="Gender" style={{ display: 'flex', gap: 8 }}>
          {GENDERS.map((g) => {
            const on = vm.gender?.wire === g.wire;
            return (
              <button
                key={g.wire}
                type="button"
                role="radio"
                aria-checked={on}
                className="press"
                onClick={() => vm.setGender(g)}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 16,
                  background: on ? s.tint : '#FFFFFF',
                  border: `1.5px solid ${on ? s.fill : RelunColors.Border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...T.labelLarge,
                  fontSize: 16,
                  color: on ? s.text : RelunColors.Ink,
                }}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </LabeledField>
      <LabeledField label={vm.signedInByPhone ? 'Email · for account recovery' : 'Phone number · for account recovery'}>
        <RelunTextField
          value={vm.recovery}
          onChange={vm.setRecovery}
          placeholder={vm.signedInByPhone ? 'you@example.com' : '+234 801 234 5678'}
          type={vm.signedInByPhone ? 'email' : 'tel'}
          inputMode={vm.signedInByPhone ? 'email' : 'tel'}
          autoComplete={vm.signedInByPhone ? 'email' : 'tel'}
        />
      </LabeledField>
      <LabeledField label="Bio" trailingLabel="Optional">
        <RelunTextField
          value={vm.bio}
          onChange={vm.setBio}
          placeholder="Something true and a little specific…"
          singleLine={false}
          minLines={3}
          textStyle={{ ...T.bodyLarge, fontSize: 16 }}
        />
        <span style={{ ...T.bodySmall, fontSize: 12, color: RelunColors.Muted, alignSelf: 'flex-end' }}>
          {vm.bio.length}/150
        </span>
      </LabeledField>
      <div style={{ height: 4, flexShrink: 0 }} />
      <PrimaryButton
        text="Continue"
        onClick={() => vm.submitDetails(onNext)}
        enabled={detailsValid(vm)}
        loading={vm.submitting}
      />
    </>
  );
}

// ---------- Step 3: location ----------

function LocationStep({ onNext }: { onNext: () => void }) {
  const s = useSegment();
  const vm = useOnboardingViewModel();

  const enable = () => {
    void location.hasPermission().then((granted) => {
      if (granted) vm.onLocationPermission(true);
      else vm.enableLocation();
    });
  };

  const tile = (bg: string, icon: string, tint: string, outline: boolean) => (
    <div
      style={{
        marginTop: 8,
        width: 88,
        height: 88,
        borderRadius: 28,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon name={icon} size={42} color={tint} outline={outline} />
    </div>
  );

  if (vm.location !== 'denied') {
    return (
      <>
        {tile(s.tint, 'location_on', s.text, false)}
        <Heading text="Enable Location" />
        <p style={{ ...T.bodyMedium, color: RelunColors.Muted }}>
          We use your location to show you people nearby. You can change this any time in Settings.
        </p>
        <div style={{ paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Benefit icon="group" title="Find people nearby" body="Matches within your chosen distance" />
          <Benefit icon="navigation" title="Distance info" body="See roughly how far someone is" />
          <Benefit icon="verified_user" title="Exact location is never shared" body="Others only see a rounded distance" />
        </div>
        <Weight />
        {vm.location === 'granted' ? (
          <>
            <div
              role="status"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderRadius: 16,
                background: RelunColors.SuccessFill,
                padding: '14px 16px',
                flexShrink: 0,
              }}
            >
              <Icon name="check_circle" size={22} color={RelunColors.SuccessText} />
              <span style={{ ...T.labelMedium, fontSize: 15, color: RelunColors.SuccessText }}>
                {'Location enabled' + (vm.cityLabel ? ` · ${vm.cityLabel}` : '')}
              </span>
            </div>
            <PrimaryButton text="Continue" onClick={onNext} />
          </>
        ) : vm.location === 'loading' ? (
          <PrimaryButton text="Enable Location" onClick={() => {}} loading loadingText="Finding you…" />
        ) : (
          <>
            <PrimaryButton text="Enable Location" onClick={enable} />
            <LinkButton text="Not now" onClick={() => vm.onLocationPermission(false)} style={{ width: '100%' }} />
          </>
        )}
      </>
    );
  }

  return (
    <>
      {tile('#F1F1F1', 'location_on', RelunColors.Body, true)}
      <Heading text="Location is off" />
      <p style={{ ...T.bodyMedium, color: RelunColors.Muted }}>
        Relun needs an area to show you people nearby. Turn on location, or tell us your city instead.
      </p>
      <OutlineButton text="Open Settings" onClick={() => void openAppSettings(vm.enableLocation)} leadingIcon="settings" leadingIconOutline />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: RelunColors.Border }} />
        <span style={{ ...T.bodySmall, color: RelunColors.Muted }}>or enter a city</span>
        <div style={{ flex: 1, height: 1, background: RelunColors.Border }} />
      </div>
      <RelunTextField
        value={vm.cityInput}
        onChange={vm.setCityInput}
        placeholder="City, e.g. Lagos"
        autoComplete="address-level2"
        onEnter={() => vm.useCity(onNext)}
        leading={<Icon name="search" size={20} color={RelunColors.Muted} />}
      />
      <Weight />
      <PrimaryButton
        text="Use this city"
        onClick={() => vm.useCity(onNext)}
        enabled={vm.cityInput.trim().length > 1}
        loading={vm.submitting}
      />
    </>
  );
}

function Benefit({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <IconTile icon={icon} outline />
      <div>
        <div style={{ ...T.labelMedium, fontSize: 16, color: RelunColors.Ink }}>{title}</div>
        <div style={{ ...T.bodySmall, color: RelunColors.Muted }}>{body}</div>
      </div>
    </div>
  );
}

// ---------- Step 4: photos ----------

function PhotosStep({ onNext }: { onNext: () => void }) {
  const vm = useOnboardingViewModel();

  const add = async (index: number) => {
    const file = await pickImage();
    if (file) vm.addPhoto(index, file);
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Heading text="Add your photos" />
        <p style={{ ...T.bodyMedium, color: RelunColors.Muted }}>Add at least 2. Your first photo is your main one.</p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {vm.slots.map((slot, index) => (
          <PhotoSlotView
            key={index}
            slot={slot}
            main={index === 0}
            onAdd={() => void add(index)}
            onRemove={() => vm.removePhoto(index)}
            style={{ flex: 1, minWidth: 0 }}
          />
        ))}
      </div>
      <span style={{ ...T.bodySmall, color: RelunColors.Muted }}>{uploadedPhotos(vm).length}/3 photos</span>
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          borderRadius: 16,
          background: '#FFFFFF',
          border: `1px solid ${RelunColors.BorderSoft}`,
          padding: 16,
        }}
      >
        <span style={{ ...T.labelMedium, color: RelunColors.Ink }}>What works</span>
        <Tip icon="sentiment_satisfied" text="A clear face shot, smiling" />
        <Tip icon="schedule" text="Taken in the last year" />
        <Tip icon="wb_sunny" text="Good light, no sunglasses" />
      </div>
      <Weight />
      <PrimaryButton text="Finish" onClick={onNext} enabled={photosValid(vm)} />
    </>
  );
}

function Tip({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon name={icon} size={18} color={RelunColors.Body} outline />
      <span style={{ ...T.bodySmall, fontSize: 14, color: RelunColors.Body }}>{text}</span>
    </div>
  );
}

const INDETERMINATE_CSS = `
@keyframes relun-indeterminate {
  0% { left: -40%; width: 40%; }
  60% { left: 60%; width: 50%; }
  100% { left: 100%; width: 10%; }
}`;

/** One photo slot: dashed "Add" tile, uploading bar, or the photo with a remove button. Also used by the Me tab. */
export function PhotoSlotView({
  slot,
  main,
  onAdd,
  onRemove,
  style,
  seed = 'me',
}: {
  slot: PhotoSlot;
  main: boolean;
  onAdd: () => void;
  onRemove: () => void;
  style?: CSSProperties;
  seed?: string;
}) {
  const s = useSegment();
  return (
    <div style={{ position: 'relative', aspectRatio: '0.8', borderRadius: 16, overflow: 'hidden', ...style }}>
      {slot.kind === 'empty' && (
        <button
          type="button"
          className="press"
          onClick={onAdd}
          style={{
            position: 'absolute',
            inset: 0,
            background: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
          }}
        >
          <svg
            aria-hidden
            style={{
              position: 'absolute',
              top: 1,
              left: 1,
              width: 'calc(100% - 2px)',
              height: 'calc(100% - 2px)',
              overflow: 'visible',
              pointerEvents: 'none',
            }}
          >
            <rect width="100%" height="100%" rx={15} ry={15} fill="none" stroke="#CFCFCF" strokeWidth={2} strokeDasharray="4 3" />
          </svg>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: s.fill,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="add" size={22} color={s.onFill} label="Add photo" />
          </div>
          <div style={{ height: 6 }} />
          <span style={{ ...T.bodySmall, fontSize: 12, fontWeight: 500, color: RelunColors.Muted }}>Add</span>
        </button>
      )}
      {slot.kind === 'uploading' && (
        <div
          role="status"
          style={{
            position: 'absolute',
            inset: 0,
            background: '#EDEDED',
            padding: '0 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <style href="relun-indeterminate" precedence="default">
            {INDETERMINATE_CSS}
          </style>
          <span style={{ ...T.bodySmall, fontSize: 12, fontWeight: 500, color: RelunColors.Body }}>Uploading</span>
          <div style={{ height: 8 }} />
          <div
            role="progressbar"
            style={{ position: 'relative', width: '100%', height: 4, borderRadius: 2, overflow: 'hidden', background: '#D6D6D6' }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                background: s.fill,
                borderRadius: 2,
                animation: 'relun-indeterminate 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              }}
            />
          </div>
        </div>
      )}
      {slot.kind === 'done' && (
        <>
          <PersonPhoto url={slot.photo.url} seed={seed} initial="" radius={16} style={{ position: 'absolute', inset: 0 }} />
          <button
            type="button"
            aria-label="Remove photo"
            onClick={onRemove}
            className="press-plain"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 44,
              height: 44,
              padding: 6,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'flex-start',
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="close" size={16} color="#FFFFFF" />
            </span>
          </button>
        </>
      )}
      {main && slot.kind === 'done' && (
        <span
          style={{
            position: 'absolute',
            left: 6,
            bottom: 6,
            borderRadius: 999,
            background: RelunColors.Ink,
            padding: '3px 8px',
            ...T.labelSmall,
            fontSize: 11,
            color: '#FFFFFF',
          }}
        >
          Main
        </span>
      )}
    </div>
  );
}

// ---------- You're in ----------

function YoureInStep() {
  const s = useSegment();
  const vm = useOnboardingViewModel();
  const { loadNearbyCount } = vm;
  useEffect(() => {
    loadNearbyCount();
  }, [loadNearbyCount]);

  const photo = uploadedPhotos(vm)[0];
  const first = vm.name.trim().split(' ')[0] || 'friend';
  const label = s.label.toLowerCase();
  const count = vm.nearbyCount;
  const line =
    count == null
      ? 'Finding people near you…'
      : count === 0
        ? 'You’re early. We’ll show you new people as they join nearby.'
        : count === 1
          ? `1 person nearby is also looking for ${label}.`
          : count >= 50
            ? `50+ people nearby are also looking for ${label}.`
            : `${count} people nearby are also looking for ${label}.`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(circle 330px at center, ${RelunColors.HeroGlow}, transparent), ${RelunColors.HeroGradient}`,
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        className="scroll"
        style={{
          height: '100%',
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <Weight />
        <PersonPhoto
          url={photo?.url}
          seed="me"
          initial={vm.name.charAt(0).toUpperCase()}
          radius={28}
          initialSize={54}
          style={{ width: 148, aspectRatio: '0.8', border: '4px solid #FFFFFF' }}
        />
        <h1 style={{ ...T.displaySmall, color: '#FFFFFF', textAlign: 'center' }}>You’re in, {first}</h1>
        <p style={{ ...T.bodyLarge, fontWeight: 500, color: '#FFFFFF', textAlign: 'center' }}>{line}</p>
        <Weight />
        <PrimaryButton text="Start discovering" onClick={vm.finish} container="#FFFFFF" content={RelunColors.Ink} />
      </div>
    </div>
  );
}

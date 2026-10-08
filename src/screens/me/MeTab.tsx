import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { CircleIconButton, LinkButton, OutlineButton, PrimaryButton } from '../../components/Buttons';
import { ConfirmDialog, ListRow, RelunSheet, RowGroup, type DialogSpec } from '../../components/Controls';
import { Icon } from '../../components/Icon';
import { useSegment } from '../../components/segment';
import { CoinIcon, PersonPhoto, SectionHeader, SegmentPill } from '../../components/Visuals';
import type { Photo } from '../../data/models';
import { auth, calculateAge, completeness, people, profile } from '../../data/repositories';
import { messenger, useApp } from '../../data/store';
import { useAppActions } from '../../navigation/actions';
import { RelunColors, T } from '../../theme';
import { formatCoins } from '../../util/format';
import { compressForUpload, pickImage } from '../../util/images';
import { TabBarClearance, TabSurface, TabTitle } from '../main/TabCommon';

/** Android BuildConfig.VERSION_NAME / VERSION_CODE. */
const VERSION_LABEL = 'Relun 2.0.0 (build 57)';

const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message) || fallback;

/** Port of Android MeViewModel. */
function useMeViewModel() {
  const [likesCount, setLikes] = useState(0);
  const [viewsCount, setViews] = useState(0);
  const [uploading, setUploading] = useState<Set<number>>(new Set());
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const alive = useRef(true);

  const refresh = useCallback(() => {
    void profile.refresh().catch(() => {});
    void people
      .receivedLikes()
      .then((r) => alive.current && setLikes(r.count))
      .catch(() => {});
    void people
      .profileViews()
      .then((r) => alive.current && setViews(r.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    alive.current = true;
    refresh();
    const off = people.events.on((e) => e.type === 'insightsUnlocked' && refresh());
    // ON_RESUME: coming back to the page refreshes counts and photos.
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive.current = false;
      off();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const upload = async (slot: number, file: File, replace: Photo | null) => {
    setUploading((u) => new Set(u).add(slot));
    let bytes: Blob | null = null;
    try {
      bytes = await compressForUpload(file);
    } catch {
      bytes = null;
    }
    if (!bytes) {
      messenger.error('We couldn’t read that photo. Try another one.');
    } else {
      try {
        if (replace) await profile.replacePhoto(replace.id, bytes);
        else await profile.uploadPhoto(bytes);
        messenger.success('Photo saved');
      } catch (e) {
        messenger.error(errorText(e, 'Upload failed.'));
      }
    }
    if (alive.current)
      setUploading((u) => {
        const next = new Set(u);
        next.delete(slot);
        return next;
      });
  };

  const deletePhoto = (photo: Photo) => {
    if ((useApp.getState().me?.photos.length ?? 0) <= 2) {
      messenger.warning('Keep at least 2 photos on your profile.');
      return;
    }
    profile.deletePhoto(photo.id).catch((e) => messenger.error(errorText(e, 'Couldn’t remove that photo.')));
  };

  const confirmLogout = () =>
    setDialog({
      title: 'Log out?',
      body: 'You can sign back in any time with a one-time code.',
      confirm: 'Log out',
      onConfirm: () => void auth.signOut(),
    });

  const confirmDelete = () =>
    setDialog({
      title: 'Delete your account?',
      body: 'Your profile, matches and messages will be permanently removed. Unused coins can’t be refunded.',
      confirm: 'Delete account',
      destructive: true,
      onConfirm: () => {
        auth
          .deleteAccount()
          .then(() => messenger.info('Your account has been deleted.'))
          .catch((e) => messenger.error(errorText(e, 'Couldn’t delete your account.')));
      },
    });

  return {
    likesCount,
    viewsCount,
    uploading,
    dialog,
    addPhoto: (slot: number, file: File) => void upload(slot, file, null),
    replacePhoto: (slot: number, photo: Photo, file: File) => void upload(slot, file, photo),
    deletePhoto,
    soon: (text = 'Coming soon') => messenger.info(text),
    confirmLogout,
    confirmDelete,
    dismissDialog: () => setDialog(null),
  };
}

export function MeTab() {
  const vm = useMeViewModel();
  const me = useApp((s) => s.me);
  const wallet = useApp((s) => s.wallet);
  const actions = useAppActions();
  const seg = useSegment();
  const [photoMenu, setPhotoMenu] = useState<[number, Photo] | null>(null);

  const pick = async (slot: number, replace: Photo | null) => {
    const file = await pickImage();
    if (!file) return;
    if (replace) vm.replacePhoto(slot, replace, file);
    else vm.addPhoto(slot, file);
  };

  const pct = me ? completeness(me) : 0;
  const age = me?.dateOfBirth ? calculateAge(me.dateOfBirth) : null;
  const initial = me?.name.charAt(0).toUpperCase() || (me ? '?' : '');
  const photos = me?.photos ?? [];
  const bioBlank = !me?.bio.trim();

  return (
    <TabSurface>
      <div className="scroll status-pad" style={{ flex: 1, paddingBottom: TabBarClearance }}>
        <TabTitle
          title="Profile"
          actions={<CircleIconButton icon="settings" outline label="Settings" onClick={actions.openSettings} />}
        />

        {/* Avatar with completeness ring. */}
        <div
          style={{
            width: '100%',
            padding: '12px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ position: 'relative', width: 132, height: 132, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CompletenessRing pct={pct} color={seg.fill} />
            <PersonPhoto
              url={me?.photos[0]?.url}
              seed="me"
              initial={initial}
              radius="50%"
              initialSize={44}
              failureLabel={null}
              style={{ width: 114, height: 114 }}
            />
            <span
              style={{
                position: 'absolute',
                left: '50%',
                bottom: -8,
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                borderRadius: 999,
                background: RelunColors.Ink,
                padding: '3px 10px',
                ...T.labelSmall,
                color: '#FFFFFF',
              }}
            >
              {`${pct}% complete`}
            </span>
          </div>
          <span style={{ ...T.headlineSmall, color: RelunColors.Ink, paddingTop: 10, textAlign: 'center' }}>
            {[me?.name.trim() ? me.name : null, age?.toString()].filter(Boolean).join(', ')}
          </span>
          <SegmentPill text={seg.label} style={{ alignSelf: 'center' }} />
          <span
            style={{
              ...T.bodyMedium,
              color: bioBlank ? RelunColors.Faint : RelunColors.Ink,
              textAlign: 'center',
              maxWidth: 300,
            }}
          >
            {bioBlank ? 'Add a short bio so people know what you’re about.' : me!.bio}
          </span>
          <OutlineButton
            text="Edit profile"
            onClick={actions.openEditProfile}
            style={{ maxWidth: 180 }}
            leadingIcon="edit"
            leadingIconOutline
            height={44}
          />
        </div>

        {/* Relun Plus */}
        <div style={{ padding: '0 16px 16px' }}>
          <button
            type="button"
            className="press"
            onClick={actions.openPlus}
            style={{
              width: '100%',
              borderRadius: 24,
              background: wallet.plus ? seg.tint : seg.fill,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textAlign: 'left',
            }}
          >
            <Icon name="workspace_premium" size={30} color={wallet.plus ? seg.text : seg.onFill} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ ...T.titleSmall, color: wallet.plus ? RelunColors.Ink : seg.onFill }}>
                {wallet.plus ? `Relun Plus · ${wallet.plus.plan === 'weekly' ? 'Weekly' : 'Monthly'}` : 'Get Relun Plus'}
              </span>
              <span style={{ ...T.bodySmall, color: wallet.plus ? RelunColors.Body : seg.onFill }}>
                {wallet.plus
                  ? `${wallet.plus.autoRenew ? 'Renews' : 'Ends'} ${wallet.plus.until.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
                  : 'Unlimited likes, see who likes you, free message requests'}
              </span>
            </div>
            <Icon name="chevron_right" size={22} color={wallet.plus ? seg.text : seg.onFill} />
          </button>
        </div>

        {/* Insights */}
        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              borderRadius: 24,
              background: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(70,30,20,0.16)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', gap: 10 }}>
              <Stat
                icon="favorite"
                label="Likes"
                value={vm.likesCount}
                open={wallet.insightsActive}
                onClick={() => (wallet.insightsActive ? actions.openLikes() : actions.openInsights())}
              />
              <Stat
                icon="visibility"
                label="Views"
                value={vm.viewsCount}
                open={wallet.insightsActive}
                onClick={() => (wallet.insightsActive ? actions.openViews() : actions.openInsights())}
              />
            </div>
            {!wallet.insightsActive ? (
              <PrimaryButton
                text="Unlock Likes & Views"
                onClick={actions.openInsights}
                leadingIcon="lock_open"
                height={48}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <Icon name="check_circle" size={16} color={RelunColors.SuccessText} />
                <span style={{ ...T.labelMedium, fontSize: 13, color: RelunColors.SuccessText, whiteSpace: 'pre' }}>
                  {'  Insights active'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Photos */}
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionHeader text="My photos" style={{ padding: '0 4px' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1, 2].map((i) => {
              const photo = photos[i] ?? null;
              const slot: SlotState = vm.uploading.has(i) ? { kind: 'uploading' } : photo ? { kind: 'done', photo } : { kind: 'empty' };
              return (
                <div
                  key={i}
                  role={photo ? 'button' : undefined}
                  tabIndex={photo ? 0 : undefined}
                  className={photo ? 'press' : undefined}
                  onClick={photo ? () => setPhotoMenu([i, photo]) : undefined}
                  onKeyDown={
                    photo
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') setPhotoMenu([i, photo]);
                        }
                      : undefined
                  }
                  style={{ flex: 1, minWidth: 0, borderRadius: 16 }}
                >
                  <PhotoSlotView
                    slot={slot}
                    main={i === 0}
                    onAdd={() => void pick(i, null)}
                    onRemove={() => photo && setPhotoMenu([i, photo])}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Menu */}
        <div style={{ padding: '0 16px 16px' }}>
          <RowGroup>
            <ListRow title="Get Coins" onClick={actions.openCoins} leading={<CoinIcon size={24} />} value={formatCoins(wallet.balance)} />
            <ListRow title="Edit Profile" onClick={actions.openEditProfile} leading={<RowIcon icon="edit" />} />
            <ListRow
              title="Verification"
              onClick={() => vm.soon('Photo verification is coming soon')}
              leading={<RowIcon icon="verified_user" />}
              showChevron={false}
              trailing={
                <span
                  style={{
                    ...T.bodySmall,
                    fontSize: 12,
                    color: RelunColors.Body,
                    borderRadius: 999,
                    background: '#F1F1F1',
                    padding: '2px 8px',
                  }}
                >
                  Soon
                </span>
              }
            />
            <ListRow title="Settings" onClick={actions.openSettings} leading={<RowIcon icon="settings" />} />
            <ListRow title="Help & Support" onClick={() => vm.soon()} leading={<RowIcon icon="help" />} />
            <ListRow title="Privacy Policy" onClick={() => vm.soon()} leading={<RowIcon icon="description" />} />
            <ListRow title="About" onClick={() => vm.soon(VERSION_LABEL)} leading={<RowIcon icon="info" />} divider={false} />
          </RowGroup>
        </div>

        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <LinkButton
            text="Log out"
            onClick={vm.confirmLogout}
            style={{ width: '100%', height: 50 }}
            textStyle={{ ...T.labelLarge, fontSize: 16 }}
          />
          <LinkButton
            text="Delete account"
            onClick={vm.confirmDelete}
            style={{ width: '100%', height: 50 }}
            color={RelunColors.Error}
            textStyle={{ ...T.labelLarge, fontSize: 16 }}
          />
          <span style={{ ...T.bodySmall, fontSize: 12, color: RelunColors.Muted, padding: '8px 0' }}>{VERSION_LABEL}</span>
        </div>
      </div>

      {photoMenu && (
        <RelunSheet onDismiss={() => setPhotoMenu(null)}>
          <span style={{ ...T.titleLarge, color: RelunColors.Ink }}>Photo</span>
          <OutlineButton
            text="Replace photo"
            onClick={() => {
              const [slot, photo] = photoMenu;
              setPhotoMenu(null);
              void pick(slot, photo);
            }}
          />
          <OutlineButton
            text="Remove photo"
            textColor={RelunColors.Error}
            onClick={() => {
              const photo = photoMenu[1];
              setPhotoMenu(null);
              vm.deletePhoto(photo);
            }}
          />
        </RelunSheet>
      )}
      {vm.dialog && <ConfirmDialog spec={vm.dialog} onDismiss={vm.dismissDialog} />}
    </TabSurface>
  );
}

function CompletenessRing({ pct, color }: { pct: number; color: string }) {
  const stroke = 5;
  const r = 66 - stroke / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width={132} height={132} viewBox="0 0 132 132" style={{ position: 'absolute', inset: 0 }} aria-hidden>
      <circle cx={66} cy={66} r={r} fill="none" stroke="#ECECEC" strokeWidth={stroke} />
      {pct > 0 && (
        <circle
          cx={66}
          cy={66}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(circumference * pct) / 100} ${circumference}`}
          transform="rotate(-90 66 66)"
        />
      )}
    </svg>
  );
}

const RowIcon = ({ icon }: { icon: string }) => <Icon name={icon} outline size={22} color={RelunColors.Ink} />;

function Stat({
  icon,
  label,
  value,
  open,
  onClick,
}: {
  icon: string;
  label: string;
  value: number;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="press"
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: 16,
        background: '#F7F7F7',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        textAlign: 'left',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} outline size={15} color={RelunColors.Muted} />
        <span style={{ ...T.bodySmall, color: RelunColors.Muted }}>{label}</span>
      </span>
      {/* Without insights the number is shown, but who is behind it is not. */}
      <span style={{ ...T.headlineSmall, fontSize: 26, color: RelunColors.Ink }}>{value}</span>
      {!open && <span style={{ ...T.bodySmall, fontSize: 11, color: RelunColors.Faint }}>Tap to see who</span>}
    </button>
  );
}

// ---------- Photo slot (Android onboarding PhotoSlotView, kept local) ----------

type SlotState = { kind: 'empty' } | { kind: 'uploading' } | { kind: 'done'; photo: Photo };

const PROGRESS_CSS = `
@keyframes me-indeterminate {
  0% { left: -40%; width: 40%; }
  60% { left: 60%; width: 50%; }
  100% { left: 100%; width: 10%; }
}`;

function PhotoSlotView({
  slot,
  main,
  onAdd,
  onRemove,
}: {
  slot: SlotState;
  main: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const s = useSegment();
  const fill: CSSProperties = { position: 'absolute', inset: 0 };
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '0.8', borderRadius: 16, overflow: 'hidden' }}>
      {slot.kind === 'empty' && (
        <button
          type="button"
          className="press"
          onClick={onAdd}
          style={{
            ...fill,
            background: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            style={{ position: 'absolute', inset: 1, width: 'calc(100% - 2px)', height: 'calc(100% - 2px)', overflow: 'visible', pointerEvents: 'none' }}
            aria-hidden
          >
            <rect
              width="100%"
              height="100%"
              rx={15}
              fill="none"
              stroke="#CFCFCF"
              strokeWidth={2}
              strokeDasharray="3.6 2.9"
            />
          </svg>
          <span
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
          </span>
          <span style={{ height: 6 }} />
          <span style={{ ...T.bodySmall, fontSize: 12, fontWeight: 500, color: RelunColors.Muted }}>Add</span>
        </button>
      )}
      {slot.kind === 'uploading' && (
        <div
          style={{
            ...fill,
            background: '#EDEDED',
            padding: '0 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <style>{PROGRESS_CSS}</style>
          <span style={{ ...T.bodySmall, fontSize: 12, fontWeight: 500, color: RelunColors.Body }}>Uploading</span>
          <span style={{ height: 8 }} />
          <div
            role="progressbar"
            style={{ position: 'relative', width: '100%', height: 4, borderRadius: 2, background: '#D6D6D6', overflow: 'hidden' }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                borderRadius: 2,
                background: s.fill,
                animation: 'me-indeterminate 1.4s cubic-bezier(0.4,0,0.2,1) infinite',
              }}
            />
          </div>
        </div>
      )}
      {slot.kind === 'done' && (
        <>
          <PersonPhoto url={slot.photo.url} seed="me" initial="" radius={16} style={fill} />
          <button
            type="button"
            aria-label="Remove photo"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
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

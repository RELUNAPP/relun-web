import { useEffect, useState, type ReactNode } from 'react';
import { BackButton, LinkButton } from '../../components/Buttons';
import { ConfirmDialog, ListRow, RowGroup, ToggleRow, type DialogSpec } from '../../components/Controls';
import { Icon } from '../../components/Icon';
import { useSegment } from '../../components/segment';
import { Avatar, EmptyState, SectionHeader, SegmentPill } from '../../components/Visuals';
import type { BlockedUserDto, SettingsDto, SettingsPatch } from '../../data/dtos';
import { auth, profile, safety, settings as settingsRepo } from '../../data/repositories';
import { messenger, useApp } from '../../data/store';
import { useAppActions } from '../../navigation/actions';
import { RelunColors, T } from '../../theme';
import { formatCoins } from '../../util/format';
import { location } from '../../util/location';

/** Android BuildConfig.VERSION_NAME / VERSION_CODE. */
const VERSION_LABEL = 'Relun 2.0.0 (build 57)';

const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message) || fallback;

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px', flexShrink: 0 }}>
      <BackButton onClick={onBack} />
      <span style={{ ...T.headlineSmall, color: RelunColors.Ink }}>{title}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <SectionHeader text={title} style={{ paddingLeft: 20, paddingBottom: 8 }} />
      <div style={{ padding: '0 16px 20px' }}>
        <RowGroup>{children}</RowGroup>
      </div>
    </>
  );
}

export function SettingsScreen() {
  const actions = useAppActions();
  const seg = useSegment();
  const settings = useApp((s) => s.settings);
  const wallet = useApp((s) => s.wallet);
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const [blockedCount, setBlockedCount] = useState<number | null>(null);
  const [locationOn, setLocationOn] = useState(false);

  useEffect(() => {
    let alive = true;
    void settingsRepo.refresh().catch(() => {});
    safety
      .blocked()
      .then((list) => alive && setBlockedCount(list.length))
      .catch(() => {});
    void location.hasPermission().then((on) => alive && setLocationOn(on));
    return () => {
      alive = false;
    };
  }, []);

  const patch = (p: SettingsPatch, optimistic: SettingsDto) => {
    settingsRepo.update(p, optimistic).catch((e) => messenger.error(errorText(e, 'Couldn’t save that setting.')));
  };

  const filtersHint = () => messenger.info('Change this from the filters button on Discover');
  const top = settings.ageMax >= 99 ? '70+' : String(settings.ageMax);

  /**
   * Android opens the app's system settings. On the web a tap asks the browser
   * directly, then saves the new position so Discover uses it.
   */
  const openLocation = async () => {
    const before = await location.permissionState();
    if (before === 'unavailable') {
      messenger.info('Location needs a secure (https) connection. Open Relun from its https address to turn it on.');
      return;
    }
    if (before === 'denied') {
      setLocationOn(false);
      messenger.info('Location is blocked for this site. Tap the icon next to the web address, allow Location, then try again.');
      return;
    }
    const fix = await location.current();
    if (!fix) {
      const after = await location.permissionState();
      setLocationOn(false);
      if (after === 'denied') messenger.info('Location is off. You can turn it on here any time.');
      else messenger.error('Couldn’t get your location. Try again.');
      return;
    }
    const wasOn = locationOn;
    setLocationOn(true);
    messenger.success(wasOn ? 'Location updated' : 'Location is on');
    const city = await location.cityName(fix);
    profile.updateLocation(fix.latitude, fix.longitude, city).catch(() => {});
  };

  return (
    <div
      className="status-pad"
      style={{ position: 'absolute', inset: 0, background: RelunColors.Background, display: 'flex', flexDirection: 'column' }}
    >
      <Header title="Settings" onBack={actions.back} />
      <div className="scroll" style={{ flex: 1 }}>
        <div className="nav-pad" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ paddingTop: 10, paddingBottom: 40, display: 'flex', flexDirection: 'column' }}>
            <Section title="Discovery">
              <ListRow title="Age range" onClick={filtersHint} value={`${settings.ageMin}–${top}`} />
              <ListRow title="Maximum distance" onClick={filtersHint} value={`${settings.maxDistanceKm} km`} />
              <ListRow
                title="Looking for"
                onClick={null}
                divider={false}
                showChevron={false}
                trailing={
                  <>
                    <Icon name="lock" size={14} color={RelunColors.Muted} />
                    <SegmentPill text={seg.label} small style={{ alignSelf: 'center' }} />
                  </>
                }
              />
            </Section>
            <Section title="Privacy">
              <ToggleRow
                title="Visible in Discover"
                checked={settings.isVisible}
                subtitle="Turn off to pause your profile"
                onToggle={() => patch({ isVisible: !settings.isVisible }, { ...settings, isVisible: !settings.isVisible })}
              />
              <ToggleRow
                title="Show my age"
                checked={settings.showAge}
                onToggle={() => patch({ showAge: !settings.showAge }, { ...settings, showAge: !settings.showAge })}
              />
              <ToggleRow
                title="Show my distance"
                checked={settings.showDistance}
                onToggle={() =>
                  patch({ showDistance: !settings.showDistance }, { ...settings, showDistance: !settings.showDistance })
                }
              />
              <ListRow
                title="Blocked users"
                onClick={actions.openBlocked}
                value={blockedCount != null ? `${blockedCount} blocked` : null}
                divider={false}
              />
            </Section>
            <Section title="Preferences">
              <ToggleRow
                title="Push notifications"
                checked={settings.notificationsEnabled}
                onToggle={() => {
                  const next = !settings.notificationsEnabled;
                  // Turning it on also asks the browser, which Android does at sign-in.
                  if (next && 'Notification' in window && Notification.permission === 'default') {
                    void Notification.requestPermission().catch(() => {});
                  }
                  patch({ notificationsEnabled: next }, { ...settings, notificationsEnabled: next });
                }}
              />
              <ListRow
                title="Location services"
                onClick={() => void openLocation()}
                value={locationOn ? 'On' : 'Off'}
                subtitle={locationOn ? null : 'Tap to turn on'}
                divider={false}
              />
            </Section>
            <Section title="Account">
              <ListRow title="Coins & purchases" onClick={actions.openCoins} value={formatCoins(wallet.balance)} />
              <ListRow title="Help" onClick={() => messenger.info('Coming soon')} />
              <ListRow title="Terms of Service" onClick={() => messenger.info('Coming soon')} />
              <ListRow
                title="Log out"
                onClick={() =>
                  setDialog({
                    title: 'Log out?',
                    body: 'You can sign back in any time with a one-time code.',
                    confirm: 'Log out',
                    onConfirm: () => void auth.signOut(),
                  })
                }
                showChevron={false}
              />
              <ListRow
                title="Delete account"
                onClick={() =>
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
                  })
                }
                leading={<Icon name="delete" outline size={20} color={RelunColors.Error} />}
                titleColor={RelunColors.Error}
                showChevron={false}
                divider={false}
              />
            </Section>
            <span style={{ ...T.bodySmall, fontSize: 12, color: RelunColors.Muted, alignSelf: 'center' }}>{VERSION_LABEL}</span>
          </div>
        </div>
      </div>
      {dialog && <ConfirmDialog spec={dialog} onDismiss={() => setDialog(null)} />}
    </div>
  );
}

export function BlockedUsersScreen() {
  const actions = useAppActions();
  const seg = useSegment();
  const [blocked, setBlocked] = useState<BlockedUserDto[] | null>(null);

  useEffect(() => {
    let alive = true;
    safety
      .blocked()
      .then((list) => alive && setBlocked(list))
      .catch((e) => {
        if (alive) setBlocked([]);
        messenger.error(errorText(e, 'Couldn’t load blocked users.'));
      });
    return () => {
      alive = false;
    };
  }, []);

  const unblock = async (user: BlockedUserDto) => {
    try {
      await safety.unblock(user.userId);
      setBlocked((list) => list?.filter((u) => u.userId !== user.userId) ?? null);
      messenger.info(`${user.fullName.split(' ')[0]} is unblocked`);
    } catch (e) {
      messenger.error(errorText(e, 'Couldn’t unblock.'));
    }
  };

  return (
    <div
      className="status-pad nav-pad"
      style={{ position: 'absolute', inset: 0, background: RelunColors.Background, display: 'flex', flexDirection: 'column' }}
    >
      <Header title="Blocked users" onBack={actions.back} />
      {blocked != null && blocked.length === 0 && (
        <EmptyState icon="block" title="No one is blocked" body="People you block can’t see your profile or message you." />
      )}
      <div className="scroll" style={{ flex: 1 }}>
        {(blocked ?? []).map((user) => (
          <div key={user.userId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 20px' }}>
            <Avatar url={user.photoUrl} seed={user.userId} initial={user.fullName.slice(0, 1).toUpperCase()} size={48} />
            <span style={{ ...T.titleSmall, color: RelunColors.Ink, flex: 1, minWidth: 0 }}>{user.fullName}</span>
            <LinkButton text="Unblock" onClick={() => void unblock(user)} color={seg.text} />
          </div>
        ))}
      </div>
    </div>
  );
}

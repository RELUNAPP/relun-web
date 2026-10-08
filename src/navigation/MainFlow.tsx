import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/Controls';
import { useApp } from '../data/store';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { MainScreen } from '../screens/main/MainScreen';
import { MatchOverlay } from '../screens/match/MatchOverlay';
import { EditProfileScreen } from '../screens/me/EditProfileScreen';
import { ProfileViewsScreen } from '../screens/me/ProfileViewsScreen';
import { PersonProfileScreen } from '../screens/profile/PersonProfileScreen';
import { BlockedUsersScreen, SettingsScreen } from '../screens/settings/SettingsScreen';
import { CoinsSheet, InsightsSheet, MoreSheet, UnlockChatSheet, WelcomeCoinsSheet } from '../screens/sheets/Sheets';
import { shell, shellNav, useShell } from './shell';
import { Stack } from './Stack';

function PersonRoute() {
  const { userId = '' } = useParams();
  return <PersonProfileScreen userId={userId} />;
}

function ChatRoute() {
  const { userId = '' } = useParams();
  const name = (useLocation().state as { name?: string } | null)?.name ?? '';
  return <ChatScreen userId={userId} initialName={name} />;
}

/** The signed-in app: tabs underneath, pushed screens, sheets, match and dialogs on top. */
export function MainFlow() {
  const navigate = useNavigate();
  const state = useShell();
  const wallet = useApp((s) => s.wallet);

  useEffect(() => {
    shell.reset();
    shell.offerBonus(useApp.getState().wallet.pendingBonus);
    const unsubscribeWallet = useApp.subscribe((s, prev) => {
      if (s.wallet.pendingBonus !== prev.wallet.pendingBonus) shell.offerBonus(s.wallet.pendingBonus);
    });
    const unsubscribeNav = shellNav.on((event) => {
      if (event.type === 'openChat') navigate(`/chat/${event.userId}`, { state: { name: event.name } });
      else navigate('/', { replace: true });
    });
    return () => {
      unsubscribeWallet();
      unsubscribeNav();
    };
  }, [navigate]);

  const sheet = state.sheet;

  return (
    <>
      <Stack
        base={<MainScreen />}
        routes={[
          { path: '/person/:userId', element: <PersonRoute /> },
          { path: '/chat/:userId', element: <ChatRoute /> },
          { path: '/settings', element: <SettingsScreen /> },
          { path: '/blocked', element: <BlockedUsersScreen /> },
          { path: '/edit-profile', element: <EditProfileScreen /> },
          { path: '/views', element: <ProfileViewsScreen /> },
        ]}
      />

      {state.match && (
        <MatchOverlay
          person={state.match}
          onMessage={() => void shell.openChat(state.match!)}
          onKeepBrowsing={shell.dismissMatch}
        />
      )}

      {sheet?.kind === 'coins' && (
        <CoinsSheet
          wallet={wallet}
          selected={state.selectedPackage}
          buying={state.buying}
          onSelect={shell.selectPackage}
          onBuy={() => void shell.buy()}
          onDismiss={shell.closeSheet}
        />
      )}
      {sheet?.kind === 'unlock' && (
        <UnlockChatSheet
          person={sheet.person}
          wallet={wallet}
          unlocking={state.unlocking}
          onUnlock={() => void shell.unlock(sheet.person)}
          onDismiss={shell.closeSheet}
        />
      )}
      {sheet?.kind === 'insights' && (
        <InsightsSheet wallet={wallet} onUnlock={() => void shell.buyInsights()} onDismiss={shell.closeSheet} />
      )}
      {sheet?.kind === 'bonus' && <WelcomeCoinsSheet bonus={sheet.bonus} wallet={wallet} onDismiss={shell.closeSheet} />}
      {sheet?.kind === 'more' && (
        <MoreSheet
          person={sheet.person}
          onReport={() => shell.confirmReport(sheet.person)}
          onBlock={() => shell.confirmBlock(sheet.person)}
          onDismiss={shell.closeSheet}
        />
      )}

      {state.dialog && <ConfirmDialog spec={state.dialog} onDismiss={shell.dismissDialog} />}
    </>
  );
}

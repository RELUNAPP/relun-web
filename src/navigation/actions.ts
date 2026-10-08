import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Person } from '../data/models';
import { shell } from './shell';
import { useBack } from './Stack';

/** What any signed-in screen can ask the shell to do. Mirrors Android AppActions. */
export type AppActions = {
  openProfile: (userId: string) => void;
  openChat: (person: Person) => void;
  openCoins: () => void;
  openInsights: () => void;
  /** Relun Plus: plans, or the user's own status. */
  openPlus: () => void;
  /** The list behind the bell. */
  openNotifications: () => void;
  /** Messages tab, "Likes You". */
  openLikes: () => void;
  openMore: (person: Person) => void;
  openSettings: () => void;
  openBlocked: () => void;
  openEditProfile: () => void;
  /** Who viewed my profile (needs insights). */
  openViews: () => void;
  back: () => void;
};

export function useAppActions(): AppActions {
  const navigate = useNavigate();
  const back = useBack();
  return useMemo(
    () => ({
      openProfile: (userId) => navigate(`/person/${userId}`),
      openChat: (person) => void shell.openChat(person),
      openCoins: () => shell.openCoins(),
      openInsights: shell.openInsights,
      openPlus: shell.openPlus,
      openNotifications: () => navigate('/notifications'),
      openLikes: shell.showLikes,
      openMore: shell.openMore,
      openSettings: () => navigate('/settings'),
      openBlocked: () => navigate('/blocked'),
      openEditProfile: () => navigate('/edit-profile'),
      openViews: () => navigate('/views'),
      back,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate],
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DialogSpec } from '../../components/Controls';
import { firstName, type DatePost, type DateRequestStatus } from '../../data/models';
import { ApiException } from '../../data/network';
import { dates, people } from '../../data/repositories';
import { messenger } from '../../data/store';
import type { LoadState } from '../main/TabCommon';

export type DatesView = 'browse' | 'mine';

export type DatesState = {
  view: DatesView;
  browseLoad: LoadState;
  browse: DatePost[];
  mine: DatePost[];
  mineLoaded: boolean;
  offline: boolean;
  creating: boolean;
  posting: boolean;
  dialog: DialogSpec | null;
};

const initialState: DatesState = {
  view: 'browse',
  browseLoad: 'loading',
  browse: [],
  mine: [],
  mineLoaded: false,
  offline: false,
  creating: false,
  posting: false,
  dialog: null,
};

const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message) || fallback;

/** Port of Android DatesViewModel. */
export function useDatesViewModel() {
  const [state, setState] = useState<DatesState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const alive = useRef(true);

  const update = useCallback((fn: (s: DatesState) => DatesState) => {
    if (alive.current) setState(fn);
  }, []);

  const vm = useMemo(() => {
    const loadBrowse = (quiet = false) => {
      if (!quiet) update((s) => ({ ...s, browseLoad: 'loading' }));
      dates
        .browse()
        .then((list) =>
          update((s) => ({ ...s, browse: list, browseLoad: list.length === 0 ? 'empty' : 'ready', offline: false })),
        )
        .catch((e) => {
          const network = e instanceof ApiException && e.isNetwork;
          update((s) => (s.browse.length > 0 ? { ...s, offline: network } : { ...s, browseLoad: 'error', offline: network }));
        });
    };

    const loadMine = () => {
      dates
        .mine()
        .then((list) => update((s) => ({ ...s, mine: list, mineLoaded: true })))
        .catch(() => {});
    };

    const setView = (view: DatesView) => {
      update((s) => ({ ...s, view }));
      if (view === 'mine') loadMine();
      else loadBrowse(true);
    };

    const setBrowseStatus = (dateId: string, status: DateRequestStatus | null) =>
      update((s) => ({ ...s, browse: s.browse.map((d) => (d.id === dateId ? { ...d, myRequestStatus: status } : d)) }));

    const setRequestStatus = (dateId: string, requestId: string, status: DateRequestStatus) =>
      update((s) => ({
        ...s,
        mine: s.mine.map((d) =>
          d.id !== dateId ? d : { ...d, requests: d.requests.map((r) => (r.id === requestId ? { ...r, status } : r)) },
        ),
      }));

    const join = async (post: DatePost) => {
      setBrowseStatus(post.id, 'pending');
      try {
        await dates.join(post.id);
        messenger.success(`Interest sent to ${post.owner ? firstName(post.owner) : 'them'}`);
      } catch (e) {
        setBrowseStatus(post.id, null);
        messenger.error(errorText(e, 'Couldn’t send interest.'));
      }
    };

    /** Safety reminder first, then the confirmation, then the request. */
    const interested = (post: DatePost) => {
      const owner = post.owner;
      if (!owner) return;
      update((s) => ({
        ...s,
        dialog: {
          title: 'Before you meet',
          body: 'Please make sure your first meeting is in a public, open place, and tell a friend where you’re going.',
          confirm: 'I understand',
          icon: 'shield',
          // ConfirmDialog dismisses before calling this; queued updates keep that order.
          onConfirm: () =>
            update((st) => ({
              ...st,
              dialog: {
                title: 'Send interest?',
                body: `Send interest to ${firstName(owner)} for “${post.activity}”?`,
                confirm: 'Send interest',
                onConfirm: () => void join(post),
              },
            })),
        },
      }));
    };

    const post = async (activity: string, place: string, at: Date, description: string | null) => {
      update((s) => ({ ...s, posting: true }));
      try {
        const created = await dates.create(activity, place, at, description);
        update((s) => ({ ...s, posting: false, creating: false, view: 'mine', mine: [created, ...s.mine] }));
        messenger.success('Your date is live');
      } catch (e) {
        update((s) => ({ ...s, posting: false }));
        messenger.error(errorText(e, 'Couldn’t post your date.'));
      }
    };

    const remove = async (post: DatePost) => {
      const before = stateRef.current.mine;
      update((s) => ({ ...s, mine: s.mine.filter((d) => d.id !== post.id) }));
      try {
        await dates.delete(post.id);
        messenger.info('Date removed');
      } catch (e) {
        update((s) => ({ ...s, mine: before }));
        messenger.error(errorText(e, 'Couldn’t delete the date.'));
      }
    };

    const confirmDelete = (post: DatePost) =>
      update((s) => ({
        ...s,
        dialog: {
          title: 'Delete this date?',
          body: 'People who asked to join will be notified.',
          confirm: 'Delete',
          destructive: true,
          onConfirm: () => void remove(post),
        },
      }));

    const respond = async (post: DatePost, requestId: string, accept: boolean) => {
      setRequestStatus(post.id, requestId, accept ? 'accepted' : 'declined');
      try {
        await dates.respond(post.id, requestId, accept);
        if (accept) {
          const who = post.requests.find((r) => r.id === requestId)?.person;
          messenger.success(`You and ${who ? firstName(who) : 'they'} can now chat`);
          people.emit({ type: 'matchesChanged' });
        }
      } catch (e) {
        setRequestStatus(post.id, requestId, 'pending');
        messenger.error(errorText(e, 'Couldn’t update the request.'));
      }
    };

    return {
      setView,
      loadBrowse,
      loadMine,
      openCreate: (open: boolean) => update((s) => ({ ...s, creating: open })),
      dismissDialog: () => update((s) => ({ ...s, dialog: null })),
      interested,
      post: (activity: string, place: string, at: Date, description: string | null) =>
        void post(activity, place, at, description),
      confirmDelete,
      respond: (post: DatePost, requestId: string, accept: boolean) => void respond(post, requestId, accept),
    };
  }, [update]);

  useEffect(() => {
    alive.current = true;
    vm.loadBrowse();
    vm.loadMine();
    const off = people.events.on((e) => {
      if (e.type === 'blocked') update((s) => ({ ...s, browse: s.browse.filter((d) => d.owner?.id !== e.userId) }));
    });
    return () => {
      alive.current = false;
      off();
    };
  }, [vm, update]);

  return { state, vm };
}

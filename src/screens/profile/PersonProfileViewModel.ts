import { useCallback, useEffect, useRef, useState } from 'react';
import { firstName, type Person } from '../../data/models';
import { isLikeLimit, people } from '../../data/repositories';
import { messenger } from '../../data/store';

export type PersonState = { person: Person | null; loading: boolean; error: string | null };

/** Android's PersonProfileViewModel (declared inside PersonProfileScreen.kt). */
export function usePersonProfileViewModel(userId: string) {
  const [state, setState] = useState<PersonState>({ person: null, loading: true, error: null });
  const alive = useRef(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  const safeSet = useCallback((fn: (s: PersonState) => PersonState) => {
    if (alive.current) setState(fn);
  }, []);
  const update = useCallback(
    (block: (p: Person) => Person) => safeSet((s) => ({ ...s, person: s.person ? block(s.person) : null })),
    [safeSet],
  );

  const load = useCallback(() => {
    safeSet((s) => ({ ...s, loading: true, error: null }));
    people
      .person(userId)
      .then((p) => safeSet(() => ({ person: p, loading: false, error: null })))
      .catch((e: unknown) => safeSet((s) => ({ ...s, loading: false, error: (e as Error)?.message || null })));
  }, [userId, safeSet]);

  useEffect(() => {
    alive.current = true;
    load();
    const off = people.events.on((e) => {
      if (e.type === 'matched' && e.userId === userId) update((p) => ({ ...p, isMatch: true }));
      else if (e.type === 'liked' && e.userId === userId) update((p) => ({ ...p, liked: true, isMatch: p.isMatch || e.isMatch }));
      else if ((e.type === 'requestSent' || e.type === 'requestDeclined') && e.userId === userId) load();
    });
    return () => {
      alive.current = false;
      off();
    };
  }, [userId, load, update]);

  const like = useCallback(() => {
    const p = stateRef.current.person;
    if (!p || p.liked || p.isMatch) return;
    update((x) => ({ ...x, liked: true }));
    people.like(p).catch((e: unknown) => {
      update((x) => ({ ...x, liked: false }));
      // Out of likes: the shell shows the Plus offer instead.
      if (!isLikeLimit(e)) messenger.error((e as Error)?.message || `Couldn’t like ${firstName(p)}.`);
    });
  }, [update]);

  const pass = useCallback(
    (onDone: () => void) => {
      people.pass(userId).catch(() => undefined);
      onDone();
    },
    [userId],
  );

  return { state, load, like, pass };
}

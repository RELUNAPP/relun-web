import { useEffect } from 'react';
import { create } from 'zustand';
import type { Person } from '../../data/models';
import { firstName } from '../../data/models';
import { ApiException } from '../../data/network';
import { isLikeLimit, people, settings } from '../../data/repositories';
import { getApp, messenger, useApp } from '../../data/store';
import { location } from '../../util/location';
import type { LoadState } from '../main/TabCommon';

export type DiscoverView = 'grid' | 'list';

export type DiscoverState = {
  load: LoadState;
  people: Person[];
  offline: boolean;
  refreshing: boolean;
  view: DiscoverView;
  maxDistanceKm: number;
  ageMin: number;
  ageMax: number;
  filtersOpen: boolean;
};

const initialState = (): DiscoverState => {
  const s = getApp().settings;
  return {
    load: 'loading',
    people: [],
    offline: false,
    refreshing: false,
    view: 'grid',
    maxDistanceKm: s.maxDistanceKm,
    ageMin: s.ageMin,
    ageMax: s.ageMax,
    filtersOpen: false,
  };
};

/**
 * Android's DiscoverViewModel lives as long as the main screen, so switching tabs
 * keeps the loaded people and the chosen view. The web tab remounts on every
 * switch, so the state lives in a module-level store that is torn down on sign-out.
 */
const useDiscoverStore = create<DiscoverState>(initialState);
const set = (fn: (s: DiscoverState) => Partial<DiscoverState>) => useDiscoverStore.setState(fn);

let started = false;
let stops: (() => void)[] = [];
/** Bumped on reset so a request from a previous session can't write into the new one. */
let generation = 0;

function start() {
  if (started) return;
  started = true;
  useDiscoverStore.setState(initialState(), true);
  load();

  stops.push(
    useApp.subscribe((app, prev) => {
      if (app.settings !== prev.settings) {
        const s = app.settings;
        set(() => ({ maxDistanceKm: s.maxDistanceKm, ageMin: s.ageMin, ageMax: s.ageMax }));
      }
      if (app.auth.kind !== 'signedIn') stop();
    }),
  );

  stops.push(
    people.events.on((event) => {
      switch (event.type) {
        case 'blocked':
        case 'passed':
          remove(event.userId);
          break;
        // A match moves to Messages, so it leaves Discover.
        case 'liked':
          if (event.isMatch) remove(event.userId);
          else setLiked(event.userId, true);
          break;
        case 'unliked':
          setLiked(event.userId, false);
          break;
        // Sending a message request likes them too.
        case 'requestSent':
          setLiked(event.userId, true);
          break;
        default:
          break;
      }
    }),
  );
}

function stop() {
  stops.forEach((s) => s());
  stops = [];
  started = false;
  generation++;
}

function load(refresh = false) {
  set((s) => (refresh ? { refreshing: true } : { load: s.people.length === 0 ? 'loading' : s.load }));
  const gen = generation;
  void (async () => {
    try {
      const coords = location.last ?? (await location.current());
      const found = await people.discover(coords?.latitude ?? null, coords?.longitude ?? null);
      if (gen !== generation) return;
      set(() => ({ people: found, load: found.length === 0 ? 'empty' : 'ready', offline: false, refreshing: false }));
    } catch (e) {
      if (gen !== generation) return;
      const network = e instanceof ApiException && e.isNetwork;
      set((s) =>
        s.people.length > 0 && network
          ? { offline: true, refreshing: false }
          : { load: 'error', offline: network, refreshing: false },
      );
    }
  })();
}

function setView(view: DiscoverView) {
  set(() => ({ view }));
}

function like(person: Person) {
  if (person.liked) {
    setLiked(person.id, false);
    people.unlike(person.id).catch(() => setLiked(person.id, true));
    return;
  }
  setLiked(person.id, true);
  people.like(person).catch((e: unknown) => {
    setLiked(person.id, false);
    // Out of likes: the shell shows the Plus offer instead.
    if (!isLikeLimit(e)) messenger.error((e as Error)?.message || `Couldn’t like ${firstName(person)}.`);
  });
}

function pass(person: Person) {
  remove(person.id);
  people.pass(person.id).catch(() => undefined);
}

function openFilters(open: boolean) {
  set(() => ({ filtersOpen: open }));
}

function applyFilters(distance: number, ageMin: number, ageMax: number) {
  set(() => ({ filtersOpen: false, load: 'loading', people: [] }));
  void (async () => {
    const current = getApp().settings;
    try {
      await settings.update(
        { maxDistanceKm: distance, ageMin, ageMax },
        { ...current, maxDistanceKm: distance, ageMin, ageMax },
      );
    } catch {
      // Android ignores the result here; the reload below uses whatever the server has.
    }
    load();
  })();
}

function remove(userId: string) {
  set((s) => {
    const left = s.people.filter((p) => p.id !== userId);
    return { people: left, load: left.length === 0 && s.load === 'ready' ? 'empty' : s.load };
  });
}

function setLiked(userId: string, liked: boolean) {
  set((s) => ({ people: s.people.map((p) => (p.id === userId ? { ...p, liked } : p)) }));
}

const actions = { load, setView, like, pass, openFilters, applyFilters };
export type DiscoverActions = typeof actions;

export function useDiscoverViewModel(): [DiscoverState, DiscoverActions] {
  useEffect(() => {
    start();
  }, []);
  const state = useDiscoverStore();
  return [state, actions];
}

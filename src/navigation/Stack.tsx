import { useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { useLocation, useNavigate, useNavigationType, useRoutes, type RouteObject } from 'react-router-dom';

/**
 * A screen stack with Android's slide transitions (320ms push / pop). The base
 * screen stays mounted underneath, the way MainRoute keeps its tab state while
 * pushed screens come and go. Pushed screens are matched from `routes`.
 */
export function Stack({ base, routes }: { base: ReactNode; routes: RouteObject[] }) {
  const location = useLocation();
  const navType = useNavigationType();
  const element = useRoutes(routes, location);

  type Layer = { el: ReactElement; key: string };
  const current: Layer | null = element ? { el: element, key: location.key } : null;
  const prev = useRef<Layer | null>(null);
  const [leaving, setLeaving] = useState<Layer | null>(null);
  const [direction, setDirection] = useState<'push' | 'pop'>('push');

  useLayoutEffect(() => {
    const before = prev.current;
    const pop = navType === 'POP' || (before != null && current == null);
    setDirection(pop ? 'pop' : 'push');
    if (pop && before && before.key !== current?.key) {
      setLeaving(before);
      const t = setTimeout(() => setLeaving(null), 320);
      prev.current = current;
      return () => clearTimeout(t);
    }
    setLeaving(null);
    prev.current = current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const layer = { position: 'absolute', inset: 0, background: '#FAFAFA', overflow: 'hidden' } as const;

  return (
    <>
      <div style={{ ...layer, zIndex: 0 }} aria-hidden={current != null} inert={current != null ? true : undefined}>
        {base}
      </div>
      {current && (
        <div key={current.key} style={{ ...layer, zIndex: 2 }} className={direction === 'pop' ? 'anim-pop-in' : 'anim-push-in'}>
          {current.el}
        </div>
      )}
      {leaving && (
        <div key={`leaving-${leaving.key}`} style={{ ...layer, zIndex: 3, pointerEvents: 'none' }} className="anim-pop-out">
          {leaving.el}
        </div>
      )}
    </>
  );
}

/** Back that never leaves the app: pops if there's history, otherwise goes home. */
export function useBack() {
  const navigate = useNavigate();
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/', { replace: true });
  };
}

import { messenger } from '../../data/store';

/**
 * Web stand-in for Android's openAppSettings(). A page can't open the browser's
 * site settings, so: if location is blocked for this site, say where to turn it
 * back on; otherwise ask again (the browser shows its prompt).
 */
export async function openAppSettings(retry: () => void): Promise<void> {
  let state: PermissionState | null = null;
  try {
    state = (await navigator.permissions.query({ name: 'geolocation' })).state;
  } catch {
    state = null;
  }
  if (state === 'denied') {
    messenger.info('Location is blocked for this site. Allow it in your browser’s site settings, then try again.');
  } else {
    retry();
  }
}

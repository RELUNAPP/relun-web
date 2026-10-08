/**
 * Tokens and identity, persisted in localStorage and mirrored in memory so the
 * network layer can read them synchronously. Mirrors Android SessionStore.
 */
export type Session = {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  /** How the user signed in: "phone" or "email". Decides the recovery contact. */
  authMethod: string | null;
};

const KEY = 'relun.session';
const empty: Session = { accessToken: null, refreshToken: null, userId: null, authMethod: null };

const read = (): Session => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
};

type Listener = (s: Session) => void;

class SessionStore {
  private value: Session = read();
  private listeners = new Set<Listener>();

  get current(): Session {
    return this.value;
  }

  get isSignedIn(): boolean {
    return !!this.value.accessToken;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private set(next: Session) {
    this.value = next;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Private mode: the session lives for this tab only.
    }
    this.listeners.forEach((l) => l(next));
  }

  saveSignIn(accessToken: string, refreshToken: string, userId: string, method: string) {
    this.set({ accessToken, refreshToken, userId, authMethod: method });
  }

  saveTokens(accessToken: string, refreshToken: string) {
    this.set({ ...this.value, accessToken, refreshToken });
  }

  clear() {
    this.set(empty);
  }
}

export const session = new SessionStore();

// Another tab signed in or out.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) location.reload();
});

/**
 * Session-scoped bearer token for the Spark Clean API.
 *
 * The token lives in sessionStorage: it disappears when the tab closes and is
 * never written into the persisted Zustand store or any global app state.
 */

const STORAGE_KEY = "spark-clean-token";

type Listener = () => void;
const listeners = new Set<Listener>();

export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(STORAGE_KEY, token);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode); the panel falls back to memory.
  }
  for (const listener of listeners) listener();
}

export function subscribeAuthToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

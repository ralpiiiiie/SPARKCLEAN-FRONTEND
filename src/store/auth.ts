import { create } from "zustand";
import { getAuthToken } from "../services/authToken";
import { clearSession, login, logout, me } from "../services/auth";
import { errorMessage } from "../services/http";
import type { AuthUser } from "../types/auth";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  /** Validate the tab token with the server; safe to call on every mount. */
  hydrate: (force?: boolean) => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  handleUnauthorized: () => void;
}

let inflight: Promise<void> | null = null;
/**
 * Bumped whenever the session is replaced or revoked. An `/auth/me` response
 * that was already in flight must never restore a session after logout.
 */
let epoch = 0;

/**
 * Authentication state is intentionally not persisted: the bearer token lives
 * in sessionStorage and the server remains the source of truth for the role and
 * branch on every request.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",
  error: null,

  hydrate: async (force = false) => {
    if (!force && get().status === "authenticated" && get().user) return;
    if (!getAuthToken()) {
      set({ user: null, status: "unauthenticated" });
      return;
    }
    if (inflight) return inflight;

    const startedEpoch = epoch;
    set({ status: "loading" });
    inflight = (async () => {
      try {
        const user = await me();
        if (epoch !== startedEpoch) return;
        set({ user, status: "authenticated", error: null });
      } catch (error) {
        if (epoch !== startedEpoch) return;
        clearSession();
        set({ user: null, status: "unauthenticated", error: errorMessage(error) });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  signIn: async (email, password) => {
    epoch += 1;
    set({ status: "loading", error: null });
    try {
      const result = await login(email, password);
      set({ user: result.user, status: "authenticated", error: null });
      return result.user;
    } catch (error) {
      clearSession();
      set({ user: null, status: "unauthenticated", error: errorMessage(error) });
      throw error;
    }
  },

  signOut: async () => {
    // Revoke first: any in-flight profile check becomes irrelevant.
    epoch += 1;
    set({ status: "loading" });
    await logout();
    set({ user: null, status: "unauthenticated", error: null });
  },

  handleUnauthorized: () => {
    epoch += 1;
    if (get().status !== "unauthenticated") {
      set({ user: null, status: "unauthenticated", error: null });
    }
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener("spark:unauthorized", () => {
    useAuthStore.getState().handleUnauthorized();
  });
  // Restoring a frozen page (back/forward cache) must re-validate with the
  // server, so a signed-out tab can never show protected content again.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) void useAuthStore.getState().hydrate(true);
  });
}

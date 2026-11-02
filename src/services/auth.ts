import { request } from "./http";
import { setAuthToken } from "./authToken";
import type { AuthUser, LoginResponse } from "../types/auth";

interface Envelope<T> {
  data: T;
}

/** Sign in with a server-issued account. The token is kept for this tab only. */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await request<Envelope<LoginResponse>>("/auth/login", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password },
  });
  setAuthToken(data.token);
  return data;
}

/**
 * Ask the server to revoke this account's tokens (bumps token_version) and
 * clear the local token. Local state is cleared even if the network call fails.
 */
export async function logout(): Promise<void> {
  try {
    await request("/auth/logout", { method: "POST" });
  } catch {
    // The session is unusable locally regardless; never trap the user in the app.
  } finally {
    setAuthToken(null);
  }
}

/** Re-validate the tab token against the server and return the trusted profile. */
export async function me(): Promise<AuthUser> {
  const { data } = await request<Envelope<AuthUser>>("/auth/me");
  return data;
}

export function clearSession(): void {
  setAuthToken(null);
}

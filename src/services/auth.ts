import { ApiError, USE_MOCK, request } from "./http";
import { setAuthToken } from "./authToken";
import type { AuthUser, LoginResponse } from "../types/auth";

interface Envelope<T> {
  data: T;
}

/** Matches the account created by the backend seed, so both modes sign in alike. */
export const DEMO_CREDENTIALS = {
  email: "admin@sparkclean.com",
  password: "SparkClean2024!",
} as const;

const MOCK_TOKEN = "mock-session";
const MOCK_SESSION_KEY = "spark-clean-mock-user";
const MOCK_EXPIRES = "8h";

function mockUser(): AuthUser {
  return {
    id: 1,
    username: "Spark Clean Admin",
    email: DEMO_CREDENTIALS.email,
    role: "admin",
    roleLevel: 3,
  };
}

function readMockSession(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(MOCK_SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeMockSession(user: AuthUser | null): void {
  try {
    if (user) sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(MOCK_SESSION_KEY);
  } catch {
    // Storage may be unavailable; the in-memory auth store still works.
  }
}

/** Sign in with a server-issued account. The token is kept for this tab only. */
export async function login(email: string, password: string): Promise<LoginResponse> {
  if (USE_MOCK) {
    if (
      email.trim().toLowerCase() !== DEMO_CREDENTIALS.email ||
      password !== DEMO_CREDENTIALS.password
    ) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }
    const user = mockUser();
    writeMockSession(user);
    setAuthToken(MOCK_TOKEN);
    return { token: MOCK_TOKEN, expiresIn: MOCK_EXPIRES, user };
  }

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
    if (!USE_MOCK) await request("/auth/logout", { method: "POST" });
  } catch {
    // The session is unusable locally regardless; never trap the user in the app.
  } finally {
    writeMockSession(null);
    setAuthToken(null);
  }
}

/** Re-validate the tab token against the server and return the trusted profile. */
export async function me(): Promise<AuthUser> {
  if (USE_MOCK) {
    const user = readMockSession();
    if (!user) throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
    return user;
  }
  const { data } = await request<Envelope<AuthUser>>("/auth/me");
  return data;
}

export function clearSession(): void {
  writeMockSession(null);
  setAuthToken(null);
}

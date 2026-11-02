import { toast } from "sonner";
import { getAuthToken, setAuthToken } from "./authToken";

/** Base URL for the Spark Clean REST API. */
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1"
).replace(/\/+$/, "");

/** When true the app falls back to the Phase 1 in-memory dataset. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export function queryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

let coldStartWarned = false;

/** Ask the auth store to drop the session and let the router show /login. */
function notifyUnauthorized(): void {
  try {
    window.dispatchEvent(new Event("spark:unauthorized"));
  } catch {
    // Non-browser environments (tests) can skip the event.
  }
}

/** Raw fetch with the API's `{ error: { code, message } }` envelope unwrapped. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  // Every protected endpoint requires the session token; the server decides
  // what that account may read.
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    if (!coldStartWarned) {
      coldStartWarned = true;
      toast.loading("Waking up the server (Render free tier cold start)... Please wait.", {
        id: "cold-start",
        duration: 10000,
      });
    }
    throw new ApiError(0, "NETWORK_ERROR", "Cannot reach the API server. Is the backend running?");
  }

  if (coldStartWarned) {
    coldStartWarned = false;
    toast.dismiss("cold-start");
    toast.success("Server connected!");
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload: unknown = text ? safeJson(text) : null;

  if (response.status === 401 && token && path !== "/auth/login") {
    setAuthToken(null);
    notifyUnauthorized();
  }

  if (!response.ok) {
    const envelope = payload as { error?: { code?: string; message?: string; details?: unknown } } | null;
    throw new ApiError(
      response.status,
      envelope?.error?.code ?? "REQUEST_FAILED",
      envelope?.error?.message ?? `Request failed with status ${response.status}`,
      envelope?.error?.details,
    );
  }

  return payload as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Triggers a browser download for CSV and other exported endpoints. */
export async function download(path: string, filename: string): Promise<number> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });

  if (response.status === 401 && token) {
    setAuthToken(null);
    notifyUnauthorized();
  }

  if (!response.ok) {
    throw new ApiError(response.status, "DOWNLOAD_FAILED", `Export failed (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return blob.size;
}

/** Turns unknown errors into a human-readable message. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

import { ApiError, request } from "./http";
import { getAuthToken, setAuthToken } from "./authToken";
import type {
  AiChatResponse,
  AiConversationSummary,
  AiLoginResponse,
  AiPageContext,
  AiStoredMessage,
  AiUser,
} from "../types/ai";

interface Envelope<T> {
  data: T;
}

/** Clear a stale token so the panel can show the sign-in form again. */
function handleUnauthorized(error: unknown): never {
  if (error instanceof ApiError && error.status === 401) setAuthToken(null);
  throw error;
}

export function hasSession(): boolean {
  return Boolean(getAuthToken());
}

export async function login(email: string, password: string): Promise<AiLoginResponse> {
  const { data } = await request<Envelope<AiLoginResponse>>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  setAuthToken(data.token);
  return data;
}

export function logout(): void {
  setAuthToken(null);
}

export async function me(): Promise<AiUser> {
  try {
    const { data } = await request<Envelope<AiUser>>("/auth/me");
    return data;
  } catch (error) {
    handleUnauthorized(error);
  }
}

export interface ChatInput {
  message: string;
  conversationId?: number;
  pageContext?: AiPageContext;
  signal?: AbortSignal;
}

export async function chat(input: ChatInput): Promise<AiChatResponse> {
  try {
    const { data } = await request<Envelope<AiChatResponse>>("/ai/chat", {
      method: "POST",
      body: {
        message: input.message,
        conversationId: input.conversationId,
        pageContext: input.pageContext,
      },
      signal: input.signal,
    });
    return data;
  } catch (error) {
    handleUnauthorized(error);
  }
}

export async function listConversations(): Promise<AiConversationSummary[]> {
  try {
    const { data } = await request<Envelope<AiConversationSummary[]>>("/ai/conversations");
    return data;
  } catch (error) {
    handleUnauthorized(error);
  }
}

export async function getConversation(
  id: number,
): Promise<{ id: number; messages: AiStoredMessage[] }> {
  try {
    const { data } = await request<Envelope<{ id: number; messages: AiStoredMessage[] }>>(
      `/ai/conversations/${id}`,
    );
    return data;
  } catch (error) {
    handleUnauthorized(error);
  }
}

export async function deleteConversation(id: number): Promise<void> {
  try {
    await request(`/ai/conversations/${id}`, { method: "DELETE" });
  } catch (error) {
    handleUnauthorized(error);
  }
}

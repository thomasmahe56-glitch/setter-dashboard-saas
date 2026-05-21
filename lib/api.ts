import { config } from "@/lib/config";
import { getAccessToken } from "@/lib/supabase";

const RAILWAY_URL = config.apiUrl;

export class ApiAuthError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super("API_AUTH_FAILED");
    this.status = status;
    this.detail = detail;
  }
}

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return typeof data?.detail === "string" ? data.detail : `API error: ${res.status}`;
  } catch {
    return `API error: ${res.status}`;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!RAILWAY_URL) {
    throw new Error("API_URL_MISSING");
  }
  const token = await getAccessToken();
  if (!token) {
    throw new Error("NO_SESSION");
  }
  const res = await fetch(`${RAILWAY_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw new ApiAuthError(res.status, await readErrorDetail(res));
  }
  if (!res.ok) throw new Error(await readErrorDetail(res));
  return res.json();
}

export type Status =
  | "nouveau"
  | "en_cours"
  | "page_envoyee"
  | "appel_booke"
  | "signe";

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface ConversationSummary {
  id: string;
  created_at: string;
  username: string;
  display_name: string;
  message: string;
  response?: string;
  status: Status;
  agent_active: boolean;
  pending_opener?: boolean;
  avatar_url?: string | null;
  history?: HistoryMessage[];
  subscriber_id?: string;
  channel?: "instagram" | "whatsapp" | string | null;
  external_contact_id?: string | null;
  phone_e164?: string | null;
  automation_mode?: "auto" | "supervised" | "disabled";
  pending_message?: string | null;
  pending_message_at?: string | null;
}

export type Conversation = ConversationSummary & {
  history: HistoryMessage[];
};

export interface FollowUpDue {
  conversation_id: string;
  id: string;
  created_at: string;
  username: string;
  display_name: string;
  message: string;
  status: Status;
  agent_active: boolean;
  stage: "auto_23h" | "j3" | "j10";
  stage_label: string;
  mode: "auto" | "manual";
  hours_since_user: number;
  last_user_message_at: string;
  last_agent_message_at: string | null;
}

export interface FollowUpPreview {
  conversation_id: string;
  stage: FollowUpDue["stage"];
  message: string;
  history_count: number;
}

export interface FollowUpSendResult {
  conversation_id: string;
  stage: "auto_23h";
  message: string;
  sent: boolean;
}

export const api = {
  getConversations: () => apiFetch<Conversation[]>("/conversations"),
  getConversationSummaries: () =>
    apiFetch<ConversationSummary[]>("/conversations/summary"),
  getConversation: (id: string) =>
    apiFetch<Conversation>(`/conversations/${id}`),
  updateStatus: (id: string, status: Status) =>
    apiFetch(`/conversations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  updateAutomationMode: (id: string, mode: "auto" | "supervised" | "disabled") =>
    apiFetch(`/conversations/${id}/automation-mode`, {
      method: "PATCH",
      body: JSON.stringify({ automation_mode: mode }),
    }),
  ignorePending: (id: string) =>
    apiFetch(`/conversations/${id}/ignore-pending`, { method: "POST" }),
  refineMessage: (id: string, instruction: string, original_message: string) =>
    apiFetch<{ refined_message: string }>(`/conversations/${id}/refine-pending`, {
      method: "POST",
      body: JSON.stringify({ instruction, original_message }),
    }),
  activate: (id: string) =>
    apiFetch(`/conversations/${id}/activate`, { method: "POST" }),
  deactivate: (id: string) =>
    apiFetch(`/conversations/${id}/deactivate`, { method: "POST" }),
  delete: (id: string) =>
    apiFetch(`/conversations/${id}`, { method: "DELETE" }),
  getDueFollowUps: () => apiFetch<FollowUpDue[]>("/follow-ups/due"),
  previewFollowUp: (conversationId: string, stage: FollowUpDue["stage"]) =>
    apiFetch<FollowUpPreview>("/follow-ups/preview", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId, stage }),
    }),
  sendAuto23hFollowUp: (conversationId: string) =>
    apiFetch<FollowUpSendResult>(`/follow-ups/${conversationId}/send-auto-23h`, {
      method: "POST",
    }),
  logout: async () => {
    const { supabase } = await import("@/lib/supabase");
    await supabase.auth.signOut();
    window.location.href = "/login";
  },
};

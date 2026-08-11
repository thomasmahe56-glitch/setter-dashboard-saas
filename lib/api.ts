import { getAccessToken } from "@/lib/supabase";

const API_PROXY_URL = "/api/backend";

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
    console.error("[api:error]", res.status, res.url, data);
    // Prefer `message` (specific backend error) over `user_message` (friendly fallback)
    if (typeof data?.message === "string" && data.message) return data.message;
    if (typeof data?.user_message === "string") return data.user_message;
    if (typeof data?.detail?.user_message === "string") return data.detail.user_message;
    if (typeof data?.error?.user_message === "string") return data.error.user_message;
    return typeof data?.detail === "string" ? data.detail : `API error: ${res.status}`;
  } catch {
    return `API error: ${res.status}`;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("NO_SESSION");
  }
  const res = await fetch(`${API_PROXY_URL}${path}`, {
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
  stage: "auto_23h" | "j3" | "j10" | "j30";
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

export interface TrainingProfileInput {
  language: "en" | "fr" | string;
  business_name: string;
  coach_name: string;
  niche: string;
  offer_name: string;
  offer_promise: string;
  offer_format: string;
  price: string;
  proof_points: string[];
  tone_rules: string[];
  forbidden_phrases: string[];
  calendly_url: string;
  sales_page_url: string;
  raw_notes: string;
  sales_process?: string;
  next_step?: string;
  voice_profile?: string;
  knowledge_sources?: string[];
}

export interface AvatarGenerateInput {
  client_ideal: string;
  main_problem: string;
  current_block: string;
  fears: string;
  tried_before: string;
  buying_hesitations: string;
  desired_outcome: string;
  bad_fit: string;
}

export interface AgentAvatar {
  persona_summary?: string;
  current_situation?: string;
  desired_situation?: string;
  pain_points?: string[];
  fears?: string[];
  frustrations?: string[];
  objections?: string[];
  buying_triggers?: string[];
  dream_outcomes?: string[];
  exact_words?: string[];
  bad_fit?: string[];
  confidence_score?: number;
  [key: string]: unknown;
}

export interface AgentSalesRules {
  qualification_questions?: string[];
  buying_signals?: string[];
  call_offer_conditions?: string[];
  red_flags?: string[];
  stop_conditions?: string[];
  objection_responses?: string[];
  follow_up_rules?: string[];
  do_not_say?: string[];
  escalation_rules?: string[];
  faq_answers?: string[];
  links_or_resources?: string[];
  [key: string]: unknown;
}

export interface KnowledgeExtractInput {
  manual_process: string;
  pasted_text: string;
  file_name?: string;
  file_type?: string;
  file_base64?: string;
  category?: string;
}

export interface KnowledgeExtraction {
  profile_patch: Partial<TrainingProfileInput> & Record<string, unknown>;
  avatar_patch: AgentAvatar;
  rules_patch: AgentSalesRules;
  preview: Record<string, string[]>;
}

export interface TrainingCenterState {
  profile: { id: string; profile: TrainingProfileInput; updated_at: string } | null;
  avatar: { id: string; source_inputs: AvatarGenerateInput; avatar: AgentAvatar; updated_at: string } | null;
  sales_rules: { id: string; rules: AgentSalesRules; updated_at: string } | null;
  checklist: {
    business_setup: boolean;
    knowledge_voice?: boolean;
    avatar_client: boolean;
    regles_dm?: boolean;
    test_conversation: boolean;
  };
  main_steps?: { id: string; label: string }[];
  what_angellos_knows?: {
    conversation_guidance?: string[];
  };
  advanced?: {
    developer_mode: boolean;
    conversation_rules_available: boolean;
    conversation_rules: { id: string; rules: AgentSalesRules; updated_at: string } | null;
  };
  progress_score: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PromptVersion {
  id: string;
  created_at: string;
  is_active: boolean;
  source: string | null;
  insight_id: string | null;
  refinement_instruction?: string | null;
  refinement_applied_at?: string | null;
  previous_version_id?: string | null;
}

export interface PromptVersionMemory {
  id: string;
  created_at: string;
  is_active: boolean;
  source: {
    label: string;
    detail: string;
  };
  summary: string;
  offer: string;
  ideal_customer: string;
  sales_process: string[];
  next_step: string;
  voice: string;
  conversation_rules: string[];
  forbidden_topics: string[];
  what_changed: string[];
}

export interface PromptRefinementResult {
  success: boolean;
  applied: boolean;
  prompt_proposed: string;
  updated_prompt: string;
  diff: { type: "add" | "remove" | "keep"; line: string }[];
  target_section: string;
  summary: string;
  changes: string[];
  instruction: string;
  prompt_version_id?: string;
  previous_version_id?: string | null;
  refinement_applied_at?: string;
  reset_test_conversation: boolean;
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
    apiFetch<{ success: boolean; pending_generated: boolean; pending_message: string | null }>(
      `/conversations/${id}/activate`,
      { method: "POST" },
    ),
  deactivate: (id: string) =>
    apiFetch(`/conversations/${id}/deactivate`, { method: "POST" }),
  generatePending: (id: string) =>
    apiFetch<{ success: boolean; pending_message: string }>(
      `/conversations/${id}/generate-pending`,
      { method: "POST" },
    ),
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
  getTrainingCenter: (developerMode = false) =>
    apiFetch<TrainingCenterState>(`/agent/training-center${developerMode ? "?developer_mode=true" : ""}`),
  saveTrainingProfile: (profile: TrainingProfileInput) =>
    apiFetch<{ success: boolean; profile: unknown }>("/agent/profile/save", {
      method: "POST",
      body: JSON.stringify(profile),
    }),
  autosaveTrainingProfile: (profile: TrainingProfileInput) =>
    apiFetch<{ success: boolean; profile: unknown }>("/agent/profile", {
      method: "PATCH",
      body: JSON.stringify(profile),
    }),
  generateAvatar: (input: AvatarGenerateInput) =>
    apiFetch<{ avatar: AgentAvatar }>("/agent/avatar/generate", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  saveAvatar: (source_inputs: AvatarGenerateInput, avatar: AgentAvatar) =>
    apiFetch<{ success: boolean; avatar: unknown }>("/agent/avatar/save", {
      method: "POST",
      body: JSON.stringify({ source_inputs, avatar }),
    }),
  autosaveAvatarInput: (input: AvatarGenerateInput) =>
    apiFetch<{ success: boolean; avatar: unknown }>("/agent/avatar/source-inputs", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  autosaveAvatar: (avatar: AgentAvatar) =>
    apiFetch<{ success: boolean; avatar: unknown }>("/agent/avatar", {
      method: "PATCH",
      body: JSON.stringify({ avatar }),
    }),
  generateSalesRules: (avatar?: AgentAvatar, profile?: TrainingProfileInput) =>
    apiFetch<{ rules: AgentSalesRules }>("/agent/sales-rules/generate", {
      method: "POST",
      body: JSON.stringify({ avatar, profile }),
    }),
  saveSalesRules: (rules: AgentSalesRules) =>
    apiFetch<{ success: boolean; sales_rules: unknown }>("/agent/sales-rules/save", {
      method: "POST",
      body: JSON.stringify({ rules }),
    }),
  autosaveSalesRules: (rules: AgentSalesRules) =>
    apiFetch<{ success: boolean; sales_rules: unknown }>("/agent/sales-rules", {
      method: "PATCH",
      body: JSON.stringify({ rules }),
    }),
  extractKnowledge: (input: KnowledgeExtractInput) =>
    apiFetch<KnowledgeExtraction>("/agent/knowledge/extract", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  trainKnowledge: (extraction: Pick<KnowledgeExtraction, "profile_patch" | "avatar_patch" | "rules_patch">) =>
    apiFetch<{ success: boolean; profile: unknown; avatar: unknown; sales_rules: unknown }>("/agent/knowledge/train", {
      method: "POST",
      body: JSON.stringify(extraction),
    }),
  rebuildAgentPrompt: () =>
    apiFetch<{ success: boolean; prompt_version_id: string }>("/agent/prompt/rebuild", {
      method: "POST",
    }),
  refinePrompt: (instruction: string, apply = false, active_prompt?: string, prompt_proposed?: string) =>
    apiFetch<PromptRefinementResult>("/refine-prompt", {
      method: "POST",
      body: JSON.stringify({
        instruction,
        apply,
        active_prompt: active_prompt?.trim() || undefined,
        prompt_proposed: prompt_proposed?.trim() || undefined,
      }),
    }),
  playground: (messages: ChatMessage[], calendly_url?: string, sales_page_url?: string) =>
    apiFetch<{ response: string }>("/playground", {
      method: "POST",
      body: JSON.stringify({
        messages,
        calendly_url: calendly_url?.trim() || undefined,
        sales_page_url: sales_page_url?.trim() || undefined,
      }),
    }),
  getPromptVersions: () =>
    apiFetch<PromptVersion[]>("/prompt-versions"),
  getPromptVersionMemory: (versionId: string) =>
    apiFetch<PromptVersionMemory>(`/prompt-versions/${versionId}/memory`),
  restorePromptVersion: (versionId: string) =>
    apiFetch<{ success: boolean }>(`/prompt-versions/${versionId}/restore`, {
      method: "POST",
    }),
  logout: async () => {
    const { supabase } = await import("@/lib/supabase");
    await supabase.auth.signOut();
    window.location.href = "/login";
  },
};

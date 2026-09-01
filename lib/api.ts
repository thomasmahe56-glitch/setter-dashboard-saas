import { getAccessToken } from "@/lib/supabase";

const API_PROXY_URL = "/api/backend";
const PROSPECTING_PROXY_URL = "/api/prospecting";

export class ApiAuthError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    const message = detail || "Session expirée. Reconnecte-toi puis réessaie.";
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
    this.detail = message;
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

async function prospectingFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("NO_SESSION");
  }
  const res = await fetch(`${PROSPECTING_PROXY_URL}${path}`, {
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
  automation_mode?: "auto" | "supervised" | "disabled" | "off" | "paused";
  pending_message?: string | null;
  pending_message_at?: string | null;
}

export type Conversation = ConversationSummary & {
  history: HistoryMessage[];
};


export interface BulkAutomationModeResult {
  success: boolean;
  target_mode: "auto";
  switched_to_auto: number;
  skipped_off_disabled: number;
  skipped_other: number;
  failed: number;
  failed_ids: string[];
}

export interface BetaAiCostStatus {
  spent_eur: number;
  spent_eur_provider_usage?: number;
  spent_eur_estimated_fallback?: number;
  cost_source_breakdown?: Record<string, number>;
  provider_breakdown?: Record<string, number>;
  cap_eur: number;
  remaining_eur: number;
  guardrail_enabled: boolean;
  cap_reached: boolean;
  allowed_send_start?: string;
  allowed_send_end?: string;
  min_auto_delay_seconds?: number;
  random_auto_delay_seconds?: number;
  follow_up_config?: { stage: string; delay_hours: number; mode: "auto" | "manual" }[];
  pricing_assumption: Record<string, unknown>;
  pricing_version?: string;
}

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
  queued_until?: string | null;
  send_blocked_reason?: string | null;
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

export interface FollowUpScheduleConfig {
  auto_hours: number;
  manual1_days: number;
  manual2_days: number;
  manual3_days: number;
}

function followUpScheduleQuery(config?: FollowUpScheduleConfig): string {
  if (!config) return "";
  const params = new URLSearchParams({
    auto_hours: String(config.auto_hours),
    manual1_days: String(config.manual1_days),
    manual2_days: String(config.manual2_days),
    manual3_days: String(config.manual3_days),
  });
  return `?${params.toString()}`;
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
  quality_judge?: SimulatorQualityJudge;
}

export interface SimulatorScenario {
  id: string;
  title: string;
  description: string;
  prospect_profile: string;
}

export type SimulatorQualityJudgeDecision = "pass" | "retry" | "human_review";

export interface SimulatorQualityJudge {
  overall_score: number;
  decision: SimulatorQualityJudgeDecision;
  scores: {
    naturalite: number;
    contexte: number;
    progression: number;
    timing: number;
    risque_ia: number;
    risque_business: number;
  };
  why: string;
  suggested_rewrite: string;
}

export interface SimulatorResult extends SimulatorScenario {
  scenario_id: string;
  transcript: (HistoryMessage & { sent?: boolean; source?: string })[];
  angellos_reply: string;
  response_source: string;
  quality_score: number;
  flags: {
    trop_ia: boolean;
    trop_long: boolean;
    repetitif: boolean;
    pitch_premature: boolean;
    manque_contexte: boolean;
  };
  recommendation: "pass" | "retry" | "human_review";
  quality_judge?: SimulatorQualityJudge;
}

export interface SimulatorRunResponse {
  success: boolean;
  mode: "ai" | "deterministic_current_logic";
  scenario_count: number;
  pass_count: number;
  review_count: number;
  results: SimulatorResult[];
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
  already_learned?: boolean;
  rules_changed?: boolean;
}

export interface ProspectingContext {
  source: string;
  is_complete: boolean;
  missing_fields: string[];
  business_name?: string;
  niche?: string;
  offer?: string;
  offer_name?: string;
  offer_promise?: string;
  offer_summary?: string;
  ideal_customer?: string;
  language?: string;
  tone?: string;
  qualification_rules?: string[];
}

export interface ProspectingSourceInput {
  source_type: "followers" | "following" | "commenters";
  source_value: string;
  weight?: number;
  enabled?: boolean;
}

export interface ProspectingSourceDiscoveryInput {
  target_hint?: string;
  max_sources?: number;
  include_commenters?: boolean;
  include_followers?: boolean;
}

export interface ProspectingDiscoveredSource {
  source_type: "followers" | "commenters";
  source_value: string;
  label: string;
  score: number;
  reason: string;
  risk: "low" | "medium" | "high" | string;
  followers_count?: number | null;
  comment_count?: number | null;
  validated_by?: string;
  feedback?: ProspectingSourceFeedback;
}

export interface ProspectingGoldenAccount {
  username: string;
  profile_url: string;
  label?: string;
  reason: string;
  score?: number;
  followers_count?: number | null;
  stage2_error?: string;
  sources?: ProspectingDiscoveredSource[];
}

export interface ProspectingSourceFeedback {
  rating: "good" | "bad";
  reason?: string | null;
  created_at?: string | null;
}

export interface ProspectingSourceFeedbackInput {
  source_type: "followers" | "commenters";
  source_value: string;
  rating: "good" | "bad";
  reason?: string;
}

export interface ProspectingSourceDiscoveryResult {
  context_source: string;
  context_complete: boolean;
  missing_fields: string[];
  queries: string[];
  accounts?: ProspectingGoldenAccount[];
  sources: ProspectingDiscoveredSource[];
  discovery_mode?: string;
  stage2_status?: string | null;
}

export interface ProspectingCampaignInput {
  name: string;
  target_leads: number;
  max_runs: number;
  max_candidates_total: number;
  max_duration_seconds?: number;
  sources: ProspectingSourceInput[];
  target_language: string;
  target_markets: string[];
  niche_description?: string | null;
  min_followers?: number | null;
  max_followers?: number | null;
}

export interface ProspectingCampaign {
  id: string;
  name: string;
  status: "draft" | "running" | "completed" | "failed" | "paused";
  stop_reason?: string | null;
  target_leads: number;
  max_runs?: number;
  max_duration_seconds?: number;
  inserted_total: number;
  analyzed_total: number;
  skipped_total: number;
  duplicates_total: number;
  runs_count: number;
  created_at: string;
  updated_at?: string;
  completed_at?: string | null;
  error?: string | null;
  elapsed_seconds?: number;
  active_sources_remaining?: number;
  sources?: (ProspectingSourceInput & {
    id?: string;
    stats?: { runs?: number; scraped?: number; inserted?: number; skipped?: number; duplicates?: number };
  })[];
  runs?: {
    source_type?: ProspectingSourceInput["source_type"];
    source_value?: string;
    scraped?: number;
    inserted?: number;
    created_at?: string;
  }[];
  user_id?: string;
}

export interface ProspectingProspect {
  id: string;
  username: string;
  full_name?: string | null;
  bio?: string | null;
  profile_url?: string | null;
  status: "new" | "qualified" | "contacted" | "replied" | "booked" | "ignored";
  qualification_score?: number | null;
  qualification_fit?: string | null;
  qualification_reason?: string | null;
  first_dm?: string | null;
  hook_angle?: string | null;
  followers_count?: number | null;
  following_count?: number | null;
  posts_count?: number | null;
  pain_points?: string[] | null;
  offer_angle?: string | null;
  created_at?: string;
  user_id?: string;
}

export interface ProspectingKpi {
  period_days: number;
  granularity: string;
  total: { contacted: number; replied: number; demo_booked: number; ignored: number; qualified?: number };
  rates: Record<string, number>;
  by_period: Record<string, number | string>[];
}

export interface ProspectingTestProfileInput {
  username: string;
  full_name?: string;
  bio: string;
  followers_count?: number | null;
  following_count?: number | null;
  posts_count?: number | null;
  profile_url?: string;
  target_language: string;
  target_markets: string[];
  niche_description?: string | null;
}

export interface ProspectingTestProfileResult {
  context_source: string;
  context_complete: boolean;
  missing_fields: string[];
  qualification: {
    score?: number;
    fit?: string;
    reason?: string;
    hook_angle?: string;
    first_dm?: string;
    should_store?: boolean;
    [key: string]: unknown;
  };
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
  bulkSwitchSupervisedToAuto: () =>
    apiFetch<BulkAutomationModeResult>("/conversations/bulk-automation-mode", {
      method: "POST",
      body: JSON.stringify({ automation_mode: "auto" }),
    }),
  getBetaAiCost: () => apiFetch<BetaAiCostStatus>("/beta/ai-cost"),
  updateBetaSettings: (settings: Pick<BetaAiCostStatus, "allowed_send_start" | "allowed_send_end" | "min_auto_delay_seconds" | "random_auto_delay_seconds">) =>
    apiFetch<BetaAiCostStatus>("/beta/settings", {
      method: "PATCH",
      body: JSON.stringify(settings),
    }),
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
  getDueFollowUps: (config?: FollowUpScheduleConfig) => apiFetch<FollowUpDue[]>(`/follow-ups/due${followUpScheduleQuery(config)}`),
  previewFollowUp: async (conversationId: string, stage: FollowUpDue["stage"], aiInstruction?: string, delayLabel?: string) => {
    const basePayload = { conversation_id: conversationId, stage, ...(delayLabel ? { follow_up_delay_label: delayLabel } : {}) };
    const instruction = aiInstruction?.trim();

    if (!instruction) {
      return apiFetch<FollowUpPreview>("/follow-ups/preview", {
        method: "POST",
        body: JSON.stringify(basePayload),
      });
    }

    try {
      return await apiFetch<FollowUpPreview>("/follow-ups/preview", {
        method: "POST",
        body: JSON.stringify({ ...basePayload, ai_instruction: instruction }),
      });
    } catch (error) {
      console.warn("[api:follow-up-preview] retrying without ai_instruction", error);
      return apiFetch<FollowUpPreview>("/follow-ups/preview", {
        method: "POST",
        body: JSON.stringify(basePayload),
      });
    }
  },
  sendAuto23hFollowUp: (conversationId: string, config?: FollowUpScheduleConfig, aiInstruction?: string, delayLabel?: string) =>
    apiFetch<FollowUpSendResult>(`/follow-ups/${conversationId}/send-auto-23h${followUpScheduleQuery(config)}`, {
      method: "POST",
      body: JSON.stringify({
        ...(aiInstruction?.trim() ? { ai_instruction: aiInstruction.trim() } : {}),
        ...(delayLabel ? { follow_up_delay_label: delayLabel } : {}),
      }),
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
    apiFetch<{ response: string; quality_judge?: SimulatorQualityJudge }>("/playground", {
      method: "POST",
      body: JSON.stringify({
        messages,
        calendly_url: calendly_url?.trim() || undefined,
        sales_page_url: sales_page_url?.trim() || undefined,
      }),
    }),
  getSimulatorScenarios: () => apiFetch<SimulatorScenario[]>("/simulator/scenarios"),
  runSimulator: (scenario_id?: string, use_ai = false) =>
    apiFetch<SimulatorRunResponse>("/simulator/run", {
      method: "POST",
      body: JSON.stringify({ scenario_id: scenario_id || undefined, use_ai }),
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
  prospecting: {
    getContext: () => prospectingFetch<ProspectingContext>("/context"),
    getCampaigns: () => prospectingFetch<{ items: ProspectingCampaign[] }>("/campaigns"),
    createCampaign: (input: ProspectingCampaignInput) =>
      prospectingFetch<ProspectingCampaign>("/campaigns", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    runCampaign: (campaignId: string) =>
      prospectingFetch<ProspectingCampaign>(`/campaigns/${campaignId}/run`, { method: "POST" }),
    cancelCampaign: (campaignId: string) =>
      prospectingFetch<ProspectingCampaign>(`/campaigns/${campaignId}/cancel`, { method: "POST" }),
    getProspects: (limit = 30) =>
      prospectingFetch<{ items: ProspectingProspect[] }>(`/prospects?limit=${limit}`),
    updateProspectStatus: (prospectId: string, status: ProspectingProspect["status"]) =>
      prospectingFetch<{ item: ProspectingProspect }>(`/prospects/${prospectId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    addProspectFeedback: (prospectId: string, reason?: string) =>
      prospectingFetch<{ success: boolean }>(`/prospects/${prospectId}/feedback`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    getKpi: () => prospectingFetch<ProspectingKpi>("/prospects/kpi?days=30&granularity=day"),
    testProfile: (input: ProspectingTestProfileInput) =>
      prospectingFetch<ProspectingTestProfileResult>("/test-profile", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    discoverSourcesFromContext: (input: ProspectingSourceDiscoveryInput) =>
      prospectingFetch<ProspectingSourceDiscoveryResult>("/discover-sources-from-context", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    addSourceFeedback: (input: ProspectingSourceFeedbackInput) =>
      prospectingFetch<{ success: boolean }>("/source-feedback", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
};

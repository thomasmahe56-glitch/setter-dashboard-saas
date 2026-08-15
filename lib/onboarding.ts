import { api, AgentAvatar, AgentSalesRules, TrainingCenterState, TrainingProfileInput } from "@/lib/api";

export const EMPTY_BETA_PROFILE: TrainingProfileInput = {
  language: "en",
  business_name: "",
  coach_name: "",
  niche: "",
  offer_name: "",
  offer_promise: "",
  offer_format: "",
  price: "",
  proof_points: [],
  tone_rules: [],
  forbidden_phrases: [],
  calendly_url: "",
  sales_page_url: "",
  raw_notes: "",
  sales_process: "",
  next_step: "",
  voice_profile: "",
  knowledge_sources: [],
};

export function textToList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function listToText(value: string[] | undefined): string {
  return (value || []).join("\n");
}

function compactStrings(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value?.trim()));
}

export function isOnboardingIncomplete(state: TrainingCenterState | null): boolean {
  if (!state?.profile?.profile) return true;
  const profile = state.profile.profile;
  const requiredProfileFields = [
    profile.business_name,
    profile.coach_name,
    profile.niche,
    profile.offer_name,
    profile.offer_promise,
    profile.offer_format,
    profile.price,
    profile.next_step,
  ];
  const hasBusiness = requiredProfileFields.every((value) => typeof value === "string" && value.trim().length > 0);
  const hasVoice = Boolean(
    profile.raw_notes?.trim() ||
    profile.sales_process?.trim() ||
    profile.voice_profile?.trim() ||
    (profile.tone_rules || []).length > 0 ||
    (profile.forbidden_phrases || []).length > 0,
  );
  return !hasBusiness || !hasVoice;
}

export async function getPostAuthDestination(): Promise<"/onboarding" | "/crm"> {
  const state = await api.getTrainingCenter(false);
  return isOnboardingIncomplete(state) ? "/onboarding" : "/crm";
}

export function buildBetaAvatar(profile: TrainingProfileInput, objections: string[]): AgentAvatar {
  const niche = profile.niche || "the target audience";
  return {
    persona_summary: `${niche} prospects who may be qualified for ${profile.offer_name || "the offer"}.`,
    current_situation: profile.raw_notes || `They are considering ${profile.offer_name || "the offer"} and need qualification before the next step.`,
    desired_situation: profile.offer_promise || `They want a clear outcome before booking ${profile.next_step || "the next step"}.`,
    pain_points: compactStrings([profile.raw_notes, profile.sales_process, ...objections]).slice(0, 6),
    fears: objections.slice(0, 6),
    frustrations: objections.slice(0, 6),
    objections: objections.slice(0, 8),
    buying_triggers: compactStrings([profile.offer_promise, profile.next_step]),
    dream_outcomes: compactStrings([profile.offer_promise]),
    exact_words: objections.slice(0, 6),
    bad_fit: [],
    confidence_score: 70,
  };
}

export function buildBetaRules(profile: TrainingProfileInput, qualificationRules: string[], objections: string[]): AgentSalesRules {
  const nextStep = profile.next_step || "offer the next step only after the prospect is qualified";
  return {
    qualification_questions: qualificationRules.length > 0 ? qualificationRules : ["Ask one qualification question at a time before proposing the next step."],
    buying_signals: ["Prospect explains their current situation", "Prospect asks about the offer", "Prospect agrees to the next step"],
    call_offer_conditions: [nextStep],
    red_flags: ["Do not pressure the prospect", "Escalate unclear or sensitive cases to the human operator"],
    stop_conditions: ["Stop if the prospect asks not to be contacted", "Stop if the conversation leaves the approved offer scope"],
    objection_responses: objections.length > 0 ? objections : ["Acknowledge the concern, ask one clarifying question, and stay concise."],
    follow_up_rules: ["Keep beta replies in supervised mode until the human operator approves sending."],
    do_not_say: profile.forbidden_phrases || [],
    escalation_rules: ["Human approval is required before sending real beta messages."],
    faq_answers: [],
    links_or_resources: compactStrings([profile.calendly_url, profile.sales_page_url]),
  };
}

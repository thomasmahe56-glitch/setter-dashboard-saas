import {
  AgentAvatar,
  AgentSalesRules,
  ChatMessage,
  PromptVersion,
  TrainingProfileInput,
} from "@/lib/api";

export type JsonParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export type TrainingProgressInput = {
  profile: TrainingProfileInput;
  avatar: AgentAvatar;
  rules: AgentSalesRules;
  promptRebuilt: boolean;
  chatMessages: ChatMessage[];
};

export type TrainingChecklist = {
  business: "Complete" | "To complete";
  avatar: "Complete" | "To review" | "Generated" | "To complete";
  rules: "Complete" | "Generated" | "To review" | "To complete";
  activation: "Prompt rebuilt" | "To do";
  test: "Test completed" | "To do";
};

export type AngelosLevel = {
  label: string;
  description: string;
};

export function listToText(items: string[] | undefined): string {
  return (items || []).join("\n");
}

export function textToList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function prettyJson(value: unknown): string {
  return JSON.stringify(value || {}, null, 2);
}

export function getStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function parseJsonObject<T>(value: string): JsonParseResult<T> {
  try {
    const parsed = JSON.parse(value) as T;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, message: "The content must be a JSON object." };
    }
    return { ok: true, value: parsed };
  } catch {
    return {
      ok: false,
      message: "The JSON contains a syntax error. Check commas, quotes, and brackets.",
    };
  }
}

export function isBusinessComplete(profile: TrainingProfileInput): boolean {
  return [
    profile.business_name,
    profile.coach_name,
    profile.niche,
    profile.offer_name,
    profile.offer_promise,
    profile.offer_format,
    profile.price,
  ].every((value) => value.trim().length > 0);
}

export function hasMinimumAvatarInput(input: {
  client_ideal: string;
  main_problem: string;
  desired_outcome: string;
}): boolean {
  return Boolean(
    input.client_ideal.trim() &&
    input.main_problem.trim() &&
    input.desired_outcome.trim(),
  );
}

export function isAvatarMeaningful(avatar: AgentAvatar): boolean {
  return Boolean(
    typeof avatar.persona_summary === "string" && avatar.persona_summary.trim() &&
    typeof avatar.current_situation === "string" && avatar.current_situation.trim() &&
    typeof avatar.desired_situation === "string" && avatar.desired_situation.trim(),
  );
}

export function isAvatarComplete(avatar: AgentAvatar): boolean {
  return Boolean(
    isAvatarMeaningful(avatar) &&
    getStringList(avatar.pain_points).length >= 3 &&
    getStringList(avatar.objections).length >= 3 &&
    getStringList(avatar.buying_triggers).length >= 2 &&
    getStringList(avatar.exact_words).length >= 3,
  );
}

export function isRulesMeaningful(rules: AgentSalesRules): boolean {
  return Boolean(
    getStringList(rules.qualification_questions).length > 0 ||
    getStringList(rules.buying_signals).length > 0 ||
    getStringList(rules.call_offer_conditions).length > 0 ||
    getStringList(rules.objection_responses).length > 0,
  );
}

export function isRulesComplete(rules: AgentSalesRules): boolean {
  return Boolean(
    getStringList(rules.qualification_questions).length >= 3 &&
    getStringList(rules.buying_signals).length >= 3 &&
    getStringList(rules.call_offer_conditions).length >= 2 &&
    getStringList(rules.objection_responses).length >= 2 &&
    getStringList(rules.do_not_say).length >= 2,
  );
}

export function hasCompletedPlayground(chatMessages: ChatMessage[]): boolean {
  return chatMessages.some((message) => message.role === "user") &&
    chatMessages.some((message) => message.role === "assistant");
}

export function wasPromptRebuiltFromTrainingCenter(promptVersions: PromptVersion[]): boolean {
  return promptVersions.some((version) => version.is_active && version.source === "training-center");
}

export function calculateTrainingProgress({
  profile,
  avatar,
  rules,
  promptRebuilt,
  chatMessages,
}: TrainingProgressInput): number {
  let score = 0;

  const businessFields = [
    profile.business_name,
    profile.coach_name,
    profile.niche,
    profile.offer_name,
    profile.offer_promise,
    profile.offer_format,
    profile.price,
  ];
  score += Math.round((businessFields.filter((value) => value.trim()).length / businessFields.length) * 25);

  const avatarChecks = [
    Boolean(typeof avatar.persona_summary === "string" && avatar.persona_summary.trim()),
    Boolean(typeof avatar.current_situation === "string" && avatar.current_situation.trim()),
    Boolean(typeof avatar.desired_situation === "string" && avatar.desired_situation.trim()),
    getStringList(avatar.pain_points).length >= 3,
    getStringList(avatar.objections).length >= 3,
    getStringList(avatar.buying_triggers).length >= 2,
    getStringList(avatar.exact_words).length >= 3,
  ];
  score += Math.round((avatarChecks.filter(Boolean).length / avatarChecks.length) * 30);

  const rulesChecks = [
    getStringList(rules.qualification_questions).length >= 3,
    getStringList(rules.buying_signals).length >= 3,
    getStringList(rules.call_offer_conditions).length >= 2,
    getStringList(rules.objection_responses).length >= 2,
    getStringList(rules.do_not_say).length >= 2,
  ];
  score += Math.round((rulesChecks.filter(Boolean).length / rulesChecks.length) * 25);

  if (promptRebuilt) score += 10;
  if (hasCompletedPlayground(chatMessages)) score += 10;

  return Math.min(100, score);
}

export function buildTrainingChecklist({
  profile,
  avatar,
  rules,
  promptRebuilt,
  chatMessages,
}: TrainingProgressInput): TrainingChecklist {
  return {
    business: isBusinessComplete(profile) ? "Complete" : "To complete",
    avatar: isAvatarComplete(avatar)
      ? "Complete"
      : isAvatarMeaningful(avatar)
        ? "To review"
        : Object.keys(avatar || {}).length > 0
          ? "Generated"
          : "To complete",
    rules: isRulesComplete(rules)
      ? "Complete"
      : isRulesMeaningful(rules)
        ? "To review"
        : "To complete",
    activation: promptRebuilt ? "Prompt rebuilt" : "To do",
    test: hasCompletedPlayground(chatMessages) ? "Test completed" : "To do",
  };
}

export function getAngelosLevel(score: number): AngelosLevel {
  if (score <= 30) {
    return {
      label: "Generic assistant",
      description: "Angellos still needs more context to sell with precision.",
    };
  }
  if (score <= 60) {
    return {
      label: "Setter in training",
      description: "The basics are there, but its sales judgment still needs refining.",
    };
  }
  if (score <= 85) {
    return {
      label: "Specialized setter",
      description: "Angellos understands your offer, prospects, and core rules.",
    };
  }
  return {
    label: "Sales clone ready to test",
    description: "The context is robust enough to test on real conversations.",
  };
}

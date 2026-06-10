"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileJson,
  GraduationCap,
  Loader2,
  MessageSquareText,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { SectionHeader } from "@/components/training-center/SectionHeader";
import { TrainingProgress } from "@/components/training-center/TrainingProgress";
import { AdvancedToggle, EditableList, EmptyState, Field, JsonEditor, PromptField, TextField } from "@/components/training-center/fields";
import {
  AgentAvatar,
  AgentSalesRules,
  api,
  AvatarGenerateInput,
  ChatMessage,
  KnowledgeExtraction,
  PromptRefinementResult,
  PromptVersion,
  TrainingProfileInput,
} from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import {
  buildTrainingChecklist,
  calculateTrainingProgress,
  getAngelosLevel,
  getStringList,
  hasMinimumAvatarInput,
  isAvatarComplete,
  isAvatarMeaningful,
  isBusinessComplete,
  isRulesComplete,
  isRulesMeaningful,
  listToText,
  parseJsonObject,
  prettyJson,
  textToList,
  wasPromptRebuiltFromTrainingCenter,
} from "@/lib/training-center/utils";

const EMPTY_PROFILE: TrainingProfileInput = {
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
};

const EMPTY_AVATAR_INPUT: AvatarGenerateInput = {
  client_ideal: "",
  main_problem: "",
  current_block: "",
  fears: "",
  tried_before: "",
  buying_hesitations: "",
  desired_outcome: "",
  bad_fit: "",
};

type StepId = "business" | "knowledge" | "avatar-input" | "avatar-review" | "rules" | "launch";
type Notice = { kind: "success" | "error"; text: string } | null;
type AutosaveKey = "profile" | "avatarInput" | "avatar" | "rules";
type AutosaveStatus = "idle" | "saving" | "saved" | "error";
type AutosaveState = Record<AutosaveKey, { status: AutosaveStatus; savedAt: number | null }>;

const PROMPT_REFINEMENT_CHIPS = [
  "Too long",
  "Too salesy",
  "Wrong language",
  "Wrong next step",
  "Wrong question asked",
  "Bad question",
];

const STEPS: {
  id: StepId;
  title: string;
  eyebrow: string;
  description: string;
}[] = [
  {
    id: "business",
    eyebrow: "01",
    title: "Your offer",
    description: "What you sell and when to move forward.",
  },
  {
    id: "knowledge",
    eyebrow: "02",
    title: "Knowledge & voice",
    description: "Upload docs or paste transcripts.",
  },
  {
    id: "avatar-input",
    eyebrow: "03",
    title: "Ideal customer",
    description: "Who Angellos should qualify.",
  },
  {
    id: "avatar-review",
    eyebrow: "04",
    title: "Customer notes",
    description: "Review what Angellos understood.",
  },
  {
    id: "rules",
    eyebrow: "05",
    title: "Conversation rules",
    description: "How Angellos should reply.",
  },
  {
    id: "launch",
    eyebrow: "06",
    title: "Test and launch",
    description: "Try it and improve replies.",
  },
];

const AVATAR_LABELS: Record<keyof AvatarGenerateInput, { label: string; hint: string; placeholder: string }> = {
  client_ideal: {
    label: "Ideal client",
    hint: "Who must immediately recognize themselves in your DMs?",
    placeholder: "Example: independent fitness coach who gets Instagram leads but wastes time qualifying them.",
  },
  main_problem: {
    label: "Main problem",
    hint: "The problem they express most often.",
    placeholder: "Example: they reply too late, lack DM structure, and let warm prospects slip away.",
  },
  current_block: {
    label: "Current blocker",
    hint: "What is stopping them from moving forward right now.",
    placeholder: "Example: they do not know which questions to ask before offering a call.",
  },
  fears: {
    label: "Fears",
    hint: "What they fear if nothing changes.",
    placeholder: "Example: sounding too salesy, losing leads, automating too early.",
  },
  tried_before: {
    label: "Already tried",
    hint: "Solutions, methods, or coaching already attempted.",
    placeholder: "Example: ManyChat, manual replies, copied scripts, freelance setter.",
  },
  buying_hesitations: {
    label: "Buying hesitations",
    hint: "Price, time, trust, fear of failing.",
    placeholder: "Example: fear that AI will not respect their tone, budget, lack of trust, fear of spam.",
  },
  desired_outcome: {
    label: "Desired outcome",
    hint: "The concrete transformation they want.",
    placeholder: "Example: turn Instagram conversations into qualified calls without spending 2h/day in DMs.",
  },
  bad_fit: {
    label: "Bad fit",
    hint: "Profiles Angellos should filter quickly.",
    placeholder: "Example: unserious people, freebie seekers, prospects outside budget, out-of-scope requests.",
  },
};

const AVATAR_ARRAY_FIELDS: { key: keyof AgentAvatar; label: string; empty: string }[] = [
  { key: "pain_points", label: "Pain points", empty: "No pain points yet." },
  { key: "fears", label: "Fears", empty: "No fears yet." },
  { key: "frustrations", label: "Frustrations", empty: "No frustrations yet." },
  { key: "objections", label: "Objections", empty: "No objections yet." },
  { key: "buying_triggers", label: "Buying triggers", empty: "No buying triggers yet." },
  { key: "dream_outcomes", label: "Dream outcomes", empty: "No dream outcomes yet." },
  { key: "exact_words", label: "Exact words", empty: "No exact words yet." },
  { key: "bad_fit", label: "Bad fit", empty: "No bad fits yet." },
];

const RULE_FIELDS: { key: keyof AgentSalesRules; label: string; empty: string }[] = [
  { key: "qualification_questions", label: "Qualification questions", empty: "No qualification questions." },
  { key: "buying_signals", label: "Buying signals", empty: "No buying signals." },
  { key: "call_offer_conditions", label: "Conditions to offer a call", empty: "No conditions defined." },
  { key: "red_flags", label: "Red flags", empty: "No red flags." },
  { key: "stop_conditions", label: "Stop conditions", empty: "No stop conditions." },
  { key: "objection_responses", label: "Objection responses", empty: "No objection responses." },
  { key: "follow_up_rules", label: "Follow-up rules", empty: "No follow-up rules." },
  { key: "do_not_say", label: "Do not say", empty: "No forbidden phrases." },
  { key: "escalation_rules", label: "Human escalation", empty: "No escalation rules." },
];

const KNOWLEDGE_PREVIEW_SECTIONS = [
  { key: "sales_process_found", title: "Sales process found" },
  { key: "qualification_questions_found", title: "Qualification questions found" },
  { key: "good_fit_signals", title: "Good fit signals" },
  { key: "bad_fit_signals", title: "Bad fit signals" },
  { key: "next_step", title: "Next step" },
  { key: "objection_answers", title: "Objection answers" },
  { key: "faq_answers", title: "FAQ answers" },
  { key: "voice_profile_found", title: "Voice profile found" },
  { key: "phrases_to_use", title: "Phrases Angellos can use" },
  { key: "phrases_to_avoid", title: "Phrases Angellos should avoid" },
];

export default function TrainingCenterPage() {
  const [activeStep, setActiveStep] = useState<StepId>("business");
  const [profile, setProfile] = useState<TrainingProfileInput>(EMPTY_PROFILE);
  const [avatarInput, setAvatarInput] = useState<AvatarGenerateInput>(EMPTY_AVATAR_INPUT);
  const [avatarJson, setAvatarJson] = useState("{}");
  const [rulesJson, setRulesJson] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [generatingRules, setGeneratingRules] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [knowledgeProcess, setKnowledgeProcess] = useState("");
  const [knowledgeText, setKnowledgeText] = useState("");
  const [knowledgeFileName, setKnowledgeFileName] = useState("");
  const [knowledgeFileBase64, setKnowledgeFileBase64] = useState("");
  const [knowledgeExtraction, setKnowledgeExtraction] = useState<KnowledgeExtraction | null>(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeSaving, setKnowledgeSaving] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);
  const [refineInstruction, setRefineInstruction] = useState("");
  const [refinePreview, setRefinePreview] = useState<PromptRefinementResult | null>(null);
  const [refineLoading, setRefineLoading] = useState(false);
  const [refineApplying, setRefineApplying] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [restoreLoading, setRestoreLoading] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAllRules, setShowAllRules] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [autosave, setAutosave] = useState<AutosaveState>({
    profile: { status: "idle", savedAt: null },
    avatarInput: { status: "idle", savedAt: null },
    avatar: { status: "idle", savedAt: null },
    rules: { status: "idle", savedAt: null },
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const profileAutosaveSignatureRef = useRef<string | null>(null);
  const avatarInputAutosaveSignatureRef = useRef<string | null>(null);
  const avatarAutosaveSignatureRef = useRef<string | null>(null);
  const rulesAutosaveSignatureRef = useRef<string | null>(null);

  const applyTrainingCenterState = useCallback((data: Awaited<ReturnType<typeof api.getTrainingCenter>>) => {
    setProfile({ ...EMPTY_PROFILE, ...(data.profile?.profile || {}) });
    setAvatarInput({ ...EMPTY_AVATAR_INPUT, ...(data.avatar?.source_inputs || {}) });
    setAvatarJson(prettyJson(data.avatar?.avatar || {}));
    setRulesJson(prettyJson(data.sales_rules?.rules || {}));
  }, []);

  const refreshTrainingCenterState = useCallback(async () => {
    const data = await api.getTrainingCenter();
    applyTrainingCenterState(data);
  }, [applyTrainingCenterState]);

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = "/login";
    });
  }, []);

  const loadTrainingCenter = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const data = await api.getTrainingCenter();
      applyTrainingCenterState(data);
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to load" });
    } finally {
      setLoading(false);
    }
  }, [applyTrainingCenterState]);

  const loadPromptVersions = useCallback(async () => {
    setVersionsLoading(true);
    try {
      const data = await api.getPromptVersions();
      setPromptVersions(data);
    } catch {
      setPromptVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrainingCenter();
  }, [loadTrainingCenter]);

  useEffect(() => {
    loadPromptVersions();
  }, [loadPromptVersions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const avatar = useMemo(() => {
    const parsed = parseJsonObject<AgentAvatar>(avatarJson);
    return parsed.ok ? parsed.value : {};
  }, [avatarJson]);

  const rules = useMemo(() => {
    const parsed = parseJsonObject<AgentSalesRules>(rulesJson);
    return parsed.ok ? parsed.value : {};
  }, [rulesJson]);

  const businessScore = useMemo(() => {
    const fields = [
      profile.business_name,
      profile.coach_name,
      profile.niche,
      profile.offer_name,
      profile.offer_promise,
      profile.offer_format,
      profile.price,
    ];
    return fields.filter((value) => value.trim()).length;
  }, [profile]);
  const promptRebuilt = useMemo(() => wasPromptRebuiltFromTrainingCenter(promptVersions), [promptVersions]);
  const trainingProgress = useMemo(() => calculateTrainingProgress({
    profile,
    avatar,
    rules,
    promptRebuilt,
    chatMessages,
  }), [profile, avatar, rules, promptRebuilt, chatMessages]);
  const trainingChecklist = useMemo(() => buildTrainingChecklist({
    profile,
    avatar,
    rules,
    promptRebuilt,
    chatMessages,
  }), [profile, avatar, rules, promptRebuilt, chatMessages]);
  const angelosLevel = useMemo(() => getAngelosLevel(trainingProgress), [trainingProgress]);
  const canGenerateAvatar = hasMinimumAvatarInput(avatarInput);
  const canGenerateRules = isAvatarMeaningful(avatar);
  const canRebuildPrompt = isBusinessComplete(profile) && isAvatarComplete(avatar) && isRulesComplete(rules);
  const profileAutosaveSignature = useMemo(() => JSON.stringify(profile), [profile]);
  const avatarInputAutosaveSignature = useMemo(() => JSON.stringify(avatarInput), [avatarInput]);
  const avatarAutosaveSignature = avatarJson;
  const rulesAutosaveSignature = rulesJson;

  const actionDisabled = loading || savingProfile || generatingAvatar || savingAvatar || generatingRules || savingRules || rebuilding || chatLoading || knowledgeLoading || knowledgeSaving || refineLoading || refineApplying || Boolean(restoreLoading);
  const currentIndex = STEPS.findIndex((step) => step.id === activeStep);
  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < STEPS.length - 1;

  const setAutosaveStatus = useCallback((key: AutosaveKey, status: AutosaveStatus) => {
    setAutosave((current) => ({
      ...current,
      [key]: {
        status,
        savedAt: status === "saved" ? Date.now() : current[key].savedAt,
      },
    }));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (profileAutosaveSignatureRef.current === null) {
      profileAutosaveSignatureRef.current = profileAutosaveSignature;
      return;
    }
    if (profileAutosaveSignatureRef.current === profileAutosaveSignature) return;

    const timeout = window.setTimeout(async () => {
      setAutosaveStatus("profile", "saving");
      try {
        await api.autosaveTrainingProfile(profile);
        profileAutosaveSignatureRef.current = profileAutosaveSignature;
        setAutosaveStatus("profile", "saved");
      } catch {
        setAutosaveStatus("profile", "error");
      }
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [loading, profile, profileAutosaveSignature, setAutosaveStatus]);

  useEffect(() => {
    if (loading) return;
    if (avatarInputAutosaveSignatureRef.current === null) {
      avatarInputAutosaveSignatureRef.current = avatarInputAutosaveSignature;
      return;
    }
    if (avatarInputAutosaveSignatureRef.current === avatarInputAutosaveSignature) return;

    const timeout = window.setTimeout(async () => {
      setAutosaveStatus("avatarInput", "saving");
      try {
        await api.autosaveAvatarInput(avatarInput);
        avatarInputAutosaveSignatureRef.current = avatarInputAutosaveSignature;
        setAutosaveStatus("avatarInput", "saved");
      } catch {
        setAutosaveStatus("avatarInput", "error");
      }
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [loading, avatarInput, avatarInputAutosaveSignature, setAutosaveStatus]);

  useEffect(() => {
    if (loading) return;
    if (avatarAutosaveSignatureRef.current === null) {
      avatarAutosaveSignatureRef.current = avatarAutosaveSignature;
      return;
    }
    if (avatarAutosaveSignatureRef.current === avatarAutosaveSignature) return;

    const parsed = parseJsonObject<AgentAvatar>(avatarJson);
    if (!parsed.ok) {
      setAutosaveStatus("avatar", "error");
      return;
    }

    const timeout = window.setTimeout(async () => {
      setAutosaveStatus("avatar", "saving");
      try {
        await api.autosaveAvatar(parsed.value);
        avatarAutosaveSignatureRef.current = avatarAutosaveSignature;
        setAutosaveStatus("avatar", "saved");
      } catch {
        setAutosaveStatus("avatar", "error");
      }
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [loading, avatarJson, avatarAutosaveSignature, setAutosaveStatus]);

  useEffect(() => {
    if (loading) return;
    if (rulesAutosaveSignatureRef.current === null) {
      rulesAutosaveSignatureRef.current = rulesAutosaveSignature;
      return;
    }
    if (rulesAutosaveSignatureRef.current === rulesAutosaveSignature) return;

    const parsed = parseJsonObject<AgentSalesRules>(rulesJson);
    if (!parsed.ok) {
      setAutosaveStatus("rules", "error");
      return;
    }

    const timeout = window.setTimeout(async () => {
      setAutosaveStatus("rules", "saving");
      try {
        await api.autosaveSalesRules(parsed.value);
        rulesAutosaveSignatureRef.current = rulesAutosaveSignature;
        setAutosaveStatus("rules", "saved");
      } catch {
        setAutosaveStatus("rules", "error");
      }
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [loading, rulesJson, rulesAutosaveSignature, setAutosaveStatus]);

  function updateProfile(key: keyof TrainingProfileInput, value: string | string[]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function updateAvatarInput(key: keyof AvatarGenerateInput, value: string) {
    setAvatarInput((current) => ({ ...current, [key]: value }));
  }

  function updateAvatarField(key: keyof AgentAvatar, value: string | string[] | number) {
    setAvatarJson(prettyJson({ ...avatar, [key]: value }));
  }

  function updateRulesField(key: keyof AgentSalesRules, value: string[]) {
    setRulesJson(prettyJson({ ...rules, [key]: value }));
  }

  function goNext() {
    if (canGoNext) setActiveStep(STEPS[currentIndex + 1].id);
  }

  function goBack() {
    if (canGoBack) setActiveStep(STEPS[currentIndex - 1].id);
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    setNotice(null);
    try {
      await api.saveTrainingProfile(profile);
      setNotice({ kind: "success", text: "Offer saved." });
      setActiveStep("avatar-input");
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to save" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleGenerateAvatar() {
    if (!canGenerateAvatar) {
      setNotice({ kind: "error", text: "Complete ideal client, main problem, and desired outcome first." });
      return;
    }
    setGeneratingAvatar(true);
    setNotice(null);
    try {
      const data = await api.generateAvatar(avatarInput);
      setAvatarJson(prettyJson(data.avatar));
      setNotice({ kind: "success", text: "Customer notes are ready to review." });
      setActiveStep("avatar-review");
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to generate" });
    } finally {
      setGeneratingAvatar(false);
    }
  }

  async function handleSaveAvatar() {
    setSavingAvatar(true);
    setNotice(null);
    try {
      const parsed = parseJsonObject<AgentAvatar>(avatarJson);
      if (!parsed.ok) {
        setNotice({ kind: "error", text: parsed.message });
        return;
      }
      await api.saveAvatar(avatarInput, parsed.value);
      setNotice({ kind: "success", text: "Customer notes saved." });
      setActiveStep("rules");
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Invalid avatar" });
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handleGenerateRules() {
    if (!canGenerateRules) {
      setNotice({ kind: "error", text: "Generate and complete the client avatar before creating DM rules." });
      return;
    }
    setGeneratingRules(true);
    setNotice(null);
    try {
      const parsed = parseJsonObject<AgentAvatar>(avatarJson);
      if (!parsed.ok) {
        setNotice({ kind: "error", text: parsed.message });
        return;
      }
      const data = await api.generateSalesRules(parsed.value, profile);
      setRulesJson(prettyJson(data.rules));
      setNotice({ kind: "success", text: "Conversation rules suggested." });
      setActiveStep("rules");
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to generate rules" });
    } finally {
      setGeneratingRules(false);
    }
  }

  async function handleSaveRules() {
    setSavingRules(true);
    setNotice(null);
    try {
      const parsed = parseJsonObject<AgentSalesRules>(rulesJson);
      if (!parsed.ok) {
        setNotice({ kind: "error", text: parsed.message });
        return;
      }
      await api.saveSalesRules(parsed.value);
      await refreshTrainingCenterState();
      setNotice({ kind: "success", text: "Conversation rules saved." });
      setActiveStep("launch");
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Invalid rules" });
    } finally {
      setSavingRules(false);
    }
  }

  async function handleRebuildPrompt() {
    if (!canRebuildPrompt) {
      setNotice({ kind: "error", text: "Complete the offer, ideal customer, and conversation rules before updating Angellos." });
      return;
    }
    setRebuilding(true);
    setNotice(null);
    try {
      await api.rebuildAgentPrompt();
      await refreshTrainingCenterState();
      setNotice({ kind: "success", text: "Updated. Test the new behavior below." });
      await loadPromptVersions();
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to rebuild" });
    } finally {
      setRebuilding(false);
    }
  }

  async function handleSendTestMessage() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const nextMessages = [...chatMessages, { role: "user" as const, content: text }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    try {
      const data = await api.playground(nextMessages, profile.calendly_url, profile.sales_page_url);
      setChatMessages((current) => [...current, { role: "assistant", content: data.response }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to run test";
      setChatError(message);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatInputRef.current?.focus(), 50);
    }
  }

  async function handleExtractKnowledge() {
    if (!knowledgeProcess.trim() && !knowledgeText.trim() && !knowledgeFileBase64) {
      setKnowledgeError("Write your process or paste document text first.");
      return;
    }
    setKnowledgeLoading(true);
    setKnowledgeError(null);
    setNotice(null);
    try {
      const extraction = await api.extractKnowledge({
        manual_process: knowledgeProcess,
        pasted_text: knowledgeText,
        file_name: knowledgeFileName,
        file_type: knowledgeFileName.split(".").pop() || "pasted text",
        file_base64: knowledgeFileBase64,
        category: "knowledge_and_voice",
      });
      setKnowledgeExtraction(extraction);
      setNotice({ kind: "success", text: "Angellos learned from your files. Review it before saving." });
    } catch (error) {
      setKnowledgeExtraction(null);
      setKnowledgeError(error instanceof Error ? error.message : "Couldn’t read this knowledge. Try pasting text instead.");
    } finally {
      setKnowledgeLoading(false);
    }
  }

  async function handleTrainKnowledge() {
    if (!knowledgeExtraction) {
      setKnowledgeError("Review what Angellos learned first.");
      return;
    }
    setKnowledgeSaving(true);
    setKnowledgeError(null);
    setNotice(null);
    try {
      await api.trainKnowledge({
        profile_patch: knowledgeExtraction.profile_patch,
        avatar_patch: knowledgeExtraction.avatar_patch,
        rules_patch: knowledgeExtraction.rules_patch,
      });
      await api.rebuildAgentPrompt();
      await refreshTrainingCenterState();
      await loadPromptVersions();
      setNotice({ kind: "success", text: "Angellos learned your process and voice. Test it with a sample conversation." });
      setActiveStep("launch");
    } catch (error) {
      setKnowledgeError(error instanceof Error ? error.message : "Couldn’t train Angellos. Try again.");
    } finally {
      setKnowledgeSaving(false);
    }
  }

  function handleKnowledgePreviewChange(section: string, items: string[]) {
    setKnowledgeExtraction((current) => {
      if (!current) return current;
      return {
        ...current,
        preview: { ...current.preview, [section]: items },
        ...mapKnowledgePreviewToPatch(current, section, items),
      };
    });
  }

  function handleChatKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendTestMessage();
    }
  }

  async function handlePreviewPromptRefinement() {
    const instruction = refineInstruction.trim();
    if (!instruction) {
      setRefineError("Tell Angellos what to improve first.");
      return;
    }
    setRefineLoading(true);
    setRefineError(null);
    setNotice(null);
    try {
      const preview = await api.refinePrompt(instruction, false);
      setRefinePreview(preview);
      setNotice({ kind: "success", text: "Ready to update Angellos." });
    } catch (error) {
      setRefinePreview(null);
      setRefineError(error instanceof Error ? error.message : "Couldn’t update Angellos. Try again or check the console.");
    } finally {
      setRefineLoading(false);
    }
  }

  async function handleApplyPromptRefinement() {
    const instruction = (refinePreview?.instruction || refineInstruction).trim();
    if (!instruction) {
      setRefineError("Missing instruction.");
      return;
    }
    setRefineApplying(true);
    setRefineError(null);
    setNotice(null);
    try {
      await api.refinePrompt(instruction, true, undefined, refinePreview?.updated_prompt);
      setChatMessages([]);
      setChatError(null);
      setChatInput("");
      setRefinePreview(null);
      setRefineInstruction("");
      await loadPromptVersions();
      setNotice({ kind: "success", text: "Updated. Test the new behavior below." });
    } catch (error) {
      setRefineError(error instanceof Error ? error.message : "Couldn’t update Angellos. Try again or check the console.");
    } finally {
      setRefineApplying(false);
    }
  }

  async function handleRestorePrompt(versionId: string) {
    setRestoreLoading(versionId);
    setNotice(null);
    try {
      await api.restorePromptVersion(versionId);
      await loadPromptVersions();
      setNotice({ kind: "success", text: "Version restored." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to restore" });
    } finally {
      setRestoreLoading(null);
    }
  }

  return (
    <main className="app-page training-center-page" style={{ minHeight: "100vh", background: "#f5f7fb", paddingLeft: 72 }}>
      <NavBar />
      <div className="app-page-inner training-inner" style={{ maxWidth: 1440, margin: "0 auto", padding: "28px 28px 44px" }}>
        <header className="training-header" style={styles.header}>
          <div>
            <div style={styles.titleRow}>
              <GraduationCap size={24} color="#0095F6" />
              <h1 style={styles.title}>Teach Angellos</h1>
            </div>
            <p style={styles.subtitle}>
              Show Angellos how to qualify prospects, reply in your tone, and move the right people to the next step.
            </p>
            <p style={styles.microCopy}>
              Answer simply in your own words. Correct Angellos like you would correct a teammate.
            </p>
          </div>
          <button
            type="button"
            onClick={loadTrainingCenter}
            disabled={loading}
            title="Refresh"
            aria-label="Refresh"
            style={iconButton(loading)}
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
          </button>
        </header>

        {notice && (
          <div style={notice.kind === "success" ? styles.successNotice : styles.errorNotice}>
            {notice.text}
          </div>
        )}

        <section className="training-shell" style={styles.shell}>
          <aside className="training-steps-pane" style={styles.stepsPane}>
            <TrainingProgress
              progress={trainingProgress}
              businessScore={businessScore}
              level={angelosLevel}
              checklist={trainingChecklist}
            />

            <nav style={styles.stepList}>
              {STEPS.map((step, index) => {
                const active = step.id === activeStep;
                const done = stepDone(step.id, trainingChecklist);
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStep(step.id)}
                    style={stepButton(active)}
                  >
                    <span style={stepDot(active, done)}>
                      {done ? <Check size={13} /> : step.eyebrow}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={styles.stepTitle}>{step.title}</span>
                      <span style={styles.stepDescription}>{step.description}</span>
                    </span>
                    {index < STEPS.length - 1 && <span style={styles.stepLine} />}
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="training-work-pane" style={styles.workPane}>
            {activeStep === "business" && (
              <BusinessStep
                profile={profile}
                onChange={updateProfile}
                autosaveStatus={autosave.profile.status}
                disabled={actionDisabled}
                saving={savingProfile}
                onSave={handleSaveProfile}
              />
            )}

            {activeStep === "knowledge" && (
              <KnowledgeVoiceStep
                manualProcess={knowledgeProcess}
                pastedText={knowledgeText}
                fileName={knowledgeFileName}
                extraction={knowledgeExtraction}
                loading={knowledgeLoading}
                saving={knowledgeSaving}
                error={knowledgeError}
                disabled={actionDisabled}
                onManualProcessChange={setKnowledgeProcess}
                onPastedTextChange={setKnowledgeText}
                onFileNameChange={setKnowledgeFileName}
                onFileBase64Change={setKnowledgeFileBase64}
                onPreviewChange={handleKnowledgePreviewChange}
                onExtract={handleExtractKnowledge}
                onTrain={handleTrainKnowledge}
              />
            )}

            {activeStep === "avatar-input" && (
              <AvatarInputStep
                input={avatarInput}
                disabled={actionDisabled || !canGenerateAvatar}
                autosaveStatus={autosave.avatarInput.status}
                helperText={canGenerateAvatar ? null : "Complete ideal client, main problem, and desired outcome first."}
                generating={generatingAvatar}
                onChange={updateAvatarInput}
                onGenerate={handleGenerateAvatar}
              />
            )}

            {activeStep === "avatar-review" && (
              <AvatarReviewStep
                avatar={avatar}
                avatarJson={avatarJson}
                showAdvanced={showAdvanced}
                disabled={actionDisabled}
                saving={savingAvatar}
                autosaveStatus={autosave.avatar.status}
                generatingRules={generatingRules}
                canGenerateRules={canGenerateRules}
                generateRulesHelp={canGenerateRules ? null : "Generate and complete the client avatar first."}
                onAvatarChange={updateAvatarField}
                onJsonChange={setAvatarJson}
                onToggleAdvanced={() => setShowAdvanced((value) => !value)}
                onSave={handleSaveAvatar}
                onGenerateRules={handleGenerateRules}
              />
            )}

            {activeStep === "rules" && (
              <RulesStep
                rules={rules}
                rulesJson={rulesJson}
                showAdvanced={showAdvanced}
                disabled={actionDisabled}
                saving={savingRules}
                autosaveStatus={autosave.rules.status}
                generating={generatingRules}
                canGenerate={canGenerateRules}
                generateHelp={canGenerateRules ? null : "Review the avatar before generating DM rules."}
                onRulesChange={updateRulesField}
                onJsonChange={setRulesJson}
                onToggleAdvanced={() => setShowAdvanced((value) => !value)}
                showAllRules={showAllRules}
                onToggleAllRules={() => setShowAllRules((value) => !value)}
                onGenerate={handleGenerateRules}
                onSave={handleSaveRules}
              />
            )}

            {activeStep === "launch" && (
              <LaunchStep
                profile={profile}
                avatar={avatar}
                rules={rules}
                disabled={actionDisabled}
                canRebuild={canRebuildPrompt}
                rebuildHelp={canRebuildPrompt ? null : "Complete the business profile, avatar, and DM rules before rebuilding."}
                rebuilding={rebuilding}
                messages={chatMessages}
                input={chatInput}
                chatLoading={chatLoading}
                chatError={chatError}
                refineInstruction={refineInstruction}
                refinePreview={refinePreview}
                refineLoading={refineLoading}
                refineApplying={refineApplying}
                refineError={refineError}
                promptVersions={promptVersions}
                versionsLoading={versionsLoading}
                restoreLoading={restoreLoading}
                messagesEndRef={messagesEndRef}
                inputRef={chatInputRef}
                onInputChange={setChatInput}
                onSendTestMessage={handleSendTestMessage}
                onChatKeyDown={handleChatKeyDown}
                onResetChat={() => {
                  setChatMessages([]);
                  setChatError(null);
                  setChatInput("");
                }}
                onRefineInstructionChange={(value) => {
                  setRefineInstruction(value);
                  setRefineError(null);
                }}
                onRefineChip={(value) => {
                  setRefineInstruction((current) => current.trim() ? `${current.trim()}\n${value}` : value);
                  setRefineError(null);
                }}
                onPreviewRefinement={handlePreviewPromptRefinement}
                onApplyRefinement={handleApplyPromptRefinement}
                onCancelRefinement={() => setRefinePreview(null)}
                onRestorePrompt={handleRestorePrompt}
                onRebuild={handleRebuildPrompt}
              />
            )}

            <div style={styles.footerNav}>
              <button type="button" onClick={goBack} disabled={!canGoBack || actionDisabled} style={ghostButton(!canGoBack || actionDisabled)}>
                <ArrowLeft size={15} />
                Back
              </button>
              <button type="button" onClick={goNext} disabled={!canGoNext || actionDisabled} style={ghostButton(!canGoNext || actionDisabled)}>
                Next
                <ArrowRight size={15} />
              </button>
            </div>
          </section>

          <aside className="training-preview-pane" style={styles.previewPane}>
            <PreviewPanel profile={profile} avatar={avatar} rules={rules} activeStep={activeStep} onEdit={setActiveStep} />
          </aside>
        </section>
      </div>
    </main>
  );
}

function AutosaveIndicator({ status }: { status: AutosaveStatus }) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span style={styles.autosaveSaving}>
        <Loader2 size={12} className="animate-spin" />
        Saving...
      </span>
    );
  }
  if (status === "error") {
    return <span style={styles.autosaveError}>Not saved</span>;
  }
  return (
    <span style={styles.autosaveSaved}>
      <Check size={12} />
      Saved
    </span>
  );
}

function BusinessStep({
  profile,
  autosaveStatus,
  disabled,
  saving,
  onChange,
  onSave,
}: {
  profile: TrainingProfileInput;
  autosaveStatus: AutosaveStatus;
  disabled: boolean;
  saving: boolean;
  onChange: (key: keyof TrainingProfileInput, value: string | string[]) => void;
  onSave: () => void;
}) {
  return (
    <div>
      <SectionHeader
        eyebrow="Your offer"
        title="Teach Angellos what you sell"
        description="Give Angellos the basics it needs to understand your offer and the next step you want prospects to take."
        action={
          <div style={styles.headerActions}>
            <AutosaveIndicator status={autosaveStatus} />
            <button type="button" onClick={onSave} disabled={disabled} style={primaryButton(disabled)}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save offer
            </button>
          </div>
        }
      />

      <div style={styles.fieldGrid}>
        <Field label="Business name" value={profile.business_name} onChange={(v) => onChange("business_name", v)} placeholder="Example: TrainToRehab, Studio Fit Lead, Rehab Coach Academy" />
        <Field label="Coach / founder" value={profile.coach_name} onChange={(v) => onChange("coach_name", v)} placeholder="Example: Thomas, head coach who replies to prospects" />
        <Field label="Niche" value={profile.niche} onChange={(v) => onChange("niche", v)} placeholder="Example: fitness coaches who want to turn Instagram leads into qualified calls." />
        <Field label="Offer name" value={profile.offer_name} onChange={(v) => onChange("offer_name", v)} placeholder="Example: 8-week coaching program to structure Instagram acquisition and closing." />
      </div>

      <div style={styles.focusArea}>
        <TextField
          label="Offer promise"
          value={profile.offer_promise}
          rows={4}
          onChange={(v) => onChange("offer_promise", v)}
          placeholder="Example: go from scattered Instagram conversations to 5-10 qualified calls per week without spending 2h/day in DMs."
        />
        <TextField
          label="Format / coaching"
          value={profile.offer_format}
          rows={4}
          onChange={(v) => onChange("offer_format", v)}
          placeholder="Example: 8 weeks, 1 call per week, WhatsApp support, DM scripts, tracking dashboard, and weekly feedback."
        />
        <TextField
          label="Price / terms"
          value={profile.price}
          rows={3}
          onChange={(v) => onChange("price", v)}
          placeholder="Example: EUR 1,500 to EUR 3,000, paid once or in 3 installments. Only mention price after qualification."
        />
      </div>

      <details style={styles.details}>
        <summary style={styles.summary}>Advanced fields</summary>
        <div style={styles.advancedGrid}>
          <TextField label="Proof points" value={listToText(profile.proof_points)} rows={4} onChange={(v) => onChange("proof_points", textToList(v))} placeholder="Example: +42 qualified calls in 30 days for one coach. One proof point per line." />
          <TextField label="Tone to respect" value={listToText(profile.tone_rules)} rows={4} onChange={(v) => onChange("tone_rules", textToList(v))} placeholder="One tone rule per line." />
          <TextField label="Do not say" value={listToText(profile.forbidden_phrases)} rows={4} onChange={(v) => onChange("forbidden_phrases", textToList(v))} placeholder="Example: guaranteed promises, aggressive pitch, guilt-based follow-ups. One phrase per line." />
          <Field label="Call link" value={profile.calendly_url} onChange={(v) => onChange("calendly_url", v)} placeholder="https://calendly.com/..." />
          <Field label="Sales page link" value={profile.sales_page_url} onChange={(v) => onChange("sales_page_url", v)} placeholder="https://..." />
          <TextField label="Free notes" value={profile.raw_notes} rows={5} onChange={(v) => onChange("raw_notes", v)} placeholder="Useful context, subtleties, edge cases." />
        </div>
      </details>
    </div>
  );
}

function KnowledgeVoiceStep({
  manualProcess,
  pastedText,
  fileName,
  extraction,
  loading,
  saving,
  error,
  disabled,
  onManualProcessChange,
  onPastedTextChange,
  onFileNameChange,
  onFileBase64Change,
  onPreviewChange,
  onExtract,
  onTrain,
}: {
  manualProcess: string;
  pastedText: string;
  fileName: string;
  extraction: KnowledgeExtraction | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  disabled: boolean;
  onManualProcessChange: (value: string) => void;
  onPastedTextChange: (value: string) => void;
  onFileNameChange: (value: string) => void;
  onFileBase64Change: (value: string) => void;
  onPreviewChange: (section: string, items: string[]) => void;
  onExtract: () => void;
  onTrain: () => void;
}) {
  const canExtract = Boolean(manualProcess.trim() || pastedText.trim() || fileName);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    onFileNameChange(file.name);
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    onFileBase64Change(window.btoa(binary));

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["txt", "md", "markdown", "csv"].includes(extension)) {
      return;
    }
    onPastedTextChange(new TextDecoder("utf-8").decode(buffer));
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Knowledge & voice"
        title="Upload your knowledge and voice"
        description="Add sales scripts, FAQs, SOPs, call notes, YouTube transcripts, podcast transcripts, captions, or newsletters. Angellos will learn what you sell, how your sales process works, and how you speak."
        action={
          <button type="button" onClick={onExtract} disabled={disabled || loading || !canExtract} style={primaryButton(disabled || loading || !canExtract)}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? "Reading..." : "Review what Angellos learned"}
          </button>
        }
      />

      <div style={styles.knowledgeGrid}>
        <section style={styles.knowledgeCard}>
          <h3 style={styles.cardTitle}>Write your sales process</h3>
          <p style={styles.toolText}>How do you usually handle a good DM conversation?</p>
          <textarea
            value={manualProcess}
            rows={8}
            disabled={disabled || loading || saving}
            onChange={(event) => onManualProcessChange(event.target.value)}
            placeholder={"Example:\nWhen someone says they are interested, I first ask what they sell and how many leads they get per month. If they have a $500+ offer and use Instagram for sales, I send them the application page. I don’t send Calendly before they apply."}
            style={styles.refineInput}
          />
        </section>

        <section style={styles.knowledgeCard}>
          <h3 style={styles.cardTitle}>Upload your knowledge and voice</h3>
          <p style={styles.toolText}>Upload your sales script, FAQ, SOP, offer doc, call notes, DM process, YouTube transcript, podcast transcript, newsletter, captions, or voice note transcript.</p>
          <label style={styles.uploadBox}>
            <input
              type="file"
              accept=".txt,.md,.markdown,.csv,.pdf,.docx"
              disabled={disabled || loading || saving}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <FileJson size={18} />
            <span>{fileName || "Upload TXT, Markdown, CSV, PDF or DOCX"}</span>
            <small>PDF, DOCX, TXT, Markdown and CSV are supported.</small>
          </label>
          <textarea
            value={pastedText}
            rows={8}
            disabled={disabled || loading || saving}
            onChange={(event) => onPastedTextChange(event.target.value)}
            placeholder="Paste a YouTube transcript, podcast transcript, sales script, FAQ, captions, newsletter, SOP, or call notes here."
            style={styles.refineInput}
          />
        </section>
      </div>

      {error && <p style={styles.inlineError}>{error}</p>}

      {extraction && (
        <section style={styles.learnedPanel}>
          <div style={styles.toolHeader}>
            <div>
              <h3 style={styles.cardTitle}>Angellos learned from your files</h3>
              <p style={styles.toolText}>Edit or remove anything before saving it.</p>
            </div>
            <button type="button" onClick={onTrain} disabled={disabled || saving} style={primaryButton(disabled || saving)}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {saving ? "Training Angellos..." : "Looks good, train Angellos"}
            </button>
          </div>
          <div style={styles.knowledgePreviewGrid}>
            {KNOWLEDGE_PREVIEW_SECTIONS.map((section) => (
              <KnowledgePreviewSection
                key={section.key}
                title={section.title}
                items={extraction.preview?.[section.key] || []}
                onChange={(items) => onPreviewChange(section.key, items)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AvatarInputStep({
  input,
  disabled,
  autosaveStatus,
  helperText,
  generating,
  onChange,
  onGenerate,
}: {
  input: AvatarGenerateInput;
  disabled: boolean;
  autosaveStatus: AutosaveStatus;
  helperText: string | null;
  generating: boolean;
  onChange: (key: keyof AvatarGenerateInput, value: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div>
      <SectionHeader
        eyebrow="Ideal customer"
        title="Describe who Angellos should qualify"
        description="Write naturally. Angellos will turn your answers into simple customer notes you can review."
        action={
          <div style={styles.headerActions}>
            <AutosaveIndicator status={autosaveStatus} />
            <button type="button" onClick={onGenerate} disabled={disabled} style={primaryButton(disabled)}>
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              Create customer notes
            </button>
          </div>
        }
      />
      {helperText && <p style={styles.actionHelp}>{helperText}</p>}

      <div style={styles.promptGrid}>
        {Object.entries(AVATAR_LABELS).map(([key, item]) => (
          <PromptField
            key={key}
            label={item.label}
            hint={item.hint}
            placeholder={item.placeholder}
            value={input[key as keyof AvatarGenerateInput]}
            onChange={(value) => onChange(key as keyof AvatarGenerateInput, value)}
          />
        ))}
      </div>
    </div>
  );
}

function AvatarReviewStep({
  avatar,
  avatarJson,
  showAdvanced,
  disabled,
  saving,
  autosaveStatus,
  generatingRules,
  canGenerateRules,
  generateRulesHelp,
  onAvatarChange,
  onJsonChange,
  onToggleAdvanced,
  onSave,
  onGenerateRules,
}: {
  avatar: AgentAvatar;
  avatarJson: string;
  showAdvanced: boolean;
  disabled: boolean;
  saving: boolean;
  autosaveStatus: AutosaveStatus;
  generatingRules: boolean;
  canGenerateRules: boolean;
  generateRulesHelp: string | null;
  onAvatarChange: (key: keyof AgentAvatar, value: string | string[] | number) => void;
  onJsonChange: (value: string) => void;
  onToggleAdvanced: () => void;
  onSave: () => void;
  onGenerateRules: () => void;
}) {
  return (
    <div>
      <SectionHeader
        eyebrow="Customer notes"
        title="Review what Angellos understood"
        description="Correct the important wording before Angellos uses it in test conversations."
        action={
          <div style={styles.headerActions}>
            <AutosaveIndicator status={autosaveStatus} />
            <button type="button" onClick={onSave} disabled={disabled} style={primaryButton(disabled)}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save notes
            </button>
          </div>
        }
      />

      {!isAvatarMeaningful(avatar) && (
        <EmptyState text="Answer the previous questions, then click Generate avatar." />
      )}

      <div style={styles.focusArea}>
          <TextField
            label="Persona summary"
            value={typeof avatar.persona_summary === "string" ? avatar.persona_summary : ""}
            rows={4}
            onChange={(value) => onAvatarChange("persona_summary", value)}
            placeholder="Generate the avatar to fill this summary."
          />
          <TextField
            label="Current situation"
            value={typeof avatar.current_situation === "string" ? avatar.current_situation : ""}
            rows={3}
            onChange={(value) => onAvatarChange("current_situation", value)}
            placeholder="What the prospect is experiencing today."
          />
          <TextField
            label="Desired situation"
            value={typeof avatar.desired_situation === "string" ? avatar.desired_situation : ""}
            rows={3}
            onChange={(value) => onAvatarChange("desired_situation", value)}
            placeholder="What they want to achieve."
          />
        </div>

      <div style={styles.editableListGrid}>
        {AVATAR_ARRAY_FIELDS.map((field) => (
          <EditableList
            key={field.key}
            label={field.label}
            empty={field.empty}
            items={getStringList(avatar[field.key])}
            onChange={(items) => onAvatarChange(field.key, items)}
          />
        ))}
      </div>

      <div style={styles.actionRow}>
        <button type="button" onClick={onGenerateRules} disabled={disabled || !canGenerateRules} style={secondaryButton(disabled || !canGenerateRules)}>
          {generatingRules ? <Loader2 size={15} className="animate-spin" /> : <MessageSquareText size={15} />}
          Suggest conversation rules
        </button>
        <AdvancedToggle open={showAdvanced} onClick={onToggleAdvanced} />
      </div>
      {generateRulesHelp && <p style={styles.actionHelp}>{generateRulesHelp}</p>}

      {showAdvanced && (
        <JsonEditor title="Advanced customer data" value={avatarJson} onChange={onJsonChange} rows={12} />
      )}
    </div>
  );
}

function RulesStep({
  rules,
  rulesJson,
  showAdvanced,
  showAllRules,
  disabled,
  saving,
  autosaveStatus,
  generating,
  canGenerate,
  generateHelp,
  onRulesChange,
  onJsonChange,
  onToggleAdvanced,
  onToggleAllRules,
  onGenerate,
  onSave,
}: {
  rules: AgentSalesRules;
  rulesJson: string;
  showAdvanced: boolean;
  showAllRules: boolean;
  disabled: boolean;
  saving: boolean;
  autosaveStatus: AutosaveStatus;
  generating: boolean;
  canGenerate: boolean;
  generateHelp: string | null;
  onRulesChange: (key: keyof AgentSalesRules, value: string[]) => void;
  onJsonChange: (value: string) => void;
  onToggleAdvanced: () => void;
  onToggleAllRules: () => void;
  onGenerate: () => void;
  onSave: () => void;
}) {
  const simpleRules = buildSimpleRules(rules);

  return (
    <div>
      <SectionHeader
        eyebrow="Conversation rules"
        title="How Angellos should reply"
        description="Keep the most important rules visible. You can open the full list when you need more control."
        action={
          <div style={styles.headerActions}>
            <AutosaveIndicator status={autosaveStatus} />
            <button type="button" onClick={onSave} disabled={disabled} style={primaryButton(disabled)}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save
            </button>
          </div>
        }
      />

      <div style={styles.actionRow}>
        <button type="button" onClick={onGenerate} disabled={disabled || !canGenerate} style={secondaryButton(disabled || !canGenerate)}>
          {generating ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
          Suggest rules
        </button>
        <button type="button" onClick={onToggleAllRules} style={ghostButton(false)}>
          {showAllRules ? "Hide all rules" : "View all rules"}
        </button>
      </div>
      {generateHelp && <p style={styles.actionHelp}>{generateHelp}</p>}

      {!isRulesMeaningful(rules) && (
        <EmptyState text="Review the customer notes, then suggest conversation rules." />
      )}

      <div style={styles.simpleRulesList}>
        {simpleRules.map((rule) => (
          <div key={`${rule.key}-${rule.index}`} style={styles.simpleRuleRow}>
            <span style={styles.simpleRuleText}>{rule.text}</span>
            <div style={styles.simpleRuleActions}>
              <button type="button" disabled={disabled} onClick={() => onToggleAllRules()} style={styles.textButton}>Edit</button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const current = getStringList(rules[rule.key]);
                  onRulesChange(rule.key, current.filter((_, index) => index !== rule.index));
                }}
                style={styles.textButton}
              >
                Turn off
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAllRules && (
        <div style={styles.editableListGrid}>
          {RULE_FIELDS.map((field) => (
            <EditableList
              key={field.key}
              label={plainRuleLabel(field.label)}
              empty={field.empty.replace("structured ", "")}
              items={getStringList(rules[field.key])}
              onChange={(items) => onRulesChange(field.key, items)}
            />
          ))}
        </div>
      )}

      <div style={styles.actionRow}>
        <AdvancedToggle open={showAdvanced} onClick={onToggleAdvanced} />
      </div>

      {showAdvanced && (
        <JsonEditor title="Advanced rules data" value={rulesJson} onChange={onJsonChange} rows={12} />
      )}
    </div>
  );
}

function LaunchStep({
  profile,
  avatar,
  rules,
  disabled,
  canRebuild,
  rebuildHelp,
  rebuilding,
  messages,
  input,
  chatLoading,
  chatError,
  refineInstruction,
  refinePreview,
  refineLoading,
  refineApplying,
  refineError,
  promptVersions,
  versionsLoading,
  restoreLoading,
  messagesEndRef,
  inputRef,
  onInputChange,
  onSendTestMessage,
  onChatKeyDown,
  onResetChat,
  onRefineInstructionChange,
  onRefineChip,
  onPreviewRefinement,
  onApplyRefinement,
  onCancelRefinement,
  onRestorePrompt,
  onRebuild,
}: {
  profile: TrainingProfileInput;
  avatar: AgentAvatar;
  rules: AgentSalesRules;
  disabled: boolean;
  canRebuild: boolean;
  rebuildHelp: string | null;
  rebuilding: boolean;
  messages: ChatMessage[];
  input: string;
  chatLoading: boolean;
  chatError: string | null;
  refineInstruction: string;
  refinePreview: PromptRefinementResult | null;
  refineLoading: boolean;
  refineApplying: boolean;
  refineError: string | null;
  promptVersions: PromptVersion[];
  versionsLoading: boolean;
  restoreLoading: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onSendTestMessage: () => void;
  onChatKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onResetChat: () => void;
  onRefineInstructionChange: (value: string) => void;
  onRefineChip: (value: string) => void;
  onPreviewRefinement: () => void;
  onApplyRefinement: () => void;
  onCancelRefinement: () => void;
  onRestorePrompt: (versionId: string) => void;
  onRebuild: () => void;
}) {
  const avatarTextCount = [
    avatar.persona_summary,
    avatar.current_situation,
    avatar.desired_situation,
  ].filter((value) => typeof value === "string" && value.trim()).length;
  const avatarListCount = AVATAR_ARRAY_FIELDS.reduce((total, field) => total + getStringList(avatar[field.key]).length, 0);
  const avatarCount = avatarTextCount + avatarListCount;
  const rulesCount = RULE_FIELDS.reduce((total, field) => total + getStringList(rules[field.key]).length, 0);
  const businessDetailsCount = [
    profile.business_name,
    profile.coach_name,
    profile.niche,
    profile.offer_name,
    profile.offer_promise,
    profile.offer_format,
    profile.price,
  ].filter((value) => value.trim()).length;

  return (
    <div>
      <SectionHeader
        eyebrow="Test and launch"
        title="Test Angellos"
        description="Act like a prospect and see how Angellos replies. If something feels off, correct it like you would correct a teammate."
        action={
          <button type="button" onClick={onRebuild} disabled={disabled || !canRebuild} style={primaryButton(disabled || !canRebuild)}>
            {rebuilding ? <Loader2 size={15} className="animate-spin" /> : <FileJson size={15} />}
            {rebuilding ? "Updating Angellos..." : "Update Angellos"}
          </button>
        }
      />
      {rebuildHelp && <p style={styles.actionHelp}>{rebuildHelp.replace("business profile, avatar, and DM rules", "offer, ideal customer, and conversation rules")}</p>}

      <div style={styles.launchGrid}>
        <SummaryMetric label="Offer" value={profile.offer_name || profile.business_name || "To complete"} meta={`${businessDetailsCount} details saved`} />
        <SummaryMetric label="Ideal customer" value={avatarCount > 0 ? "Customer context saved" : "To complete"} meta={`${avatarCount} customer insight${avatarCount === 1 ? "" : "s"}`} />
        <SummaryMetric label="Conversation rules" value={rulesCount > 0 ? "Rules ready" : "To complete"} meta={`${rulesCount} rule${rulesCount === 1 ? "" : "s"}`} />
      </div>

      <div style={styles.launchPanel}>
        <h3 style={styles.cardTitle}>Ready to test</h3>
        <p style={styles.bodyText}>
          Angellos has enough context to handle test conversations. Try a real prospect message, then improve anything that feels off.
        </p>
      </div>

      <div style={styles.launchToolsGrid}>
        <TestConversation
          messages={messages}
          input={input}
          loading={chatLoading}
          error={chatError}
          disabled={disabled}
          messagesEndRef={messagesEndRef}
          inputRef={inputRef}
          onInputChange={onInputChange}
          onSend={onSendTestMessage}
          onKeyDown={onChatKeyDown}
          onReset={onResetChat}
          onNeedsImprovement={(reply) => {
            onRefineInstructionChange(`This reply needs improvement:\n"${reply}"\n\nChange Angellos so it replies better next time.`);
          }}
        />
        <PromptRefinementPanel
          instruction={refineInstruction}
          preview={refinePreview}
          loading={refineLoading}
          applying={refineApplying}
          error={refineError}
          disabled={disabled}
          onInstructionChange={onRefineInstructionChange}
          onChip={onRefineChip}
          onPreview={onPreviewRefinement}
          onApply={onApplyRefinement}
          onCancel={onCancelRefinement}
        />
        <PromptHistory
          versions={promptVersions}
          loading={versionsLoading}
          restoreLoading={restoreLoading}
          onRestore={onRestorePrompt}
        />
      </div>
    </div>
  );
}

function TestConversation({
  messages,
  input,
  loading,
  error,
  disabled,
  messagesEndRef,
  inputRef,
  onInputChange,
  onSend,
  onKeyDown,
  onReset,
  onNeedsImprovement,
}: {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onReset: () => void;
  onNeedsImprovement: (reply: string) => void;
}) {
  return (
    <section style={styles.toolCard}>
      <div style={styles.toolHeader}>
        <div>
          <h3 style={styles.cardTitle}>Test conversation</h3>
          <p style={styles.toolText}>Act like a prospect and see how Angellos replies.</p>
        </div>
        <button type="button" onClick={onReset} style={ghostButton(false)} title="Reset">
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      <div style={styles.chatBox}>
        {messages.length === 0 ? (
          <div style={styles.chatEmpty}>
            <strong>Act like a prospect and see how Angellos replies.</strong>
            {[
              "Hi, I'm interested but I'm not sure if this is right for me.",
              "How much does it cost?",
              "I've already tried several solutions, but nothing worked.",
            ].map((example) => (
              <button key={example} type="button" onClick={() => onInputChange(example)} style={styles.examplePrompt}>
                {example}
              </button>
            ))}
          </div>
        ) : (
          messages.map((message, index) => {
            const isAgent = message.role === "assistant";
            return (
              <div key={`${message.role}-${index}`} style={{ display: "flex", justifyContent: isAgent ? "flex-start" : "flex-end" }}>
                <div style={styles.messageCluster}>
                  <div style={isAgent ? styles.agentBubble : styles.userBubble}>
                    {message.content}
                  </div>
                  {isAgent && !error && (
                    <div style={styles.replyFeedbackRow}>
                      <button type="button" style={styles.textButton}>Good reply</button>
                      <button type="button" onClick={() => onNeedsImprovement(message.content)} style={styles.textButton}>Needs improvement</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={styles.agentBubble}>Angellos is thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <p style={styles.inlineError}>{error}</p>}

      <div style={styles.chatInputRow}>
        <textarea
          ref={inputRef}
          value={input}
          rows={2}
          disabled={disabled}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your message as a prospect..."
          style={styles.chatInput}
        />
        <button type="button" onClick={onSend} disabled={disabled || !input.trim()} style={primaryButton(disabled || !input.trim())} title="Send">
          <Send size={15} />
        </button>
      </div>
    </section>
  );
}

function PromptRefinementPanel({
  instruction,
  preview,
  loading,
  applying,
  error,
  disabled,
  onInstructionChange,
  onChip,
  onPreview,
  onApply,
  onCancel,
}: {
  instruction: string;
  preview: PromptRefinementResult | null;
  loading: boolean;
  applying: boolean;
  error: string | null;
  disabled: boolean;
  onInstructionChange: (value: string) => void;
  onChip: (value: string) => void;
  onPreview: () => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const previewReady = Boolean(preview);
  const busy = loading || applying;
  const canPreview = !disabled && !busy && instruction.trim().length > 0;

  return (
    <section style={styles.refinePanel}>
      <div style={styles.toolHeader}>
        <div>
          <h3 style={styles.cardTitle}>Improve Angellos</h3>
          <p style={styles.toolText}>Tell Angellos what it got wrong. It will update the rules automatically.</p>
        </div>
      </div>

      <textarea
        value={instruction}
        rows={5}
        disabled={disabled || busy}
        onChange={(event) => onInstructionChange(event.target.value)}
        placeholder="Example: Don’t suggest a call yet. First send the beta application page."
        style={styles.refineInput}
      />

      <div style={styles.chipRow}>
        {PROMPT_REFINEMENT_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={disabled || busy}
            onClick={() => onChip(chip)}
            style={chipButton(disabled || busy)}
          >
            {chip}
          </button>
        ))}
      </div>

      {error && <p style={styles.inlineError}>{error}</p>}

      <div style={styles.actionRow}>
        <button type="button" onClick={onPreview} disabled={!canPreview} style={primaryButton(!canPreview)}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {loading ? "Updating Angellos..." : "Update Angellos"}
        </button>
        {previewReady && (
          <button type="button" onClick={onCancel} disabled={busy} style={ghostButton(busy)}>
            Cancel diff
          </button>
        )}
      </div>

      {preview && (
        <div style={styles.diffBox}>
          <div style={styles.diffHeader}>
            <div>
              <span style={styles.diffEyebrow}>What will change</span>
              <strong style={styles.diffTitle}>{preview.target_section || "Angellos behavior"}</strong>
            </div>
            <span style={styles.diffCount}>{preview.diff.filter((line) => line.type !== "keep").length} line{preview.diff.filter((line) => line.type !== "keep").length > 1 ? "s" : ""}</span>
          </div>
          {preview.summary && <p style={styles.diffSummary}>{preview.summary}</p>}
          <div style={styles.diffList}>
            {preview.diff.length === 0 ? (
              <p style={styles.emptyText}>No detailed changes returned.</p>
            ) : (
              preview.diff.slice(0, 80).map((line, index) => (
                <div key={`${line.type}-${index}`} style={diffLineStyle(line.type)}>
                  <span style={styles.diffIcon}>
                    {line.type === "add" ? <Plus size={12} /> : line.type === "remove" ? <Minus size={12} /> : null}
                  </span>
                  <code style={styles.diffCode}>{line.line || " "}</code>
                </div>
              ))
            )}
          </div>
          <button type="button" onClick={onApply} disabled={disabled || busy} style={primaryButton(disabled || busy)}>
            {applying ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {applying ? "Updating Angellos..." : "Update Angellos"}
          </button>
        </div>
      )}
    </section>
  );
}

function PromptHistory({
  versions,
  loading,
  restoreLoading,
  onRestore,
}: {
  versions: PromptVersion[];
  loading: boolean;
  restoreLoading: string | null;
  onRestore: (versionId: string) => void;
}) {
  return (
    <section style={styles.toolCard}>
      <div style={styles.toolHeader}>
        <div>
          <h3 style={styles.cardTitle}>Version history</h3>
          <p style={styles.toolText}>Rollback if a recent change made Angellos worse.</p>
        </div>
      </div>

      <div style={styles.versionList}>
        {loading ? (
          <div style={styles.emptyText}>Loading versions...</div>
        ) : versions.length === 0 ? (
          <div style={styles.emptyText}>No updates yet.</div>
        ) : (
          versions.slice(0, 8).map((version) => {
            const active = version.is_active;
            const restoring = restoreLoading === version.id;
            return (
              <div key={version.id} style={styles.versionRow}>
                <div style={{ minWidth: 0 }}>
                  <div style={styles.versionTitle}>
                    <span style={styles.versionName}>{formatPromptVersionTitle(version)}</span>
                    {active && <span style={styles.activePill}>Active</span>}
                  </div>
                  <div style={styles.versionMeta}>{formatRelativeDate(version.created_at)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onRestore(version.id)}
                  disabled={active || Boolean(restoreLoading)}
                  style={secondaryButton(active || Boolean(restoreLoading))}
                >
                  {restoring ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Rollback
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function PreviewPanel({
  profile,
  avatar,
  rules,
  activeStep,
  onEdit,
}: {
  profile: TrainingProfileInput;
  avatar: AgentAvatar;
  rules: AgentSalesRules;
  activeStep: StepId;
  onEdit: (step: StepId) => void;
}) {
  const topAvatarItems = [
    ...getStringList(avatar.pain_points).slice(0, 2),
    ...getStringList(avatar.objections).slice(0, 2),
  ].slice(0, 4);
  const topRules = [
    ...getStringList(rules.qualification_questions).slice(0, 2),
    ...getStringList(rules.call_offer_conditions).slice(0, 2),
  ].slice(0, 4);
  const salesProcess = typeof profile.sales_process === "string" ? profile.sales_process : "";
  const nextStep = typeof profile.next_step === "string" ? profile.next_step : "";
  const voiceProfile = typeof profile.voice_profile === "string" ? profile.voice_profile : "";

  return (
    <div style={styles.previewInner}>
      <span style={styles.previewEyebrow}>What Angellos knows</span>
      <h2 style={styles.previewTitle}>
        {profile.business_name || profile.offer_name || "Your agent does not have context yet"}
      </h2>
      <p style={styles.previewText}>
        {activeStep === "business"
          ? "Fill in the offer basics to give it a clear sales frame."
          : typeof avatar.persona_summary === "string" && avatar.persona_summary
            ? avatar.persona_summary
            : "Generate and review the avatar to get a usable summary."}
      </p>

      <PreviewSection title="Your offer" onEdit={() => onEdit("business")}>
        <PreviewLine label="Promise" value={profile.offer_promise} />
        <PreviewLine label="Format" value={profile.offer_format} />
        <PreviewLine label="Price" value={profile.price} />
      </PreviewSection>

      <PreviewSection title="Your ideal customer" onEdit={() => onEdit("avatar-input")}>
        {topAvatarItems.length > 0 ? (
          <MiniList items={topAvatarItems} />
        ) : (
          <p style={styles.emptyText}>Pain points, objections, and exact words will appear here.</p>
        )}
      </PreviewSection>

      <PreviewSection title="How Angellos should reply" onEdit={() => onEdit("rules")}>
        {topRules.length > 0 ? (
          <MiniList items={topRules} />
        ) : (
          <p style={styles.emptyText}>Conversation rules will appear here.</p>
        )}
      </PreviewSection>

      <PreviewSection title="Your sales process" onEdit={() => onEdit("knowledge")}>
        <PreviewShortText value={salesProcess} empty="Sales process notes will appear here." />
      </PreviewSection>

      <PreviewSection title="Your next step" onEdit={() => onEdit("knowledge")}>
        <PreviewShortText value={nextStep} empty="The next step will appear here." />
      </PreviewSection>

      <PreviewSection title="Your voice" onEdit={() => onEdit("knowledge")}>
        <PreviewShortText value={voiceProfile || getStringList(profile.tone_rules).slice(0, 2).join(" ")} empty="Voice notes will appear here." />
      </PreviewSection>

      <PreviewSection title="Forbidden topics" onEdit={() => onEdit("knowledge")}>
        {getStringList(profile.forbidden_phrases).length > 0 ? (
          <MiniList items={getStringList(profile.forbidden_phrases).slice(0, 3)} />
        ) : (
          <p style={styles.emptyText}>Words and claims to avoid will appear here.</p>
        )}
      </PreviewSection>
    </div>
  );
}

function PreviewSection({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit?: () => void }) {
  return (
    <section style={styles.previewSection}>
      <div style={styles.previewSectionHeader}>
        <h3 style={styles.previewSectionTitle}>{title}</h3>
        {onEdit && (
          <button type="button" style={styles.previewEditButton} onClick={onEdit}>
            Edit
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p style={styles.previewLine}>
      <strong>{label}</strong>
      <span>{value}</span>
    </p>
  );
}

function PreviewShortText({ value, empty }: { value: string; empty: string }) {
  if (!value) return <p style={styles.emptyText}>{empty}</p>;
  const short = value.length > 160 ? `${value.slice(0, 157)}...` : value;
  return <p style={styles.previewText}>{short}</p>;
}

function MiniList({ items }: { items: string[] }) {
  return (
    <ul style={styles.miniList}>
      {items.map((item) => (
        <li key={item} style={styles.miniListItem}>{item}</li>
      ))}
    </ul>
  );
}

function KnowledgePreviewSection({
  title,
  items,
  onChange,
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const visibleItems = items.length > 0 ? items : [""];
  return (
    <section style={styles.knowledgePreviewCard}>
      <div style={styles.listHeader}>
        <span>{title}</span>
        <button type="button" style={styles.textButton} onClick={() => onChange([...items, "New item"])}>Add item</button>
      </div>
      <div style={styles.knowledgeItems}>
        {visibleItems.map((item, index) => (
          <div key={`${title}-${index}`} style={styles.knowledgeItemRow}>
            <textarea
              rows={2}
              value={item}
              onChange={(event) => {
                const next = [...visibleItems];
                next[index] = event.target.value;
                onChange(next.filter((value) => value.trim()));
              }}
              placeholder="Nothing found yet."
              style={styles.knowledgeItemInput}
            />
            <button type="button" style={styles.textButton} onClick={() => onChange(visibleItems.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function SummaryMetric({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <div style={styles.metric}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
      {meta && <span style={styles.metricMeta}>{meta}</span>}
    </div>
  );
}

function buildSimpleRules(rules: AgentSalesRules): { key: keyof AgentSalesRules; index: number; text: string }[] {
  const preferred: { key: keyof AgentSalesRules; fallback: string }[] = [
    { key: "qualification_questions", fallback: "Ask one question at a time" },
    { key: "call_offer_conditions", fallback: "Send the right next step only when the prospect is ready" },
    { key: "follow_up_rules", fallback: "Follow up naturally when the conversation goes quiet" },
    { key: "do_not_say", fallback: "Avoid wording that does not sound like the business" },
    { key: "escalation_rules", fallback: "Hand off conversations that need a human" },
  ];

  const fromRules = preferred.flatMap(({ key }) =>
    getStringList(rules[key]).slice(0, 1).map((text, index) => ({ key, index, text }))
  );

  if (fromRules.length >= 5) return fromRules.slice(0, 5);

  const existingText = new Set(fromRules.map((rule) => rule.text));
  const fallbacks = preferred
    .filter(({ fallback }) => !existingText.has(fallback))
    .map(({ key, fallback }) => ({ key, index: -1, text: fallback }));
  return [...fromRules, ...fallbacks].slice(0, 5);
}

function plainRuleLabel(label: string): string {
  const labels: Record<string, string> = {
    "Qualification questions": "Questions to ask",
    "Buying signals": "Buying signals",
    "Conditions to offer a call": "When to suggest a call",
    "Red flags": "Red flags",
    "Stop conditions": "When to stop",
    "Objection responses": "How to handle objections",
    "Follow-up rules": "Follow-up rules",
    "Do not say": "Do not say",
    "Human escalation": "When Thomas should take over",
  };
  return labels[label] || label.replace("DM", "Conversation");
}

function mapKnowledgePreviewToPatch(current: KnowledgeExtraction, section: string, items: string[]): Partial<KnowledgeExtraction> {
  const clean = items.map((item) => item.trim()).filter(Boolean);
  if (section === "sales_process_found") {
    return { profile_patch: { ...current.profile_patch, sales_process: clean.join("\n") } };
  }
  if (section === "qualification_questions_found") {
    return { rules_patch: { ...current.rules_patch, qualification_questions: clean } };
  }
  if (section === "good_fit_signals") {
    return {
      avatar_patch: { ...current.avatar_patch, buying_triggers: clean },
      rules_patch: { ...current.rules_patch, buying_signals: clean },
    };
  }
  if (section === "bad_fit_signals") {
    return {
      avatar_patch: { ...current.avatar_patch, bad_fit: clean },
      rules_patch: { ...current.rules_patch, red_flags: clean },
    };
  }
  if (section === "next_step") {
    return {
      profile_patch: { ...current.profile_patch, next_step: clean.join("\n") },
      rules_patch: { ...current.rules_patch, call_offer_conditions: clean },
    };
  }
  if (section === "objection_answers") {
    return {
      avatar_patch: { ...current.avatar_patch, objections: clean },
      rules_patch: { ...current.rules_patch, objection_responses: clean },
    };
  }
  if (section === "faq_answers") {
    return { rules_patch: { ...current.rules_patch, faq_answers: clean } };
  }
  if (section === "voice_profile_found") {
    return { profile_patch: { ...current.profile_patch, voice_profile: clean.join("\n") } };
  }
  if (section === "phrases_to_use") {
    return {
      profile_patch: { ...current.profile_patch, tone_rules: clean },
      avatar_patch: { ...current.avatar_patch, exact_words: clean },
    };
  }
  if (section === "phrases_to_avoid") {
    return {
      profile_patch: { ...current.profile_patch, forbidden_phrases: clean },
      rules_patch: { ...current.rules_patch, do_not_say: clean },
    };
  }
  return {};
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })} at ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatPromptVersionTitle(version: PromptVersion): string {
  const label = version.refinement_instruction || version.source || "manual";
  if (label === "manual") return "Manual update";
  if (label.includes("next step")) return "Changed next step rule";
  return label.length > 58 ? `${label.slice(0, 55)}...` : label;
}

function formatRelativeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const seconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Updated just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
}

function stepDone(step: StepId, checklist: ReturnType<typeof buildTrainingChecklist>): boolean {
  if (step === "business") return checklist.business === "Complete";
  if (step === "knowledge") return checklist.business === "Complete";
  if (step === "avatar-input") return checklist.business === "Complete";
  if (step === "avatar-review") return checklist.avatar === "Complete";
  if (step === "rules") return checklist.rules === "Complete";
  return checklist.activation === "Prompt rebuilt";
}

function iconButton(disabled: boolean): React.CSSProperties {
  return {
    height: 40,
    width: 40,
    borderRadius: 8,
    border: "1px solid #dfe5ee",
    background: "#fff",
    color: "#475569",
    display: "grid",
    placeItems: "center",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function stepButton(active: boolean): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 66,
    border: "none",
    borderRadius: 8,
    background: active ? "#eef6ff" : "transparent",
    color: active ? "#0f172a" : "#64748b",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    textAlign: "left",
    cursor: "pointer",
    position: "relative",
  };
}

function stepDot(active: boolean, done: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 8,
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    fontSize: 10,
    fontWeight: 850,
    background: done ? "#16a34a" : active ? "#0095F6" : "#eef2f7",
    color: done || active ? "#fff" : "#94a3b8",
  };
}

function primaryButton(disabled: boolean): React.CSSProperties {
  return {
    minHeight: 38,
    border: "none",
    borderRadius: 8,
    padding: "0 14px",
    background: disabled ? "#cbd5e1" : "#0095F6",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  };
}

function secondaryButton(disabled: boolean): React.CSSProperties {
  return {
    minHeight: 38,
    border: "1px solid #dbe4ee",
    borderRadius: 8,
    padding: "0 14px",
    background: disabled ? "#f1f5f9" : "#fff",
    color: disabled ? "#94a3b8" : "#0f172a",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  };
}

function ghostButton(disabled: boolean): React.CSSProperties {
  return {
    minHeight: 38,
    border: "1px solid #dbe4ee",
    borderRadius: 8,
    padding: "0 13px",
    background: "#fff",
    color: disabled ? "#94a3b8" : "#334155",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 750,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  };
}

function chipButton(disabled: boolean): React.CSSProperties {
  return {
    minHeight: 30,
    border: "1px solid #dbe4ee",
    borderRadius: 8,
    padding: "0 10px",
    background: disabled ? "#f1f5f9" : "#f8fafc",
    color: disabled ? "#94a3b8" : "#334155",
    fontSize: 12,
    fontWeight: 750,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  };
}

function diffLineStyle(type: "add" | "remove" | "keep"): React.CSSProperties {
  const palette = {
    add: { background: "#ecfdf5", color: "#166534", border: "#bbf7d0" },
    remove: { background: "#fef2f2", color: "#991b1b", border: "#fecaca" },
    keep: { background: "#f8fafc", color: "#64748b", border: "#edf1f5" },
  }[type];
  return {
    display: "grid",
    gridTemplateColumns: "18px minmax(0, 1fr)",
    alignItems: "start",
    gap: 6,
    border: `1px solid ${palette.border}`,
    borderRadius: 6,
    background: palette.background,
    color: palette.color,
    padding: "6px 8px",
  };
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 18,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.1,
    fontWeight: 850,
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    maxWidth: 760,
    color: "#64748b",
    fontSize: 15,
    lineHeight: 1.5,
  },
  microCopy: {
    margin: "8px 0 0",
    maxWidth: 720,
    color: "#334155",
    fontSize: 13,
    lineHeight: 1.45,
    fontWeight: 750,
  },
  successNotice: {
    marginBottom: 14,
    padding: "10px 12px",
    borderRadius: 8,
    background: "#ecfdf5",
    color: "#047857",
    fontSize: 13,
    fontWeight: 750,
  },
  errorNotice: {
    marginBottom: 14,
    padding: "10px 12px",
    borderRadius: 8,
    background: "#fef2f2",
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: 750,
  },
  shell: {
    display: "grid",
    gridTemplateColumns: "260px minmax(0, 1fr) 320px",
    gap: 18,
    alignItems: "start",
  },
  stepsPane: {
    position: "sticky",
    top: 22,
    background: "#fff",
    border: "1px solid #e6ebf2",
    borderRadius: 8,
    padding: 14,
  },
  progressBlock: {
    borderBottom: "1px solid #edf1f5",
    paddingBottom: 14,
    marginBottom: 12,
  },
  progressLabel: {
    display: "block",
    color: "#64748b",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: 0,
    marginBottom: 6,
  },
  progressValue: {
    display: "block",
    color: "#0f172a",
    fontSize: 34,
    lineHeight: 1,
    marginBottom: 12,
  },
  progressTrack: {
    height: 8,
    background: "#eef2f7",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    background: "#0095F6",
    borderRadius: 999,
  },
  progressHint: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: 650,
  },
  levelCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    background: "#f8fbff",
    border: "1px solid #e1eefc",
    display: "grid",
    gap: 4,
  },
  levelLabel: {
    color: "#0095F6",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  levelTitle: {
    color: "#0f172a",
    fontSize: 14,
    lineHeight: 1.2,
  },
  levelText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.35,
  },
  checklistBlock: {
    display: "grid",
    gap: 7,
    borderBottom: "1px solid #edf1f5",
    paddingBottom: 12,
    marginBottom: 12,
  },
  checklistRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    color: "#64748b",
    fontSize: 12,
  },
  stepList: {
    display: "grid",
    gap: 4,
  },
  stepTitle: {
    display: "block",
    fontSize: 13,
    fontWeight: 850,
    marginBottom: 3,
  },
  stepDescription: {
    display: "block",
    fontSize: 11,
    color: "#94a3b8",
    lineHeight: 1.35,
  },
  stepLine: {
    position: "absolute",
    left: 25,
    bottom: -7,
    width: 1,
    height: 10,
    background: "#e2e8f0",
  },
  workPane: {
    background: "#fff",
    border: "1px solid #e6ebf2",
    borderRadius: 8,
    padding: 22,
    minWidth: 0,
  },
  previewPane: {
    position: "sticky",
    top: 22,
    background: "#fff",
    border: "1px solid #e6ebf2",
    borderRadius: 8,
    padding: 18,
    minWidth: 0,
  },
  previewInner: {
    display: "grid",
    gap: 14,
  },
  previewEyebrow: {
    color: "#0095F6",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  previewTitle: {
    margin: 0,
    fontSize: 20,
    color: "#0f172a",
    lineHeight: 1.18,
  },
  previewText: {
    margin: 0,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.55,
  },
  previewSection: {
    borderTop: "1px solid #edf1f5",
    paddingTop: 13,
  },
  previewSectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  previewSectionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 850,
  },
  previewEditButton: {
    border: "1px solid #dbeafe",
    borderRadius: 8,
    background: "#f8fbff",
    color: "#2563eb",
    fontSize: 11,
    fontWeight: 800,
    padding: "5px 8px",
    cursor: "pointer",
  },
  previewLine: {
    display: "grid",
    gap: 3,
    margin: "0 0 9px",
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.45,
  },
  emptyText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 1.45,
  },
  miniList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "grid",
    gap: 7,
  },
  miniListItem: {
    background: "#f8fafc",
    border: "1px solid #edf1f5",
    borderRadius: 8,
    padding: "8px 10px",
    color: "#475569",
    fontSize: 12,
    lineHeight: 1.35,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 20,
  },
  sectionEyebrow: {
    margin: "0 0 5px",
    color: "#0095F6",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  sectionTitle: {
    margin: "0 0 6px",
    color: "#0f172a",
    fontSize: 23,
    lineHeight: 1.15,
    fontWeight: 850,
  },
  sectionDescription: {
    margin: 0,
    maxWidth: 620,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
    gap: 12,
  },
  focusArea: {
    display: "grid",
    gap: 12,
    marginTop: 14,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    color: "#475569",
    fontSize: 12,
    fontWeight: 750,
  },
  input: {
    width: "100%",
    border: "1px solid #dfe5ee",
    borderRadius: 8,
    background: "#fff",
    color: "#111827",
    fontSize: 13,
    padding: "10px 12px",
    outline: "none",
    fontFamily: "inherit",
  },
  textarea: {
    width: "100%",
    border: "1px solid #dfe5ee",
    borderRadius: 8,
    background: "#fff",
    color: "#111827",
    fontSize: 13,
    padding: "10px 12px",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
    lineHeight: 1.45,
  },
  details: {
    marginTop: 16,
    borderTop: "1px solid #edf1f5",
    paddingTop: 14,
  },
  summary: {
    cursor: "pointer",
    color: "#334155",
    fontSize: 13,
    fontWeight: 850,
  },
  advancedGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
    gap: 12,
    marginTop: 14,
  },
  promptGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
    gap: 12,
  },
  knowledgeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
    gap: 14,
  },
  knowledgeCard: {
    border: "1px solid #e6ebf2",
    borderRadius: 8,
    background: "#fbfdff",
    padding: 14,
    display: "grid",
    gap: 10,
    minWidth: 0,
  },
  uploadBox: {
    border: "1px dashed #b9d7ff",
    borderRadius: 8,
    background: "#f8fbff",
    color: "#1e3a8a",
    padding: 14,
    display: "grid",
    gap: 5,
    placeItems: "center",
    textAlign: "center",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,
  },
  learnedPanel: {
    border: "1px solid #dbeafe",
    borderRadius: 8,
    background: "#fff",
    padding: 16,
    marginTop: 16,
  },
  knowledgePreviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
    gap: 12,
  },
  knowledgePreviewCard: {
    border: "1px solid #e6ebf2",
    borderRadius: 8,
    background: "#fbfdff",
    padding: 12,
    display: "grid",
    gap: 9,
  },
  knowledgeItems: {
    display: "grid",
    gap: 8,
  },
  knowledgeItemRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 8,
  },
  knowledgeItemInput: {
    width: "100%",
    border: "1px solid #dfe5ee",
    borderRadius: 8,
    background: "#fff",
    color: "#111827",
    fontSize: 12,
    padding: "8px 10px",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
    lineHeight: 1.4,
  },
  promptField: {
    border: "1px solid #e6ebf2",
    borderRadius: 8,
    padding: 12,
    display: "grid",
    gap: 7,
    background: "#fbfdff",
  },
  promptLabel: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 850,
  },
  promptHint: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.35,
  },
  promptTextarea: {
    width: "100%",
    minHeight: 86,
    border: "1px solid #dfe5ee",
    borderRadius: 8,
    background: "#fff",
    color: "#111827",
    fontSize: 13,
    padding: "10px 12px",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
    lineHeight: 1.45,
  },
  editableListGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
    gap: 12,
    marginTop: 14,
  },
  editableList: {
    border: "1px solid #e6ebf2",
    borderRadius: 8,
    padding: 12,
    background: "#fbfdff",
    display: "grid",
    gap: 9,
  },
  listHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 850,
    gap: 8,
  },
  countPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 8,
    background: "#eef6ff",
    color: "#0095F6",
    display: "grid",
    placeItems: "center",
    fontSize: 11,
    fontWeight: 850,
  },
  listTextarea: {
    width: "100%",
    border: "1px solid #dfe5ee",
    borderRadius: 8,
    background: "#fff",
    color: "#111827",
    fontSize: 13,
    padding: "10px 12px",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
    lineHeight: 1.45,
  },
  actionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 10,
  },
  autosaveSaved: {
    minHeight: 26,
    borderRadius: 8,
    background: "#ecfdf5",
    color: "#15803d",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "0 8px",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  autosaveSaving: {
    minHeight: 26,
    borderRadius: 8,
    background: "#eff6ff",
    color: "#0369a1",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "0 8px",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  autosaveError: {
    minHeight: 26,
    borderRadius: 8,
    background: "#fef2f2",
    color: "#b91c1c",
    display: "inline-flex",
    alignItems: "center",
    padding: "0 8px",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  actionHelp: {
    margin: "8px 0 0",
    color: "#b45309",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 750,
  },
  jsonTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 850,
    color: "#0f172a",
  },
  debugWarning: {
    color: "#92400e",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 12,
    lineHeight: 1.4,
    fontWeight: 700,
  },
  jsonTextarea: {
    width: "100%",
    border: "1px solid #dfe5ee",
    borderRadius: 8,
    background: "#fbfdff",
    color: "#111827",
    fontSize: 12,
    padding: "10px 12px",
    outline: "none",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    resize: "vertical",
    lineHeight: 1.5,
  },
  footerNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderTop: "1px solid #edf1f5",
    marginTop: 22,
    paddingTop: 16,
  },
  launchGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
    gap: 12,
  },
  metric: {
    border: "1px solid #e6ebf2",
    borderRadius: 8,
    padding: 14,
    background: "#fbfdff",
    display: "grid",
    gap: 6,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 750,
  },
  metricValue: {
    color: "#0f172a",
    fontSize: 15,
    lineHeight: 1.25,
  },
  metricMeta: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 1.25,
  },
  launchPanel: {
    border: "1px solid #e6ebf2",
    borderRadius: 8,
    padding: 16,
    background: "#fbfdff",
    marginTop: 14,
  },
  launchToolsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
    gap: 14,
    marginTop: 14,
  },
  toolCard: {
    border: "1px solid #e6ebf2",
    borderRadius: 8,
    padding: 14,
    background: "#fff",
    minWidth: 0,
  },
  toolHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  toolText: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.4,
  },
  chatBox: {
    height: 300,
    overflowY: "auto",
    background: "#f8fafc",
    border: "1px solid #edf1f5",
    borderRadius: 8,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  chatEmpty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "center",
    gap: 8,
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "left",
  },
  examplePrompt: {
    border: "1px solid #dbeafe",
    borderRadius: 8,
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "8px 10px",
    fontSize: 12,
    lineHeight: 1.35,
    textAlign: "left",
    cursor: "pointer",
  },
  agentBubble: {
    maxWidth: "84%",
    borderRadius: "14px 14px 14px 4px",
    background: "#0f9f77",
    color: "#fff",
    padding: "8px 12px",
    fontSize: 13,
    lineHeight: 1.45,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  userBubble: {
    maxWidth: "84%",
    borderRadius: "14px 14px 4px 14px",
    background: "#e8eef6",
    color: "#0f172a",
    padding: "8px 12px",
    fontSize: 13,
    lineHeight: 1.45,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  messageCluster: {
    display: "grid",
    gap: 5,
    maxWidth: "88%",
  },
  replyFeedbackRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    paddingLeft: 4,
  },
  textButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 800,
    padding: 0,
    cursor: "pointer",
  },
  inlineError: {
    margin: "10px 0 0",
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: 700,
  },
  refinePanel: {
    border: "1px solid #dbeafe",
    borderRadius: 8,
    padding: 14,
    background: "#fbfdff",
    minWidth: 0,
  },
  refineInput: {
    width: "100%",
    border: "1px solid #dfe5ee",
    borderRadius: 8,
    background: "#fff",
    color: "#111827",
    fontSize: 13,
    padding: "10px 12px",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
    lineHeight: 1.45,
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  simpleRulesList: {
    display: "grid",
    gap: 8,
    marginTop: 14,
  },
  simpleRuleRow: {
    border: "1px solid #e6ebf2",
    borderRadius: 8,
    background: "#fbfdff",
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  simpleRuleText: {
    color: "#0f172a",
    fontSize: 13,
    lineHeight: 1.4,
    fontWeight: 750,
  },
  simpleRuleActions: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  diffBox: {
    border: "1px solid #dbeafe",
    borderRadius: 8,
    background: "#fff",
    padding: 12,
    marginTop: 14,
    display: "grid",
    gap: 10,
  },
  diffHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  diffEyebrow: {
    display: "block",
    color: "#64748b",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0,
    marginBottom: 3,
  },
  diffTitle: {
    display: "block",
    color: "#0f172a",
    fontSize: 13,
    lineHeight: 1.25,
  },
  diffCount: {
    borderRadius: 8,
    background: "#eef6ff",
    color: "#0369a1",
    padding: "3px 7px",
    fontSize: 11,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  diffSummary: {
    margin: 0,
    color: "#475569",
    fontSize: 12,
    lineHeight: 1.45,
  },
  diffList: {
    maxHeight: 260,
    overflowY: "auto",
    display: "grid",
    gap: 5,
  },
  diffIcon: {
    display: "grid",
    placeItems: "center",
    minHeight: 18,
  },
  diffCode: {
    color: "inherit",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 11,
    lineHeight: 1.45,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  chatInputRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 10,
  },
  chatInput: {
    flex: 1,
    border: "1px solid #dfe5ee",
    borderRadius: 8,
    background: "#fff",
    color: "#111827",
    fontSize: 13,
    padding: "10px 12px",
    outline: "none",
    fontFamily: "inherit",
    resize: "none",
    lineHeight: 1.45,
  },
  versionList: {
    display: "grid",
    gap: 9,
  },
  versionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    border: "1px solid #edf1f5",
    borderRadius: 8,
    padding: 10,
    background: "#fbfdff",
  },
  versionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 850,
    minWidth: 0,
  },
  versionName: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  versionMeta: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 3,
  },
  activePill: {
    borderRadius: 8,
    background: "#dcfce7",
    color: "#15803d",
    padding: "2px 7px",
    fontSize: 10,
    fontWeight: 850,
  },
  cardTitle: {
    margin: "0 0 8px",
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 850,
  },
  bodyText: {
    margin: 0,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.55,
  },
  emptyState: {
    border: "1px dashed #cbd5e1",
    borderRadius: 8,
    background: "#f8fafc",
    color: "#64748b",
    padding: 16,
    fontSize: 13,
    lineHeight: 1.45,
    marginBottom: 14,
    fontWeight: 700,
  },
};

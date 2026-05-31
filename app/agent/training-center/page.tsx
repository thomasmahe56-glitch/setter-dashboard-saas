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

type StepId = "business" | "avatar-input" | "avatar-review" | "rules" | "launch";
type Notice = { kind: "success" | "error"; text: string } | null;

const STEPS: {
  id: StepId;
  title: string;
  eyebrow: string;
  description: string;
}[] = [
  {
    id: "business",
    eyebrow: "01",
    title: "Business",
    description: "Offre, promesse, prix et limites.",
  },
  {
    id: "avatar-input",
    eyebrow: "02",
    title: "Client idéal",
    description: "Les inputs bruts du persona.",
  },
  {
    id: "avatar-review",
    eyebrow: "03",
    title: "Avatar",
    description: "Validation humaine de l'avatar généré.",
  },
  {
    id: "rules",
    eyebrow: "04",
    title: "Règles DM",
    description: "Qualification, signaux et objections.",
  },
  {
    id: "launch",
    eyebrow: "05",
    title: "Activation",
    description: "Compilation du prompt Angellos.",
  },
];

const AVATAR_LABELS: Record<keyof AvatarGenerateInput, { label: string; hint: string; placeholder: string }> = {
  client_ideal: {
    label: "Client idéal",
    hint: "Qui doit absolument se reconnaître dans tes DM ?",
    placeholder: "Ex : coach sportif indépendant qui reçoit des leads Instagram mais perd du temps à les qualifier.",
  },
  main_problem: {
    label: "Problème principal",
    hint: "Le problème qu'il exprime le plus souvent.",
    placeholder: "Ex : il répond trop tard, manque de structure en DM et laisse filer des prospects chauds.",
  },
  current_block: {
    label: "Blocage actuel",
    hint: "Ce qui l'empêche d'avancer maintenant.",
    placeholder: "Ex : il ne sait pas quelles questions poser avant de proposer un appel.",
  },
  fears: {
    label: "Peurs",
    hint: "Ce qu'il craint si rien ne change.",
    placeholder: "Ex : passer pour quelqu'un de trop commercial, perdre des leads, automatiser trop tôt.",
  },
  tried_before: {
    label: "Déjà essayé",
    hint: "Solutions, méthodes ou accompagnements déjà tentés.",
    placeholder: "Ex : ManyChat, réponses manuelles, scripts copiés-collés, setter freelance.",
  },
  buying_hesitations: {
    label: "Freins à l'achat",
    hint: "Prix, temps, confiance, peur d'échouer.",
    placeholder: "Ex : peur que l'IA ne respecte pas son ton, budget, manque de confiance, peur du spam.",
  },
  desired_outcome: {
    label: "Résultat désiré",
    hint: "La transformation concrète qu'il veut.",
    placeholder: "Ex : transformer ses conversations Instagram en appels qualifiés sans passer 2h par jour en DM.",
  },
  bad_fit: {
    label: "Mauvais fit",
    hint: "Les profils qu'Angellos doit filtrer vite.",
    placeholder: "Ex : personnes non sérieuses, curieux gratuits, prospects hors budget, demandes hors périmètre.",
  },
};

const AVATAR_ARRAY_FIELDS: { key: keyof AgentAvatar; label: string; empty: string }[] = [
  { key: "pain_points", label: "Douleurs", empty: "Aucune douleur structurée pour l'instant." },
  { key: "fears", label: "Peurs", empty: "Aucune peur structurée pour l'instant." },
  { key: "frustrations", label: "Frustrations", empty: "Aucune frustration structurée pour l'instant." },
  { key: "objections", label: "Objections", empty: "Aucune objection structurée pour l'instant." },
  { key: "buying_triggers", label: "Déclencheurs d'achat", empty: "Aucun déclencheur structuré pour l'instant." },
  { key: "dream_outcomes", label: "Résultats rêvés", empty: "Aucun résultat structuré pour l'instant." },
  { key: "exact_words", label: "Mots exacts", empty: "Aucun mot exact pour l'instant." },
  { key: "bad_fit", label: "Mauvais fit", empty: "Aucun mauvais fit structuré pour l'instant." },
];

const RULE_FIELDS: { key: keyof AgentSalesRules; label: string; empty: string }[] = [
  { key: "qualification_questions", label: "Questions de qualification", empty: "Aucune question de qualification." },
  { key: "buying_signals", label: "Signaux d'achat", empty: "Aucun signal d'achat." },
  { key: "call_offer_conditions", label: "Conditions pour proposer un appel", empty: "Aucune condition définie." },
  { key: "red_flags", label: "Red flags", empty: "Aucun red flag." },
  { key: "stop_conditions", label: "Stop conditions", empty: "Aucune condition d'arrêt." },
  { key: "objection_responses", label: "Réponses aux objections", empty: "Aucune réponse aux objections." },
  { key: "follow_up_rules", label: "Règles de relance", empty: "Aucune règle de relance." },
  { key: "do_not_say", label: "À ne pas dire", empty: "Aucun interdit." },
  { key: "escalation_rules", label: "Escalade humaine", empty: "Aucune règle d'escalade." },
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
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [restoreLoading, setRestoreLoading] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

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
      setProfile({ ...EMPTY_PROFILE, ...(data.profile?.profile || {}) });
      setAvatarInput({ ...EMPTY_AVATAR_INPUT, ...(data.avatar?.source_inputs || {}) });
      setAvatarJson(prettyJson(data.avatar?.avatar || {}));
      setRulesJson(prettyJson(data.sales_rules?.rules || {}));
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Chargement impossible" });
    } finally {
      setLoading(false);
    }
  }, []);

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

  const actionDisabled = loading || savingProfile || generatingAvatar || savingAvatar || generatingRules || savingRules || rebuilding || chatLoading || Boolean(restoreLoading);
  const currentIndex = STEPS.findIndex((step) => step.id === activeStep);
  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < STEPS.length - 1;

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
      setNotice({ kind: "success", text: "Business Setup enregistré" });
      setActiveStep("avatar-input");
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Enregistrement impossible" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleGenerateAvatar() {
    if (!canGenerateAvatar) {
      setNotice({ kind: "error", text: "Complète d'abord client idéal, problème principal et résultat désiré." });
      return;
    }
    setGeneratingAvatar(true);
    setNotice(null);
    try {
      const data = await api.generateAvatar(avatarInput);
      setAvatarJson(prettyJson(data.avatar));
      setNotice({ kind: "success", text: "Avatar généré, prêt à valider" });
      setActiveStep("avatar-review");
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Génération impossible" });
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
      setNotice({ kind: "success", text: "Avatar Client enregistré" });
      setActiveStep("rules");
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Avatar invalide" });
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handleGenerateRules() {
    if (!canGenerateRules) {
      setNotice({ kind: "error", text: "Génère et complète d'abord l'avatar client avant de créer les règles DM." });
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
      setNotice({ kind: "success", text: "Règles DM générées" });
      setActiveStep("rules");
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Génération des règles impossible" });
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
      setNotice({ kind: "success", text: "Règles DM enregistrées" });
      setActiveStep("launch");
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Règles invalides" });
    } finally {
      setSavingRules(false);
    }
  }

  async function handleRebuildPrompt() {
    if (!canRebuildPrompt) {
      setNotice({ kind: "error", text: "Complète le profil business, valide l'avatar et enregistre les règles DM avant de reconstruire le prompt." });
      return;
    }
    setRebuilding(true);
    setNotice(null);
    try {
      await api.rebuildAgentPrompt();
      setNotice({ kind: "success", text: "Prompt Angellos reconstruit et activé" });
      await loadPromptVersions();
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Rebuild impossible" });
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
      const message = error instanceof Error ? error.message : "Test impossible";
      setChatError(message);
      setChatMessages((current) => [...current, { role: "assistant", content: message }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatInputRef.current?.focus(), 50);
    }
  }

  function handleChatKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendTestMessage();
    }
  }

  async function handleRestorePrompt(versionId: string) {
    setRestoreLoading(versionId);
    setNotice(null);
    try {
      await api.restorePromptVersion(versionId);
      await loadPromptVersions();
      setNotice({ kind: "success", text: "Version de prompt restaurée" });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Restauration impossible" });
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
              <h1 style={styles.title}>Training Center</h1>
            </div>
            <p style={styles.subtitle}>
              En 10 minutes, Angellos comprend ton offre, ton client idéal et ta manière de vendre. Plus tu l'entraînes, plus ses réponses deviennent précises, humaines et proches de ton style.
            </p>
            <p style={styles.microCopy}>
              Réponds simplement avec tes mots. Angellos structure ensuite ton avatar et tes règles DM.
            </p>
          </div>
          <button
            type="button"
            onClick={loadTrainingCenter}
            disabled={loading}
            title="Rafraîchir"
            aria-label="Rafraîchir"
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
                disabled={actionDisabled}
                saving={savingProfile}
                onSave={handleSaveProfile}
              />
            )}

            {activeStep === "avatar-input" && (
              <AvatarInputStep
                input={avatarInput}
                disabled={actionDisabled || !canGenerateAvatar}
                helperText={canGenerateAvatar ? null : "Complète d'abord client idéal, problème principal et résultat désiré."}
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
                generatingRules={generatingRules}
                canGenerateRules={canGenerateRules}
                generateRulesHelp={canGenerateRules ? null : "Génère et complète d'abord l'avatar client."}
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
                generating={generatingRules}
                canGenerate={canGenerateRules}
                generateHelp={canGenerateRules ? null : "Valide l'avatar avant de générer les règles DM."}
                onRulesChange={updateRulesField}
                onJsonChange={setRulesJson}
                onToggleAdvanced={() => setShowAdvanced((value) => !value)}
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
                rebuildHelp={canRebuildPrompt ? null : "Complète le profil business, l'avatar et les règles DM avant le rebuild."}
                rebuilding={rebuilding}
                messages={chatMessages}
                input={chatInput}
                chatLoading={chatLoading}
                chatError={chatError}
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
                onRestorePrompt={handleRestorePrompt}
                onRebuild={handleRebuildPrompt}
              />
            )}

            <div style={styles.footerNav}>
              <button type="button" onClick={goBack} disabled={!canGoBack || actionDisabled} style={ghostButton(!canGoBack || actionDisabled)}>
                <ArrowLeft size={15} />
                Retour
              </button>
              <button type="button" onClick={goNext} disabled={!canGoNext || actionDisabled} style={ghostButton(!canGoNext || actionDisabled)}>
                Suivant
                <ArrowRight size={15} />
              </button>
            </div>
          </section>

          <aside className="training-preview-pane" style={styles.previewPane}>
            <PreviewPanel profile={profile} avatar={avatar} rules={rules} activeStep={activeStep} />
          </aside>
        </section>
      </div>
    </main>
  );
}

function BusinessStep({
  profile,
  disabled,
  saving,
  onChange,
  onSave,
}: {
  profile: TrainingProfileInput;
  disabled: boolean;
  saving: boolean;
  onChange: (key: keyof TrainingProfileInput, value: string | string[]) => void;
  onSave: () => void;
}) {
  return (
    <div>
      <SectionHeader
        eyebrow="Business Setup"
        title="Pose les bases qu'Angellos doit respecter"
        description="Commence par les éléments qui changent vraiment les réponses en DM. Les détails avancés restent disponibles, mais on évite de tout demander d'un coup."
        action={
          <button type="button" onClick={onSave} disabled={disabled} style={primaryButton(disabled)}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Enregistrer
          </button>
        }
      />

      <div style={styles.fieldGrid}>
        <Field label="Nom du business" value={profile.business_name} onChange={(v) => onChange("business_name", v)} placeholder="Ex : TrainToRehab, Studio Fit Lead, Rehab Coach Academy" />
        <Field label="Coach / fondateur" value={profile.coach_name} onChange={(v) => onChange("coach_name", v)} placeholder="Ex : Thomas, coach principal qui répond aux prospects" />
        <Field label="Niche" value={profile.niche} onChange={(v) => onChange("niche", v)} placeholder="Ex : coachs sportifs qui veulent transformer leurs leads Instagram en appels qualifiés." />
        <Field label="Nom de l'offre" value={profile.offer_name} onChange={(v) => onChange("offer_name", v)} placeholder="Ex : accompagnement 8 semaines pour structurer acquisition et closing Instagram." />
      </div>

      <div style={styles.focusArea}>
        <TextField
          label="Promesse de l'offre"
          value={profile.offer_promise}
          rows={4}
          onChange={(v) => onChange("offer_promise", v)}
          placeholder="Ex : passer de conversations Instagram dispersées à 5-10 appels qualifiés par semaine sans passer 2h/jour en DM."
        />
        <TextField
          label="Format / accompagnement"
          value={profile.offer_format}
          rows={4}
          onChange={(v) => onChange("offer_format", v)}
          placeholder="Ex : 8 semaines, 1 appel par semaine, support WhatsApp, scripts DM, dashboard de suivi et feedback hebdomadaire."
        />
        <TextField
          label="Prix / modalités"
          value={profile.price}
          rows={3}
          onChange={(v) => onChange("price", v)}
          placeholder="Ex : 1 500€ à 3 000€, paiement en 1 ou 3 fois. Ne parler du prix qu'après qualification."
        />
      </div>

      <details style={styles.details}>
        <summary style={styles.summary}>Champs avancés</summary>
        <div style={styles.advancedGrid}>
          <TextField label="Preuves" value={listToText(profile.proof_points)} rows={4} onChange={(v) => onChange("proof_points", textToList(v))} placeholder="Ex : +42 appels qualifiés en 30 jours pour un coach. Une preuve par ligne." />
          <TextField label="Ton à respecter" value={listToText(profile.tone_rules)} rows={4} onChange={(v) => onChange("tone_rules", textToList(v))} placeholder="Une règle de ton par ligne." />
          <TextField label="À ne pas dire" value={listToText(profile.forbidden_phrases)} rows={4} onChange={(v) => onChange("forbidden_phrases", textToList(v))} placeholder="Ex : promesses garanties, discours agressif, relances culpabilisantes. Une formulation par ligne." />
          <Field label="Lien appel" value={profile.calendly_url} onChange={(v) => onChange("calendly_url", v)} placeholder="https://calendly.com/..." />
          <Field label="Lien page de vente" value={profile.sales_page_url} onChange={(v) => onChange("sales_page_url", v)} placeholder="https://..." />
          <TextField label="Notes libres" value={profile.raw_notes} rows={5} onChange={(v) => onChange("raw_notes", v)} placeholder="Contexte utile, subtilités, cas particuliers." />
        </div>
      </details>
    </div>
  );
}

function AvatarInputStep({
  input,
  disabled,
  helperText,
  generating,
  onChange,
  onGenerate,
}: {
  input: AvatarGenerateInput;
  disabled: boolean;
  helperText: string | null;
  generating: boolean;
  onChange: (key: keyof AvatarGenerateInput, value: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div>
      <SectionHeader
        eyebrow="Avatar rapide"
        title="Décris ton client avec tes mots"
        description="L'objectif n'est pas d'être parfait. Angellos va structurer ces réponses, puis tu valideras la version finale à l'étape suivante."
        action={
          <button type="button" onClick={onGenerate} disabled={disabled} style={primaryButton(disabled)}>
            {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Générer l'avatar
          </button>
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
        eyebrow="Validation avatar"
        title="Valide ce qu'Angellos a compris"
        description="Corrige les formulations importantes. C'est cette version structurée qui servira de source de vérité."
        action={
          <button type="button" onClick={onSave} disabled={disabled} style={primaryButton(disabled)}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Valider l'avatar
          </button>
        }
      />

      {!isAvatarMeaningful(avatar) && (
        <EmptyState text="Réponds aux questions précédentes puis clique sur Générer l'avatar." />
      )}

      <div style={styles.focusArea}>
          <TextField
            label="Résumé persona"
            value={typeof avatar.persona_summary === "string" ? avatar.persona_summary : ""}
            rows={4}
            onChange={(value) => onAvatarChange("persona_summary", value)}
            placeholder="Génère l'avatar pour remplir ce résumé."
          />
          <TextField
            label="Situation actuelle"
            value={typeof avatar.current_situation === "string" ? avatar.current_situation : ""}
            rows={3}
            onChange={(value) => onAvatarChange("current_situation", value)}
            placeholder="Ce que vit le prospect aujourd'hui."
          />
          <TextField
            label="Situation désirée"
            value={typeof avatar.desired_situation === "string" ? avatar.desired_situation : ""}
            rows={3}
            onChange={(value) => onAvatarChange("desired_situation", value)}
            placeholder="Ce qu'il veut obtenir."
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
          Générer les règles DM
        </button>
        <AdvancedToggle open={showAdvanced} onClick={onToggleAdvanced} />
      </div>
      {generateRulesHelp && <p style={styles.actionHelp}>{generateRulesHelp}</p>}

      {showAdvanced && (
        <JsonEditor title="JSON avatar" value={avatarJson} onChange={onJsonChange} rows={12} />
      )}
    </div>
  );
}

function RulesStep({
  rules,
  rulesJson,
  showAdvanced,
  disabled,
  saving,
  generating,
  canGenerate,
  generateHelp,
  onRulesChange,
  onJsonChange,
  onToggleAdvanced,
  onGenerate,
  onSave,
}: {
  rules: AgentSalesRules;
  rulesJson: string;
  showAdvanced: boolean;
  disabled: boolean;
  saving: boolean;
  generating: boolean;
  canGenerate: boolean;
  generateHelp: string | null;
  onRulesChange: (key: keyof AgentSalesRules, value: string[]) => void;
  onJsonChange: (value: string) => void;
  onToggleAdvanced: () => void;
  onGenerate: () => void;
  onSave: () => void;
}) {
  return (
    <div>
      <SectionHeader
        eyebrow="Règles DM"
        title="Décide comment Angellos qualifie et oriente"
        description="Ces listes deviennent le garde-fou opérationnel: quand continuer, quand stopper, quand proposer un appel."
        action={
          <button type="button" onClick={onSave} disabled={disabled} style={primaryButton(disabled)}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Enregistrer les règles
          </button>
        }
      />

      <div style={styles.actionRow}>
        <button type="button" onClick={onGenerate} disabled={disabled || !canGenerate} style={secondaryButton(disabled || !canGenerate)}>
          {generating ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
          Régénérer depuis l'avatar
        </button>
        <AdvancedToggle open={showAdvanced} onClick={onToggleAdvanced} />
      </div>
      {generateHelp && <p style={styles.actionHelp}>{generateHelp}</p>}

      {!isRulesMeaningful(rules) && (
        <EmptyState text="Valide l'avatar puis génère les règles DM." />
      )}

      <div style={styles.editableListGrid}>
        {RULE_FIELDS.map((field) => (
          <EditableList
            key={field.key}
            label={field.label}
            empty={field.empty}
            items={getStringList(rules[field.key])}
            onChange={(items) => onRulesChange(field.key, items)}
          />
        ))}
      </div>

      {showAdvanced && (
        <JsonEditor title="JSON règles DM" value={rulesJson} onChange={onJsonChange} rows={12} />
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
  promptVersions,
  versionsLoading,
  restoreLoading,
  messagesEndRef,
  inputRef,
  onInputChange,
  onSendTestMessage,
  onChatKeyDown,
  onResetChat,
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
  promptVersions: PromptVersion[];
  versionsLoading: boolean;
  restoreLoading: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onSendTestMessage: () => void;
  onChatKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onResetChat: () => void;
  onRestorePrompt: (versionId: string) => void;
  onRebuild: () => void;
}) {
  const avatarCount = AVATAR_ARRAY_FIELDS.reduce((total, field) => total + getStringList(avatar[field.key]).length, 0);
  const rulesCount = RULE_FIELDS.reduce((total, field) => total + getStringList(rules[field.key]).length, 0);

  return (
    <div>
      <SectionHeader
        eyebrow="Activation"
        title="Reconstruis le prompt actif d'Angellos"
        description="Le prompt sera compilé depuis le profil business, l'avatar validé et les règles DM. Les données structurées restent la source de vérité."
        action={
          <button type="button" onClick={onRebuild} disabled={disabled || !canRebuild} style={primaryButton(disabled || !canRebuild)}>
            {rebuilding ? <Loader2 size={15} className="animate-spin" /> : <FileJson size={15} />}
            Rebuild prompt Angellos          </button>
        }
      />
      {rebuildHelp && <p style={styles.actionHelp}>{rebuildHelp}</p>}

      <div style={styles.launchGrid}>
        <SummaryMetric label="Business" value={profile.offer_name || profile.business_name || "À compléter"} />
        <SummaryMetric label="Avatar" value={`${avatarCount} éléments structurés`} />
        <SummaryMetric label="Règles DM" value={`${rulesCount} règles structurées`} />
      </div>

      <div style={styles.launchPanel}>
        <h3 style={styles.cardTitle}>Avant de tester</h3>
        <p style={styles.bodyText}>
          Après le rebuild, passe dans Agent Studio ou CRM en mode supervisé et teste 2 ou 3 messages typiques.
          Si une réponse sonne faux, reviens ici corriger l'avatar ou les règles plutôt que de modifier le prompt à la main.
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
}) {
  return (
    <section style={styles.toolCard}>
      <div style={styles.toolHeader}>
        <div>
          <h3 style={styles.cardTitle}>Conversation de test</h3>
          <p style={styles.toolText}>Teste le prompt actif comme si tu étais un prospect.</p>
        </div>
        <button type="button" onClick={onReset} style={ghostButton(false)} title="Réinitialiser">
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      <div style={styles.chatBox}>
        {messages.length === 0 ? (
          <div style={styles.chatEmpty}>
            <strong>Teste Angellos avec un vrai message prospect.</strong>
            {[
              "Salut, je suis intéressé mais je ne sais pas si c'est adapté à moi.",
              "Ça coûte combien ?",
              "J'ai déjà essayé plusieurs solutions mais ça n'a pas marché.",
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
                <div style={isAgent ? styles.agentBubble : styles.userBubble}>
                  {message.content}
                </div>
              </div>
            );
          })
        )}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={styles.agentBubble}>Angellos réfléchit...</div>
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
          placeholder="Tape ton message en tant que prospect..."
          style={styles.chatInput}
        />
        <button type="button" onClick={onSend} disabled={disabled || !input.trim()} style={primaryButton(disabled || !input.trim())} title="Envoyer">
          <Send size={15} />
        </button>
      </div>
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
          <h3 style={styles.cardTitle}>Historique prompts</h3>
          <p style={styles.toolText}>Reviens à une version précédente si le rebuild ne te plaît pas.</p>
        </div>
      </div>

      <div style={styles.versionList}>
        {loading ? (
          <div style={styles.emptyText}>Chargement des versions...</div>
        ) : versions.length === 0 ? (
          <div style={styles.emptyText}>Aucune version disponible.</div>
        ) : (
          versions.slice(0, 8).map((version) => {
            const active = version.is_active;
            const restoring = restoreLoading === version.id;
            return (
              <div key={version.id} style={styles.versionRow}>
                <div style={{ minWidth: 0 }}>
                  <div style={styles.versionTitle}>
                    {version.source || "manual"}
                    {active && <span style={styles.activePill}>Active</span>}
                  </div>
                  <div style={styles.versionMeta}>{formatDate(version.created_at)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onRestore(version.id)}
                  disabled={active || Boolean(restoreLoading)}
                  style={secondaryButton(active || Boolean(restoreLoading))}
                >
                  {restoring ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Restaurer
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
}: {
  profile: TrainingProfileInput;
  avatar: AgentAvatar;
  rules: AgentSalesRules;
  activeStep: StepId;
}) {
  const topAvatarItems = [
    ...getStringList(avatar.pain_points).slice(0, 2),
    ...getStringList(avatar.objections).slice(0, 2),
  ].slice(0, 4);
  const topRules = [
    ...getStringList(rules.qualification_questions).slice(0, 2),
    ...getStringList(rules.call_offer_conditions).slice(0, 2),
  ].slice(0, 4);

  return (
    <div style={styles.previewInner}>
      <span style={styles.previewEyebrow}>Ce qu'Angellos comprend</span>
      <h2 style={styles.previewTitle}>
        {profile.business_name || profile.offer_name || "Ton agent n'a pas encore de contexte"}
      </h2>
      <p style={styles.previewText}>
        {activeStep === "business"
          ? "Remplis les bases de l'offre pour donner un cadre commercial clair."
          : typeof avatar.persona_summary === "string" && avatar.persona_summary
            ? avatar.persona_summary
            : "Génère puis valide l'avatar pour obtenir une synthèse exploitable."}
      </p>

      <PreviewSection title="Offre">
        <PreviewLine label="Promesse" value={profile.offer_promise} />
        <PreviewLine label="Format" value={profile.offer_format} />
        <PreviewLine label="Prix" value={profile.price} />
      </PreviewSection>

      <PreviewSection title="Avatar">
        {topAvatarItems.length > 0 ? (
          <MiniList items={topAvatarItems} />
        ) : (
          <p style={styles.emptyText}>Les douleurs, objections et mots exacts apparaîtront ici.</p>
        )}
      </PreviewSection>

      <PreviewSection title="Règles DM">
        {topRules.length > 0 ? (
          <MiniList items={topRules} />
        ) : (
          <p style={styles.emptyText}>Les règles de qualification apparaîtront ici.</p>
        )}
      </PreviewSection>
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={styles.previewSection}>
      <h3 style={styles.previewSectionTitle}>{title}</h3>
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

function MiniList({ items }: { items: string[] }) {
  return (
    <ul style={styles.miniList}>
      {items.map((item) => (
        <li key={item} style={styles.miniListItem}>{item}</li>
      ))}
    </ul>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metric}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })} à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

function stepDone(step: StepId, checklist: ReturnType<typeof buildTrainingChecklist>): boolean {
  if (step === "business") return checklist.business === "Complet";
  if (step === "avatar-input") return checklist.business === "Complet";
  if (step === "avatar-review") return checklist.avatar === "Complet";
  if (step === "rules") return checklist.rules === "Complet";
  return checklist.activation === "Prompt reconstruit";
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
  previewSectionTitle: {
    margin: "0 0 8px",
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 850,
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
  launchPanel: {
    border: "1px solid #e6ebf2",
    borderRadius: 8,
    padding: 16,
    background: "#fbfdff",
    marginTop: 14,
  },
  launchToolsGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.15fr) minmax(300px, 0.85fr)",
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
  inlineError: {
    margin: "10px 0 0",
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: 700,
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

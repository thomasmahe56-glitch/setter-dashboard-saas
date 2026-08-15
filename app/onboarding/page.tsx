"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Loader2, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import { AngelosAvatar } from "@/components/AngelosAvatar";
import { api, ChatMessage, TrainingProfileInput } from "@/lib/api";
import {
  buildBetaAvatar,
  buildBetaRules,
  EMPTY_BETA_PROFILE,
  listToText,
  textToList,
} from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/client";

const REQUIRED_FIELDS: (keyof TrainingProfileInput)[] = [
  "business_name",
  "coach_name",
  "niche",
  "offer_name",
  "offer_promise",
  "offer_format",
  "price",
  "next_step",
];

type SaveState = "idle" | "saving" | "saved" | "error";

export default function OnboardingPage() {
  const [profile, setProfile] = useState<TrainingProfileInput>(EMPTY_BETA_PROFILE);
  const [qualificationRulesText, setQualificationRulesText] = useState("");
  const [objectionsText, setObjectionsText] = useState("");
  const [checking, setChecking] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [notice, setNotice] = useState("");
  const [testInput, setTestInput] = useState("Hi, I am interested but I want to know if this is for me.");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        window.location.href = "/login?next=/onboarding";
        return;
      }
      try {
        const state = await api.getTrainingCenter(false);
        const savedProfile = state.profile?.profile;
        const savedRules = state.sales_rules?.rules;
        if (savedProfile) {
          setProfile({ ...EMPTY_BETA_PROFILE, ...savedProfile });
        }
        if (savedRules?.qualification_questions) {
          setQualificationRulesText(listToText(savedRules.qualification_questions));
        }
        if (savedRules?.objection_responses) {
          setObjectionsText(listToText(savedRules.objection_responses));
        }
      } catch {
        // Keep the beta form usable even if the first training-center read fails.
      } finally {
        setChecking(false);
      }
    });
  }, []);

  const missingFields = useMemo(
    () => REQUIRED_FIELDS.filter((key) => !String(profile[key] || "").trim()),
    [profile],
  );
  const canSave = missingFields.length === 0 && (profile.raw_notes.trim() || profile.sales_process?.trim() || profile.voice_profile?.trim() || profile.tone_rules.length > 0);
  const qualificationRules = useMemo(() => textToList(qualificationRulesText), [qualificationRulesText]);
  const objections = useMemo(() => textToList(objectionsText), [objectionsText]);

  function updateProfile(key: keyof TrainingProfileInput, value: string | string[]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
    setNotice("");
  }

  async function saveConfiguration() {
    if (!canSave || saveState === "saving") return;
    setSaveState("saving");
    setNotice("");
    setTestError("");
    try {
      const betaAvatar = buildBetaAvatar(profile, objections);
      const betaRules = buildBetaRules(profile, qualificationRules, objections);
      await api.saveTrainingProfile(profile);
      await api.saveAvatar(
        {
          client_ideal: profile.niche,
          main_problem: profile.raw_notes || profile.sales_process || profile.offer_promise,
          current_block: profile.sales_process || profile.raw_notes,
          fears: objections.join("\n"),
          tried_before: "",
          buying_hesitations: objections.join("\n"),
          desired_outcome: profile.offer_promise,
          bad_fit: "",
        },
        betaAvatar,
      );
      await api.saveSalesRules(betaRules);
      await api.rebuildAgentPrompt();
      setSaveState("saved");
      setNotice("Configuration saved. Beta conversations stay supervised: Angellos drafts replies, you approve before sending.");
    } catch (error) {
      setSaveState("error");
      setNotice(error instanceof Error ? error.message : "Unable to save onboarding configuration.");
    }
  }

  async function runTestConversation() {
    const text = testInput.trim();
    if (!text || testLoading) return;
    setTestLoading(true);
    setTestError("");
    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setTestInput("");
    try {
      const data = await api.playground(nextMessages, profile.calendly_url, profile.sales_page_url);
      setMessages((current) => [...current, { role: "assistant", content: data.response }]);
    } catch (error) {
      setTestError(error instanceof Error ? error.message : "Unable to generate test response.");
    } finally {
      setTestLoading(false);
    }
  }

  if (checking) return null;

  return (
    <main className="app-page" style={styles.page}>
      <section style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.brandRow}>
            <AngelosAvatar size={44} radius={12} shadow="0 8px 24px rgba(0,149,246,0.18)" />
            <div>
              <p style={styles.eyebrow}>Angellos beta onboarding</p>
              <h1 style={styles.title}>Configure your supervised AI setter.</h1>
            </div>
          </div>
          <Link href="/crm" style={styles.secondaryLink}>Open CRM</Link>
        </header>

        <div style={styles.grid}>
          <section style={styles.formColumn}>
            <Step number="01" title="Business">
              <div style={styles.fieldGrid}>
                <SelectField label="Language" value={profile.language || "en"} onChange={(value) => updateProfile("language", value)} options={["en", "fr"]} />
                <Field label="Business name" value={profile.business_name} onChange={(value) => updateProfile("business_name", value)} placeholder="Nounes Coaching" />
                <Field label="Operator / coach name" value={profile.coach_name} onChange={(value) => updateProfile("coach_name", value)} placeholder="Nounes" />
                <Field label="Niche" value={profile.niche} onChange={(value) => updateProfile("niche", value)} placeholder="Who Angellos should qualify" />
              </div>
            </Step>

            <Step number="02" title="Offer">
              <div style={styles.fieldGrid}>
                <Field label="Offer name" value={profile.offer_name} onChange={(value) => updateProfile("offer_name", value)} placeholder="Program name" />
                <Field label="Price / pricing rule" value={profile.price} onChange={(value) => updateProfile("price", value)} placeholder="Price, range, or when to discuss price" />
                <Field label="Next step" value={profile.next_step || ""} onChange={(value) => updateProfile("next_step", value)} placeholder="Book a call, send page, ask application question..." />
                <Field label="Booking or sales page URL" value={profile.calendly_url || profile.sales_page_url || ""} onChange={(value) => {
                  updateProfile("calendly_url", value);
                  updateProfile("sales_page_url", value);
                }} placeholder="https://..." />
              </div>
              <TextField label="Offer promise" rows={3} value={profile.offer_promise} onChange={(value) => updateProfile("offer_promise", value)} placeholder="Concrete outcome prospects want" />
              <TextField label="Offer format" rows={3} value={profile.offer_format} onChange={(value) => updateProfile("offer_format", value)} placeholder="Duration, calls, support, deliverables" />
            </Step>

            <Step number="03" title="Voice + rules">
              <TextField label="Tone rules" rows={4} value={listToText(profile.tone_rules)} onChange={(value) => updateProfile("tone_rules", textToList(value))} placeholder="One tone rule per line" />
              <TextField label="Forbidden phrases" rows={4} value={listToText(profile.forbidden_phrases)} onChange={(value) => updateProfile("forbidden_phrases", textToList(value))} placeholder="One forbidden phrase per line" />
              <TextField label="Common objections" rows={4} value={objectionsText} onChange={setObjectionsText} placeholder="One objection or answer per line" />
              <TextField label="Qualification rules / sales process" rows={5} value={qualificationRulesText || profile.sales_process || ""} onChange={(value) => {
                setQualificationRulesText(value);
                updateProfile("sales_process", value);
              }} placeholder="Questions to ask, buying signals, when to move to the next step" />
              <TextField label="Raw notes" rows={5} value={profile.raw_notes} onChange={(value) => updateProfile("raw_notes", value)} placeholder="Anything Angellos must know before replying" />
            </Step>

            <Step number="04" title="Mode">
              <div style={styles.modeCard}>
                <ShieldCheck size={18} color="#f59e0b" />
                <div>
                  <strong>Supervised beta mode is forced.</strong>
                  <p>Instagram/ManyChat connection happens outside this form. New tenant conversations are created in supervised mode: Angellos generates a pending reply in CRM, but no auto-send is enabled here.</p>
                </div>
              </div>
              <button type="button" onClick={saveConfiguration} disabled={!canSave || saveState === "saving"} style={primaryButton(!canSave || saveState === "saving")}>
                {saveState === "saving" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saveState === "saving" ? "Saving configuration..." : "Save beta configuration"}
              </button>
              {!canSave && <p style={styles.helpText}>Complete all business and offer fields plus at least one voice/rule note before saving.</p>}
              {notice && <p style={saveState === "error" ? styles.errorText : styles.successText}>{notice}</p>}
            </Step>
          </section>

          <aside style={styles.testPanel}>
            <div style={styles.testHeader}>
              <Sparkles size={18} color="#0095F6" />
              <div>
                <h2>05 Test conversation</h2>
                <p>Type a fake prospect message. The response uses the saved Training Center context.</p>
              </div>
            </div>
            <div style={styles.chatBox}>
              {messages.length === 0 ? (
                <p style={styles.emptyChat}>Save the configuration, then test a prospect message.</p>
              ) : messages.map((message, index) => (
                <div key={`${message.role}-${index}`} style={{ display: "flex", justifyContent: message.role === "assistant" ? "flex-start" : "flex-end" }}>
                  <div style={message.role === "assistant" ? styles.agentBubble : styles.userBubble}>{message.content}</div>
                </div>
              ))}
              {testLoading && <div style={styles.agentBubble}>Angellos is thinking...</div>}
            </div>
            {testError && <p style={styles.errorText}>{testError}</p>}
            <textarea
              rows={3}
              value={testInput}
              onChange={(event) => setTestInput(event.target.value)}
              placeholder="Type as a prospect..."
              style={styles.textarea}
            />
            <button type="button" onClick={runTestConversation} disabled={saveState !== "saved" || testLoading || !testInput.trim()} style={primaryButton(saveState !== "saved" || testLoading || !testInput.trim())}>
              {testLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquareText size={16} />}
              Generate test response
            </button>
            <Link href="/crm" style={styles.crmCta}>
              Open supervised CRM <ArrowRight size={16} />
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section style={styles.stepCard}>
      <div style={styles.stepTitle}><span>{number}</span><h2>{title}</h2></div>
      <div style={styles.stepBody}>{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label style={styles.label}>{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={styles.input} /></label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label style={styles.label}>{label}<select value={value} onChange={(event) => onChange(event.target.value)} style={styles.input}>{options.map((option) => <option key={option} value={option}>{option === "fr" ? "Français" : "English"}</option>)}</select></label>
  );
}

function TextField({ label, rows, value, onChange, placeholder }: { label: string; rows: number; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label style={styles.label}>{label}<textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={styles.textarea} /></label>
  );
}

function primaryButton(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    border: "none",
    borderRadius: 12,
    padding: "13px 16px",
    background: disabled ? "#93c5fd" : "#0095F6",
    color: "white",
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "linear-gradient(135deg,#f8fafc 0%,#eef4ff 100%)", color: "#0f172a", padding: 24 },
  shell: { maxWidth: 1280, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 24 },
  brandRow: { display: "flex", alignItems: "center", gap: 14 },
  eyebrow: { margin: 0, color: "#0095F6", fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" },
  title: { margin: "2px 0 0", fontSize: 32, lineHeight: 1.05, fontWeight: 900 },
  secondaryLink: { color: "#0f172a", textDecoration: "none", fontWeight: 800, background: "white", border: "1px solid #e5e7eb", borderRadius: 999, padding: "10px 14px" },
  grid: { display: "grid", gridTemplateColumns: "minmax(0,1fr) 420px", gap: 20, alignItems: "start" },
  formColumn: { display: "flex", flexDirection: "column", gap: 16 },
  stepCard: { background: "white", border: "1px solid #e5e7eb", borderRadius: 22, padding: 22, boxShadow: "0 14px 40px rgba(15,23,42,.06)" },
  stepTitle: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  stepBody: { display: "flex", flexDirection: "column", gap: 14 },
  fieldGrid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 800, color: "#475569" },
  input: { border: "1px solid #e5e7eb", borderRadius: 12, padding: "11px 12px", fontSize: 14, color: "#0f172a", background: "#f8fafc", outline: "none" },
  textarea: { border: "1px solid #e5e7eb", borderRadius: 12, padding: "11px 12px", fontSize: 14, color: "#0f172a", background: "#f8fafc", outline: "none", resize: "vertical", fontFamily: "inherit" },
  modeCard: { display: "flex", gap: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 16, padding: 14, color: "#78350f" },
  helpText: { margin: 0, color: "#64748b", fontSize: 13 },
  errorText: { margin: 0, color: "#dc2626", fontSize: 13, fontWeight: 700 },
  successText: { margin: 0, color: "#047857", fontSize: 13, fontWeight: 700 },
  testPanel: { position: "sticky", top: 20, background: "white", border: "1px solid #e5e7eb", borderRadius: 24, padding: 20, boxShadow: "0 14px 40px rgba(15,23,42,.08)", display: "flex", flexDirection: "column", gap: 12 },
  testHeader: { display: "flex", gap: 12, alignItems: "flex-start" },
  chatBox: { minHeight: 300, maxHeight: 460, overflow: "auto", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 18, padding: 14, display: "flex", flexDirection: "column", gap: 10 },
  emptyChat: { margin: "auto", color: "#64748b", textAlign: "center", fontSize: 14 },
  userBubble: { maxWidth: "82%", background: "#0095F6", color: "white", borderRadius: "16px 16px 4px 16px", padding: "10px 12px", fontSize: 14 },
  agentBubble: { maxWidth: "82%", background: "white", border: "1px solid #e5e7eb", color: "#0f172a", borderRadius: "16px 16px 16px 4px", padding: "10px 12px", fontSize: 14 },
  crmCta: { display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8, textDecoration: "none", color: "#0095F6", fontWeight: 900, padding: 10 },
};

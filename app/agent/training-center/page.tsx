"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  FileJson,
  GraduationCap,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";
import { NavBar } from "@/components/NavBar";
import {
  AgentAvatar,
  AgentSalesRules,
  api,
  AvatarGenerateInput,
  TrainingProfileInput,
} from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

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

const CHECKLIST = [
  { key: "business_setup", label: "Business Setup" },
  { key: "avatar_client", label: "Avatar Client" },
  { key: "regles_dm", label: "Règles DM" },
  { key: "test_conversation", label: "Test de conversation" },
] as const;

type Notice = { kind: "success" | "error"; text: string } | null;

function listToText(items: string[] | undefined): string {
  return (items || []).join("\n");
}

function textToList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value || {}, null, 2);
}

function parseJsonObject<T>(value: string): T {
  const parsed = JSON.parse(value) as T;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON_OBJECT_REQUIRED");
  }
  return parsed;
}

export default function TrainingCenterPage() {
  const [profile, setProfile] = useState<TrainingProfileInput>(EMPTY_PROFILE);
  const [avatarInput, setAvatarInput] = useState<AvatarGenerateInput>(EMPTY_AVATAR_INPUT);
  const [avatarJson, setAvatarJson] = useState("{}");
  const [rulesJson, setRulesJson] = useState("{}");
  const [progress, setProgress] = useState(0);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [generatingRules, setGeneratingRules] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

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
      setProgress(data.progress_score || 0);
      setChecklist(data.checklist || {});
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Chargement impossible" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrainingCenter();
  }, [loadTrainingCenter]);

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

  function updateProfile(key: keyof TrainingProfileInput, value: string | string[]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function updateAvatarInput(key: keyof AvatarGenerateInput, value: string) {
    setAvatarInput((current) => ({ ...current, [key]: value }));
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    setNotice(null);
    try {
      await api.saveTrainingProfile(profile);
      setChecklist((current) => ({ ...current, business_setup: true }));
      setProgress((current) => Math.max(current, 25));
      setNotice({ kind: "success", text: "Business Setup enregistré" });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Enregistrement impossible" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleGenerateAvatar() {
    setGeneratingAvatar(true);
    setNotice(null);
    try {
      const data = await api.generateAvatar(avatarInput);
      setAvatarJson(prettyJson(data.avatar));
      setNotice({ kind: "success", text: "Avatar généré, prêt à valider" });
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
      const avatar = parseJsonObject<AgentAvatar>(avatarJson);
      await api.saveAvatar(avatarInput, avatar);
      setChecklist((current) => ({ ...current, avatar_client: true }));
      setProgress((current) => Math.max(current, 50));
      setNotice({ kind: "success", text: "Avatar Client enregistré" });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "JSON avatar invalide" });
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handleGenerateRules() {
    setGeneratingRules(true);
    setNotice(null);
    try {
      const avatar = parseJsonObject<AgentAvatar>(avatarJson);
      const data = await api.generateSalesRules(avatar, profile);
      setRulesJson(prettyJson(data.rules));
      setNotice({ kind: "success", text: "Règles DM générées" });
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
      const rules = parseJsonObject<AgentSalesRules>(rulesJson);
      await api.saveSalesRules(rules);
      setChecklist((current) => ({ ...current, regles_dm: true }));
      setProgress((current) => Math.max(current, 75));
      setNotice({ kind: "success", text: "Règles DM enregistrées" });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "JSON règles invalide" });
    } finally {
      setSavingRules(false);
    }
  }

  async function handleRebuildPrompt() {
    setRebuilding(true);
    setNotice(null);
    try {
      await api.rebuildAgentPrompt();
      setNotice({ kind: "success", text: "Prompt Angelos reconstruit et activé" });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Rebuild impossible" });
    } finally {
      setRebuilding(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "#fff",
    color: "#111827",
    fontSize: 13,
    padding: "10px 12px",
    outline: "none",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    color: "#4b5563",
    fontSize: 12,
    fontWeight: 700,
  };

  const panelStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #eceff3",
    borderRadius: 8,
    padding: 18,
  };

  const actionDisabled = loading || savingProfile || generatingAvatar || savingAvatar || generatingRules || savingRules || rebuilding;

  return (
    <main style={{ minHeight: "100vh", background: "#f7f8fa", paddingLeft: 72 }}>
      <NavBar />
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "34px 28px 56px" }}>
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 22 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <GraduationCap size={24} color="#0095F6" />
              <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1, fontWeight: 850, color: "#0f172a" }}>
                Training Center
              </h1>
            </div>
            <p style={{ margin: 0, maxWidth: 720, color: "#64748b", fontSize: 15, lineHeight: 1.5 }}>
              Entraîne Angelos à comprendre ton business, ton client idéal et ta manière de vendre.
            </p>
          </div>
          <button
            type="button"
            onClick={loadTrainingCenter}
            disabled={loading}
            title="Rafraîchir"
            aria-label="Rafraîchir"
            style={{
              height: 40,
              width: 40,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#475569",
              display: "grid",
              placeItems: "center",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
          </button>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 18, alignItems: "start" }}>
          <aside style={panelStyle}>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0 }}>
              Progression
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
              <strong style={{ fontSize: 36, lineHeight: 1, color: "#0f172a" }}>{progress}%</strong>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{businessScore}/7 champs business</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "#eef2f7", overflow: "hidden", marginBottom: 18 }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "#0095F6" }} />
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {CHECKLIST.map((item) => {
                const done = Boolean(checklist[item.key]);
                return (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 22,
                      height: 22,
                      borderRadius: 8,
                      display: "grid",
                      placeItems: "center",
                      background: done ? "#dcfce7" : "#f1f5f9",
                      color: done ? "#16a34a" : "#94a3b8",
                      flexShrink: 0,
                    }}>
                      <Check size={14} />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: done ? "#0f172a" : "#64748b" }}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {notice && (
              <p style={{
                margin: "18px 0 0",
                padding: "10px 12px",
                borderRadius: 8,
                background: notice.kind === "success" ? "#ecfdf5" : "#fef2f2",
                color: notice.kind === "success" ? "#047857" : "#b91c1c",
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1.4,
              }}>
                {notice.text}
              </p>
            )}
          </aside>

          <div style={{ display: "grid", gap: 18 }}>
            <section style={panelStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 850, color: "#0f172a" }}>Business Setup</h2>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Offre, promesse, prix, preuves et limites de ton agent.</p>
                </div>
                <button type="button" onClick={handleSaveProfile} disabled={actionDisabled} style={primaryButton(actionDisabled)}>
                  {savingProfile ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Enregistrer
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 12 }}>
                <Field label="Nom du business" value={profile.business_name} onChange={(v) => updateProfile("business_name", v)} inputStyle={inputStyle} />
                <Field label="Coach / fondateur" value={profile.coach_name} onChange={(v) => updateProfile("coach_name", v)} inputStyle={inputStyle} />
                <Field label="Niche" value={profile.niche} onChange={(v) => updateProfile("niche", v)} inputStyle={inputStyle} />
                <Field label="Nom de l'offre" value={profile.offer_name} onChange={(v) => updateProfile("offer_name", v)} inputStyle={inputStyle} />
                <TextField label="Promesse de l'offre" value={profile.offer_promise} rows={3} onChange={(v) => updateProfile("offer_promise", v)} inputStyle={inputStyle} labelStyle={labelStyle} />
                <TextField label="Format / accompagnement" value={profile.offer_format} rows={3} onChange={(v) => updateProfile("offer_format", v)} inputStyle={inputStyle} labelStyle={labelStyle} />
                <TextField label="Prix / modalités" value={profile.price} rows={2} onChange={(v) => updateProfile("price", v)} inputStyle={inputStyle} labelStyle={labelStyle} />
                <TextField label="Preuves" value={listToText(profile.proof_points)} rows={2} onChange={(v) => updateProfile("proof_points", textToList(v))} inputStyle={inputStyle} labelStyle={labelStyle} />
                <TextField label="Ton à respecter" value={listToText(profile.tone_rules)} rows={2} onChange={(v) => updateProfile("tone_rules", textToList(v))} inputStyle={inputStyle} labelStyle={labelStyle} />
                <TextField label="À ne pas dire" value={listToText(profile.forbidden_phrases)} rows={2} onChange={(v) => updateProfile("forbidden_phrases", textToList(v))} inputStyle={inputStyle} labelStyle={labelStyle} />
                <Field label="Lien appel" value={profile.calendly_url} onChange={(v) => updateProfile("calendly_url", v)} inputStyle={inputStyle} />
                <Field label="Lien page de vente" value={profile.sales_page_url} onChange={(v) => updateProfile("sales_page_url", v)} inputStyle={inputStyle} />
              </div>
              <div style={{ marginTop: 12 }}>
                <TextField label="Notes libres" value={profile.raw_notes} rows={4} onChange={(v) => updateProfile("raw_notes", v)} inputStyle={inputStyle} labelStyle={labelStyle} />
              </div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 18 }}>
              <div style={panelStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                  <div>
                    <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 850, color: "#0f172a" }}>Avatar rapide</h2>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Inputs simples pour générer une base structurée.</p>
                  </div>
                  <button type="button" onClick={handleGenerateAvatar} disabled={actionDisabled} style={secondaryButton(actionDisabled)}>
                    {generatingAvatar ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    Générer
                  </button>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {Object.entries(AVATAR_LABELS).map(([key, label]) => (
                    <TextField
                      key={key}
                      label={label}
                      value={avatarInput[key as keyof AvatarGenerateInput]}
                      rows={2}
                      onChange={(v) => updateAvatarInput(key as keyof AvatarGenerateInput, v)}
                      inputStyle={inputStyle}
                      labelStyle={labelStyle}
                    />
                  ))}
                </div>
              </div>

              <div style={panelStyle}>
                <JsonEditor
                  title="Avatar généré"
                  value={avatarJson}
                  onChange={setAvatarJson}
                  rows={21}
                  inputStyle={inputStyle}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <button type="button" onClick={handleSaveAvatar} disabled={actionDisabled} style={primaryButton(actionDisabled)}>
                    {savingAvatar ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    Valider l'avatar
                  </button>
                  <button type="button" onClick={handleGenerateRules} disabled={actionDisabled} style={secondaryButton(actionDisabled)}>
                    {generatingRules ? <Loader2 size={15} className="animate-spin" /> : <MessageSquareText size={15} />}
                    Générer les règles DM
                  </button>
                </div>
              </div>
            </section>

            <section style={panelStyle}>
              <JsonEditor
                title="Règles DM"
                value={rulesJson}
                onChange={setRulesJson}
                rows={14}
                inputStyle={inputStyle}
              />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={handleSaveRules} disabled={actionDisabled} style={secondaryButton(actionDisabled)}>
                  {savingRules ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Enregistrer les règles
                </button>
                <button type="button" onClick={handleRebuildPrompt} disabled={actionDisabled} style={primaryButton(actionDisabled)}>
                  {rebuilding ? <Loader2 size={15} className="animate-spin" /> : <FileJson size={15} />}
                  Rebuild prompt Angelos
                </button>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

const AVATAR_LABELS: Record<keyof AvatarGenerateInput, string> = {
  client_ideal: "Client idéal",
  main_problem: "Problème principal",
  current_block: "Blocage actuel",
  fears: "Peurs",
  tried_before: "Déjà essayé",
  buying_hesitations: "Freins à l'achat",
  desired_outcome: "Résultat désiré",
  bad_fit: "Mauvais fit",
};

function Field({
  label,
  value,
  onChange,
  inputStyle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputStyle: React.CSSProperties;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "#4b5563", fontSize: 12, fontWeight: 700 }}>
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </label>
  );
}

function TextField({
  label,
  value,
  rows,
  onChange,
  inputStyle,
  labelStyle,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
    </label>
  );
}

function JsonEditor({
  title,
  value,
  onChange,
  rows,
  inputStyle,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  inputStyle: React.CSSProperties;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 850, color: "#0f172a" }}>
        <FileJson size={15} color="#0095F6" />
        {title}
      </span>
      <textarea
        value={value}
        rows={rows}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputStyle,
          resize: "vertical",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 12,
          lineHeight: 1.5,
          background: "#fbfdff",
        }}
      />
    </label>
  );
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

"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown, ChevronUp, Zap, ArrowLeft } from "lucide-react";
import { NavBar } from "@/components/NavBar";

interface PainPoint { text: string; frequency: number; examples: string[] }
interface Objection { text: string; frequency: number; examples: string[] }
interface BusinessSuggestion { suggestion: string; priority: "high" | "medium" | "low"; justification: string }
interface DiffLine { line: string; type: "add" | "remove" | "keep"; justification: string }
interface Insight {
  id: string
  created_at: string
  conversations_analyzed: number
  status: "pending" | "applied" | "ignored"
  pain_points: PainPoint[]
  objections: Objection[]
  business_suggestions: BusinessSuggestion[]
  prompt_diff: DiffLine[]
  prompt_proposed: string
}
interface PreviewDiffLine { line: string; type: "add" | "remove" | "keep"; justification: string }
interface PreviewResult { prompt_proposed: string; diff: PreviewDiffLine[] }

import { config as appConfig } from "@/lib/config";
import { getAccessToken } from "@/lib/supabase";
const RAILWAY_URL = appConfig.apiUrl;

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${RAILWAY_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) +
    " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
}

function StatusBadgeInsight({ status }: { status: Insight["status"] }) {
  const map = {
    pending: { label: "En attente", bg: "#fef3c7", color: "#92400e" },
    applied: { label: "Appliqué",   bg: "#f0fdf4", color: "#16a34a" },
    ignored: { label: "Ignoré",     bg: "#f0f0f0", color: "#8e8e8e" },
  };
  const s = map[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700,
      padding: "2px 10px", borderRadius: 9999, color: s.color, background: s.bg, whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}

function PriorityBadge({ priority }: { priority: BusinessSuggestion["priority"] }) {
  const map = {
    high:   { label: "Haute",   bg: "#fef2f2", color: "#dc2626" },
    medium: { label: "Moyenne", bg: "#fff7ed", color: "#ea580c" },
    low:    { label: "Basse",   bg: "#f0f0f0", color: "#8e8e8e" },
  };
  const s = map[priority];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 9999,
      color: s.color, background: s.bg, whiteSpace: "nowrap", flexShrink: 0,
    }}>{s.label}</span>
  );
}

function SectionToggle({ allSelected, onToggle }: { allSelected: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} style={{
      fontSize: 11, color: "#8e8e8e", background: "transparent", border: "none",
      cursor: "pointer", padding: 0, fontWeight: 500, textDecoration: "underline", flexShrink: 0,
    }}>
      {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
    </button>
  );
}

function PreviewDiffViewer({ lines }: { lines: PreviewDiffLine[] }) {
  return (
    <div style={{
      background: "#0a0a0a", borderRadius: 10, padding: "12px 16px",
      fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, overflowX: "auto",
    }}>
      {lines.map((l, i) => {
        const isAdd = l.type === "add";
        const isRemove = l.type === "remove";
        return (
          <div key={i}>
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-start",
              color: isAdd ? "#4ade80" : isRemove ? "#f87171" : "#8e8e8e",
              background: isAdd ? "rgba(74,222,128,0.07)" : isRemove ? "rgba(248,113,113,0.07)" : "transparent",
              borderRadius: 4, padding: "1px 4px",
            }}>
              <span style={{ flexShrink: 0, userSelect: "none", opacity: 0.6 }}>
                {isAdd ? "+" : isRemove ? "−" : " "}
              </span>
              <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", flex: 1 }}>{l.line}</span>
            </div>
            {(isAdd || isRemove) && l.justification && (
              <div style={{
                fontSize: 10, color: isAdd ? "#6ee7b7" : "#fca5a5", opacity: 0.7,
                fontStyle: "italic", padding: "0 4px 2px 20px",
              }}>
                ↳ {l.justification}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PreviewLoadingState({ countLabel, mode = "initial" }: { countLabel: string; mode?: "initial" | "refresh" }) {
  return (
    <div
      aria-live="polite"
      style={{
        margin: "0 0 12px",
        border: "1px solid #dbeafe",
        background: "#eff6ff",
        borderRadius: 12,
        padding: 14,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 10,
          background: "#0095F6", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Loader2 size={16} className="animate-spin" />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: "#0a0a0a", margin: "0 0 2px" }}>
            {mode === "refresh" ? "Mise à jour de la prévisualisation" : "Prévisualisation en cours"}
          </p>
          <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
            Claude reconstruit le prompt avec {countLabel || "la sélection actuelle"}. Ça peut prendre quelques secondes.
          </p>
        </div>
      </div>

      <div style={{
        background: "#0a0a0a",
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        {[92, 76, 84, 58].map((width, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: i % 2 === 0 ? "#4ade80" : "#8e8e8e", fontFamily: "monospace", fontSize: 12 }}>
              {i % 2 === 0 ? "+" : " "}
            </span>
            <div
              className="skeleton-shimmer"
              style={{
                width: `${width}%`,
                height: 12,
                borderRadius: 5,
                background: "linear-gradient(90deg, #1f2937 0%, #334155 45%, #1f2937 90%)",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightCard({
  insight,
  onApply,
  onIgnore,
  actionLoading,
  toast,
}: {
  insight: Insight;
  onApply: (id: string, promptProposed: string) => void;
  onIgnore: (id: string) => void;
  actionLoading: string | null;
  toast: string | null;
}) {
  const isPending = insight.status === "pending";

  // ── Sélections ──────────────────────────────────────────────────────────────
  const allSuggestionTexts = useMemo(
    () => (insight.business_suggestions || []).map((s) => s.suggestion),
    [insight.business_suggestions]
  );
  const allPainPointTexts = useMemo(
    () => (insight.pain_points || []).map((p) => p.text),
    [insight.pain_points]
  );
  const allObjectionTexts = useMemo(
    () => (insight.objections || []).map((o) => o.text),
    [insight.objections]
  );

  const [selSugg, setSelSugg] = useState<string[]>(allSuggestionTexts);   // all checked
  const [selPain, setSelPain] = useState<string[]>([]);                    // all unchecked
  const [selObj,  setSelObj]  = useState<string[]>([]);                    // all unchecked

  // ── Prévisualisation ─────────────────────────────────────────────────────────
  const [showOrigDiff, setShowOrigDiff] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewSelectionKey, setPreviewSelectionKey] = useState<string | null>(null);
  const previewRequestId = useRef(0);

  const toggle = (list: string[], set: (v: string[]) => void, item: string) =>
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const totalSelected = selSugg.length + selPain.length + selObj.length;
  const selectionKey = useMemo(
    () => JSON.stringify({ suggestions: selSugg, painPoints: selPain, objections: selObj }),
    [selSugg, selPain, selObj]
  );

  function buildCountLabel(): string {
    const parts: string[] = [];
    if (selSugg.length) parts.push(`${selSugg.length} suggestion${selSugg.length > 1 ? "s" : ""}`);
    if (selPain.length) parts.push(`${selPain.length} douleur${selPain.length > 1 ? "s" : ""}`);
    if (selObj.length) parts.push(`${selObj.length} objection${selObj.length > 1 ? "s" : ""}`);
    return parts.join(" · ");
  }

  const handlePreview = useCallback(async () => {
    const requestId = previewRequestId.current + 1;
    previewRequestId.current = requestId;
    const requestedSelectionKey = selectionKey;
    const selectedSuggestions = [...selSugg];
    const selectedPainPoints = [...selPain];
    const selectedObjections = [...selObj];

    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      const result = await apiFetch<PreviewResult>("/preview-prompt", {
        method: "POST",
        body: JSON.stringify({
          insight_id: insight.id,
          selected_suggestions: selectedSuggestions,
          selected_pain_points: selectedPainPoints,
          selected_objections: selectedObjections,
        }),
      });
      if (previewRequestId.current !== requestId) return;
      setPreviewResult(result);
      setPreviewSelectionKey(requestedSelectionKey);
    } catch (e: unknown) {
      if (previewRequestId.current !== requestId) return;
      setPreviewError(e instanceof Error ? e.message : "Erreur lors de la prévisualisation");
    } finally {
      if (previewRequestId.current === requestId) setIsLoadingPreview(false);
    }
  }, [insight.id, selSugg, selPain, selObj, selectionKey]);

  useEffect(() => {
    if (!previewResult || previewSelectionKey === selectionKey || isLoadingPreview) return;
    const timeout = window.setTimeout(() => {
      handlePreview();
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [handlePreview, isLoadingPreview, previewResult, previewSelectionKey, selectionKey]);

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 16, padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 12,
  };
  const sectionHeader: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8,
  };
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#0a0a0a", margin: 0 };
  const hint: React.CSSProperties = { fontSize: 11, color: "#c0c0c0", margin: "2px 0 8px", display: "block" };
  const sep: React.CSSProperties = { borderTop: "1px solid #f0f0f0", margin: "16px 0" };

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 12, color: "#8e8e8e", margin: "0 0 4px" }}>{formatDate(insight.created_at)}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StatusBadgeInsight status={insight.status} />
            <span style={{ fontSize: 12, color: "#8e8e8e" }}>
              {insight.conversations_analyzed} conversation{insight.conversations_analyzed > 1 ? "s" : ""} analysée{insight.conversations_analyzed > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ── Pain points ── */}
      {insight.pain_points?.length > 0 && (
        <>
          <div style={sep} />
          <div style={sectionHeader}>
            <p style={sectionTitle}>Douleurs détectées</p>
            {isPending && (
              <SectionToggle
                allSelected={allPainPointTexts.length > 0 && allPainPointTexts.every((t) => selPain.includes(t))}
                onToggle={() => setSelPain(allPainPointTexts.every((t) => selPain.includes(t)) ? [] : allPainPointTexts)}
              />
            )}
          </div>
          {isPending && <span style={hint}>Cocher pour adapter les questions de qualification</span>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {insight.pain_points.map((p, i) => (
              <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, cursor: isPending ? "pointer" : "default" }}>
                {isPending && (
                  <input type="checkbox" checked={selPain.includes(p.text)} onChange={() => toggle(selPain, setSelPain, p.text)}
                    style={{ flexShrink: 0, accentColor: "#0095F6" }} />
                )}
                <span style={{
                  fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, borderRadius: 99,
                  background: "#fef3c7", color: "#92400e", display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}>{p.frequency}</span>
                <span style={{ fontSize: 13, color: "#262626" }}>{p.text}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {/* ── Objections ── */}
      {insight.objections?.length > 0 && (
        <>
          <div style={sep} />
          <div style={sectionHeader}>
            <p style={sectionTitle}>Objections</p>
            {isPending && (
              <SectionToggle
                allSelected={allObjectionTexts.length > 0 && allObjectionTexts.every((t) => selObj.includes(t))}
                onToggle={() => setSelObj(allObjectionTexts.every((t) => selObj.includes(t)) ? [] : allObjectionTexts)}
              />
            )}
          </div>
          {isPending && <span style={hint}>Cocher pour renforcer le traitement dans le prompt</span>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {insight.objections.map((o, i) => (
              <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, cursor: isPending ? "pointer" : "default" }}>
                {isPending && (
                  <input type="checkbox" checked={selObj.includes(o.text)} onChange={() => toggle(selObj, setSelObj, o.text)}
                    style={{ flexShrink: 0, accentColor: "#0095F6" }} />
                )}
                <span style={{
                  fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, borderRadius: 99,
                  background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}>{o.frequency}</span>
                <span style={{ fontSize: 13, color: "#262626" }}>{o.text}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {/* ── Suggestions business ── */}
      {insight.business_suggestions?.length > 0 && (
        <>
          <div style={sep} />
          <div style={sectionHeader}>
            <p style={sectionTitle}>Suggestions business</p>
            {isPending && (
              <SectionToggle
                allSelected={allSuggestionTexts.length > 0 && allSuggestionTexts.every((t) => selSugg.includes(t))}
                onToggle={() => setSelSugg(allSuggestionTexts.every((t) => selSugg.includes(t)) ? [] : allSuggestionTexts)}
              />
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {insight.business_suggestions.map((s, i) => (
              <label key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: isPending ? "pointer" : "default" }}>
                {isPending && (
                  <input type="checkbox" checked={selSugg.includes(s.suggestion)} onChange={() => toggle(selSugg, setSelSugg, s.suggestion)}
                    style={{ marginTop: 2, flexShrink: 0, accentColor: "#0095F6" }} />
                )}
                <PriorityBadge priority={s.priority} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: "#262626", margin: "0 0 2px", fontWeight: 500 }}>{s.suggestion}</p>
                  {s.justification && <p style={{ fontSize: 12, color: "#8e8e8e", margin: 0 }}>{s.justification}</p>}
                </div>
              </label>
            ))}
          </div>
        </>
      )}

      {/* ── Diff original du rapport (lecture seule) ── */}
      {insight.prompt_diff?.length > 0 && (
        <>
          <div style={sep} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showOrigDiff ? 12 : 0 }}>
            <p style={sectionTitle}>Proposition meta-prompt</p>
            <button type="button" onClick={() => setShowOrigDiff((v) => !v)} style={{
              display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
              color: "#0095F6", background: "transparent", border: "none", cursor: "pointer", padding: 0,
            }}>
              {showOrigDiff ? <><ChevronUp size={14} /> Masquer</> : <><ChevronDown size={14} /> Voir le diff</>}
            </button>
          </div>

          {showOrigDiff && (
            <div style={{
              background: "#0a0a0a", borderRadius: 10, padding: "12px 16px",
              fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, overflowX: "auto", marginBottom: 12,
            }}>
              {insight.prompt_diff.map((l, i) => {
                const isAdd = l.type === "add"; const isRemove = l.type === "remove";
                return (
                  <div key={i} style={{
                    display: "flex", gap: 8, alignItems: "flex-start",
                    color: isAdd ? "#4ade80" : isRemove ? "#f87171" : "#8e8e8e",
                    background: isAdd ? "rgba(74,222,128,0.07)" : isRemove ? "rgba(248,113,113,0.07)" : "transparent",
                    borderRadius: 4, padding: "1px 4px",
                  }}>
                    <span style={{ flexShrink: 0, userSelect: "none", opacity: 0.6 }}>
                      {isAdd ? "+" : isRemove ? "−" : " "}
                    </span>
                    <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", flex: 1 }}>{l.line}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Zone d'action (pending uniquement) ── */}
      {isPending && (
        <>
          {/* Étape 1 : bouton Prévisualiser */}
          {!previewResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {previewError && (
                <p style={{ fontSize: 12, color: "#dc2626", margin: 0, padding: "6px 10px", background: "#fef2f2", borderRadius: 8 }}>
                  {previewError}
                </p>
              )}
              {isLoadingPreview && (
                <PreviewLoadingState countLabel={buildCountLabel()} />
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handlePreview(); }}
                  disabled={isLoadingPreview}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 18px", borderRadius: 10, border: "none",
                    background: isLoadingPreview ? "#e0e0e0" : "#0095F6",
                    color: isLoadingPreview ? "#8e8e8e" : "#fff",
                    fontSize: 13, fontWeight: 700,
                    cursor: isLoadingPreview ? "not-allowed" : "pointer",
                  }}
                >
                  {isLoadingPreview
                    ? <><Loader2 size={13} className="animate-spin" />Génération du diff...</>
                    : <>Prévisualiser{totalSelected > 0 ? ` (${buildCountLabel()})` : ""}</>
                  }
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onIgnore(insight.id); }}
                  disabled={actionLoading === insight.id}
                  style={{
                    padding: "8px 18px", borderRadius: 10, border: "1px solid #dbdbdb",
                    background: "#fff", fontSize: 13, fontWeight: 600, color: "#8e8e8e",
                    cursor: actionLoading === insight.id ? "not-allowed" : "pointer",
                  }}
                >
                  Ignorer
                </button>
              </div>
            </div>
          )}

          {/* Étape 2 : diff de prévisualisation + appliquer */}
          {previewResult && (
            <div>
              {isLoadingPreview && (
                <PreviewLoadingState countLabel={buildCountLabel()} mode="refresh" />
              )}
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0a0a0a", margin: "0 0 10px" }}>
                Changements qui seront appliqués au prompt
              </p>
              <PreviewDiffViewer lines={previewResult.diff} />
              <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onApply(insight.id, previewResult.prompt_proposed); }}
                  disabled={actionLoading === insight.id || isLoadingPreview}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 18px", borderRadius: 10, border: "none",
                    background: actionLoading === insight.id || isLoadingPreview ? "#e0e0e0" : "#16a34a",
                    color: actionLoading === insight.id || isLoadingPreview ? "#8e8e8e" : "#fff",
                    fontSize: 13, fontWeight: 700,
                    cursor: actionLoading === insight.id || isLoadingPreview ? "not-allowed" : "pointer",
                  }}
                >
                  {actionLoading === insight.id && <Loader2 size={13} className="animate-spin" />}
                  Appliquer ce prompt
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreviewResult(null); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 10, border: "1px solid #dbdbdb",
                    background: "#fff", fontSize: 13, fontWeight: 600, color: "#262626",
                    cursor: "pointer",
                  }}
                >
                  <ArrowLeft size={13} /> Modifier la sélection
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onIgnore(insight.id); }}
                  disabled={actionLoading === insight.id}
                  style={{
                    padding: "8px 18px", borderRadius: 10, border: "1px solid #dbdbdb",
                    background: "#fff", fontSize: 13, fontWeight: 600, color: "#8e8e8e",
                    cursor: actionLoading === insight.id ? "not-allowed" : "pointer",
                  }}
                >
                  Ignorer
                </button>
                {toast && (
                  <span style={{ fontSize: 12, color: "#16a34a", display: "flex", alignItems: "center" }}>
                    {toast}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Skeleton() {
  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 16, padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 12,
  };
  const line = (w: string, h = 12): React.CSSProperties => ({
    height: h, borderRadius: 6, background: "#f0f0f0", width: w, marginBottom: 8,
  });
  return (
    <>
      {[1, 2].map((k) => (
        <div key={k} style={card}>
          <div style={line("40%", 10)} />
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={line("15%", 20)} /><div style={line("25%", 20)} />
          </div>
          <div style={line("90%")} /><div style={line("70%")} /><div style={line("80%")} />
        </div>
      ))}
    </>
  );
}

export default function InsightsPage() {
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const { supabase } = await import("@/lib/supabase");
      const { data } = await supabase.auth.getUser();
      if (!data.user) window.location.href = "/login";
    }
    checkAuth();
  }, []);

  const fetchInsights = useCallback(async () => {
    try {
      const data = await apiFetch<Insight[]>("/insights");
      setInsights(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  async function handleAnalyse() {
    setAnalysing(true);
    try {
      await apiFetch("/feedback-loop", { method: "POST", body: JSON.stringify({}) });
      await fetchInsights();
    } catch {
      setError("L'analyse a échoué");
    } finally {
      setAnalysing(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleApply(id: string, promptProposed: string) {
    setActionLoading(id);
    try {
      await apiFetch("/apply-prompt", {
        method: "POST",
        body: JSON.stringify({ insight_id: id, prompt_proposed: promptProposed }),
      });
      await fetchInsights();
      showToast("Prompt appliqué !");
    } catch {
      showToast("Erreur lors de l'application");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleIgnore(id: string) {
    setActionLoading(id);
    try {
      await apiFetch(`/insights/${id}/ignore`, { method: "PATCH" });
      await fetchInsights();
      showToast("Rapport ignoré");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#fafafa" }}>
      <NavBar />
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a0a0a", margin: "0 0 4px" }}>Insights</h1>
              <p style={{ fontSize: 13, color: "#8e8e8e", margin: 0 }}>Analyses automatiques des conversations pour améliorer l'agent</p>
            </div>
            <button
              type="button"
              onClick={handleAnalyse}
              disabled={analysing}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 10, border: "none",
                background: analysing ? "#e0e0e0" : "#0095F6",
                color: analysing ? "#8e8e8e" : "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: analysing ? "not-allowed" : "pointer", flexShrink: 0,
              }}
            >
              {analysing
                ? <><Loader2 size={14} className="animate-spin" />Analyse en cours...</>
                : <><Zap size={14} />Lancer une analyse</>
              }
            </button>
          </div>

          {error && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fef2f2", color: "#dc2626", fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}

          {loading ? (
            <Skeleton />
          ) : insights.length === 0 ? (
            <div style={{
              background: "#fff", borderRadius: 16, padding: "48px 24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              textAlign: "center", color: "#8e8e8e", fontSize: 13,
            }}>
              <span style={{ fontSize: 36, display: "block", marginBottom: 12 }}>🔍</span>
              Aucune analyse pour l'instant.<br />
              Lance une analyse pour obtenir des insights sur tes conversations.
            </div>
          ) : (
            insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onApply={handleApply}
                onIgnore={handleIgnore}
                actionLoading={actionLoading}
                toast={toast}
              />
            ))
          )}

        </div>
      </div>
    </div>
  );
}

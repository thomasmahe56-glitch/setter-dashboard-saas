"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, Clock3, Copy, ExternalLink, Loader2, Send, Sparkles } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { api, ApiAuthError, FollowUpDue, FollowUpPreview, FollowUpScheduleConfig } from "@/lib/api";
import { getInstagramHandle } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type RelanceStage = FollowUpDue["stage"];

const STAGE_STORAGE_KEY = "angellos.relance.instructions.v1";
const SCHEDULE_STORAGE_KEY = "angellos.relance.schedule.v1";

const DEFAULT_STAGE_INSTRUCTIONS: Record<RelanceStage, string> = {
  auto_23h: "Relance courte, naturelle, sans pression. Rester dans la continuité du dernier échange. Une seule question maximum.",
  j3: "Relance contextuelle. Reprendre le dernier point mentionné par le prospect et rouvrir doucement la discussion.",
  j10: "Relance plus douce, orientée valeur. Ne pas forcer la vente. Proposer une aide ou une clarification.",
  j30: "Dernier check-in. Ton léger, pas insistant. Accepter que la conversation soit froide.",
};

const DEFAULT_STAGE_SCHEDULE: Record<RelanceStage, number> = {
  auto_23h: 23,
  j3: 3,
  j10: 10,
  j30: 30,
};

function stageTitle(stage: RelanceStage, schedule: Record<RelanceStage, number>): string {
  if (stage === "auto_23h") return `Auto ${schedule.auto_23h}h`;
  return `D+${schedule[stage]}`;
}

function stageDelayLabel(stage: RelanceStage, schedule: Record<RelanceStage, number>): string {
  if (stage === "auto_23h") return `${schedule.auto_23h} heures après le dernier message prospect`;
  return `${schedule[stage]} jours après le dernier message prospect`;
}

function numberRange(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

function RelanceSkeleton() {
  return (
    <div className="app-scroll-page">
      <div className="app-page-inner relance-inner">
        <div className="skeleton-shimmer" style={{ width: 180, height: 26, borderRadius: 8, marginBottom: 8 }} />
        <div className="skeleton-shimmer" style={{ width: 320, height: 12, borderRadius: 6, marginBottom: 20 }} />
        <div className="relance-step-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
          {[0, 1, 2].map((i) => <div key={i} className="skeleton-shimmer" style={{ height: 120, borderRadius: 16 }} />)}
        </div>
        <div className="skeleton-shimmer" style={{ height: 280, borderRadius: 16 }} />
      </div>
    </div>
  );
}

export default function RelancePage() {
  const { t } = useI18n();
  const [followUps, setFollowUps] = useState<FollowUpDue[]>([]);
  const [previews, setPreviews] = useState<Record<string, FollowUpPreview>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [sendLoading, setSendLoading] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<RelanceStage>("auto_23h");
  const [stageInstructions, setStageInstructions] = useState<Record<RelanceStage, string>>(DEFAULT_STAGE_INSTRUCTIONS);
  const [instructionsLoaded, setInstructionsLoaded] = useState(false);
  const [stageSchedule, setStageSchedule] = useState<Record<RelanceStage, number>>(DEFAULT_STAGE_SCHEDULE);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = "/login";
    });
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STAGE_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<Record<RelanceStage, string>>;
      setStageInstructions({ ...DEFAULT_STAGE_INSTRUCTIONS, ...parsed });
    } catch {
      setStageInstructions(DEFAULT_STAGE_INSTRUCTIONS);
    } finally {
      setInstructionsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!instructionsLoaded) return;
    window.localStorage.setItem(STAGE_STORAGE_KEY, JSON.stringify(stageInstructions));
  }, [instructionsLoaded, stageInstructions]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<Record<RelanceStage, number>>;
      setStageSchedule({ ...DEFAULT_STAGE_SCHEDULE, ...parsed });
    } catch {
      setStageSchedule(DEFAULT_STAGE_SCHEDULE);
    } finally {
      setScheduleLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!scheduleLoaded) return;
    window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(stageSchedule));
  }, [scheduleLoaded, stageSchedule]);

  const followUpScheduleConfig = useMemo<FollowUpScheduleConfig>(() => ({
    auto_hours: stageSchedule.auto_23h,
    manual1_days: stageSchedule.j3,
    manual2_days: stageSchedule.j10,
    manual3_days: stageSchedule.j30,
  }), [stageSchedule]);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getDueFollowUps(followUpScheduleConfig);
      setFollowUps(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "NO_SESSION") {
        await createClient().auth.signOut();
        window.location.href = "/login";
      } else if (e instanceof ApiAuthError) {
        setError(`Supabase connection OK, but the API rejected the token (${e.status}): ${e.detail}`);
      } else {
        setError("Connection error");
      }
    } finally {
      setLoading(false);
    }
  }, [followUpScheduleConfig]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handlePreview(item: FollowUpDue) {
    setPreviewLoading(item.conversation_id);
    try {
      const preview = await api.previewFollowUp(
        item.conversation_id,
        item.stage,
        stageInstructions[item.stage],
        stageDelayLabel(item.stage, stageSchedule),
      );
      setPreviews((prev) => ({ ...prev, [item.conversation_id]: preview }));
    } finally {
      setPreviewLoading(null);
    }
  }

  async function handleSendAuto23h(item: FollowUpDue) {
    setSendLoading(item.conversation_id);
    try {
      const result = await api.sendAuto23hFollowUp(
        item.conversation_id,
        followUpScheduleConfig,
        stageInstructions[item.stage],
        stageDelayLabel(item.stage, stageSchedule),
      );
      setPreviews((prev) => ({
        ...prev,
        [item.conversation_id]: {
          conversation_id: result.conversation_id,
          stage: result.stage,
          message: result.message,
          history_count: 0,
        },
      }));
      setSentIds((prev) => ({ ...prev, [item.conversation_id]: true }));
    } finally {
      setSendLoading(null);
    }
  }

  async function handleCopy(item: FollowUpDue) {
    const text = previews[item.conversation_id]?.message;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(item.conversation_id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  };

  const stepCards = useMemo(() => [
    { stage: "auto_23h" as const, label: t("relance.automatic", "Automatic"), color: "#1D9E75", icon: Send, mode: t("relance.auto23hMode", "Envoi automatique dans la fenêtre Meta") },
    { stage: "j3" as const, label: t("relance.assisted", "Assisted"), color: "#0095F6", icon: Sparkles, mode: t("relance.manualMode", "Préparation assistée, envoi manuel") },
    { stage: "j10" as const, label: t("relance.assisted", "Assisted"), color: "#8b5cf6", icon: Clock3, mode: t("relance.manualMode", "Préparation assistée, envoi manuel") },
    { stage: "j30" as const, label: t("relance.assisted", "Assisted"), color: "#d946ef", icon: Clock3, mode: t("relance.manualMode", "Préparation assistée, envoi manuel") },
  ], [t]);

  const selectedStageCard = stepCards.find((step) => step.stage === selectedStage) || stepCards[0];
  const filteredFollowUps = followUps.filter((item) => item.stage === selectedStage);
  const selectedCount = filteredFollowUps.length;
  const selectedStageTitle = stageTitle(selectedStage, stageSchedule);

  return (
    <div className="app-page">
      <NavBar lastRefresh={lastRefresh} onRefresh={refresh} />
      {loading ? (
        <RelanceSkeleton />
      ) : error ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontSize: 13 }}>{error}</div>
      ) : (
        <div className="app-scroll-page">
          <div className="app-page-inner relance-inner">
            <div className="app-page-heading" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
              <div>
                <h1 className="app-page-title" style={{ fontSize: 24, fontWeight: 800, color: "#0a0a0a", margin: "0 0 4px" }}>{t("relance.title", "Follow-ups")}</h1>
                <p style={{ fontSize: 13, color: "#8e8e8e", margin: 0 }}>
                  {t("relance.subtitle", "Planned sequence: automatic at 23h, then AI-assisted at D+3, D+10 and D+30.")}
                </p>
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 9999,
                background: "#f0fdf4", color: "#16a34a",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                {t("relance.compliance", "Meta compliant mode")}
              </div>
            </div>

            <div className="relance-step-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 16 }}>
              {stepCards.map(({ stage, label, color, icon: Icon, mode }) => {
                const isSelected = selectedStage === stage;
                const count = followUps.filter((item) => item.stage === stage).length;
                const title = stageTitle(stage, stageSchedule);
                const options = stage === "auto_23h"
                  ? numberRange(1, 23)
                  : stage === "j3"
                    ? numberRange(1, Math.max(1, stageSchedule.j10 - 1))
                    : stage === "j10"
                      ? numberRange(stageSchedule.j3 + 1, Math.max(stageSchedule.j3 + 1, stageSchedule.j30 - 1))
                      : numberRange(stageSchedule.j10 + 1, 60);
                return (
                <div key={stage} role="button" tabIndex={0} onClick={() => setSelectedStage(stage)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedStage(stage); }} aria-pressed={isSelected} style={{
                  ...card,
                  border: isSelected ? `2px solid ${color}` : "1px solid #f0f0f0",
                  boxShadow: isSelected ? `0 12px 30px ${color}22` : card.boxShadow,
                  textAlign: "left",
                  cursor: "pointer",
                  transform: isSelected ? "translateY(-1px)" : "none",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={17} color={color} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color, background: `${color}14`, padding: "3px 8px", borderRadius: 9999, height: 22 }}>
                      {label}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0a0a0a", margin: "0 0 8px" }}>{title}</h2>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12, fontWeight: 800, color }} onClick={(event) => event.stopPropagation()}>
                    {stage === "auto_23h" ? t("relance.delayHours", "Délai") : t("relance.delayDays", "Jour")}
                    <select
                      value={stageSchedule[stage]}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setStageSchedule((prev) => ({ ...prev, [stage]: value }));
                        setSelectedStage(stage);
                      }}
                      style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: "5px 8px", background: "#fff", color: "#262626", fontSize: 12, fontWeight: 800 }}
                    >
                      {options.map((value) => (
                        <option key={value} value={value}>{stage === "auto_23h" ? `${value} h` : `J+${value}`}</option>
                      ))}
                    </select>
                  </label>
                  <p style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.45, color, margin: "0 0 8px" }}>{count} {count > 1 ? t("relance.followUpPlural", "follow-ups") : t("relance.followUpSingular", "follow-up")}</p>
                  <p style={{ fontSize: 13, lineHeight: 1.45, color: "#8e8e8e", margin: 0 }}>{mode}</p>
                </div>
              );})}
            </div>

            <div style={{ ...card, marginBottom: 16, border: `1px solid ${selectedStageCard.color}22` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 900, color: selectedStageCard.color, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.4 }}>
                    {selectedStageTitle} sélectionné · {selectedCount} {selectedCount > 1 ? t("relance.followUpPlural", "relances") : t("relance.followUpSingular", "relance")} à traiter
                  </p>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0a0a0a", margin: 0 }}>{t("relance.aiInstructions", "Instructions IA")}</h2>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: selectedStageCard.color, background: `${selectedStageCard.color}14`, padding: "4px 10px", borderRadius: 9999, flexShrink: 0 }}>
                  {selectedStage === "auto_23h" ? t("relance.automatic", "Automatique") : t("relance.assisted", "Assisté")}
                </span>
              </div>
              <textarea
                value={stageInstructions[selectedStage]}
                onChange={(event) => setStageInstructions((prev) => ({ ...prev, [selectedStage]: event.target.value }))}
                aria-label={`Instructions IA ${selectedStageTitle}`}
                style={{
                  width: "100%",
                  minHeight: 92,
                  resize: "vertical",
                  border: "1px solid #e5e5e5",
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "#262626",
                  outline: "none",
                  background: "#fafafa",
                }}
              />
              <p style={{ fontSize: 12, color: "#8e8e8e", margin: "8px 0 0" }}>
                {t("relance.instructionsHelp", "Ces indications sont utilisées quand Angelos génère la relance de ce preset. Modifiables ici, conservées sur cet appareil.")}
              </p>
            </div>

            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0a0a0a", margin: "0 0 3px" }}>{t("relance.due", "Due follow-ups")} · {selectedStageTitle}</h2>
                  <p style={{ fontSize: 12, color: "#8e8e8e", margin: 0 }}>
                    {selectedStage === "auto_23h"
                      ? t("relance.auto23hListHelp", "Relances automatiques encore dans la fenêtre Meta de 24 h.")
                      : t("relance.manualListHelp", "Relances préparées par IA : le coach copie puis envoie manuellement.")}
                  </p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#8e8e8e", background: "#f5f5f5", padding: "4px 10px", borderRadius: 9999 }}>
                  {selectedCount} {selectedCount > 1 ? t("relance.followUpPlural", "follow-ups") : t("relance.followUpSingular", "follow-up")}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredFollowUps.length === 0 ? (
                  <div style={{ padding: "30px 12px", textAlign: "center", color: "#8e8e8e", fontSize: 13 }}>
                    {t("relance.emptyStage", `Aucune relance éligible en ${selectedStageTitle} pour l’instant.`)}
                  </div>
                ) : filteredFollowUps.map((item) => {
                  const handle = getInstagramHandle(item);
                  const name = handle || item.display_name || item.username || "?";
                  const preview = previews[item.conversation_id];
                  const isLoadingPreview = previewLoading === item.conversation_id;
                  const isSending = sendLoading === item.conversation_id;
                  const isSent = sentIds[item.conversation_id];
                  const isQueuedByWindow = Boolean(item.send_blocked_reason && item.queued_until);
                  return (
                    <div key={item.conversation_id} style={{ padding: "12px 0", borderTop: "1px solid #f0f0f0" }}>
                      <div className="relance-row" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Avatar name={name} size="sm" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: "#0a0a0a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                            <StatusBadge status={item.status} />
                            <span style={{
                              fontSize: 11, fontWeight: 800,
                              color: item.mode === "auto" ? "#16a34a" : "#2563eb",
                              background: item.mode === "auto" ? "#f0fdf4" : "#eff6ff",
                              padding: "2px 8px", borderRadius: 9999,
                            }}>
                              {stageTitle(item.stage, stageSchedule)}
                            </span>
                            {isSent && (
                              <span style={{
                                fontSize: 11, fontWeight: 800, color: "#16a34a",
                                background: "#f0fdf4", padding: "2px 8px", borderRadius: 9999,
                              }}>
                                {t("relance.sent", "Sent")}
                              </span>
                            )}
                            {isQueuedByWindow && (
                              <span style={{
                                fontSize: 11, fontWeight: 800, color: "#92400e",
                                background: "#fffbeb", padding: "2px 8px", borderRadius: 9999,
                              }}>
                                {t("relance.queuedWindow", "Queued for window")}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: "#8e8e8e", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.message || t("relance.noLastMessage", "No last message")} · {item.hours_since_user}{t("relance.hoursSince", "h since the last prospect message")}
                          </p>
                        </div>
                        <div className="relance-actions" style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          {item.stage === "auto_23h" ? (
                            <button type="button" onClick={() => handleSendAuto23h(item)} disabled={isSending || isSent || isQueuedByWindow} style={{
                              display: "flex", alignItems: "center", gap: 5,
                              padding: "7px 10px", borderRadius: 9, border: "1px solid #1D9E75",
                              background: isSent ? "#f0fdf4" : "#1D9E75", color: isSent ? "#16a34a" : "#fff",
                              fontSize: 12, fontWeight: 800,
                              cursor: isSending || isSent || isQueuedByWindow ? "not-allowed" : "pointer",
                              opacity: isSending ? 0.7 : 1,
                            }}>
                              {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                            {isQueuedByWindow ? t("relance.queued", "Queued") : isSent ? t("relance.sent", "Sent") : t("relance.sendH23", "Send H23")}
                            </button>
                          ) : (
                            <button type="button" onClick={() => handlePreview(item)} disabled={isLoadingPreview} style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "7px 10px", borderRadius: 9, border: "1px solid #e0e0e0",
                            background: "#fff", color: "#262626", fontSize: 12, fontWeight: 700,
                            cursor: isLoadingPreview ? "not-allowed" : "pointer", opacity: isLoadingPreview ? 0.6 : 1,
                          }}>
                            {isLoadingPreview ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                            {t("relance.generate", "Generate")}
                          </button>
                          )}
                          <button type="button" onClick={() => handleCopy(item)} disabled={!preview} style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "7px 10px", borderRadius: 9, border: "1px solid #e0e0e0",
                            background: "#fff", color: preview ? "#262626" : "#c0c0c0", fontSize: 12, fontWeight: 700,
                            cursor: preview ? "pointer" : "not-allowed",
                          }}>
                            {copiedId === item.conversation_id ? <Check size={13} /> : <Copy size={13} />}
                            {copiedId === item.conversation_id ? t("relance.copied", "Copied") : t("relance.copy", "Copy")}
                          </button>
                          {handle && (
                            <a href={`https://instagram.com/${handle}`} target="_blank" rel="noreferrer" style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: 34, height: 34, borderRadius: 9, color: "#8e8e8e",
                            }}>
                              <ExternalLink size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                      {preview && (
                        <div className="relance-preview" style={{
                          margin: "10px 0 0 48px", padding: "10px 12px",
                          borderRadius: 12, background: "#f5f5f5",
                          fontSize: 13, lineHeight: 1.5, color: "#262626",
                        }}>
                          {preview.message}
                        </div>
                      )}
                      {isQueuedByWindow && (
                        <p style={{ margin: "8px 0 0 48px", fontSize: 12, color: "#92400e" }}>
                          {t("relance.queuedHelp", "Eligible outside sending hours. Angellos will wait for the next allowed window.")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ ...card }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0a0a0a", margin: "0 0 8px" }}>{t("relance.sendingRule", "Sending rule")}</h2>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: "#8e8e8e", margin: 0 }}>
                {t("relance.sendingRuleBody", "Auto only before 24h. After that, the AI prepares the message and the coach sends it manually from Instagram or ManyChat Inbox.")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

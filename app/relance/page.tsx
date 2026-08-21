"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, Clock3, Copy, ExternalLink, Loader2, Send, Sparkles } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { api, ApiAuthError, FollowUpDue, FollowUpPreview } from "@/lib/api";
import { getInstagramHandle } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

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

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = "/login";
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getDueFollowUps();
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
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handlePreview(item: FollowUpDue) {
    setPreviewLoading(item.conversation_id);
    try {
      const preview = await api.previewFollowUp(item.conversation_id, item.stage);
      setPreviews((prev) => ({ ...prev, [item.conversation_id]: preview }));
    } finally {
      setPreviewLoading(null);
    }
  }

  async function handleSendAuto23h(item: FollowUpDue) {
    setSendLoading(item.conversation_id);
    try {
      const result = await api.sendAuto23hFollowUp(item.conversation_id);
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

  const stepCards = [
    { title: "Auto 23h", label: t("relance.automatic", "Automatic"), color: "#1D9E75", icon: Send, body: t("relance.auto23hBody", "Short follow-up before the Instagram/ManyChat window closes.") },
    { title: "D+3", label: t("relance.assisted", "Assisted"), color: "#0095F6", icon: Sparkles, body: t("relance.d3Body", "The AI prepares a contextual follow-up to send manually.") },
    { title: "D+10", label: t("relance.assisted", "Assisted"), color: "#8b5cf6", icon: Clock3, body: t("relance.d10Body", "Gentle follow-up, more open door than sales pressure.") },
    { title: "D+30", label: t("relance.assisted", "Assisted"), color: "#d946ef", icon: Clock3, body: t("relance.d30Body", "Final check-in for cold conversations, one last touch.") },
  ];

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
              {stepCards.map(({ title, label, color, icon: Icon, body }) => (
                <div key={title} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={17} color={color} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color, background: `${color}14`, padding: "3px 8px", borderRadius: 9999, height: 22 }}>
                      {label}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0a0a0a", margin: "0 0 6px" }}>{title}</h2>
                  <p style={{ fontSize: 13, lineHeight: 1.45, color: "#8e8e8e", margin: 0 }}>{body}</p>
                </div>
              ))}
            </div>

            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0a0a0a", margin: "0 0 3px" }}>{t("relance.due", "Due follow-ups")}</h2>
                  <p style={{ fontSize: 12, color: "#8e8e8e", margin: 0 }}>
                    {t("relance.dueHelp", "Calculated from message history. Older conversations without timestamps use their creation date.")}
                  </p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#8e8e8e", background: "#f5f5f5", padding: "4px 10px", borderRadius: 9999 }}>
                  {followUps.length} {followUps.length > 1 ? t("relance.followUpPlural", "follow-ups") : t("relance.followUpSingular", "follow-up")}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {followUps.length === 0 ? (
                  <div style={{ padding: "30px 12px", textAlign: "center", color: "#8e8e8e", fontSize: 13 }}>
                    {t("relance.empty", "No follow-ups due right now.")}
                  </div>
                ) : followUps.map((item) => {
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
                              {item.stage_label}
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

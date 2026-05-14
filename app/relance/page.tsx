"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock3, Copy, ExternalLink, Loader2, Send, Sparkles } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { api, FollowUpDue, FollowUpPreview } from "@/lib/api";
import { getInstagramHandle } from "@/lib/utils";

function RelanceSkeleton() {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div className="skeleton-shimmer" style={{ width: 180, height: 26, borderRadius: 8, marginBottom: 8 }} />
        <div className="skeleton-shimmer" style={{ width: 320, height: 12, borderRadius: 6, marginBottom: 20 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
          {[0, 1, 2].map((i) => <div key={i} className="skeleton-shimmer" style={{ height: 120, borderRadius: 16 }} />)}
        </div>
        <div className="skeleton-shimmer" style={{ height: 280, borderRadius: 16 }} />
      </div>
    </div>
  );
}

export default function RelancePage() {
  const router = useRouter();
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
    if (!localStorage.getItem("dashboard_secret")) router.replace("/login");
  }, [router]);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getDueFollowUps();
      setFollowUps(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") {
        localStorage.removeItem("dashboard_secret");
        window.location.href = "/login";
      } else {
        setError("Erreur de connexion");
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
    { title: "Auto 23 h", label: "Automatique", color: "#1D9E75", icon: Send, body: "Relance courte avant la fermeture de la fenêtre Instagram/ManyChat." },
    { title: "J+3", label: "Assistée", color: "#0095F6", icon: Sparkles, body: "L'IA prépare une relance contextuelle à envoyer manuellement." },
    { title: "J+10", label: "Assistée", color: "#8b5cf6", icon: Clock3, body: "Dernière relance douce, plutôt porte ouverte que pression commerciale." },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#fafafa" }}>
      <NavBar lastRefresh={lastRefresh} onRefresh={refresh} />
      {loading ? (
        <RelanceSkeleton />
      ) : error ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontSize: 13 }}>{error}</div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px" }}>
          <div style={{ maxWidth: 980, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a0a0a", margin: "0 0 4px" }}>Relance</h1>
                <p style={{ fontSize: 13, color: "#8e8e8e", margin: 0 }}>
                  Séquence prévue : automatique à 23 h, puis assistée par l'IA à J+3 et J+10.
                </p>
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 9999,
                background: "#f0fdf4", color: "#16a34a",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                Mode conforme Meta
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 16 }}>
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
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0a0a0a", margin: "0 0 3px" }}>Relances dues</h2>
                  <p style={{ fontSize: 12, color: "#8e8e8e", margin: 0 }}>
                    Calculées depuis l'historique des messages. Les anciennes conversations sans timestamp utilisent leur date de création.
                  </p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#8e8e8e", background: "#f5f5f5", padding: "4px 10px", borderRadius: 9999 }}>
                  {followUps.length} relance{followUps.length > 1 ? "s" : ""}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {followUps.length === 0 ? (
                  <div style={{ padding: "30px 12px", textAlign: "center", color: "#8e8e8e", fontSize: 13 }}>
                    Aucune relance due pour le moment.
                  </div>
                ) : followUps.map((item) => {
                  const handle = getInstagramHandle(item);
                  const name = handle || item.display_name || item.username || "?";
                  const preview = previews[item.conversation_id];
                  const isLoadingPreview = previewLoading === item.conversation_id;
                  const isSending = sendLoading === item.conversation_id;
                  const isSent = sentIds[item.conversation_id];
                  return (
                    <div key={item.conversation_id} style={{ padding: "12px 0", borderTop: "1px solid #f0f0f0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                                Envoyée
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: "#8e8e8e", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.message || "Aucun dernier message"} · {item.hours_since_user} h depuis le dernier message prospect
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          {item.stage === "auto_23h" ? (
                            <button type="button" onClick={() => handleSendAuto23h(item)} disabled={isSending || isSent} style={{
                              display: "flex", alignItems: "center", gap: 5,
                              padding: "7px 10px", borderRadius: 9, border: "1px solid #1D9E75",
                              background: isSent ? "#f0fdf4" : "#1D9E75", color: isSent ? "#16a34a" : "#fff",
                              fontSize: 12, fontWeight: 800,
                              cursor: isSending || isSent ? "not-allowed" : "pointer",
                              opacity: isSending ? 0.7 : 1,
                            }}>
                              {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                              {isSent ? "Envoyée" : "Envoyer H23"}
                            </button>
                          ) : (
                            <button type="button" onClick={() => handlePreview(item)} disabled={isLoadingPreview} style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "7px 10px", borderRadius: 9, border: "1px solid #e0e0e0",
                            background: "#fff", color: "#262626", fontSize: 12, fontWeight: 700,
                            cursor: isLoadingPreview ? "not-allowed" : "pointer", opacity: isLoadingPreview ? 0.6 : 1,
                          }}>
                            {isLoadingPreview ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                            Générer
                          </button>
                          )}
                          <button type="button" onClick={() => handleCopy(item)} disabled={!preview} style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "7px 10px", borderRadius: 9, border: "1px solid #e0e0e0",
                            background: "#fff", color: preview ? "#262626" : "#c0c0c0", fontSize: 12, fontWeight: 700,
                            cursor: preview ? "pointer" : "not-allowed",
                          }}>
                            {copiedId === item.conversation_id ? <Check size={13} /> : <Copy size={13} />}
                            {copiedId === item.conversation_id ? "Copié" : "Copier"}
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
                        <div style={{
                          margin: "10px 0 0 48px", padding: "10px 12px",
                          borderRadius: 12, background: "#f5f5f5",
                          fontSize: 13, lineHeight: 1.5, color: "#262626",
                        }}>
                          {preview.message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ ...card }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0a0a0a", margin: "0 0 8px" }}>Règle d'envoi</h2>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: "#8e8e8e", margin: 0 }}>
                Auto uniquement avant 24 h. Après, l'IA prépare le message et le coach l'envoie manuellement depuis Instagram ou ManyChat Inbox.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

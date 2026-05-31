"use client";
import { useState } from "react";
import { ExternalLink, Trash2, ChevronDown, ArrowLeft, Zap, Sparkles, Loader2, Copy, Check } from "lucide-react";
import { ConversationSummary, Status, api } from "@/lib/api";
import { getContactLabel, getContactUrl, getConversationChannel, STATUS_LABELS } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { ChannelBadge } from "./ChannelBadge";
import { StatusBadge } from "./StatusBadge";

const STATUSES: Status[] = ["nouveau","en_cours","page_envoyee","appel_booke","signe"];

interface Props {
  conversation: ConversationSummary;
  loadingDetails?: boolean;
  detailError?: string | null;
  onBack?: () => void;
  onUpdate: (id: string, changes: Partial<ConversationSummary>) => void;
  onDelete: (id: string) => void;
}

function MessageSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[0, 1, 2, 3].map((i) => {
        const right = i % 2 === 1;
        return (
          <div key={i} style={{ display: "flex", justifyContent: right ? "flex-end" : "flex-start" }}>
            <div
              className="skeleton-shimmer"
              style={{
                width: right ? "54%" : "44%",
                height: 34,
                borderRadius: right ? "24px 24px 6px 24px" : "24px 24px 24px 6px",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function ConversationPanel({ conversation: c, loadingDetails = false, detailError = null, onBack, onUpdate, onDelete }: Props) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modeChanging, setModeChanging] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  const history = Array.isArray(c.history) ? c.history : [];
  const name = c.display_name || c.username || "?";
  const channel = getConversationChannel(c);
  const contactLabel = getContactLabel(c);
  const profileUrl = getContactUrl(c, "profile");
  const messageUrl = getContactUrl(c, "message");
  const channelName = channel === "whatsapp" ? "WhatsApp" : "Instagram";

  async function handleStatus(status: Status) {
    setStatusOpen(false);
    const prev = c.status;
    onUpdate(c.id, { status });
    try { await api.updateStatus(c.id, status); } catch { onUpdate(c.id, { status: prev }); }
  }

  async function handleActivate() {
    setActivating(true);
    onUpdate(c.id, { agent_active: true });
    try { await api.activate(c.id); } catch { onUpdate(c.id, { agent_active: false }); }
    setActivating(false);
  }

  async function handleDeactivate() {
    setActivating(true);
    onUpdate(c.id, { agent_active: false });
    try { await api.deactivate(c.id); } catch { onUpdate(c.id, { agent_active: true }); }
    setActivating(false);
  }

  async function handleDelete() {
    if (!confirm(`Supprimer ${name} ?`)) return;
    try { await api.delete(c.id); onDelete(c.id); } catch {}
  }

  async function handleModeChange(mode: "auto" | "supervised" | "disabled") {
    setModeChanging(true);
    const prev = c.automation_mode;
    onUpdate(c.id, { automation_mode: mode });
    try { await api.updateAutomationMode(c.id, mode); } catch { onUpdate(c.id, { automation_mode: prev }); }
    setModeChanging(false);
  }

  async function handleIgnorePending() {
    const prevMsg = c.pending_message;
    const prevAt = c.pending_message_at;
    onUpdate(c.id, { pending_message: null, pending_message_at: null });
    try { await api.ignorePending(c.id); } catch { onUpdate(c.id, { pending_message: prevMsg, pending_message_at: prevAt }); }
  }

  async function handleCopyPending() {
    if (!c.pending_message) return;
    await navigator.clipboard.writeText(c.pending_message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRefine() {
    if (!refineInstruction.trim() || !c.pending_message) return;
    setRefining(true);
    setRefineError(null);
    try {
      const result = await api.refineMessage(c.id, refineInstruction.trim(), c.pending_message);
      onUpdate(c.id, { pending_message: result.refined_message });
      setRefineInstruction("");
      setRefineOpen(false);
    } catch {
      setRefineError("Angellos n'a pas pu affiner le message. Réessaie.");
    }
    setRefining(false);
  }

  return (
    <div className="conversation-panel" style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      {/* Header */}
      <div className="conversation-header" style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 24px", borderBottom: "1px solid #f0f0f0",
        background: "#fff", flexShrink: 0,
      }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: "50%", color: "#8e8e8e" }}>
            <ArrowLeft size={18} />
          </button>
        )}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Avatar name={name} size="sm" />
          <span style={{ position: "absolute", right: -5, bottom: -5 }}>
            <ChannelBadge conversation={c} size="sm" />
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#0a0a0a" }}>{name}</span>
            <StatusBadge status={c.status} />
          </div>
          <p style={{ fontSize: 12, color: "#8e8e8e", margin: 0 }}>
            {contactLabel}
          </p>
        </div>

        {/* Actions */}
        <div className="conversation-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Status dropdown */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setStatusOpen(!statusOpen)} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "6px 12px", borderRadius: 9999,
              border: "1px solid #e0e0e0", background: "#fff",
              fontSize: 12, fontWeight: 500, color: "#262626", cursor: "pointer",
            }}>
              {STATUS_LABELS[c.status]}
              <ChevronDown size={12} color="#8e8e8e" />
            </button>
            {statusOpen && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 4px)",
                width: 168, background: "#fff", border: "1px solid #f0f0f0",
                borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                zIndex: 100, overflow: "hidden", padding: "4px 0",
              }}>
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => handleStatus(s)} style={{
                    width: "100%", textAlign: "left", padding: "9px 16px",
                    background: "transparent",
                    border: "none", fontSize: 13,
                    fontWeight: c.status === s ? 700 : 400,
                    color: c.status === s ? "#0095F6" : "#262626",
                    cursor: "pointer",
                  }}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Channel profile */}
          {profileUrl && (
            <a href={profileUrl} target="_blank" rel="noreferrer"
              style={{ padding: 8, borderRadius: "50%", color: "#8e8e8e", display: "flex" }}>
              <ExternalLink size={18} />
            </a>
          )}

          {/* Activate */}
          {!c.agent_active ? (
            <button onClick={handleActivate} disabled={activating} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: 9999,
              background: "#0095F6", color: "#fff", border: "none",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              opacity: activating ? 0.6 : 1,
            }}>
              <Zap size={14} />
              {activating ? "..." : "Activer"}
            </button>
          ) : (
            <button onClick={handleDeactivate} disabled={activating} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 9999,
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              fontSize: 12, fontWeight: 600, color: "#16a34a",
              cursor: activating ? "not-allowed" : "pointer",
              opacity: activating ? 0.6 : 1,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              {activating ? "..." : "Désactiver"}
            </button>
          )}

          {/* Delete */}
          <button onClick={handleDelete} style={{
            padding: 8, borderRadius: "50%", border: "none",
            background: "transparent", cursor: "pointer", color: "#8e8e8e",
            display: "flex",
          }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="conversation-mode" style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 24px", borderBottom: "1px solid #f5f5f5",
        background: "#fafafa", flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: "#8e8e8e", fontWeight: 500, marginRight: 2 }}>Mode :</span>
        {(["auto", "supervised", "disabled"] as const).map((mode) => {
          const isActive = (c.automation_mode ?? "supervised") === mode;
          const col = {
            auto: { activeBg: "#16a34a", activeColor: "#fff", idleBg: "#f0fdf4", idleColor: "#16a34a" },
            supervised: { activeBg: "#d97706", activeColor: "#fff", idleBg: "#fffbeb", idleColor: "#d97706" },
            disabled: { activeBg: "#6b7280", activeColor: "#fff", idleBg: "#f5f5f5", idleColor: "#6b7280" },
          }[mode];
          const label = { auto: "Auto", supervised: "Supervisé", disabled: "Off" }[mode];
          return (
            <button key={mode} onClick={() => handleModeChange(mode)} disabled={modeChanging} style={{
              padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, border: "none",
              background: isActive ? col.activeBg : col.idleBg,
              color: isActive ? col.activeColor : col.idleColor,
              cursor: modeChanging ? "not-allowed" : "pointer",
              opacity: modeChanging ? 0.6 : 1,
              transition: "all 0.15s",
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Agent banner */}
      {c.agent_active && (
        <div className="agent-active-banner" style={{
          display: "flex", alignItems: "center", gap: 8,
          margin: "16px 24px 0",
          padding: "8px 12px", borderRadius: 16,
          background: "rgba(0,0,0,0.04)",
          fontSize: 12, fontWeight: 500, color: "#8e8e8e", flexShrink: 0,
        }}>
          <Sparkles size={14} color="#0095F6" />
          Agent IA actif — réponses automatiques en cours
        </div>
      )}

      {/* Pending message banner */}
      {c.pending_message && (
        <div className="pending-message-banner" style={{
          margin: "12px 24px 0", padding: "12px 16px", borderRadius: 16,
          background: "#fffbeb", border: "1px solid #fde68a", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Message en attente
            </span>
            <button onClick={handleIgnorePending} style={{ fontSize: 11, color: "#8e8e8e", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              Ignorer
            </button>
          </div>
          <p style={{ fontSize: 13, color: "#0a0a0a", margin: "0 0 10px", lineHeight: 1.5 }}>
            {c.pending_message}
          </p>
          <div className="pending-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleCopyPending}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 9999,
                background: copied ? "#f0fdf4" : "#0095F6",
                border: copied ? "1px solid #bbf7d0" : "none",
                color: copied ? "#16a34a" : "#fff",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copié !" : "Copier"}
            </button>
            {messageUrl && (
              <a
                href={messageUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 9999,
                  background: channel === "whatsapp" ? "#25D366" : "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                  color: "#fff", fontSize: 12, fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <ExternalLink size={13} />
                Ouvrir {channelName}
              </a>
            )}
            <button
              type="button"
              onClick={() => { setRefineOpen(!refineOpen); setRefineError(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 9999,
                background: refineOpen ? "#f5f3ff" : "transparent",
                border: `1px solid ${refineOpen ? "#a78bfa" : "#e0e0e0"}`,
                color: refineOpen ? "#7c3aed" : "#8e8e8e",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}
            >
              ✨ Demander à Angellos d&apos;affiner
            </button>
            <button
              type="button"
              onClick={handleIgnorePending}
              style={{
                padding: "6px 14px", borderRadius: 9999,
                background: "transparent", border: "1px solid #e0e0e0",
                color: "#8e8e8e", fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}
            >
              Ignorer
            </button>
          </div>

          {refineOpen && (
            <div style={{ marginTop: 10 }}>
              <textarea
                value={refineInstruction}
                onChange={(e) => setRefineInstruction(e.target.value)}
                placeholder='Ex : "Rends-le plus chaleureux", "Il a mentionné une blessure, intègre ça", "Trop long, raccourcis"'
                rows={2}
                style={{
                  width: "100%", padding: "8px 12px",
                  borderRadius: 10, border: "1px solid #e0e0e0",
                  fontSize: 12, lineHeight: 1.5, resize: "none",
                  outline: "none", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
              {refineError && (
                <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>
                  {refineError}
                </div>
              )}
              <button
                type="button"
                onClick={handleRefine}
                disabled={refining || !refineInstruction.trim()}
                style={{
                  marginTop: 8,
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 16px", borderRadius: 9999,
                  background: refining || !refineInstruction.trim() ? "#e0e0e0" : "#7c3aed",
                  border: "none", color: "#fff",
                  fontSize: 12, fontWeight: 600,
                  cursor: refining || !refineInstruction.trim() ? "not-allowed" : "pointer",
                }}
              >
                {refining ? <Loader2 size={13} className="animate-spin" /> : "✨"}
                {refining ? "Angellos affine..." : "Affiner le message"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="conversation-messages" style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
        {loadingDetails ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8e8e8e", fontSize: 12 }}>
              <Loader2 className="animate-spin" size={14} color="#0095F6" />
              Chargement de la conversation
            </div>
            <MessageSkeleton />
          </div>
        ) : detailError ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontSize: 13 }}>
            {detailError}
          </div>
        ) : history.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8e8e8e", fontSize: 13 }}>
            Aucun historique
          </div>
        ) : history.map((msg, i) => {
          const isAgent = msg.role === "assistant";
          const prev = history[i - 1];
          const showLabel = !prev || prev.role !== msg.role;
          return (
            <div key={i} style={{ display: "flex", justifyContent: isAgent ? "flex-end" : "flex-start" }}>
              <div className="message-bubble-wrap" style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: "70%" }}>
                {showLabel && (
                  <span style={{
                    fontSize: 10, color: "#8e8e8e",
                    textAlign: isAgent ? "right" : "left",
                    margin: `${i > 0 ? "6px" : "0"} 4px 0`,
                  }}>
                    {isAgent ? "Agent IA" : contactLabel}
                  </span>
                )}
                <div style={{
                  padding: "8px 16px",
                  borderRadius: isAgent ? "24px 24px 6px 24px" : "24px 24px 24px 6px",
                  background: isAgent ? "#0095F6" : "#f0f0f0",
                  color: isAgent ? "#fff" : "#0a0a0a",
                  fontSize: 13, lineHeight: 1.5,
                  transition: "opacity 150ms, transform 150ms",
                  animation: "fadeIn 150ms ease-out",
                }}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="conversation-footer" style={{
        padding: "8px 24px", borderTop: "1px solid #f0f0f0",
        display: "flex", justifyContent: "space-between",
        fontSize: 11, color: "#8e8e8e", flexShrink: 0,
      }}>
        <span>{history.length} messages · ID {c.subscriber_id || c.id.slice(0, 8)}</span>
        {profileUrl && (
          <a href={profileUrl} target="_blank" rel="noreferrer"
            style={{ color: "#8e8e8e", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            <ExternalLink size={12} /> {channelName}
          </a>
        )}
      </div>
    </div>
  );
}

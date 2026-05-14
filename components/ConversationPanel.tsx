"use client";
import { useState } from "react";
import { ExternalLink, Trash2, ChevronDown, ArrowLeft, Zap, Sparkles, Loader2 } from "lucide-react";
import { ConversationSummary, Status, api } from "@/lib/api";
import { getInstagramHandle, STATUS_LABELS } from "@/lib/utils";
import { Avatar } from "./Avatar";
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

  const history = Array.isArray(c.history) ? c.history : [];
  const name = c.display_name || c.username || "?";
  const instagramHandle = getInstagramHandle(c);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 24px", borderBottom: "1px solid #f0f0f0",
        background: "#fff", flexShrink: 0,
      }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: "50%", color: "#8e8e8e" }}>
            <ArrowLeft size={18} />
          </button>
        )}
        <Avatar name={name} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#0a0a0a" }}>{name}</span>
            <StatusBadge status={c.status} />
          </div>
          <p style={{ fontSize: 12, color: "#8e8e8e", margin: 0 }}>
            {instagramHandle ? `@${instagramHandle}` : c.username}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
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

          {/* Instagram */}
          {instagramHandle && (
            <a href={`https://instagram.com/${instagramHandle}`} target="_blank" rel="noreferrer"
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

      {/* Agent banner */}
      {c.agent_active && (
        <div style={{
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

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: "70%" }}>
                {showLabel && (
                  <span style={{
                    fontSize: 10, color: "#8e8e8e",
                    textAlign: isAgent ? "right" : "left",
                    margin: `${i > 0 ? "6px" : "0"} 4px 0`,
                  }}>
                    {isAgent ? "Agent IA" : instagramHandle ? `@${instagramHandle}` : `@${c.username}`}
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
      <div style={{
        padding: "8px 24px", borderTop: "1px solid #f0f0f0",
        display: "flex", justifyContent: "space-between",
        fontSize: 11, color: "#8e8e8e", flexShrink: 0,
      }}>
        <span>{history.length} messages · ID {c.subscriber_id || c.id.slice(0, 8)}</span>
        {instagramHandle && (
          <a href={`https://instagram.com/${instagramHandle}`} target="_blank" rel="noreferrer"
            style={{ color: "#8e8e8e", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            <ExternalLink size={12} /> Instagram
          </a>
        )}
      </div>
    </div>
  );
}

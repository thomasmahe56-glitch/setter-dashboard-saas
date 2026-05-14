"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { ConversationSummary, Status } from "@/lib/api";
import { STATUS_LABELS, timeAgo } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { StatusBadge } from "./StatusBadge";

const ALL: (Status | "all")[] = ["all","nouveau","en_cours","page_envoyee","appel_booke","signe"];

interface Props {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ProspectList({ conversations, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");

  const filtered = conversations.filter((c) => {
    const okStatus = filter === "all" || c.status === filter;
    const term = search.toLowerCase();
    const okSearch = !term ||
      c.display_name?.toLowerCase().includes(term) ||
      c.username?.toLowerCase().includes(term) ||
      c.message?.toLowerCase().includes(term);
    return okStatus && okSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px" }}>
        <h2 style={{ fontWeight: 700, fontSize: 16, color: "#0a0a0a", margin: 0 }}>Messages</h2>
        <p style={{ fontSize: 12, color: "#8e8e8e", margin: "2px 0 0" }}>
          {conversations.length} prospect{conversations.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Search */}
      <div style={{ padding: "0 12px 8px", position: "relative" }}>
        <Search size={14} style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", color: "#8e8e8e", pointerEvents: "none" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher"
          style={{
            width: "100%", background: "#f5f5f5", border: "none", borderRadius: 9999,
            padding: "8px 12px 8px 34px", fontSize: 13, color: "#0a0a0a",
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, padding: "0 12px 10px", overflowX: "auto", scrollbarWidth: "none" }}>
        {ALL.map((s) => {
          const active = filter === s;
          return (
            <button key={s} onClick={() => setFilter(s)} style={{
              flexShrink: 0, padding: "4px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
              border: "none",
              background: active ? "#0a0a0a" : "#f0f0f0",
              color: active ? "#fff" : "#8e8e8e",
              cursor: "pointer", transition: "background 0.15s, color 0.15s",
            }}>
              {s === "all" ? "Tous" : STATUS_LABELS[s as Status]}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 12px" }}>
        {filtered.map((c) => {
          const name = c.display_name || c.username || "?";
          const selected = selectedId === c.id;
          return (
            <button key={c.id} onClick={() => onSelect(c.id)} style={{
              width: "100%", textAlign: "left", padding: "10px 12px",
              display: "flex", gap: 12, alignItems: "flex-start",
              background: selected ? "#f5f5f5" : "transparent",
              border: "none", borderRadius: 16,
              cursor: "pointer", transition: "background 0.15s",
            }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Avatar name={name} size="md" />
                {c.agent_active && (
                  <span style={{
                    position: "absolute", top: -1, right: -1,
                    width: 12, height: 12, borderRadius: "50%",
                    background: "#0095F6", border: "2px solid #fff",
                  }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0a0a0a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {name}
                  </span>
                  <span style={{ fontSize: 11, color: "#8e8e8e", flexShrink: 0, marginLeft: 8 }}>
                    {timeAgo(c.created_at)}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#8e8e8e", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.message || "Aucun message"}
                </p>
                <StatusBadge status={c.status} />
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "#8e8e8e", fontSize: 13 }}>
            Aucun prospect
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useConversations } from "@/hooks/useConversations";
import { api, Conversation, ConversationSummary } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { ProspectList } from "@/components/ProspectList";
import { ConversationPanel } from "@/components/ConversationPanel";
import { useI18n } from "@/lib/i18n";

function CRMInitialSkeleton() {
  return (
    <div className="crm-page-body">
      <div className="crm-card">
        <div className="crm-sidebar-skeleton">
          <div className="skeleton-shimmer" style={{ width: 110, height: 18, borderRadius: 6, marginBottom: 20 }} />
          <div className="skeleton-shimmer" style={{ width: "100%", height: 34, borderRadius: 9999, marginBottom: 18 }} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 18 }}>
              <div className="skeleton-shimmer" style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-shimmer" style={{ width: `${72 - i * 5}%`, height: 12, borderRadius: 6, marginBottom: 8 }} />
                <div className="skeleton-shimmer" style={{ width: "92%", height: 10, borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: 24 }}>
          <div className="skeleton-shimmer" style={{ width: 220, height: 18, borderRadius: 6, marginBottom: 24 }} />
          <div className="skeleton-shimmer" style={{ width: "50%", height: 34, borderRadius: 18, marginBottom: 12 }} />
          <div className="skeleton-shimmer" style={{ width: "62%", height: 34, borderRadius: 18, marginLeft: "auto", marginBottom: 12 }} />
          <div className="skeleton-shimmer" style={{ width: "46%", height: 34, borderRadius: 18 }} />
        </div>
      </div>
    </div>
  );
}

export default function CRMPage() {
  const { t } = useI18n();
  const { conversations, setConversations, loading, error, lastRefresh, refresh } = useConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Conversation | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState(false);


  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = "/login";
    });
  }, []);


  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    setSelectedDetail(null);
    setDetailLoading(true);
    setDetailError(null);

    api.getConversation(selectedId)
      .then((data) => {
        if (!cancelled) setSelectedDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetailError(t("crm.loadConversationError", "Unable to load conversation"));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedId, t]);

  const selectedSummary = conversations.find((c) => c.id === selectedId) || null;
  const selected = selectedDetail || selectedSummary;

  function handleSelect(id: string) { setSelectedId(id); setMobilePanel(true); }
  function handleUpdate(id: string, changes: Partial<ConversationSummary>) {
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, ...changes } : c));
    setSelectedDetail((prev) => prev && prev.id === id ? { ...prev, ...changes } : prev);
  }
  function handleDelete(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setSelectedDetail(null); setSelectedId(null); setMobilePanel(false);
  }


  return (
    <div className="crm-page">
      <NavBar lastRefresh={lastRefresh} onRefresh={refresh} />
      {loading ? (
        <CRMInitialSkeleton />
      ) : error ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontSize: 13 }}>{error}</div>
      ) : (
        <div className="crm-page-body">
          <div className="crm-card">
            {/* Sidebar - always visible on desktop, hidden on mobile when panel is open */}
            <div className={`crm-sidebar ${mobilePanel ? "crm-mobile-hidden" : ""}`}>
              <ProspectList conversations={conversations} selectedId={selectedId} onSelect={handleSelect} />
            </div>

            {/* Right panel - always visible on desktop */}
            <div className={`crm-detail ${!mobilePanel && !selected ? "" : ""} ${mobilePanel ? "crm-mobile-visible" : "crm-mobile-detail-idle"}`}>
              {selected ? (
                <ConversationPanel
                  conversation={selected}
                  loadingDetails={detailLoading}
                  detailError={detailError}
                  onBack={mobilePanel ? () => setMobilePanel(false) : undefined}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#8e8e8e", fontSize: 13, gap: 8 }}>
                  <span style={{ fontSize: 32 }}>💬</span>
                  {t("crm.selectProspect", "Select a prospect to view the conversation")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, MessageCircle, Send, Phone, Award, TrendingUp } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import { NavBar } from "@/components/NavBar";
import { api, type BetaAiCostStatus, Status } from "@/lib/api";
import { getInstagramHandle, STATUS_LABELS, STATUS_BAR_COLOR, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { useI18n } from "@/lib/i18n";

const FUNNEL: { status: Status; icon: React.ElementType }[] = [
  { status: "nouveau", icon: Users },
  { status: "en_cours", icon: MessageCircle },
  { status: "page_envoyee", icon: Send },
  { status: "appel_booke", icon: Phone },
  { status: "signe", icon: Award },
];

function KPISkeleton() {
  return (
    <div className="app-scroll-page">
      <div className="app-page-inner kpi-inner">
        <div className="skeleton-shimmer" style={{ width: 170, height: 24, borderRadius: 6, marginBottom: 8 }} />
        <div className="skeleton-shimmer" style={{ width: 230, height: 12, borderRadius: 6, marginBottom: 20 }} />
        <div className="kpi-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div className="skeleton-shimmer" style={{ width: 32, height: 32, borderRadius: 8, marginBottom: 16 }} />
              <div className="skeleton-shimmer" style={{ width: 54, height: 28, borderRadius: 6, marginBottom: 8 }} />
              <div className="skeleton-shimmer" style={{ width: 92, height: 12, borderRadius: 6 }} />
            </div>
          ))}
        </div>
        <div className="skeleton-shimmer" style={{ width: "100%", height: 240, borderRadius: 16 }} />
      </div>
    </div>
  );
}

export default function KPIPage() {
  const { t } = useI18n();
  const { conversations, loading, lastRefresh, refresh } = useConversations();
  const [aiCost, setAiCost] = useState<BetaAiCostStatus | null>(null);

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = "/login";
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.getBetaAiCost()
      .then((status) => {
        if (!cancelled) setAiCost(status);
      })
      .catch(() => {
        if (!cancelled) setAiCost(null);
      });
    return () => { cancelled = true; };
  }, [lastRefresh]);

  const total = conversations.length;
  const counts = FUNNEL.reduce((acc, { status }) => {
    acc[status] = conversations.filter((c) => c.status === status).length;
    return acc;
  }, {} as Record<Status, number>);
  const maxCount = Math.max(...Object.values(counts), 1);
  const recent = [...conversations]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 16,
    padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  };

  return (
    <div className="app-page">
      <NavBar lastRefresh={lastRefresh} onRefresh={refresh} />
      {loading ? (
        <KPISkeleton />
      ) : (
        <div className="app-scroll-page">
          <div className="app-page-inner kpi-inner">

            <h1 className="app-page-title" style={{ fontSize: 24, fontWeight: 800, color: "#0a0a0a", margin: "0 0 4px" }}>{t("kpi.title", "Performance")}</h1>
            <p style={{ fontSize: 13, color: "#8e8e8e", margin: "0 0 20px" }}>{t("kpi.subtitle", "Pipeline overview")}</p>

            {/* KPI Cards */}
            <div className="kpi-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
              {FUNNEL.map(({ status, icon: Icon }) => {
                const count = counts[status];
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={status} style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={16} color="#8e8e8e" />
                      </div>
                      {pct > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "2px 6px", borderRadius: 99 }}>
                          {pct}%
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 28, fontWeight: 800, color: "#0095F6", margin: "0 0 2px" }}>{count}</p>
                    <p style={{ fontSize: 12, color: "#8e8e8e", margin: 0 }}>{t(`status.${status}`, STATUS_LABELS[status])}</p>
                  </div>
                );
              })}
            </div>

            {/* Funnel + Stats */}
            <div className="kpi-funnel-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0a0a0a", margin: 0 }}>{t("kpi.funnel", "Conversion funnel")}</h2>
                  {counts["signe"] > 0 && total > 0 && (
                    <span style={{ fontSize: 12, color: "#8e8e8e", display: "flex", alignItems: "center", gap: 4 }}>
                      <TrendingUp size={12} /> {Math.round((counts["signe"] / total) * 100)}% conv.
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "#8e8e8e", margin: "0 0 16px" }}>{t("kpi.funnelHelp", "From first message to signed contract")}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {FUNNEL.map(({ status }) => {
                    const count = counts[status];
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const barW = Math.round((count / maxCount) * 100);
                    return (
                      <div key={status} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 12, color: "#262626", width: 100, flexShrink: 0 }}>{t(`status.${status}`, STATUS_LABELS[status])}</span>
                        <div style={{ flex: 1, height: 8, background: "#f0f0f0", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 99, background: STATUS_BAR_COLOR[status], width: `${barW}%`, transition: "width 0.6s" }} />
                        </div>
                        <span style={{ fontSize: 12, color: "#8e8e8e", width: 60, textAlign: "right", flexShrink: 0 }}>
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={card}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0a0a0a", margin: "0 0 16px" }}>{t("kpi.aiAgent", "AI agent")}</h2>
                <p style={{ fontSize: 36, fontWeight: 800, color: "#0095F6", margin: "0 0 2px" }}>
                  {conversations.filter((c) => c.agent_active).length}
                </p>
                <p style={{ fontSize: 12, color: "#8e8e8e", margin: "0 0 16px" }}>{t("kpi.activeAgents", "active agents")}</p>
                {[
                  { label: t("kpi.totalProspects", "Total prospects"), value: total },
                  { label: t("kpi.signed", "Signed"), value: counts["signe"] },
                  { label: t("kpi.conversionRate", "Conv. rate"), value: `${total > 0 ? Math.round((counts["signe"] / total) * 100) : 0}%` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #f0f0f0", fontSize: 13 }}>
                    <span style={{ color: "#8e8e8e" }}>{label}</span>
                    <span style={{ fontWeight: 700, color: "#0a0a0a" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0a0a0a", margin: "0 0 4px" }}>Coût IA/API</h2>
                  <p style={{ fontSize: 12, color: "#8e8e8e", margin: 0 }}>Suivi du plafond d’utilisation Angellos</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: aiCost?.cap_reached ? "#b91c1c" : "#15803d", background: aiCost?.cap_reached ? "#fef2f2" : "#ecfdf5", padding: "4px 8px", borderRadius: 99 }}>
                  {aiCost?.cap_reached ? "Cap atteint" : "Cap non atteint"}
                </span>
              </div>
              <div className="kpi-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                {[
                  { label: "Utilisé", value: aiCost ? `${aiCost.spent_eur.toFixed(2)} €` : "—" },
                  { label: "Cap", value: aiCost ? `${aiCost.cap_eur.toFixed(2)} €` : "—" },
                  { label: "Restant", value: aiCost ? `${aiCost.remaining_eur.toFixed(2)} €` : "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 14, background: "#fbfbfb" }}>
                    <p style={{ fontSize: 12, color: "#8e8e8e", margin: "0 0 6px" }}>{label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: "#0095F6", margin: 0 }}>{value}</p>
                  </div>
                ))}
            </div>
            </div>

            {/* Recent */}
            <div style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0a0a0a", margin: "0 0 16px" }}>{t("kpi.recentActivity", "Recent activity")}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {recent.map((c) => {
                  const instagramHandle = getInstagramHandle(c);
                  return (
                  <div key={c.id} className="kpi-recent-row" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={instagramHandle || c.username || "?"} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#0a0a0a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {instagramHandle || c.username}
                        {instagramHandle && (
                          <span style={{ fontWeight: 400, color: "#8e8e8e", marginLeft: 4 }}>@{instagramHandle}</span>
                        )}
                      </p>
                      <p style={{ fontSize: 12, color: "#8e8e8e", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.message || "—"}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <StatusBadge status={c.status} />
                      <span style={{ fontSize: 12, color: "#8e8e8e" }}>{timeAgo(c.created_at)}</span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

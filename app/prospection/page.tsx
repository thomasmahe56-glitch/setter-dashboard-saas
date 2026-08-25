"use client";

import { useEffect } from "react";
import { ExternalLink, Search, Send, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";

const PROSPECTING_DASHBOARD_URL = "https://angelos-prospecting-production.up.railway.app";

export default function ProspectionPage() {
  const { t } = useI18n();

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = "/login";
    });
  }, []);

  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  };

  return (
    <div className="app-page">
      <NavBar />
      <div className="app-scroll-page">
        <div className="app-page-inner" style={{ maxWidth: 980 }}>
          <div className="app-page-heading" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#0095F6", textTransform: "uppercase", margin: "0 0 8px" }}>
                {t("prospection.eyebrow", "Angellos acquisition")}
              </p>
              <h1 className="app-page-title" style={{ fontSize: 28, fontWeight: 850, color: "#0a0a0a", margin: "0 0 6px" }}>
                {t("prospection.title", "Prospection")}
              </h1>
              <p style={{ fontSize: 14, color: "#626b78", margin: 0, maxWidth: 680, lineHeight: 1.55 }}>
                {t("prospection.subtitle", "Find francophone Instagram prospects, qualify them, prepare a personalized first DM, then send carefully with the Chrome extension.")}
              </p>
            </div>
            <a
              href={PROSPECTING_DASHBOARD_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                padding: "11px 16px",
                background: "#0a0a0a",
                color: "#fff",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              {t("prospection.openDashboard", "Open Prospecting dashboard")}
              <ExternalLink size={15} />
            </a>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
            {[
              { icon: Search, title: t("prospection.step1", "Find leads"), body: t("prospection.step1Body", "Use accounts, hashtags, post commenters and follower/following sources.") },
              { icon: SlidersHorizontal, title: t("prospection.step2", "Filter Nounes MVP"), body: t("prospection.step2Body", "Followers min/max are enforced; language, markets and niche guide AI qualification.") },
              { icon: Send, title: t("prospection.step3", "Prepare first DM"), body: t("prospection.step3Body", "Angellos writes a short, natural French opener with no AI, beta or product pitch.") },
              { icon: ShieldCheck, title: t("prospection.step4", "Send safely"), body: t("prospection.step4Body", "The Chrome extension applies sending windows, random delays, daily quota and failure stop.") },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} style={card}>
                <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "#edf7ff", color: "#0095F6", marginBottom: 16 }}>
                  <Icon size={19} />
                </div>
                <h2 style={{ fontSize: 16, color: "#0a0a0a", margin: "0 0 8px", fontWeight: 800 }}>{title}</h2>
                <p style={{ fontSize: 13, color: "#626b78", margin: 0, lineHeight: 1.5 }}>{body}</p>
              </div>
            ))}
          </div>

          <div style={{ ...card, display: "grid", gap: 12 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0a0a0a", margin: 0 }}>
              {t("prospection.betaNoteTitle", "Phase 1 beta note")}
            </h2>
            <p style={{ fontSize: 13, color: "#626b78", lineHeight: 1.55, margin: 0 }}>
              {t("prospection.betaNoteBody", "For speed and production safety, Prospecting remains a separate backend/dashboard in Phase 1. This page makes it visible as an Angellos acquisition capability without merging the CRM backend.")}
            </p>
            <div style={{ border: "1px solid #e5eaf1", borderRadius: 12, padding: 14, background: "#fbfcfd" }}>
              <p style={{ fontSize: 12, color: "#8e8e8e", margin: "0 0 6px", fontWeight: 800 }}>{t("prospection.liveUrl", "Live URL")}</p>
              <a href={PROSPECTING_DASHBOARD_URL} target="_blank" rel="noreferrer" style={{ color: "#0077c8", fontWeight: 800, fontSize: 14 }}>
                {PROSPECTING_DASHBOARD_URL}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

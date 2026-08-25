"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Search, Send, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

const PROSPECTING_DASHBOARD_URL = "https://angelos-prospecting-production.up.railway.app";

export default function ProspectionPage() {
  const { t } = useI18n();
  const [trainingContext, setTrainingContext] = useState<Awaited<ReturnType<typeof api.getTrainingCenter>> | null>(null);
  const [trainingLoading, setTrainingLoading] = useState(true);

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = "/login";
    });
  }, []);

  useEffect(() => {
    api.getTrainingCenter(false)
      .then(setTrainingContext)
      .catch(() => setTrainingContext(null))
      .finally(() => setTrainingLoading(false));
  }, []);

  const profile = trainingContext?.profile?.profile;
  const avatar = trainingContext?.avatar?.avatar;
  const salesRules = trainingContext?.sales_rules?.rules;
  const missingTrainingCenter = [
    profile?.business_name ? null : "business_name",
    profile?.niche ? null : "niche",
    profile?.offer_name || profile?.offer_promise ? null : "offer",
    avatar?.persona_summary ? null : "ideal_customer",
  ].filter(Boolean) as string[];
  const inheritedContextReady = !trainingLoading && trainingContext !== null && missingTrainingCenter.length === 0;

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

          <div style={{ ...card, display: "grid", gap: 12, marginBottom: 16, border: inheritedContextReady ? "1px solid #b7e4c7" : "1px solid #ffd6a5", background: inheritedContextReady ? "#f6fff9" : "#fffaf0" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: inheritedContextReady ? "#16833a" : "#b7791f", textTransform: "uppercase", margin: "0 0 6px" }}>
                  {t("prospection.trainingContextEyebrow", "Training Center inherited")}
                </p>
                <h2 style={{ fontSize: 17, fontWeight: 850, color: "#0a0a0a", margin: "0 0 6px" }}>
                  {inheritedContextReady
                    ? t("prospection.trainingContextReady", "Prospecting uses the Angellos Training Center")
                    : t("prospection.trainingContextIncomplete", "Complète d'abord le Training Center")}
                </h2>
                <p style={{ fontSize: 13, color: "#626b78", lineHeight: 1.55, margin: 0 }}>
                  {t("prospection.trainingContextBody", "Niche, offer, ideal customer, tone, qualification rules and first-DM style come from the existing Training Center. Prospecting keeps only sources, markets, exclusions, followers and volume as prospecting-specific settings.")}
                </p>
              </div>
              <a href="/agent/training-center" style={{ color: "#0077c8", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>
                {t("prospection.openTrainingCenter", "Open Training Center")}
              </a>
            </div>
            {inheritedContextReady ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <ContextChip label="Business" value={profile?.business_name || "-"} />
                <ContextChip label="Niche" value={profile?.niche || "-"} />
                <ContextChip label="Offer" value={profile?.offer_name || profile?.offer_promise || "-"} />
                <ContextChip label="Tone/rules" value={`${profile?.tone_rules?.length || 0} tone · ${salesRules?.qualification_questions?.length || 0} qualification`} />
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#9a5b00", margin: 0 }}>
                {trainingLoading ? "Loading Training Center..." : `Missing: ${missingTrainingCenter.join(", ") || "Training Center unavailable"}.`}
              </p>
            )}
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

function ContextChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #dcefe2", borderRadius: 12, padding: 12, background: "#fff" }}>
      <p style={{ fontSize: 11, color: "#16833a", textTransform: "uppercase", fontWeight: 850, margin: "0 0 5px" }}>{label}</p>
      <p style={{ fontSize: 13, color: "#1f2937", fontWeight: 700, margin: 0, lineHeight: 1.35 }}>{value}</p>
    </div>
  );
}

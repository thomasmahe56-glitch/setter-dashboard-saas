"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Clock3,
  FlaskConical,
  GraduationCap,
  Lightbulb,
  LogOut,
  Menu,
  MessageCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { config } from "@/lib/config";
import { AngelosAvatar } from "@/components/AngelosAvatar";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";

const TABS = [
  { key: "crm", href: "/crm", label: "CRM", icon: MessageCircle },
  { key: "followUps", href: "/relance", label: "Follow-ups", icon: Clock3 },
  { key: "kpis", href: "/kpi", label: "KPIs", icon: BarChart3 },
  { key: "insights", href: "/insights", label: "Insights", icon: Lightbulb },
  { key: "training", href: "/agent/training-center", label: "Training", icon: GraduationCap },
  { key: "simulator", href: "/agent/simulator", label: "Simulator", icon: FlaskConical },
];

interface NavBarProps {
  lastRefresh?: Date | null;
  onRefresh?: () => void;
}

export function NavBar({ lastRefresh, onRefresh }: NavBarProps) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { language, setLanguage, t } = useI18n();
  const tabs = TABS.map((tab) => ({ ...tab, label: t(`nav.${tab.key}`, tab.label) }));

  async function handleLogout() {
    await createClient().auth.signOut();
    window.location.href = "/login";
  }

  const width = open ? 232 : 72;

  return (
    <aside
      className="app-nav"
      style={{
        position: "fixed",
        inset: "0 auto 0 0",
        width,
        zIndex: 80,
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(10px)",
        borderRight: "1px solid #ececec",
        display: "flex",
        flexDirection: "column",
        transition: "width 180ms ease",
        boxShadow: open ? "8px 0 28px rgba(15,23,42,0.08)" : "none",
      }}
    >
      <div className="app-nav-brand" style={{ height: 64, display: "flex", alignItems: "center", padding: "0 16px", gap: 12 }}>
        <AngelosAvatar size={40} radius={10} />
        {open && (
          <span
            style={{
              fontWeight: 750,
              fontSize: 14,
              color: "#0a0a0a",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {config.agentName}
          </span>
        )}
      </div>

      <button
        className="app-nav-toggle"
        type="button"
        onClick={() => setOpen((value) => !value)}
          title={open ? t("nav.closeMenu", "Close menu") : t("nav.openMenu", "Open menu")}
        aria-label={open ? t("nav.closeMenu", "Close menu") : t("nav.openMenu", "Open menu")}
        style={{
          height: 40,
          width: 40,
          borderRadius: 10,
          border: "1px solid #eeeeee",
          background: "#fff",
          color: "#5f6368",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 16px 16px",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      <nav className="app-nav-links" style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 10px" }}>
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/agent" && path.startsWith(href));
          return (
            <Link
              key={href}
              className="app-nav-link"
              href={href}
              title={label}
              aria-label={label}
              style={{
                height: 44,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: open ? "flex-start" : "center",
                gap: 12,
                padding: open ? "0 14px" : 0,
                fontSize: 14,
                fontWeight: active ? 700 : 560,
                color: active ? "#0a0a0a" : "#7a7a7a",
                background: active ? "#f2f7ff" : "transparent",
                textDecoration: "none",
                transition: "background 150ms ease, color 150ms ease",
              }}
            >
              <Icon size={18} color={active ? "#0095F6" : "currentColor"} />
              {open && <span style={{ whiteSpace: "nowrap" }}>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <div className="app-nav-actions" style={{ padding: "0 10px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
        {lastRefresh && open && (
          <div style={{ fontSize: 12, color: "#8e8e8e", padding: "0 12px 6px" }}>
            {t("nav.updated", "Updated")} {lastRefresh.toLocaleTimeString(language === "fr" ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
        <label
          title={t("nav.language", "Language")}
          style={{
            height: 44,
            borderRadius: 10,
            color: "#7a7a7a",
            display: "flex",
            alignItems: "center",
            justifyContent: open ? "space-between" : "center",
            gap: 8,
            padding: open ? "0 14px" : 0,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {open && <span>{t("nav.language", "Language")}</span>}
          <select
            aria-label={t("nav.language", "Language")}
            value={language}
            onChange={(event) => setLanguage(event.target.value === "fr" ? "fr" : "en")}
            style={{ border: "1px solid #eeeeee", borderRadius: 8, background: "#fff", color: "#262626", padding: "5px 7px", fontSize: 12, fontWeight: 700 }}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </label>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title={t("nav.refresh", "Refresh")}
            aria-label={t("nav.refresh", "Refresh")}
            style={{
              height: 44,
              borderRadius: 10,
              border: "none",
              background: "transparent",
              color: "#7a7a7a",
              display: "flex",
              alignItems: "center",
              justifyContent: open ? "flex-start" : "center",
              gap: 12,
              padding: open ? "0 14px" : 0,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 560,
            }}
          >
            <RefreshCw size={18} />
            {open && <span>{t("nav.refresh", "Refresh")}</span>}
          </button>
        )}
        <button
          type="button"
          onClick={handleLogout}
          title={t("nav.logout", "Log out")}
          aria-label={t("nav.logout", "Log out")}
          style={{
            height: 44,
            borderRadius: 10,
            border: "none",
            background: "transparent",
            color: "#7a7a7a",
            display: "flex",
            alignItems: "center",
            justifyContent: open ? "flex-start" : "center",
            gap: 12,
            padding: open ? "0 14px" : 0,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 560,
          }}
        >
          <LogOut size={18} />
          {open && <span>{t("nav.logout", "Log out")}</span>}
        </button>
      </div>
    </aside>
  );
}

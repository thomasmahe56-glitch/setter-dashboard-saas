"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { config } from "@/lib/config";

const TABS = [
  { href: "/crm", label: "CRM" },
  { href: "/relance", label: "Relance" },
  { href: "/kpi", label: "KPIs" },
  { href: "/insights", label: "Insights" },
  { href: "/agent", label: "Agent" },
];

interface NavBarProps {
  lastRefresh?: Date | null;
  onRefresh?: () => void;
}

export function NavBar({ lastRefresh, onRefresh }: NavBarProps) {
  const path = usePathname();

  return (
    <nav style={{
      height: 56, borderBottom: "1px solid #f0f0f0",
      background: "rgba(255,255,255,0.90)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center",
      padding: "0 24px", position: "sticky", top: 0, zIndex: 50,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: 160 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: "#0095F6", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{config.agentName.charAt(0)}</span>
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#0a0a0a" }}>{config.agentName}</span>
      </div>

      {/* Tabs */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        {TABS.map(({ href, label }) => {
          const active = path === href || path.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              position: "relative", height: 56, display: "flex", alignItems: "center",
              padding: "0 16px",
              fontSize: 14, fontWeight: active ? 600 : 500,
              color: active ? "#0a0a0a" : "#8e8e8e",
              textDecoration: "none", transition: "color 0.15s",
            }}>
              {label}
              {active && (
                <span style={{
                  position: "absolute", bottom: 0, left: 12, right: 12,
                  height: 2, background: "#0a0a0a", borderRadius: 9999,
                }} />
              )}
            </Link>
          );
        })}
      </div>

      {/* Right */}
      <div style={{ width: 160, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
        {lastRefresh && (
          <span style={{ fontSize: 12, color: "#8e8e8e" }}>
            {lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        {onRefresh && (
          <button onClick={onRefresh} style={{
            padding: 8, borderRadius: "50%", border: "none",
            background: "transparent", cursor: "pointer", color: "#8e8e8e",
            display: "flex", alignItems: "center",
          }}>
            <RefreshCw size={16} />
          </button>
        )}
      </div>
    </nav>
  );
}

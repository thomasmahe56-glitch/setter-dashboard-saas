"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { config } from "@/lib/config";

export default function LoginPage() {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => { if (localStorage.getItem("dashboard_secret")) router.replace("/crm"); }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${config.apiUrl}/conversations`, {
        headers: { "x-dashboard-secret": secret },
      });
      if (res.status === 401) { setError("Clé incorrecte"); setLoading(false); return; }
      if (!res.ok) throw new Error();
      localStorage.setItem("dashboard_secret", secret);
      router.replace("/crm");
    } catch { setError("Erreur de connexion"); setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 12, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#0095F6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 24 }}>{config.agentName.charAt(0)}</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0a0a0a", margin: "0 0 4px" }}>{config.agentName}</h1>
          <p style={{ fontSize: 13, color: "#8e8e8e", margin: 0 }}>Setter Dashboard</p>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <form onSubmit={handleLogin}>
            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
              placeholder="Clé d'accès" autoFocus
              style={{
                width: "100%", background: "#f0f0f0", border: "1px solid transparent",
                borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#0a0a0a",
                outline: "none", boxSizing: "border-box", marginBottom: 10,
              }} />
            {error && <p style={{ color: "#ef4444", fontSize: 13, textAlign: "center", margin: "0 0 10px" }}>{error}</p>}
            <button type="submit" disabled={loading || !secret.trim()} style={{
              width: "100%", background: "#0095F6", color: "#fff", border: "none",
              borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700,
              cursor: "pointer", opacity: loading || !secret.trim() ? 0.5 : 1,
            }}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

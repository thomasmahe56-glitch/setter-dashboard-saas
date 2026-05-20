"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { config } from "@/lib/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data } = await sb.auth.getSession();
        if (data.session) {
          router.replace("/crm");
          return;
        }
      } catch (e) {
        console.error("Session check failed:", e);
      } finally {
        setChecking(false);
      }
    }
    checkSession();
  }, [router]);

  if (checking) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    const { supabase } = await import("@/lib/supabase");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email ou mot de passe incorrect");
      setLoading(false);
      return;
    }
    router.replace("/crm");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8fafc 0%, #f0f4ff 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo + titre */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: "#0095F6",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 32px rgba(0,149,246,0.25)",
          }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 28 }}>
              {config.agentName.charAt(0)}
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a0a0a", margin: "0 0 6px" }}>
            {config.agentName}
          </h1>
          <p style={{ fontSize: 14, color: "#8e8e8e", margin: 0 }}>
            Connectez-vous à votre dashboard
          </p>
        </div>

        {/* Card login */}
        <div style={{
          background: "#fff", borderRadius: 20, padding: 32,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                autoFocus
                required
                style={{
                  background: "#f9fafb", border: "1px solid #e5e7eb",
                  borderRadius: 10, padding: "11px 14px",
                  fontSize: 14, color: "#0a0a0a", outline: "none",
                  boxSizing: "border-box", width: "100%",
                  transition: "border-color 150ms",
                }}
                onFocus={(e) => e.target.style.borderColor = "#0095F6"}
                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  background: "#f9fafb", border: "1px solid #e5e7eb",
                  borderRadius: 10, padding: "11px 14px",
                  fontSize: 14, color: "#0a0a0a", outline: "none",
                  boxSizing: "border-box", width: "100%",
                  transition: "border-color 150ms",
                }}
                onFocus={(e) => e.target.style.borderColor = "#0095F6"}
                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>

            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: 8, padding: "10px 14px",
                fontSize: 13, color: "#dc2626", textAlign: "center",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              style={{
                width: "100%", background: "#0095F6", color: "#fff",
                border: "none", borderRadius: 10, padding: "13px",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                marginTop: 4,
                opacity: loading || !email.trim() || !password.trim() ? 0.5 : 1,
                transition: "opacity 150ms",
              }}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>

          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 20 }}>
          {config.agentName} · Setter Dashboard · Accès restreint
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { AngelosAvatar } from "@/components/AngelosAvatar";
import { config as appConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/onboarding");
        return;
      }
      setCheckingSession(false);
    });
  }, [router]);

  if (checkingSession) return null;

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || password.length < 8) return;
    setLoading(true);
    setError("");
    setMessage("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) {
      setError(error.message || "Unable to create beta account.");
      setLoading(false);
      return;
    }
    if (!data.session) {
      setMessage("Account created. Check your inbox to confirm your email, then sign in to continue onboarding.");
      setLoading(false);
      return;
    }
    router.replace("/onboarding");
    router.refresh();
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.header}>
          <AngelosAvatar size={92} radius={24} shadow="0 8px 32px rgba(0,149,246,0.18)" />
          <p style={styles.eyebrow}>Supervised beta access</p>
          <h1 style={styles.title}>Create your {appConfig.agentName} beta account</h1>
          <p style={styles.subtitle}>Configure your Training Center, test Angellos, then use the CRM in supervised mode.</p>
        </div>
        <form onSubmit={handleSignup} style={styles.form}>
          <label style={styles.label}>Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required style={styles.input} />
          </label>
          <label style={styles.label}>Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 8 characters" minLength={8} required style={styles.input} />
          </label>
          {error && <p style={styles.error}>{error}</p>}
          {message && <p style={styles.success}>{message}</p>}
          <button type="submit" disabled={loading || !email.trim() || password.length < 8} style={primaryButton(loading || !email.trim() || password.length < 8)}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Creating account..." : "Start beta onboarding"}
            {!loading ? <ArrowRight size={16} /> : null}
          </button>
        </form>
        <p style={styles.footer}>Already have access? <Link href="/login?next=/onboarding" style={styles.link}>Sign in</Link></p>
      </section>
    </main>
  );
}

function primaryButton(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    background: disabled ? "#93c5fd" : "#0095F6",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "13px 16px",
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "linear-gradient(135deg,#f8fafc 0%,#eef4ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, color: "#0f172a" },
  card: { width: "100%", maxWidth: 440, background: "white", borderRadius: 24, padding: 32, boxShadow: "0 18px 60px rgba(15,23,42,.10)", border: "1px solid #e5e7eb" },
  header: { textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 24 },
  eyebrow: { margin: "8px 0 0", color: "#0095F6", fontSize: 12, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" },
  title: { margin: 0, fontSize: 26, lineHeight: 1.1, fontWeight: 900 },
  subtitle: { margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 800, color: "#475569" },
  input: { border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#0f172a", background: "#f8fafc", outline: "none" },
  error: { margin: 0, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 700 },
  success: { margin: 0, color: "#047857", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 700 },
  footer: { textAlign: "center", color: "#64748b", fontSize: 13, margin: "18px 0 0" },
  link: { color: "#0095F6", fontWeight: 800, textDecoration: "none" },
};

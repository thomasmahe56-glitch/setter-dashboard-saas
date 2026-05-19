"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Send, Loader2, Zap } from "lucide-react";
import { NavBar } from "@/components/NavBar";

interface ChatMessage { role: "user" | "assistant"; content: string }
interface BusinessSuggestion { suggestion: string; priority: "high" | "medium" | "low" }
interface Insight { id: string; created_at: string; business_suggestions: BusinessSuggestion[] }
interface PromptVersion { id: string; created_at: string; is_active: boolean; source: string; insight_id: string | null }
interface AgentLinks { calendly_url: string; sales_page_url: string }

import { config as appConfig } from "@/lib/config";
import { getAccessToken } from "@/lib/supabase";
const RAILWAY_URL = appConfig.apiUrl;

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${RAILWAY_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`Erreur API ${res.status}`);
  return res.json();
}

function PriorityBadge({ priority }: { priority: BusinessSuggestion["priority"] }) {
  const map = {
    high:   { label: "Haute",   bg: "#fef2f2", color: "#dc2626" },
    medium: { label: "Moyenne", bg: "#fff7ed", color: "#ea580c" },
    low:    { label: "Basse",   bg: "#f0f0f0", color: "#8e8e8e" },
  };
  const s = map[priority];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 9999,
      color: s.color, background: s.bg, whiteSpace: "nowrap", flexShrink: 0,
    }}>{s.label}</span>
  );
}

function ThinkingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 14px" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: "#fff",
          animation: `pulse2 1.2s ease-in-out ${i * 0.2}s infinite`,
          display: "inline-block",
        }} />
      ))}
    </div>
  );
}

export default function AgentPage() {
  const router = useRouter();

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Right panel
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [salesPageUrl, setSalesPageUrl] = useState("");
  const [linksLoading, setLinksLoading] = useState(true);
  const [linksSaving, setLinksSaving] = useState(false);
  const [linksToast, setLinksToast] = useState<string | null>(null);
  const [observations, setObservations] = useState("");
  const [lastInsight, setLastInsight] = useState<Insight | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [restoreLoading, setRestoreLoading] = useState<string | null>(null);
  const [versionToast, setVersionToast] = useState<string | null>(null);

  useEffect(() => {
    import("@/lib/supabase").then(({ supabase }) => {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) router.replace("/login");
      });
    });
  }, [router]);

  useEffect(() => {
    const stored = localStorage.getItem("agent_observations");
    if (stored) setObservations(stored);
  }, []);

  const fetchLastInsight = useCallback(async () => {
    try {
      const data = await apiFetch<Insight[]>("/insights");
      setLastInsight(data.length > 0 ? data[0] : null);
    } catch {}
    finally { setInsightsLoading(false); }
  }, []);

  const fetchPromptVersions = useCallback(async () => {
    try {
      const data = await apiFetch<PromptVersion[]>("/prompt-versions");
      setPromptVersions(data);
    } catch {}
    finally { setVersionsLoading(false); }
  }, []);

  const fetchAgentLinks = useCallback(async () => {
    try {
      const data = await apiFetch<AgentLinks>("/agent-links");
      setCalendlyUrl(data.calendly_url || "");
      setSalesPageUrl(data.sales_page_url || "");
    } catch {
      const storedCalendly = localStorage.getItem("agent_calendly_url");
      if (storedCalendly) setCalendlyUrl(storedCalendly);
      const storedSalesPage = localStorage.getItem("agent_sales_page_url");
      if (storedSalesPage) setSalesPageUrl(storedSalesPage);
    } finally {
      setLinksLoading(false);
    }
  }, []);

  useEffect(() => { fetchLastInsight(); }, [fetchLastInsight]);
  useEffect(() => { fetchPromptVersions(); }, [fetchPromptVersions]);
  useEffect(() => { fetchAgentLinks(); }, [fetchAgentLinks]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  function handleObservationsChange(val: string) {
    setObservations(val);
    localStorage.setItem("agent_observations", val);
  }

  function handleCalendlyUrlChange(val: string) {
    setCalendlyUrl(val);
    localStorage.setItem("agent_calendly_url", val);
  }

  function handleSalesPageUrlChange(val: string) {
    setSalesPageUrl(val);
    localStorage.setItem("agent_sales_page_url", val);
  }

  async function handleSaveAgentLinks() {
    setLinksSaving(true);
    setLinksToast(null);
    try {
      await apiFetch("/agent-links", {
        method: "PATCH",
        body: JSON.stringify({
          calendly_url: calendlyUrl.trim(),
          sales_page_url: salesPageUrl.trim(),
        }),
      });
      localStorage.setItem("agent_calendly_url", calendlyUrl);
      localStorage.setItem("agent_sales_page_url", salesPageUrl);
      await fetchPromptVersions();
      setLinksToast("Options enregistrées pour l'agent actif");
      setTimeout(() => setLinksToast(null), 3000);
    } catch {
      setLinksToast("Erreur lors de l'enregistrement");
      setTimeout(() => setLinksToast(null), 3000);
    } finally {
      setLinksSaving(false);
    }
  }

  function handleReset() {
    setMessages([]);
    setChatError(null);
    setInput("");
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || chatLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setChatLoading(true);
    setChatError(null);

    try {
      const data = await apiFetch<{ response: string }>("/playground", {
        method: "POST",
        body: JSON.stringify({
          messages: nextMessages,
          calendly_url: calendlyUrl.trim() || undefined,
          sales_page_url: salesPageUrl.trim() || undefined,
        }),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      setChatError(msg);
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) +
      " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
  }

  async function handleRestore(id: string) {
    setRestoreLoading(id);
    try {
      await apiFetch(`/prompt-versions/${id}/restore`, { method: "POST" });
      await fetchPromptVersions();
      setVersionToast("Prompt restauré !");
      setTimeout(() => setVersionToast(null), 3000);
    } catch {
      setVersionToast("Erreur lors de la restauration");
      setTimeout(() => setVersionToast(null), 3000);
    } finally {
      setRestoreLoading(null);
    }
  }

  async function handleFeedbackLoop() {
    setAnalysing(true);
    setToast(null);
    const testConv = messages
      .map((m) => `${m.role === "user" ? "Prospect" : "Agent"}: ${m.content}`)
      .join("\n");
    try {
      await apiFetch("/feedback-loop", {
        method: "POST",
        body: JSON.stringify({
          n: 20,
          manual_observations: observations || undefined,
          test_conversation: testConv || undefined,
        }),
      });
      setToast("Analyse lancée !");
      setTimeout(() => router.push("/insights"), 2000);
    } catch {
      setToast("Erreur lors de l'analyse");
      setAnalysing(false);
    }
  }

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    display: "flex", flexDirection: "column",
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 13, fontWeight: 700, color: "#0a0a0a", margin: 0,
  };

  const prevRole = useRef<string | null>(null);
  const agentLinksCard = (
    <div style={{ ...card, padding: 20 }}>
      <p style={{ ...sectionTitle, marginBottom: 6 }}>Options de l'agent</p>
      <p style={{ fontSize: 12, color: "#8e8e8e", margin: "0 0 12px" }}>
        Ces liens seront utilisés par l'agent actif quand il oriente vers un appel ou la page.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#8e8e8e" }}>Lien envoyé pour un appel</span>
          <input
            value={calendlyUrl}
            onChange={(e) => handleCalendlyUrlChange(e.target.value)}
            disabled={linksLoading || linksSaving}
            placeholder="https://calendly.com/..."
            style={{
              width: "100%", background: "#f5f5f5", border: "none", borderRadius: 10,
              padding: "10px 12px", fontSize: 13, color: "#0a0a0a",
              outline: "none", fontFamily: "inherit", boxSizing: "border-box",
              opacity: linksLoading || linksSaving ? 0.6 : 1,
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#8e8e8e" }}>Lien envoyé pour la page de vente</span>
          <input
            value={salesPageUrl}
            onChange={(e) => handleSalesPageUrlChange(e.target.value)}
            disabled={linksLoading || linksSaving}
            placeholder="https://votre-page-de-vente.com"
            style={{
              width: "100%", background: "#f5f5f5", border: "none", borderRadius: 10,
              padding: "10px 12px", fontSize: 13, color: "#0a0a0a",
              outline: "none", fontFamily: "inherit", boxSizing: "border-box",
              opacity: linksLoading || linksSaving ? 0.6 : 1,
            }}
          />
        </label>
        <button
          type="button"
          onClick={handleSaveAgentLinks}
          disabled={linksLoading || linksSaving}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "10px 0", borderRadius: 10, border: "none",
            background: linksLoading || linksSaving ? "#e0e0e0" : "#1D9E75",
            color: linksLoading || linksSaving ? "#8e8e8e" : "#fff",
            fontSize: 13, fontWeight: 700,
            cursor: linksLoading || linksSaving ? "not-allowed" : "pointer",
          }}
        >
          {linksSaving || linksLoading ? <Loader2 size={14} className="animate-spin" /> : null}
          {linksLoading ? "Chargement..." : linksSaving ? "Enregistrement..." : "Enregistrer les options"}
        </button>
        {linksToast && (
          <p style={{
            fontSize: 12, margin: 0,
            color: linksToast.startsWith("Erreur") ? "#dc2626" : "#16a34a",
            fontWeight: 600,
          }}>
            {linksToast}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#fafafa" }}>
      <NavBar />
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0a0a0a", margin: "0 0 4px" }}>Agent</h1>
            <p style={{ fontSize: 13, color: "#8e8e8e", margin: 0 }}>
              Tu joues le rôle du prospect. L'agent répond avec le prompt actif.
            </p>
          </div>

          {/* Two-column grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

            {/* ── LEFT : Conversation de test ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={card}>
              {/* Card header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 20px 12px", borderBottom: "1px solid #f0f0f0",
              }}>
                <span style={sectionTitle}>Conversation de test</span>
                <button
                  onClick={handleReset}
                  title="Réinitialiser"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", borderRadius: 8,
                    border: "1px solid #e0e0e0", background: "#fff",
                    fontSize: 12, color: "#8e8e8e", cursor: "pointer", fontWeight: 500,
                  }}
                >
                  <RotateCcw size={12} /> Reset
                </button>
              </div>

              {/* Messages */}
              <div style={{
                height: 380, overflowY: "auto", padding: "12px 16px",
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                {messages.length === 0 ? (
                  <div style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#c0c0c0", fontSize: 13, textAlign: "center",
                  }}>
                    Envoie un premier message pour démarrer le test
                  </div>
                ) : (
                  (() => {
                    prevRole.current = null;
                    return messages.map((msg, i) => {
                      const isAgent = msg.role === "assistant";
                      const showLabel = prevRole.current !== msg.role;
                      prevRole.current = msg.role;
                      return (
                        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isAgent ? "flex-start" : "flex-end", marginTop: showLabel && i > 0 ? 8 : 0 }}>
                          {showLabel && (
                            <span style={{
                              fontSize: 11, color: "#8e8e8e", marginBottom: 3,
                              marginLeft: isAgent ? 4 : 0, marginRight: isAgent ? 0 : 4,
                            }}>
                              {isAgent ? "Agent" : "Toi (prospect)"}
                            </span>
                          )}
                          <div style={{
                            maxWidth: "80%", padding: "8px 14px",
                            borderRadius: isAgent ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                            background: isAgent ? "#1D9E75" : "#f0f0f0",
                            color: isAgent ? "#fff" : "#0a0a0a",
                            fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}>
                            {msg.content}
                          </div>
                        </div>
                      );
                    });
                  })()
                )}

                {chatLoading && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: "#8e8e8e", marginBottom: 3, marginLeft: 4 }}>
                      Agent
                    </span>
                    <div style={{
                      background: "#1D9E75", borderRadius: "16px 16px 16px 4px",
                    }}>
                      <ThinkingDots />
                    </div>
                    <span style={{ fontSize: 11, color: "#8e8e8e", marginTop: 3, marginLeft: 4 }}>
                      L'agent réfléchit...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {chatError && (
                <div style={{ padding: "6px 16px", fontSize: 12, color: "#dc2626", background: "#fef2f2" }}>
                  {chatError}
                </div>
              )}

              {/* Input */}
              <div style={{
                display: "flex", gap: 8, padding: "12px 16px",
                borderTop: "1px solid #f0f0f0", alignItems: "flex-end",
              }}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={chatLoading}
                  placeholder="Tape ton message en tant que prospect..."
                  rows={2}
                  style={{
                    flex: 1, background: "#f5f5f5", border: "none", borderRadius: 12,
                    padding: "8px 12px", fontSize: 13, color: "#0a0a0a",
                    outline: "none", resize: "none", fontFamily: "inherit",
                    opacity: chatLoading ? 0.5 : 1,
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={chatLoading || !input.trim()}
                  style={{
                    width: 40, height: 40, borderRadius: 12, border: "none",
                    background: chatLoading || !input.trim() ? "#e0e0e0" : "#1D9E75",
                    color: chatLoading || !input.trim() ? "#8e8e8e" : "#fff",
                    cursor: chatLoading || !input.trim() ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>

            {agentLinksCard}
            </div>

            {/* ── RIGHT : Recommandations ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Observations */}
              <div style={{ ...card, padding: 20 }}>
                <p style={{ ...sectionTitle, marginBottom: 10 }}>Tes observations</p>
                <textarea
                  value={observations}
                  onChange={(e) => handleObservationsChange(e.target.value)}
                  placeholder="Note ce que tu observes pendant le test : ce qui fonctionne, ce qui coince, ce que tu voudrais changer..."
                  rows={6}
                  style={{
                    width: "100%", background: "#f5f5f5", border: "none", borderRadius: 10,
                    padding: "10px 12px", fontSize: 13, color: "#0a0a0a",
                    outline: "none", resize: "none", fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Last insight suggestions */}
              <div style={{ ...card, padding: 20 }}>
                <p style={{ ...sectionTitle, marginBottom: 12 }}>Insights du feedback loop</p>
                {insightsLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[80, 60, 70].map((w, i) => (
                      <div key={i} style={{ height: 12, borderRadius: 6, background: "#f0f0f0", width: `${w}%` }} />
                    ))}
                  </div>
                ) : !lastInsight || !lastInsight.business_suggestions?.length ? (
                  <p style={{ fontSize: 12, color: "#c0c0c0", margin: 0 }}>
                    Lance une analyse depuis la page Insights pour voir les recommandations ici.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {lastInsight.business_suggestions.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <PriorityBadge priority={s.priority} />
                        <span style={{ fontSize: 13, color: "#262626", flex: 1 }}>{s.suggestion}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feedback loop button */}
              <div style={{ ...card, padding: 20 }}>
                <p style={{ fontSize: 13, color: "#8e8e8e", margin: "0 0 12px" }}>
                  Envoie la conversation de test et tes observations au feedback loop pour générer un nouvel insight.
                </p>
                <button
                  onClick={handleFeedbackLoop}
                  disabled={analysing}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "11px 0", borderRadius: 10, border: "none",
                    background: analysing ? "#e0e0e0" : "#0095F6",
                    color: analysing ? "#8e8e8e" : "#fff",
                    fontSize: 13, fontWeight: 700,
                    cursor: analysing ? "not-allowed" : "pointer",
                  }}
                >
                  {analysing
                    ? <><Loader2 size={14} className="animate-spin" />Analyse en cours...</>
                    : <><Zap size={14} />Envoyer au feedback loop</>
                  }
                </button>
                {toast && (
                  <p style={{
                    fontSize: 12, margin: "10px 0 0", textAlign: "center",
                    color: toast.startsWith("Erreur") ? "#dc2626" : "#16a34a",
                    fontWeight: 600,
                  }}>
                    {toast}
                  </p>
                )}
              </div>

              {/* Prompt versions history */}
              <div style={{ ...card, padding: 20 }}>
                <p style={{ ...sectionTitle, marginBottom: 12 }}>Historique des prompts</p>
                {versionsLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{ height: 12, borderRadius: 6, background: "#f0f0f0", width: `${70 + i * 10}%` }} />
                    ))}
                  </div>
                ) : promptVersions.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#c0c0c0", margin: 0 }}>
                    Aucune version de prompt enregistrée.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {promptVersions.map((v, i) => (
                      <div key={v.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "10px 0",
                        borderTop: i > 0 ? "1px solid #f0f0f0" : "none",
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, color: "#262626", margin: "0 0 3px", fontWeight: 500 }}>
                            {formatDate(v.created_at)}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 9999,
                              background: v.source === "feedback-loop" ? "#eff6ff" : "#f0f0f0",
                              color: v.source === "feedback-loop" ? "#2563eb" : "#8e8e8e",
                            }}>
                              {v.source === "feedback-loop" ? "Feedback loop" : "Manuel"}
                            </span>
                            {v.is_active && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 9999,
                                background: "#f0fdf4", color: "#16a34a",
                              }}>
                                Actif
                              </span>
                            )}
                          </div>
                        </div>
                        {!v.is_active && (
                          <button
                            onClick={() => handleRestore(v.id)}
                            disabled={restoreLoading === v.id}
                            style={{
                              padding: "5px 12px", borderRadius: 8, flexShrink: 0,
                              border: "1px solid #e0e0e0", background: "#fff",
                              fontSize: 11, fontWeight: 600, color: "#8e8e8e",
                              cursor: restoreLoading === v.id ? "not-allowed" : "pointer",
                              opacity: restoreLoading === v.id ? 0.5 : 1,
                            }}
                          >
                            {restoreLoading === v.id ? <Loader2 size={10} className="animate-spin" /> : "Restaurer"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {versionToast && (
                  <p style={{
                    fontSize: 12, margin: "10px 0 0",
                    color: versionToast.startsWith("Erreur") ? "#dc2626" : "#16a34a",
                    fontWeight: 600,
                  }}>
                    {versionToast}
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

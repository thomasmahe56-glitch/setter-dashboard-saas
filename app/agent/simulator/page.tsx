"use client";

import { useEffect, useState } from "react";
import { Loader2, Play, RefreshCw } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { api, SimulatorResult, SimulatorScenario } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

type JudgeScoreKey = keyof NonNullable<SimulatorResult["quality_judge"]>["scores"];

const FLAG_LABELS: Record<keyof SimulatorResult["flags"], string> = {
  trop_ia: "Trop IA",
  trop_long: "Trop long",
  repetitif: "Répétitif",
  pitch_premature: "Pitch prématuré",
  manque_contexte: "Manque de contexte",
};

const RECOMMENDATION_LABELS: Record<SimulatorResult["recommendation"], string> = {
  pass: "Pass",
  retry: "Retry",
  human_review: "Human review",
};

const RECOMMENDATION_COLORS: Record<SimulatorResult["recommendation"], string> = {
  pass: "#16a34a",
  retry: "#f59e0b",
  human_review: "#dc2626",
};

const JUDGE_SCORE_LABELS: Record<JudgeScoreKey, string> = {
  naturalite: "Naturalité",
  contexte: "Contexte",
  progression: "Progression",
  timing: "Timing commercial",
  risque_ia: "Risque IA",
  risque_business: "Risque business",
};

const JUDGE_SCORE_ORDER: JudgeScoreKey[] = ["naturalite", "contexte", "progression", "timing", "risque_ia", "risque_business"];

function RecommendationBadge({ value }: { value: SimulatorResult["recommendation"] }) {
  return (
    <span
      style={{
        borderRadius: 999,
        padding: "6px 10px",
        background: `${RECOMMENDATION_COLORS[value]}14`,
        color: RECOMMENDATION_COLORS[value],
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {RECOMMENDATION_LABELS[value]}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#f59e0b" : "#dc2626";
  return (
    <span style={{ color, fontSize: 28, fontWeight: 850, letterSpacing: -1 }}>
      {score}
      <span style={{ fontSize: 13, color: "#8e8e8e", fontWeight: 700 }}>/100</span>
    </span>
  );
}

function QualityJudgePanel({ judge }: { judge: NonNullable<SimulatorResult["quality_judge"]> }) {
  const color = RECOMMENDATION_COLORS[judge.decision];
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${color}33`, background: `${color}08`, padding: 14, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 13, color: "#111827" }}>DM Quality Judge v1</h3>
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 12 }}>Évaluation structurée interne simulateur uniquement.</p>
        </div>
        <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
          <span style={{ color, fontSize: 24, fontWeight: 850, letterSpacing: -0.8 }}>
            {judge.overall_score}<span style={{ fontSize: 12, color: "#8e8e8e", fontWeight: 700 }}>/100</span>
          </span>
          <RecommendationBadge value={judge.decision} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {JUDGE_SCORE_ORDER.map((key) => (
          <div key={key} style={{ borderRadius: 12, background: "#fff", border: "1px solid #e5e7eb", padding: "9px 10px" }}>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 11, fontWeight: 750 }}>{JUDGE_SCORE_LABELS[key]}</p>
            <p style={{ margin: "4px 0 0", color: "#111827", fontSize: 16, fontWeight: 850 }}>{judge.scores[key]}/10</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <p style={{ margin: 0, color: "#374151", fontSize: 13, lineHeight: 1.5 }}><strong>Pourquoi :</strong> {judge.why}</p>
        <div style={{ borderRadius: 12, background: "#fff", border: "1px solid #e5e7eb", padding: 10 }}>
          <p style={{ margin: "0 0 6px", color: "#6b7280", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6 }}>Rewrite suggéré</p>
          <p style={{ margin: 0, color: "#111827", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{judge.suggested_rewrite}</p>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: SimulatorResult }) {
  const activeFlags = Object.entries(result.flags).filter(([, value]) => value) as [keyof SimulatorResult["flags"], boolean][];

  return (
    <article
      style={{
        border: "1px solid #ececec",
        borderRadius: 18,
        background: "#fff",
        boxShadow: "0 16px 45px rgba(15,23,42,0.06)",
        padding: 20,
        display: "grid",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: "#0a0a0a", letterSpacing: -0.4 }}>{result.title}</h2>
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 14, lineHeight: 1.5 }}>{result.description}</p>
        </div>
        <div style={{ textAlign: "right", display: "grid", gap: 8, justifyItems: "end" }}>
          <ScoreBadge score={result.quality_score} />
          <RecommendationBadge value={result.recommendation} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}>
        <section style={{ borderRadius: 14, background: "#f8fafc", padding: 14 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 13, color: "#111827" }}>Transcript simulé</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {result.transcript.map((message, index) => (
              <div key={`${message.role}-${index}`} style={{ display: "grid", justifyItems: message.role === "assistant" ? "end" : "start" }}>
                <div
                  style={{
                    maxWidth: "86%",
                    borderRadius: 14,
                    padding: "10px 12px",
                    background: message.role === "assistant" ? "#0095f6" : "#fff",
                    color: message.role === "assistant" ? "#fff" : "#111827",
                    border: message.role === "assistant" ? "none" : "1px solid #e5e7eb",
                    fontSize: 13,
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {message.content || "∅ silence / ghost"}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          <div style={{ borderRadius: 14, border: "1px solid #e5e7eb", padding: 14 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#111827" }}>Réponse Angellos</h3>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "#111827" }}>{result.angellos_reply}</p>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#8e8e8e" }}>Source: {result.response_source}</p>
          </div>

          {result.quality_judge && <QualityJudgePanel judge={result.quality_judge} />}

          <div style={{ borderRadius: 14, border: "1px solid #e5e7eb", padding: 14 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#111827" }}>Flags qualité</h3>
            {activeFlags.length ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {activeFlags.map(([key]) => (
                  <span key={key} style={{ borderRadius: 999, background: "#fef2f2", color: "#b91c1c", fontSize: 12, fontWeight: 750, padding: "6px 9px" }}>
                    {FLAG_LABELS[key]}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: "#16a34a", fontWeight: 700 }}>Aucun flag détecté</p>
            )}
          </div>
        </section>
      </div>
    </article>
  );
}

export default function SimulatorPage() {
  const [scenarios, setScenarios] = useState<SimulatorScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState("");
  const [results, setResults] = useState<SimulatorResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = "/login";
    });
  }, []);

  async function loadScenarios() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSimulatorScenarios();
      setScenarios(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load simulator scenarios");
    } finally {
      setLoading(false);
    }
  }

  async function runSimulation(scenarioId = selectedScenario) {
    setRunning(true);
    setError(null);
    try {
      const data = await api.runSimulator(scenarioId || undefined, false);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run simulator");
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    loadScenarios();
  }, []);

  const passCount = results.filter((result) => result.recommendation === "pass").length;

  return (
    <main style={{ minHeight: "100vh", background: "#f7f8fb", color: "#111827" }}>
      <NavBar />
      <div style={{ marginLeft: 72, padding: "32px min(5vw, 56px)", display: "grid", gap: 24 }}>
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
          <div>
            <p style={{ margin: "0 0 8px", color: "#0095f6", fontSize: 12, fontWeight: 850, textTransform: "uppercase", letterSpacing: 1.2 }}>Interne</p>
            <h1 style={{ margin: 0, fontSize: 34, letterSpacing: -1.2 }}>Simulateur de conversations Angellos</h1>
            <p style={{ margin: "10px 0 0", maxWidth: 740, color: "#6b7280", lineHeight: 1.55 }}>
              Banc de test léger pour vérifier les réponses Angellos sur les objections et cas sensibles avant de brûler de vrais prospects.
            </p>
          </div>
          <button
            type="button"
            onClick={loadScenarios}
            disabled={loading || running}
            style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 12, padding: "10px 13px", cursor: loading || running ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: 750 }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </header>

        <section style={{ border: "1px solid #ececec", borderRadius: 18, background: "#fff", padding: 18, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={selectedScenario}
            onChange={(event) => setSelectedScenario(event.target.value)}
            style={{ minWidth: 260, border: "1px solid #e5e7eb", borderRadius: 12, padding: "11px 12px", background: "#fff", fontWeight: 700 }}
          >
            <option value="">Tous les scénarios</option>
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>{scenario.title}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => runSimulation()}
            disabled={loading || running}
            style={{ border: "none", background: "#0095f6", color: "#fff", borderRadius: 12, padding: "12px 16px", cursor: loading || running ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: 850 }}
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Lancer simulation
          </button>
          {results.length > 0 && (
            <span style={{ marginLeft: "auto", color: "#6b7280", fontSize: 14 }}>
              {passCount}/{results.length} pass
            </span>
          )}
        </section>

        {error && <div style={{ borderRadius: 14, background: "#fef2f2", color: "#b91c1c", padding: 14, fontSize: 14, fontWeight: 700 }}>{error}</div>}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7280" }}><Loader2 size={18} className="animate-spin" /> Chargement du simulateur…</div>
        ) : results.length > 0 ? (
          <div style={{ display: "grid", gap: 18 }}>
            {results.map((result) => <ResultCard key={result.scenario_id} result={result} />)}
          </div>
        ) : (
          <div style={{ border: "1px dashed #d1d5db", borderRadius: 18, background: "rgba(255,255,255,0.7)", padding: 28, color: "#6b7280" }}>
            Sélectionne un scénario ou lance toute la suite de tests.
          </div>
        )}
      </div>
    </main>
  );
}

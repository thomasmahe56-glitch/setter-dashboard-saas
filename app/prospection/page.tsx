"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  Play,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { createClient } from "@/lib/supabase/client";
import {
  api,
  ProspectingCampaign,
  ProspectingCampaignInput,
  ProspectingContext,
  ProspectingKpi,
  ProspectingProspect,
  ProspectingSourceInput,
  ProspectingTestProfileResult,
} from "@/lib/api";

type Notice = { kind: "success" | "error"; text: string } | null;

type SourceDraft = ProspectingSourceInput & { id: string };

const DEFAULT_SOURCE: SourceDraft = {
  id: "source-1",
  source_type: "followers",
  source_value: "",
  weight: 2,
  enabled: true,
};

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eef0f3",
  borderRadius: 22,
  padding: 20,
  boxShadow: "0 4px 24px rgba(15,23,42,0.06)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: "12px 13px",
  fontSize: 14,
  color: "#111827",
  background: "#fff",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 7,
  color: "#1f2937",
  fontSize: 12,
  fontWeight: 850,
};

export default function ProspectionPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [context, setContext] = useState<ProspectingContext | null>(null);
  const [campaigns, setCampaigns] = useState<ProspectingCampaign[]>([]);
  const [prospects, setProspects] = useState<ProspectingProspect[]>([]);
  const [kpi, setKpi] = useState<ProspectingKpi | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [runningCampaignId, setRunningCampaignId] = useState<string | null>(null);
  const [testingProfile, setTestingProfile] = useState(false);
  const [testResult, setTestResult] = useState<ProspectingTestProfileResult | null>(null);

  const [campaignName, setCampaignName] = useState("Campagne Instagram Nounes");
  const [targetLeads, setTargetLeads] = useState(10);
  const [maxRuns, setMaxRuns] = useState(10);
  const [maxCandidates, setMaxCandidates] = useState(500);
  const [targetLanguage, setTargetLanguage] = useState("français");
  const [markets, setMarkets] = useState("France, Belgique, Suisse");
  const [nicheDescription, setNicheDescription] = useState("");
  const [minFollowers, setMinFollowers] = useState(1000);
  const [maxFollowers, setMaxFollowers] = useState(50000);
  const [sources, setSources] = useState<SourceDraft[]>([DEFAULT_SOURCE]);

  const [testUsername, setTestUsername] = useState("coach_test");
  const [testBio, setTestBio] = useState("");
  const [testFollowers, setTestFollowers] = useState(5000);

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = "/login";
    });
  }, []);

  const loadProspection = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setNotice(null);
    try {
      const [contextData, campaignData, prospectData, kpiData] = await Promise.all([
        api.prospecting.getContext(),
        api.prospecting.getCampaigns(),
        api.prospecting.getProspects(40),
        api.prospecting.getKpi(),
      ]);
      setContext(contextData);
      setCampaigns(campaignData.items || []);
      setProspects(prospectData.items || []);
      setKpi(kpiData);
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Impossible de charger la prospection." });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProspection();
  }, [loadProspection]);

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.status === "running") || campaigns[0] || null,
    [campaigns],
  );

  const contextReady = Boolean(context?.is_complete);
  const missingFields = context?.missing_fields || [];
  const kpiCards = [
    { label: "Qualifiés", value: prospects.filter((p) => p.status === "qualified" || p.status === "new").length, icon: Users },
    { label: "Contactés", value: kpi?.total?.contacted || prospects.filter((p) => p.status === "contacted").length, icon: Send },
    { label: "Réponses", value: kpi?.total?.replied || prospects.filter((p) => p.status === "replied").length, icon: MessageSquareText },
    { label: "Calls bookés", value: kpi?.total?.demo_booked || prospects.filter((p) => p.status === "booked").length, icon: CheckCircle2 },
  ];

  function updateSource(id: string, patch: Partial<SourceDraft>) {
    setSources((current) => current.map((source) => (source.id === id ? { ...source, ...patch } : source)));
  }

  function addSource() {
    setSources((current) => [
      ...current,
      { ...DEFAULT_SOURCE, id: `source-${Date.now()}`, source_value: "" },
    ]);
  }

  function removeSource(id: string) {
    setSources((current) => (current.length === 1 ? current : current.filter((source) => source.id !== id)));
  }

  function campaignPayload(): ProspectingCampaignInput {
    return {
      name: campaignName.trim() || "Campagne Instagram",
      target_leads: targetLeads,
      max_runs: maxRuns,
      max_candidates_total: maxCandidates,
      sources: sources
        .filter((source) => source.source_value.trim())
        .map(({ source_type, source_value, weight, enabled }) => ({
          source_type,
          source_value: source_value.trim(),
          weight,
          enabled,
        })),
      target_language: targetLanguage.trim() || "français",
      target_markets: markets.split(",").map((item) => item.trim()).filter(Boolean),
      niche_description: nicheDescription.trim() || context?.niche || null,
      min_followers: Number.isFinite(minFollowers) ? minFollowers : null,
      max_followers: Number.isFinite(maxFollowers) ? maxFollowers : null,
    };
  }

  async function handleCreateCampaign() {
    const payload = campaignPayload();
    if (!payload.sources.length) {
      setNotice({ kind: "error", text: "Ajoute au moins une source Instagram." });
      return;
    }
    setSavingCampaign(true);
    setNotice(null);
    try {
      const campaign = await api.prospecting.createCampaign(payload);
      setCampaigns((current) => [campaign, ...current.filter((item) => item.id !== campaign.id)]);
      setNotice({ kind: "success", text: "Campagne créée. Tu peux la lancer quand la source est validée." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Impossible de créer la campagne." });
    } finally {
      setSavingCampaign(false);
    }
  }

  async function handleRunCampaign(campaignId: string) {
    setRunningCampaignId(campaignId);
    setNotice(null);
    try {
      const campaign = await api.prospecting.runCampaign(campaignId);
      setCampaigns((current) => current.map((item) => (item.id === campaign.id ? campaign : item)));
      setNotice({ kind: "success", text: "Campagne lancée. Angellos analyse les profils en arrière-plan." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Impossible de lancer la campagne." });
    } finally {
      setRunningCampaignId(null);
      loadProspection(true);
    }
  }

  async function handleTestProfile() {
    if (!testBio.trim()) {
      setNotice({ kind: "error", text: "Colle une bio Instagram à tester." });
      return;
    }
    setTestingProfile(true);
    setTestResult(null);
    setNotice(null);
    try {
      const result = await api.prospecting.testProfile({
        username: testUsername.trim() || "profil_test",
        bio: testBio.trim(),
        followers_count: testFollowers,
        target_language: targetLanguage,
        target_markets: markets.split(",").map((item) => item.trim()).filter(Boolean),
        niche_description: nicheDescription.trim() || context?.niche || null,
      });
      setTestResult(result);
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Test profil impossible." });
    } finally {
      setTestingProfile(false);
    }
  }

  return (
    <div className="app-page">
      <NavBar lastRefresh={null} onRefresh={() => loadProspection(true)} />
      <div className="app-scroll-page">
        <div className="app-page-inner" style={{ maxWidth: 1180 }}>
          <div className="app-page-heading" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 850, color: "#0095F6", textTransform: "uppercase", margin: "0 0 8px" }}>
                Acquisition Angellos
              </p>
              <h1 className="app-page-title" style={{ fontSize: 34, lineHeight: 1.04, fontWeight: 850, color: "#0a0a0a", margin: "0 0 8px" }}>
                Prospection
              </h1>
              <p style={{ fontSize: 14, color: "#626b78", margin: 0, maxWidth: 740, lineHeight: 1.55 }}>
                Crée des campagnes Instagram, qualifie les profils avec le Training Center Angellos, puis prépare les premiers DMs pour une prise de contact propre.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadProspection(true)}
              disabled={refreshing}
              style={primaryButton(false, true)}
            >
              {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Rafraîchir
            </button>
          </div>

          {notice && (
            <div style={{ ...card, marginBottom: 16, borderColor: notice.kind === "success" ? "#b7e4c7" : "#fecaca", background: notice.kind === "success" ? "#f6fff9" : "#fff5f5", color: notice.kind === "success" ? "#166534" : "#b91c1c", display: "flex", gap: 10, alignItems: "center" }}>
              {notice.kind === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span style={{ fontSize: 13, fontWeight: 750 }}>{notice.text}</span>
            </div>
          )}

          {loading ? (
            <ProspectionSkeleton />
          ) : (
            <>
              <div className="kpi-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginBottom: 16 }}>
                {kpiCards.map(({ label, value, icon: Icon }) => (
                  <div key={label} style={card}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <p style={{ color: "#7b8491", fontSize: 12, fontWeight: 800, margin: "0 0 8px" }}>{label}</p>
                        <p style={{ color: "#0a0a0a", fontSize: 30, fontWeight: 850, margin: 0 }}>{value}</p>
                      </div>
                      <div style={{ width: 42, height: 42, borderRadius: 14, display: "grid", placeItems: "center", background: "#edf7ff", color: "#0095F6" }}>
                        <Icon size={19} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="prospection-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: 16, alignItems: "start" }}>
                <div style={{ display: "grid", gap: 16 }}>
                  <section style={{ ...card, borderColor: contextReady ? "#b7e4c7" : "#ffd6a5", background: contextReady ? "#f8fffb" : "#fffaf0" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <p style={{ color: contextReady ? "#16833a" : "#b7791f", fontSize: 12, fontWeight: 850, textTransform: "uppercase", margin: "0 0 8px" }}>
                          Training Center hérité
                        </p>
                        <h2 style={{ color: "#0a0a0a", fontSize: 19, fontWeight: 850, margin: "0 0 7px" }}>
                          {contextReady ? "Contexte prêt pour qualifier les prospects" : "Contexte incomplet"}
                        </h2>
                        <p style={{ color: "#626b78", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                          La niche, l’offre, l’avatar client, le ton et les règles de qualification viennent du Training Center du compte connecté.
                        </p>
                      </div>
                      {contextReady ? <CheckCircle2 color="#16a34a" /> : <AlertCircle color="#b7791f" />}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginTop: 16 }}>
                      <ContextChip label="Business" value={context?.business_name || "Non renseigné"} />
                      <ContextChip label="Niche" value={context?.niche || "Non renseignée"} />
                      <ContextChip label="Offre" value={context?.offer_name || context?.offer || context?.offer_promise || "Non renseignée"} />
                      <ContextChip label="Source" value={context?.source || "training_center"} />
                    </div>
                    {!contextReady && (
                      <p style={{ color: "#9a5b00", fontSize: 13, fontWeight: 700, margin: "14px 0 0" }}>
                        À compléter : {missingFields.length ? missingFields.join(", ") : "Training Center indisponible"}.
                      </p>
                    )}
                  </section>

                  <section style={card}>
                    <SectionTitle icon={Target} eyebrow="Campagne" title="Créer une campagne de prospection" />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 16 }}>
                      <label style={labelStyle}>Nom de campagne<input style={inputStyle} value={campaignName} onChange={(e) => setCampaignName(e.target.value)} /></label>
                      <label style={labelStyle}>Langue cible<input style={inputStyle} value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} /></label>
                      <label style={labelStyle}>Prospects cible<input style={inputStyle} type="number" min={1} max={50} value={targetLeads} onChange={(e) => setTargetLeads(Number(e.target.value))} /></label>
                      <label style={labelStyle}>Runs maximum<input style={inputStyle} type="number" min={1} max={50} value={maxRuns} onChange={(e) => setMaxRuns(Number(e.target.value))} /></label>
                      <label style={labelStyle}>Candidats maximum<input style={inputStyle} type="number" min={50} max={2000} value={maxCandidates} onChange={(e) => setMaxCandidates(Number(e.target.value))} /></label>
                      <label style={labelStyle}>Followers minimum<input style={inputStyle} type="number" min={0} value={minFollowers} onChange={(e) => setMinFollowers(Number(e.target.value))} /></label>
                      <label style={labelStyle}>Followers maximum<input style={inputStyle} type="number" min={0} value={maxFollowers} onChange={(e) => setMaxFollowers(Number(e.target.value))} /></label>
                      <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>Marchés ciblés<input style={inputStyle} value={markets} onChange={(e) => setMarkets(e.target.value)} placeholder="France, Belgique, Suisse" /></label>
                      <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>Angle / exclusion simple<textarea style={{ ...inputStyle, minHeight: 74, resize: "vertical" }} value={nicheDescription} onChange={(e) => setNicheDescription(e.target.value)} placeholder="Optionnel : précision de niche ou profils à éviter." /></label>
                    </div>

                    <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 850, color: "#111827" }}>Sources Instagram</h3>
                        <button type="button" onClick={addSource} style={secondaryButton()}>Ajouter une source</button>
                      </div>
                      {sources.map((source) => (
                        <div key={source.id} className="prospection-source-row" style={{ display: "grid", gridTemplateColumns: "150px minmax(0, 1fr) 84px auto", gap: 8, alignItems: "end" }}>
                          <label style={labelStyle}>Type
                            <select style={inputStyle} value={source.source_type} onChange={(e) => updateSource(source.id, { source_type: e.target.value as SourceDraft["source_type"] })}>
                              <option value="followers">Followers</option>
                              <option value="following">Following</option>
                              <option value="commenters">Commentateurs</option>
                            </select>
                          </label>
                          <label style={labelStyle}>Compte ou URL de post<input style={inputStyle} value={source.source_value} onChange={(e) => updateSource(source.id, { source_value: e.target.value })} placeholder="@compte_source ou https://instagram.com/p/..." /></label>
                          <label style={labelStyle}>Poids<input style={inputStyle} type="number" min={1} max={5} value={source.weight || 1} onChange={(e) => updateSource(source.id, { weight: Number(e.target.value) })} /></label>
                          <button type="button" onClick={() => removeSource(source.id)} style={secondaryButton()}>Retirer</button>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
                      <button type="button" onClick={handleCreateCampaign} disabled={savingCampaign} style={primaryButton(savingCampaign)}>
                        {savingCampaign ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Créer la campagne
                      </button>
                      {activeCampaign && (
                        <button type="button" onClick={() => handleRunCampaign(activeCampaign.id)} disabled={runningCampaignId === activeCampaign.id || activeCampaign.status === "running"} style={primaryButton(runningCampaignId === activeCampaign.id)}>
                          {runningCampaignId === activeCampaign.id ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                          {activeCampaign.status === "running" ? "Campagne en cours" : "Lancer la dernière campagne"}
                        </button>
                      )}
                    </div>
                  </section>

                  <section style={card}>
                    <SectionTitle icon={Search} eyebrow="Prospects" title="Liste qualifiée" />
                    <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                      {prospects.length ? prospects.map((prospect) => <ProspectRow key={prospect.id} prospect={prospect} />) : (
                        <EmptyState text="Aucun prospect qualifié pour ce compte pour le moment." />
                      )}
                    </div>
                  </section>
                </div>

                <aside style={{ display: "grid", gap: 16 }}>
                  <section style={card}>
                    <SectionTitle icon={ShieldCheck} eyebrow="Statut" title="Campagne en cours" />
                    {activeCampaign ? (
                      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                        <StatusPill status={activeCampaign.status} />
                        <h3 style={{ margin: 0, color: "#111827", fontSize: 17, fontWeight: 850 }}>{activeCampaign.name}</h3>
                        <p style={{ margin: 0, color: "#626b78", fontSize: 13, lineHeight: 1.5 }}>
                          {activeCampaign.inserted_total || 0}/{activeCampaign.target_leads || 0} prospects insérés · {activeCampaign.analyzed_total || 0} profils analysés · {activeCampaign.runs_count || 0} runs.
                        </p>
                        {activeCampaign.error && <p style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>{activeCampaign.error}</p>}
                      </div>
                    ) : (
                      <EmptyState text="Crée une campagne pour voir son statut ici." />
                    )}
                  </section>

                  <section style={card}>
                    <SectionTitle icon={Sparkles} eyebrow="Test profil" title="Qualifier une bio" />
                    <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                      <label style={labelStyle}>Username<input style={inputStyle} value={testUsername} onChange={(e) => setTestUsername(e.target.value)} /></label>
                      <label style={labelStyle}>Followers<input style={inputStyle} type="number" min={0} value={testFollowers} onChange={(e) => setTestFollowers(Number(e.target.value))} /></label>
                      <label style={labelStyle}>Bio / profil<textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} value={testBio} onChange={(e) => setTestBio(e.target.value)} placeholder="Colle une bio Instagram ici..." /></label>
                      <button type="button" onClick={handleTestProfile} disabled={testingProfile} style={primaryButton(testingProfile)}>
                        {testingProfile ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        Tester le profil
                      </button>
                    </div>
                    {testResult && (
                      <div style={{ marginTop: 14, border: "1px solid #e5eaf1", borderRadius: 16, padding: 14, background: "#fbfcfd", display: "grid", gap: 8 }}>
                        <ContextChip label="Score" value={String(testResult.qualification?.score ?? "-")} />
                        <ContextChip label="Fit" value={String(testResult.qualification?.fit || "-")} />
                        <ContextChip label="Hook" value={String(testResult.qualification?.hook_angle || "-")} />
                        <p style={{ margin: 0, color: "#4b5563", fontSize: 13, lineHeight: 1.5 }}>{String(testResult.qualification?.reason || "Pas de raison retournée.")}</p>
                        {testResult.qualification?.first_dm && <p style={{ margin: 0, color: "#0a0a0a", fontSize: 13, lineHeight: 1.5, fontWeight: 750 }}>DM : {testResult.qualification.first_dm}</p>}
                      </div>
                    )}
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, eyebrow, title }: { icon: typeof Search; eyebrow: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 42, height: 42, borderRadius: 14, display: "grid", placeItems: "center", background: "#edf7ff", color: "#0095F6" }}>
        <Icon size={19} />
      </div>
      <div>
        <p style={{ color: "#0077c8", fontSize: 11, fontWeight: 850, textTransform: "uppercase", margin: "0 0 4px" }}>{eyebrow}</p>
        <h2 style={{ color: "#0a0a0a", fontSize: 18, fontWeight: 850, margin: 0 }}>{title}</h2>
      </div>
    </div>
  );
}

function ContextChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #e5eaf1", borderRadius: 14, padding: 12, background: "#fff" }}>
      <p style={{ fontSize: 11, color: "#7b8491", textTransform: "uppercase", fontWeight: 850, margin: "0 0 5px" }}>{label}</p>
      <p style={{ fontSize: 13, color: "#111827", fontWeight: 750, margin: 0, lineHeight: 1.35 }}>{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: ProspectingCampaign["status"] }) {
  const meta = {
    draft: ["Brouillon", "#f3f4f6", "#374151"],
    running: ["En cours", "#edf7ff", "#0077c8"],
    completed: ["Terminée", "#ecfdf5", "#166534"],
    failed: ["Erreur", "#fef2f2", "#b91c1c"],
    paused: ["En pause", "#fff7ed", "#9a5b00"],
  }[status];
  return <span style={{ width: "fit-content", borderRadius: 999, padding: "7px 11px", background: meta[1], color: meta[2], fontSize: 12, fontWeight: 850 }}>{meta[0]}</span>;
}

function ProspectRow({ prospect }: { prospect: ProspectingProspect }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center", border: "1px solid #eef0f3", borderRadius: 16, padding: 14, background: "#fff" }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: "0 0 4px", color: "#111827", fontSize: 14, fontWeight: 850 }}>@{prospect.username}</p>
        <p style={{ margin: 0, color: "#626b78", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {prospect.qualification_reason || prospect.bio || "Prospect qualifié par Angellos"}
        </p>
        {prospect.first_dm && <p style={{ margin: "8px 0 0", color: "#0a0a0a", fontSize: 13, fontWeight: 700 }}>DM : {prospect.first_dm}</p>}
      </div>
      <div style={{ textAlign: "right", display: "grid", gap: 6 }}>
        <span style={{ color: "#0095F6", fontSize: 18, fontWeight: 850 }}>{prospect.qualification_score ?? "-"}</span>
        <span style={{ color: "#7b8491", fontSize: 12, fontWeight: 750 }}>{prospect.status}</span>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ border: "1px dashed #d8dee8", borderRadius: 16, padding: 18, color: "#7b8491", fontSize: 13, fontWeight: 650, background: "#fbfcfd" }}>{text}</div>;
}

function ProspectionSkeleton() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="kpi-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
        {[0, 1, 2, 3].map((item) => <div key={item} className="skeleton-shimmer" style={{ height: 120, borderRadius: 22 }} />)}
      </div>
      <div className="skeleton-shimmer" style={{ height: 320, borderRadius: 22 }} />
    </div>
  );
}

function primaryButton(loadingButton = false, compact = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "none",
    borderRadius: 999,
    padding: compact ? "10px 14px" : "12px 16px",
    background: loadingButton ? "#6b7280" : "#0a0a0a",
    color: "#fff",
    cursor: loadingButton ? "wait" : "pointer",
    fontSize: 13,
    fontWeight: 850,
    boxShadow: "0 12px 28px rgba(10,10,10,0.14)",
  };
}

function secondaryButton(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    padding: "10px 12px",
    background: "#fff",
    color: "#374151",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 850,
  };
}

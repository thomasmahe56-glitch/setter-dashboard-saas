"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
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
  ProspectingDiscoveredSource,
  ProspectingGoldenAccount,
  ProspectingKpi,
  ProspectingProspect,
  ProspectingSourceDiscoveryResult,
  ProspectingSourceFeedbackInput,
  ProspectingSourceInput,
  ProspectingTestProfileResult,
} from "@/lib/api";

type Notice = { kind: "success" | "error"; text: string } | null;

type SourceDraft = ProspectingSourceInput & { id: string };
type ProspectStatus = ProspectingProspect["status"];

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
  const [cancelingCampaignId, setCancelingCampaignId] = useState<string | null>(null);
  const [testingProfile, setTestingProfile] = useState(false);
  const [testResult, setTestResult] = useState<ProspectingTestProfileResult | null>(null);
  const [targetHint, setTargetHint] = useState("");
  const [discoveringSources, setDiscoveringSources] = useState(false);
  const [sourceDiscovery, setSourceDiscovery] = useState<ProspectingSourceDiscoveryResult | null>(null);
  const [sourceFeedbackDrafts, setSourceFeedbackDrafts] = useState<Record<string, { rating?: "good" | "bad"; reason: string }>>({});
  const [savingSourceFeedbackKey, setSavingSourceFeedbackKey] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState("Campagne Instagram Nounes");
  const [targetLeads, setTargetLeads] = useState(3);
  const [maxRuns, setMaxRuns] = useState(3);
  const [maxCandidates, setMaxCandidates] = useState(150);
  const [targetLanguage, setTargetLanguage] = useState("français");
  const [markets, setMarkets] = useState("France, Belgique, Suisse");
  const [nicheDescription, setNicheDescription] = useState("");
  const [minFollowers, setMinFollowers] = useState(1000);
  const [maxFollowers, setMaxFollowers] = useState(50000);
  const [sources, setSources] = useState<SourceDraft[]>([DEFAULT_SOURCE]);

  const [testUsername, setTestUsername] = useState("coach_test");
  const [testBio, setTestBio] = useState("");
  const [testFollowers, setTestFollowers] = useState(5000);
  const [selectedProspect, setSelectedProspect] = useState<ProspectingProspect | null>(null);
  const [updatingProspectId, setUpdatingProspectId] = useState<string | null>(null);

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

  function addDiscoveredSource(source: ProspectingDiscoveredSource) {
    if (source.source_value.startsWith("manual_search:")) {
      setNotice({ kind: "error", text: "Cette suggestion est une requête à vérifier : ouvre-la, choisis une vraie URL Instagram, puis colle-la dans la campagne." });
      return;
    }
    setSources((current) => {
      const nextSource: SourceDraft = {
        id: `source-${current.length + 1}`,
        source_type: source.source_type,
        source_value: source.source_value,
        weight: source.source_type === "commenters" ? 4 : 2,
        enabled: true,
      };
      const emptyIndex = current.findIndex((item) => !item.source_value.trim());
      if (emptyIndex === -1) return [...current, nextSource];
      return current.map((item, index) => (index === emptyIndex ? { ...nextSource, id: item.id } : item));
    });
    setNotice({ kind: "success", text: "Source ajoutée à la campagne. Garde un test court avant de scaler." });
  }

  async function handleDiscoverSources() {
    setDiscoveringSources(true);
    setSourceDiscovery(null);
    setNotice(null);
    try {
      const result = await api.prospecting.discoverSourcesFromContext({
        target_hint: targetHint.trim() || undefined,
        max_sources: 10,
        include_commenters: true,
        include_followers: true,
      });
      setSourceDiscovery(result);
      if (!result.sources.length) {
        setNotice({ kind: "error", text: "Aucune source exploitable trouvée. Essaie une précision cible plus concrète." });
      }
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Impossible de suggérer des sources." });
    } finally {
      setDiscoveringSources(false);
    }
  }

  function updateSourceFeedbackDraft(source: ProspectingDiscoveredSource, patch: Partial<{ rating: "good" | "bad"; reason: string }>) {
    const key = sourceFeedbackKey(source);
    setSourceFeedbackDrafts((current) => ({
      ...current,
      [key]: {
        rating: current[key]?.rating || source.feedback?.rating,
        reason: current[key]?.reason ?? source.feedback?.reason ?? "",
        ...patch,
      },
    }));
  }

  async function handleSourceFeedback(source: ProspectingDiscoveredSource) {
    const key = sourceFeedbackKey(source);
    const draft = sourceFeedbackDrafts[key] || { rating: source.feedback?.rating, reason: source.feedback?.reason || "" };
    if (!draft.rating) {
      setNotice({ kind: "error", text: "Choisis d’abord 👍 ou 👎 pour cette source." });
      return;
    }
    setSavingSourceFeedbackKey(key);
    setNotice(null);
    try {
      const input: ProspectingSourceFeedbackInput = {
        source_type: source.source_type,
        source_value: source.source_value,
        rating: draft.rating,
        reason: draft.reason.trim() || undefined,
      };
      await api.prospecting.addSourceFeedback(input);
      setSourceDiscovery((current) => current ? {
        ...current,
        sources: current.sources.map((item) => sourceFeedbackKey(item) === key ? {
          ...item,
          feedback: { rating: input.rating, reason: input.reason || null, created_at: new Date().toISOString() },
        } : item),
      } : current);
      setNotice({ kind: "success", text: "Avis enregistré. Angellos l’utilisera dans les prochaines suggestions." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Impossible d’enregistrer l’avis source." });
    } finally {
      setSavingSourceFeedbackKey(null);
    }
  }

  function campaignPayload(): ProspectingCampaignInput {
    return {
      name: campaignName.trim() || "Campagne Instagram",
      target_leads: targetLeads,
      max_runs: maxRuns,
      max_candidates_total: maxCandidates,
      max_duration_seconds: 300,
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

  async function handleCancelCampaign(campaignId: string) {
    const confirmed = window.confirm("Annuler cette campagne ? Angellos s’arrêtera proprement entre deux runs.");
    if (!confirmed) return;

    setCancelingCampaignId(campaignId);
    setNotice(null);
    try {
      const campaign = await api.prospecting.cancelCampaign(campaignId);
      setCampaigns((current) => current.map((item) => (item.id === campaign.id ? campaign : item)));
      await loadProspection(true);
      setNotice({ kind: "success", text: "Campagne annulée." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Impossible d’annuler la campagne." });
    } finally {
      setCancelingCampaignId(null);
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

  async function handleProspectStatusChange(prospectId: string, status: ProspectStatus) {
    setUpdatingProspectId(prospectId);
    setNotice(null);
    try {
      const result = await api.prospecting.updateProspectStatus(prospectId, status);
      const updated = result.item;
      setProspects((current) => current.map((prospect) => (prospect.id === prospectId ? { ...prospect, ...updated } : prospect)));
      setSelectedProspect((current) => (current?.id === prospectId ? { ...current, ...updated } : current));
      setNotice({ kind: "success", text: `Statut mis à jour : ${prospectStatusLabel(status)}.` });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Impossible de mettre à jour le statut du prospect." });
    } finally {
      setUpdatingProspectId(null);
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
                      <ContextChip label="Offre" value={context?.offer_name || context?.offer || context?.offer_promise || context?.offer_summary || "Non renseignée"} />
                      <ContextChip label="Source" value={context?.source || "training_center"} />
                    </div>
                    {!contextReady && (
                      <p style={{ color: "#9a5b00", fontSize: 13, fontWeight: 700, margin: "14px 0 0" }}>
                        À compléter : {missingFields.length ? missingFields.join(", ") : "Training Center indisponible"}.
                      </p>
                    )}
                  </section>

                  <section style={card}>
                    <SectionTitle icon={Sparkles} eyebrow="1. Trouver les meilleures sources" title="Source Discovery Angellos" />
                    <p style={{ margin: "12px 0 0", color: "#626b78", fontSize: 13, lineHeight: 1.55, fontWeight: 650 }}>
                      Pour un test rapide, privilégie les commentateurs de posts récents : signal plus chaud que les followers.
                    </p>
                    <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                      <label style={labelStyle}>Précision cible optionnelle
                        <textarea
                          style={{ ...inputStyle, minHeight: 82, resize: "vertical" }}
                          value={targetHint}
                          onChange={(e) => setTargetHint(e.target.value)}
                          placeholder="Ex : kinés libéraux français actifs sur Instagram"
                        />
                      </label>
                      <button type="button" onClick={handleDiscoverSources} disabled={discoveringSources} style={primaryButton(discoveringSources)}>
                        {discoveringSources ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        Suggérer des sources
                      </button>
                    </div>
                    {discoveringSources && (
                      <p style={{ margin: "14px 0 0", color: "#0077c8", fontSize: 13, fontWeight: 800 }}>
                        Angellos trouve les gros comptes, puis mine leurs followers et posts récents...
                      </p>
                    )}
                    {sourceDiscovery && (
                      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                        {sourceDiscovery.discovery_mode === "fallback_queries" && (
                          <p style={{ margin: 0, color: "#9a5b00", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 14, padding: 12, fontSize: 13, lineHeight: 1.45, fontWeight: 750 }}>
                            Recherche web serveur indisponible : Angellos propose des requêtes à vérifier, sans inventer de usernames. Ouvre une requête, choisis une vraie URL Instagram, puis colle-la dans les sources.
                          </p>
                        )}
                        {sourceDiscovery.stage2_status === "apify_quota_exhausted" && (
                          <p style={{ margin: 0, color: "#9a5b00", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 14, padding: 12, fontSize: 13, lineHeight: 1.45, fontWeight: 750 }}>
                            Quota Apify atteint : les gros comptes Tavily sont affichés sans sources dérivées. Réessaie après recharge ou baisse le volume.
                          </p>
                        )}
                        {sourceDiscovery.accounts?.length ? sourceDiscovery.accounts.map((account) => (
                          <GoldenAccountCard
                            key={account.username}
                            account={account}
                            drafts={sourceFeedbackDrafts}
                            savingKey={savingSourceFeedbackKey}
                            onAdd={addDiscoveredSource}
                            onDraftChange={updateSourceFeedbackDraft}
                            onSaveFeedback={handleSourceFeedback}
                          />
                        )) : sourceDiscovery.sources.length ? sourceDiscovery.sources.map((source) => (
                          <DiscoveredSourceRow
                            key={`${source.source_type}:${source.source_value}`}
                            source={source}
                            draft={sourceFeedbackDrafts[sourceFeedbackKey(source)]}
                            saving={savingSourceFeedbackKey === sourceFeedbackKey(source)}
                            onAdd={() => addDiscoveredSource(source)}
                            onDraftChange={(patch) => updateSourceFeedbackDraft(source, patch)}
                            onSaveFeedback={() => handleSourceFeedback(source)}
                          />
                        )) : <EmptyState text="Aucune suggestion retournée pour cette cible." />}
                        {sourceDiscovery.queries.length > 0 && (
                          <details style={{ border: "1px solid #e5eaf1", borderRadius: 14, padding: 12, background: "#fbfcfd" }}>
                            <summary style={{ cursor: "pointer", color: "#374151", fontSize: 12, fontWeight: 850 }}>Requêtes utilisées par Angellos</summary>
                            <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "#626b78", fontSize: 12, lineHeight: 1.6 }}>
                              {sourceDiscovery.queries.map((query) => <li key={query}>{query}</li>)}
                            </ul>
                          </details>
                        )}
                      </div>
                    )}
                  </section>

                  <section style={card}>
                    <SectionTitle icon={Target} eyebrow="Campagne" title="Créer une campagne de prospection" />
                    <p style={{ margin: "12px 0 0", color: "#626b78", fontSize: 13, lineHeight: 1.55, fontWeight: 650 }}>
                      Mode test rapide : commence avec 3 prospects. Si la source est bonne, relance plus large ensuite.
                    </p>
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
                        <div>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 850, color: "#111827" }}>Sources Instagram</h3>
                          <p style={{ margin: "6px 0 0", color: "#626b78", fontSize: 12, lineHeight: 1.45, fontWeight: 650 }}>
                            Pour un test rapide, privilégie Commentateurs sur un post récent et niché. Followers est plus lent et moins qualifié.
                          </p>
                        </div>
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
                      {prospects.length ? prospects.map((prospect) => <ProspectRow key={prospect.id} prospect={prospect} onOpen={() => setSelectedProspect(prospect)} />) : (
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
                        <StatusPill status={activeCampaign.status} stopReason={activeCampaign.stop_reason} />
                        <h3 style={{ margin: 0, color: "#111827", fontSize: 17, fontWeight: 850 }}>{activeCampaign.name}</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                          <ProgressChip label="Profils analysés" value={String(activeCampaign.analyzed_total || 0)} />
                          <ProgressChip label="Prospects trouvés" value={`${activeCampaign.inserted_total || 0}/${activeCampaign.target_leads || 0}`} />
                          <ProgressChip label="Runs effectués" value={`${activeCampaign.runs_count || 0}/${activeCampaign.max_runs || "-"}`} />
                          <ProgressChip label="Temps écoulé" value={formatElapsed(activeCampaign.elapsed_seconds)} />
                          <ProgressChip label="Source actuelle" value={currentCampaignSource(activeCampaign)} wide />
                        </div>
                        {(activeCampaign.inserted_total || 0) === 0 && (activeCampaign.runs_count || 0) >= 1 && (
                          <p style={{ margin: 0, color: "#9a5b00", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 14, padding: 12, fontSize: 13, lineHeight: 1.45, fontWeight: 750 }}>
                            Aucun prospect qualifié pour l’instant. Si ça reste à 0 après 2-3 runs, change de source.
                          </p>
                        )}
                        {activeCampaign.status !== "running" && (activeCampaign.inserted_total || 0) === 0 && (activeCampaign.runs_count || 0) >= (activeCampaign.max_runs || 0) && (
                          <p style={{ margin: 0, color: "#b91c1c", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 14, padding: 12, fontSize: 13, lineHeight: 1.45, fontWeight: 750 }}>
                            0 prospect inséré après {activeCampaign.runs_count || 0} runs : source faible ou filtre trop strict. Teste plutôt Commentateurs sur un post récent et niché.
                          </p>
                        )}
                        {activeCampaign.error && <p style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>{activeCampaign.error}</p>}
                        {activeCampaign.status === "running" && (
                          <button
                            type="button"
                            onClick={() => handleCancelCampaign(activeCampaign.id)}
                            disabled={cancelingCampaignId === activeCampaign.id}
                            style={dangerButton(cancelingCampaignId === activeCampaign.id)}
                          >
                            {cancelingCampaignId === activeCampaign.id ? <Loader2 size={16} className="animate-spin" /> : <AlertCircle size={16} />}
                            Annuler la campagne
                          </button>
                        )}
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
      <ProspectDetailDrawer
        prospect={selectedProspect}
        updatingId={updatingProspectId}
        onClose={() => setSelectedProspect(null)}
        onStatusChange={handleProspectStatusChange}
      />
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

function ProgressChip({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div style={{ border: "1px solid #e5eaf1", borderRadius: 14, padding: 12, background: "#fbfcfd", gridColumn: wide ? "1 / -1" : undefined }}>
      <p style={{ fontSize: 11, color: "#7b8491", textTransform: "uppercase", fontWeight: 850, margin: "0 0 5px" }}>{label}</p>
      <p style={{ fontSize: 13, color: "#111827", fontWeight: 800, margin: 0, lineHeight: 1.35, overflowWrap: "anywhere" }}>{value}</p>
    </div>
  );
}

function formatElapsed(seconds?: number | null) {
  if (!seconds || seconds < 0) return "-";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}m ${rest}s` : `${rest}s`;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function currentCampaignSource(campaign: ProspectingCampaign) {
  const lastRun = campaign.runs?.[campaign.runs.length - 1];
  if (lastRun?.source_type && lastRun?.source_value) {
    return `${sourceTypeLabel(lastRun.source_type)} · ${lastRun.source_value}`;
  }
  const enabledSource = campaign.sources?.find((source) => source.enabled !== false) || campaign.sources?.[0];
  if (enabledSource?.source_type && enabledSource?.source_value) {
    return `${sourceTypeLabel(enabledSource.source_type)} · ${enabledSource.source_value}`;
  }
  return "-";
}

function sourceTypeLabel(sourceType: ProspectingSourceInput["source_type"]) {
  return {
    followers: "Followers",
    following: "Following",
    commenters: "Commentateurs",
  }[sourceType];
}

function sourceFeedbackKey(source: ProspectingDiscoveredSource) {
  return `${source.source_type}:${source.source_value}`;
}

function sourceOpenUrl(source: ProspectingDiscoveredSource) {
  if (source.source_value.startsWith("manual_search:")) {
    return `https://www.google.com/search?q=${encodeURIComponent(source.source_value.replace("manual_search:", ""))}`;
  }
  if (source.source_type === "commenters") return source.source_value;
  return `https://www.instagram.com/${source.source_value.replace(/^@/, "")}`;
}

function GoldenAccountCard({
  account,
  drafts,
  savingKey,
  onAdd,
  onDraftChange,
  onSaveFeedback,
}: {
  account: ProspectingGoldenAccount;
  drafts: Record<string, { rating?: "good" | "bad"; reason: string }>;
  savingKey: string | null;
  onAdd: (source: ProspectingDiscoveredSource) => void;
  onDraftChange: (source: ProspectingDiscoveredSource, patch: Partial<{ rating: "good" | "bad"; reason: string }>) => void;
  onSaveFeedback: (source: ProspectingDiscoveredSource) => void;
}) {
  const sources = account.sources || [];
  return (
    <div style={{ border: "1px solid #dbeafe", borderRadius: 18, padding: 14, background: "#f8fbff", display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 7 }}>
            <span style={{ width: "fit-content", borderRadius: 999, padding: "5px 9px", background: "#dbeafe", color: "#1d4ed8", fontSize: 11, fontWeight: 850 }}>
              Gros compte
            </span>
            <span style={{ color: "#0a0a0a", fontSize: 13, fontWeight: 850 }}>@{account.username}</span>
            <span style={{ color: "#374151", fontSize: 12, fontWeight: 800 }}>{formatNumber(account.followers_count)} followers</span>
          </div>
          <p style={{ margin: 0, color: "#4b5563", fontSize: 13, lineHeight: 1.45 }}>{account.reason}</p>
          {account.stage2_error ? (
            <p style={{ margin: "8px 0 0", color: "#9a5b00", fontSize: 12, lineHeight: 1.45, fontWeight: 800 }}>{account.stage2_error}</p>
          ) : null}
        </div>
        <a href={account.profile_url || `https://www.instagram.com/${account.username}`} target="_blank" rel="noreferrer" style={{ ...secondaryButton(), textDecoration: "none" }}>
          <ExternalLink size={15} />
          Ouvrir
        </a>
      </div>
      {sources.length ? (
        <div style={{ display: "grid", gap: 9 }}>
          <p style={{ margin: 0, color: "#374151", fontSize: 12, fontWeight: 850 }}>Sources dérivées</p>
          {sources.map((source) => (
            <DiscoveredSourceRow
              key={`${source.source_type}:${source.source_value}`}
              source={source}
              draft={drafts[sourceFeedbackKey(source)]}
              saving={savingKey === sourceFeedbackKey(source)}
              onAdd={() => onAdd(source)}
              onDraftChange={(patch) => onDraftChange(source, patch)}
              onSaveFeedback={() => onSaveFeedback(source)}
            />
          ))}
        </div>
      ) : (
        <EmptyState text="Aucune source dérivée Apify pour ce compte pour le moment." />
      )}
    </div>
  );
}

function DiscoveredSourceRow({
  source,
  draft,
  saving,
  onAdd,
  onDraftChange,
  onSaveFeedback,
}: {
  source: ProspectingDiscoveredSource;
  draft?: { rating?: "good" | "bad"; reason: string };
  saving: boolean;
  onAdd: () => void;
  onDraftChange: (patch: Partial<{ rating: "good" | "bad"; reason: string }>) => void;
  onSaveFeedback: () => void;
}) {
  const isManualSearch = source.source_value.startsWith("manual_search:");
  const selectedRating = draft?.rating || source.feedback?.rating;
  const reason = draft?.reason ?? source.feedback?.reason ?? "";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center", border: "1px solid #e5eaf1", borderRadius: 16, padding: 14, background: "#fff" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 7 }}>
          <span style={{ width: "fit-content", borderRadius: 999, padding: "5px 9px", background: source.source_type === "commenters" ? "#edf7ff" : "#f3f4f6", color: source.source_type === "commenters" ? "#0077c8" : "#374151", fontSize: 11, fontWeight: 850 }}>
            {source.source_type === "commenters" ? "Commentateurs" : "Followers"}
          </span>
          <span style={{ color: "#0a0a0a", fontSize: 13, fontWeight: 850 }}>Score {source.score}/100</span>
          {source.source_type === "commenters" ? (
            <span style={{ color: (source.comment_count || 0) >= 10 ? "#166534" : "#9a5b00", fontSize: 12, fontWeight: 850 }}>
              {source.comment_count ?? "?"} commentaires
            </span>
          ) : source.followers_count !== undefined ? (
            <span style={{ color: "#374151", fontSize: 12, fontWeight: 850 }}>
              {formatNumber(source.followers_count)} followers
            </span>
          ) : null}
          <span style={{ color: riskColor(source.risk), fontSize: 12, fontWeight: 850 }}>Risque {riskLabel(source.risk)}</span>
        </div>
        <p style={{ margin: "0 0 5px", color: "#111827", fontSize: 14, fontWeight: 850 }}>{source.label}</p>
        <p style={{ margin: "0 0 6px", color: "#626b78", fontSize: 12, lineHeight: 1.45, overflowWrap: "anywhere" }}>{source.source_value}</p>
        <p style={{ margin: 0, color: "#4b5563", fontSize: 13, lineHeight: 1.45 }}>{source.reason}</p>
        {source.feedback ? (
          <p style={{ margin: "9px 0 0", color: source.feedback.rating === "bad" ? "#b91c1c" : "#166534", background: source.feedback.rating === "bad" ? "#fff5f5" : "#f6fff9", border: `1px solid ${source.feedback.rating === "bad" ? "#fecaca" : "#b7e4c7"}`, borderRadius: 12, padding: "8px 10px", fontSize: 12, fontWeight: 800 }}>
            Déjà jugée {source.feedback.rating === "bad" ? "👎" : "👍"}{source.feedback.reason ? ` : ${source.feedback.reason}` : ""}
          </p>
        ) : null}
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => onDraftChange({ rating: "good" })} style={ratingButton(selectedRating === "good", "good")}>👍 Bonne source</button>
            <button type="button" onClick={() => onDraftChange({ rating: "bad" })} style={ratingButton(selectedRating === "bad", "bad")}>👎 Mauvaise source</button>
          </div>
          <input
            style={{ ...inputStyle, padding: "10px 12px", fontSize: 13 }}
            value={reason}
            onChange={(event) => onDraftChange({ reason: event.target.value })}
            placeholder="Pourquoi ? (optionnel)"
          />
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, justifyItems: "stretch" }}>
        <a href={sourceOpenUrl(source)} target="_blank" rel="noreferrer" style={{ ...secondaryButton(), textDecoration: "none" }}>
          <ExternalLink size={15} />
          Ouvrir
        </a>
        <button type="button" onClick={onAdd} style={secondaryButton()}>
          {isManualSearch ? "À vérifier" : "Ajouter à la campagne"}
        </button>
        <button type="button" onClick={onSaveFeedback} disabled={saving} style={primaryButton(saving, true)}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function ratingButton(active: boolean, rating: "good" | "bad"): React.CSSProperties {
  return {
    ...secondaryButton(),
    borderColor: active ? (rating === "good" ? "#86efac" : "#fecaca") : "#e5e7eb",
    background: active ? (rating === "good" ? "#f0fdf4" : "#fff5f5") : "#fff",
    color: active ? (rating === "good" ? "#166534" : "#b91c1c") : "#374151",
  };
}

function riskLabel(risk: string) {
  const labels: Record<string, string> = { low: "faible", medium: "moyen", high: "élevé" };
  return labels[risk] || risk;
}

function riskColor(risk: string) {
  if (risk === "low") return "#166534";
  if (risk === "medium") return "#9a5b00";
  return "#b91c1c";
}

function StatusPill({ status, stopReason }: { status: ProspectingCampaign["status"]; stopReason?: string | null }) {
  const meta = {
    draft: ["Brouillon", "#f3f4f6", "#374151"],
    running: ["En cours", "#edf7ff", "#0077c8"],
    completed: ["Terminée", "#ecfdf5", "#166534"],
    failed: ["Erreur", "#fef2f2", "#b91c1c"],
    paused: [stopReason === "manual_stop" ? "Annulée" : "En pause", "#fff7ed", "#9a5b00"],
  }[status];
  return <span style={{ width: "fit-content", borderRadius: 999, padding: "7px 11px", background: meta[1], color: meta[2], fontSize: 12, fontWeight: 850 }}>{meta[0]}</span>;
}

function prospectStatusLabel(status: ProspectStatus) {
  const labels: Record<ProspectStatus, string> = {
    new: "Nouveau",
    qualified: "Qualifié",
    contacted: "Contacté",
    replied: "Répondu",
    booked: "Booké",
    ignored: "Ignoré",
  };
  return labels[status];
}

function ProspectStatusPill({ status }: { status: ProspectStatus }) {
  const colors: Record<ProspectStatus, [string, string]> = {
    new: ["#edf7ff", "#0077c8"],
    qualified: ["#ecfdf5", "#166534"],
    contacted: ["#f3f4f6", "#374151"],
    replied: ["#fff7ed", "#9a5b00"],
    booked: ["#ecfdf5", "#166534"],
    ignored: ["#fef2f2", "#b91c1c"],
  };
  const [background, color] = colors[status];
  return <span style={{ width: "fit-content", borderRadius: 999, padding: "6px 10px", background, color, fontSize: 12, fontWeight: 850 }}>{prospectStatusLabel(status)}</span>;
}

function ProspectRow({ prospect, onOpen }: { prospect: ProspectingProspect; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center", border: "1px solid #eef0f3", borderRadius: 16, padding: 14, background: "#fff", cursor: "pointer", textAlign: "left" }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: "0 0 4px", color: "#111827", fontSize: 14, fontWeight: 850 }}>@{prospect.username}</p>
        <p style={{ margin: 0, color: "#626b78", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {prospect.qualification_reason || prospect.bio || "Prospect qualifié par Angellos"}
        </p>
        {prospect.first_dm && <p style={{ margin: "8px 0 0", color: "#0a0a0a", fontSize: 13, fontWeight: 700 }}>DM : {prospect.first_dm}</p>}
      </div>
      <div style={{ textAlign: "right", display: "grid", gap: 6, justifyItems: "end" }}>
        <span style={{ color: "#0095F6", fontSize: 18, fontWeight: 850 }}>{prospect.qualification_score ?? "-"}</span>
        <ProspectStatusPill status={prospect.status} />
      </div>
    </button>
  );
}

function ProspectDetailDrawer({
  prospect,
  updatingId,
  onClose,
  onStatusChange,
}: {
  prospect: ProspectingProspect | null;
  updatingId: string | null;
  onClose: () => void;
  onStatusChange: (prospectId: string, status: ProspectStatus) => void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  if (!prospect) return null;

  async function copyDm() {
    if (!prospect?.first_dm) return;
    try {
      await navigator.clipboard.writeText(prospect.first_dm);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div role="presentation" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", justifyContent: "flex-end", background: "rgba(15,23,42,0.35)", backdropFilter: "blur(4px)" }}>
      <aside role="dialog" aria-modal="true" aria-label={`Fiche prospect @${prospect.username}`} onClick={(event) => event.stopPropagation()} style={{ width: "min(560px, 100%)", height: "100%", overflowY: "auto", background: "#fff", boxShadow: "-18px 0 46px rgba(15,23,42,0.18)", padding: 22, display: "grid", alignContent: "start", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: "#0077c8", fontSize: 11, fontWeight: 850, textTransform: "uppercase", margin: "0 0 7px" }}>Fiche prospect</p>
            <h2 style={{ color: "#0a0a0a", fontSize: 27, lineHeight: 1.05, fontWeight: 850, margin: "0 0 6px", overflowWrap: "anywhere" }}>@{prospect.username || "prospect"}</h2>
            <p style={{ margin: 0, color: "#626b78", fontSize: 14, fontWeight: 750 }}>{prospect.full_name || "Nom complet non disponible"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer la fiche prospect" style={{ border: "1px solid #e5e7eb", borderRadius: 999, width: 38, height: 38, background: "#fff", color: "#374151", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          <ProgressChip label="Score" value={String(prospect.qualification_score ?? "-")} />
          <ProgressChip label="Fit" value={prospect.qualification_fit || "-"} />
          <div style={{ border: "1px solid #e5eaf1", borderRadius: 14, padding: 12, background: "#fbfcfd" }}>
            <p style={{ fontSize: 11, color: "#7b8491", textTransform: "uppercase", fontWeight: 850, margin: "0 0 7px" }}>Statut</p>
            <ProspectStatusPill status={prospect.status} />
          </div>
        </div>

        <DetailSection title="Profil">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {prospect.profile_url ? (
              <a href={prospect.profile_url} target="_blank" rel="noreferrer" style={{ ...secondaryButton(), textDecoration: "none" }}>
                <ExternalLink size={15} />
                Ouvrir Instagram
              </a>
            ) : null}
          </div>
          <p style={{ margin: 0, color: "#4b5563", fontSize: 13, lineHeight: 1.55 }}>{prospect.bio || "Bio non disponible."}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <ContextChip label="Followers" value={formatNumber(prospect.followers_count)} />
            <ContextChip label="Following" value={formatNumber(prospect.following_count)} />
            <ContextChip label="Posts" value={formatNumber(prospect.posts_count)} />
            <ContextChip label="Créé le" value={formatDate(prospect.created_at)} />
          </div>
        </DetailSection>

        <DetailSection title="Analyse">
          <p style={{ margin: 0, color: "#4b5563", fontSize: 13, lineHeight: 1.55 }}>{prospect.qualification_reason || "Aucune raison de qualification disponible."}</p>
          <div>
            <h4 style={{ margin: "0 0 8px", color: "#111827", fontSize: 13, fontWeight: 850 }}>Pain points</h4>
            {prospect.pain_points?.length ? (
              <ul style={{ margin: 0, paddingLeft: 18, color: "#4b5563", fontSize: 13, lineHeight: 1.55 }}>
                {prospect.pain_points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            ) : (
              <p style={{ margin: 0, color: "#7b8491", fontSize: 13 }}>Aucun pain point détecté.</p>
            )}
          </div>
          <ContextChip label="Angle d’offre" value={prospect.offer_angle || "-"} />
          {prospect.hook_angle ? <ContextChip label="Hook" value={prospect.hook_angle} /> : null}
        </DetailSection>

        <DetailSection title="Premier DM">
          <p style={{ margin: 0, border: "1px solid #e5eaf1", borderRadius: 16, padding: 14, background: "#fbfcfd", color: "#111827", fontSize: 14, lineHeight: 1.55, fontWeight: 700, whiteSpace: "pre-wrap" }}>{prospect.first_dm || "Aucun premier DM généré."}</p>
          <button type="button" onClick={copyDm} disabled={!prospect.first_dm} style={secondaryButton(!prospect.first_dm)}>
            <Copy size={15} />
            Copier le DM
          </button>
          {copyState === "copied" ? <p style={{ margin: 0, color: "#166534", fontSize: 12, fontWeight: 800 }}>DM copié.</p> : null}
          {copyState === "error" ? <p style={{ margin: 0, color: "#b91c1c", fontSize: 12, fontWeight: 800 }}>Copie impossible.</p> : null}
        </DetailSection>

        <DetailSection title="Actions">
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {prospect.profile_url ? (
              <a href={prospect.profile_url} target="_blank" rel="noreferrer" style={{ ...secondaryButton(), textDecoration: "none" }}>
                <ExternalLink size={15} />
                Ouvrir le profil Instagram
              </a>
            ) : null}
            {(["contacted", "replied", "booked", "ignored"] as ProspectStatus[]).map((status) => (
              <button key={status} type="button" onClick={() => onStatusChange(prospect.id, status)} disabled={updatingId === prospect.id} style={status === "ignored" ? dangerButton(updatingId === prospect.id) : primaryButton(updatingId === prospect.id, true)}>
                {updatingId === prospect.id ? <Loader2 size={15} className="animate-spin" /> : null}
                Marquer {prospectStatusLabel(status).toLowerCase()}
              </button>
            ))}
          </div>
        </DetailSection>
      </aside>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid #eef0f3", borderRadius: 18, padding: 16, background: "#fff", display: "grid", gap: 12 }}>
      <h3 style={{ margin: 0, color: "#0a0a0a", fontSize: 16, fontWeight: 850 }}>{title}</h3>
      {children}
    </section>
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

function secondaryButton(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    padding: "10px 12px",
    background: disabled ? "#f3f4f6" : "#fff",
    color: disabled ? "#9ca3af" : "#374151",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 12,
    fontWeight: 850,
  };
}

function dangerButton(loadingButton = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid #fecaca",
    borderRadius: 999,
    padding: "11px 14px",
    background: loadingButton ? "#fee2e2" : "#fff5f5",
    color: "#b91c1c",
    cursor: loadingButton ? "wait" : "pointer",
    fontSize: 13,
    fontWeight: 850,
  };
}

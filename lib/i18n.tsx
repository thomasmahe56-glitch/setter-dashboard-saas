"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type DashboardLanguage = "en" | "fr";

type I18nContextValue = {
  language: DashboardLanguage;
  setLanguage: (language: DashboardLanguage) => void;
  t: (key: string, fallback: string) => string;
};

const STORAGE_KEY = "angellos_dashboard_language";

const fr: Record<string, string> = {
  "nav.crm": "CRM",
  "nav.followUps": "Relances",
  "nav.kpis": "KPIs",
  "nav.insights": "Insights",
  "nav.training": "Formation",
  "nav.openMenu": "Ouvrir le menu",
  "nav.closeMenu": "Fermer le menu",
  "nav.updated": "Mis à jour",
  "nav.refresh": "Rafraîchir",
  "nav.logout": "Déconnexion",
  "nav.language": "Langue",
  "crm.loadConversationError": "Impossible de charger la conversation",
  "crm.selectProspect": "Sélectionne un prospect pour voir la conversation",
  "relance.title": "Relances",
  "relance.subtitle": "Séquence prévue : automatique à 23h, puis assistée par IA à J+3, J+10 et J+30.",
  "relance.compliance": "Mode conforme Meta",
  "relance.due": "Relances à traiter",
  "relance.dueHelp": "Calculé depuis l’historique des messages. Les anciennes conversations sans timestamp utilisent leur date de création.",
  "relance.empty": "Aucune relance à traiter pour l’instant.",
  "kpi.title": "Performance",
  "kpi.subtitle": "Vue d’ensemble du pipeline",
  "kpi.funnel": "Tunnel de conversion",
  "kpi.funnelHelp": "Du premier message au contrat signé",
  "kpi.aiAgent": "Agent IA",
  "kpi.activeAgents": "agents actifs",
  "kpi.totalProspects": "Prospects totaux",
  "kpi.signed": "Signés",
  "kpi.conversionRate": "Taux conv.",
  "kpi.recentActivity": "Activité récente",
  "insights.title": "Insights",
  "insights.subtitle": "Analyse automatique des conversations pour améliorer l’agent",
  "insights.run": "Lancer l’analyse",
  "insights.running": "Analyse en cours...",
  "insights.empty": "Aucune analyse pour l’instant.",
  "insights.emptyHelp": "Lance une analyse pour obtenir des insights depuis tes conversations.",
  "training.offer.eyebrow": "Ton offre",
  "training.offer.title": "Apprends à Angellos ce que tu vends",
  "training.offer.description": "Donne à Angellos les bases pour comprendre ton offre et la prochaine étape attendue.",
  "training.offer.save": "Sauver l’offre",
  "training.businessName": "Nom de l’entreprise",
  "training.coachFounder": "Coach / fondateur",
  "training.niche": "Niche",
  "training.offerName": "Nom de l’offre",
  "training.language": "Langue des réponses",
  "training.offerPromise": "Promesse de l’offre",
  "training.offerFormat": "Format / accompagnement",
  "training.priceTerms": "Prix / conditions",
  "training.advancedFields": "Champs avancés",
  "training.proofPoints": "Preuves / résultats",
  "training.tone": "Ton à respecter",
  "training.doNotSay": "À ne pas dire",
  "training.callLink": "Lien d’appel",
  "training.salesPageLink": "Lien page de vente",
  "training.freeNotes": "Notes libres",
};

const dictionaries: Record<DashboardLanguage, Record<string, string>> = { en: {}, fr };

const I18nContext = createContext<I18nContextValue | null>(null);

function readInitialLanguage(): DashboardLanguage {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem(STORAGE_KEY) === "fr" ? "fr" : "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<DashboardLanguage>("en");

  useEffect(() => {
    setLanguageState(readInitialLanguage());
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage: (nextLanguage) => {
      setLanguageState(nextLanguage);
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
      document.documentElement.lang = nextLanguage;
    },
    t: (key, fallback) => dictionaries[language][key] || fallback,
  }), [language]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context) return context;

  // Defensive fallback for production auth/navigation edge cases where a cached
  // route can render before the root provider is hydrated. Missing translations
  // must never make the dashboard unusable.
  return {
    language: "en" as DashboardLanguage,
    setLanguage: (nextLanguage: DashboardLanguage) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, nextLanguage);
        document.documentElement.lang = nextLanguage;
      }
    },
    t: (_key: string, fallback: string) => fallback,
  };
}

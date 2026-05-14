"use client";
import { useState, useEffect, useCallback } from "react";
import { api, ConversationSummary } from "@/lib/api";

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await api.getConversationSummaries();
      setConversations(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") {
        localStorage.removeItem("dashboard_secret");
        window.location.href = "/login";
      } else {
        setError("Erreur de connexion");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { conversations, setConversations, loading, error, lastRefresh, refresh: fetch };
}

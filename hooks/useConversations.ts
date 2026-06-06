"use client";
import { useState, useEffect, useCallback } from "react";
import { api, ApiAuthError, ConversationSummary } from "@/lib/api";

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
      if (e instanceof Error && e.message === "NO_SESSION") {
        const { supabase } = await import("@/lib/supabase");
        await supabase.auth.signOut();
        window.location.href = "/login";
      } else if (e instanceof ApiAuthError) {
        setError(`Supabase connection OK, but the API rejected the token (${e.status}): ${e.detail}`);
      } else if (e instanceof Error && e.message === "API_URL_MISSING") {
        setError("NEXT_PUBLIC_API_URL is not configured");
      } else {
        setError("Connection error");
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

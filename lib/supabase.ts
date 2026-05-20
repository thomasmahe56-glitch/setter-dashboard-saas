import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;
  _supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
  return _supabase;
}

export const supabase = {
  auth: {
    getSession: () => getSupabaseClient().auth.getSession(),
    getUser: () => getSupabaseClient().auth.getUser(),
    signInWithPassword: (credentials: { email: string; password: string }) =>
      getSupabaseClient().auth.signInWithPassword(credentials),
    signOut: () => getSupabaseClient().auth.signOut(),
    onAuthStateChange: (
      callback: Parameters<SupabaseClient["auth"]["onAuthStateChange"]>[0]
    ) => getSupabaseClient().auth.onAuthStateChange(callback),
  },
};

export async function getAccessToken(): Promise<string> {
  const { data } = await getSupabaseClient().auth.getSession();
  const token = data.session?.access_token ?? "";
  console.log("[auth] getAccessToken:", token ? `token OK (${token.length} chars)` : "TOKEN VIDE — session absente");
  return token;
}

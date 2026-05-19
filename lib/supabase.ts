import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  _supabase = createClient(url, key);
  return _supabase;
}

export const supabase = {
  auth: {
    getSession: () => getSupabaseClient().auth.getSession(),
    signInWithPassword: (credentials: { email: string; password: string }) =>
      getSupabaseClient().auth.signInWithPassword(credentials),
    signOut: () => getSupabaseClient().auth.signOut(),
    onAuthStateChange: (callback: Parameters<SupabaseClient["auth"]["onAuthStateChange"]>[0]) =>
      getSupabaseClient().auth.onAuthStateChange(callback),
  },
};

export async function getAccessToken(): Promise<string> {
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session?.access_token ?? "";
}

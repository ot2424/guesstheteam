import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabase = Boolean(url && anon);

if (!hasSupabase) {
  console.warn('[Supabase] VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY fehlt. Login ist deaktiviert.');
}

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', anon ?? 'placeholder');

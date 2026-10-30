import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { IS_ONLINE_EDITION } from '../../edition';
import { SyncError } from '../../domain/errors';

let client: SupabaseClient | null = null;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function getSupabaseClient(): SupabaseClient {
  if (!IS_ONLINE_EDITION) {
    throw new SyncError('Cloud accounts are not included in this build.', {
      recovery:
        'Install the online edition to connect an account. The offline edition keeps working without one.',
    });
  }

  if (client) {
    return client;
  }

  const config = getSupabaseConfig();

  if (!config) {
    throw new SyncError('Cloud accounts are not configured for this build.', {
      recovery:
        'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY when building the online edition.',
    });
  }

  client = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv, validateEnv } from './env.js';

let client: SupabaseClient | null = null;
let envValidated = false;

export function getSupabase(): SupabaseClient {
  if (!envValidated) {
    validateEnv();
    envValidated = true;
  }
  if (!client) {
    const url = getEnv('SUPABASE_URL');
    const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      throw new Error('Supabase credentials not configured');
    }
    client = createClient(url, key);
  }
  return client;
}

export function getJobsTable(): string {
  return getEnv('SUPABASE_JOBS_TABLE', 'jobs');
}

export function getClicksTable(): string {
  return getEnv('SUPABASE_CLICKS_TABLE', 'clicks');
}

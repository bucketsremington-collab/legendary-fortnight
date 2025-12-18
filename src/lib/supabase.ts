import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if we're in demo mode (no Supabase credentials)
export const isDemoMode = !supabaseUrl || !supabaseAnonKey || import.meta.env.VITE_DEMO_MODE === 'true';

// Create Supabase client (will be null-ish in demo mode)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabase !== null && !isDemoMode;
};

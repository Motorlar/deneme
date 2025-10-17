import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL ve Anon Key gerekli');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SiteConfiguration {
  id: string;
  user_id: string;
  site_url: string;
  site_name: string;
  field_mappings: Record<string, string>;
  list_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  site_config_id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  source_url: string;
  created_at: string;
  site_configurations?: {
    site_name: string;
  };
}

// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rzrrvodiegjfwtebxxvo.supabase.co';
const supabaseAnonKey = 'sb_publishable_hoMnur6vUqLq46wKh5mGpA_dVQ3DnZA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Environment variables o'qish (Vite browser/build va Node test muhitlari uchun xavfsiz)
const rawUrl = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL)
  ? import.meta.env.VITE_SUPABASE_URL
  : (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '');

const rawAnonKey = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_ANON_KEY)
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : '');

const supabaseUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';
const supabaseAnonKey = typeof rawAnonKey === 'string' ? rawAnonKey.trim() : '';

// Konfiguratsiya to'liqligini tekshirish
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0 &&
  !supabaseUrl.includes('your_supabase_project_url')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase Config Warning] VITE_SUPABASE_URL yoki VITE_SUPABASE_ANON_KEY aniqlanmadi. ' +
    'Iltimos, .env yoki .env.local faylida ushbu o‘zgaruvchilarni sozlang (.env.example namunasiga qarang).'
  );
}

// Hardcoded fallback ishlatilmaydi: agar env mavjud bo'lmasa, dastur qulab tushmasligi
// uchun neytral placeholder bilan xavfsiz klient hosil qilinadi (eski loyihaga yashirin ulanish qilinmaydi).
const targetUrl = isSupabaseConfigured ? supabaseUrl : 'https://unconfigured-project.supabase.co';
const targetKey = isSupabaseConfigured ? supabaseAnonKey : 'unconfigured-anon-key';

export const supabase = createClient(targetUrl, targetKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

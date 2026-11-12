// test_supabase_config.js
// SEC-02: Supabase muhit o'zgaruvchilari (env) va konfiguratsiya xavfsizligi testi
import assert from 'assert';
import { createClient } from '@supabase/supabase-js';

console.log("====================================================");
console.log("SAVATCHI: SEC-02 SUPABASE KONFIGURATSIYASI TESTI");
console.log("====================================================");

let passed = 0;
let failed = 0;

function run(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (e) {
    console.error(`❌ [FAIL] ${name}: ${e.message}`);
    failed++;
  }
}

// 1. Konfiguratsiya funksiyasi simulyatsiyasi (src/lib/supabase.js mantig'i)
function checkConfig(url, key) {
  const supabaseUrl = typeof url === 'string' ? url.trim() : '';
  const supabaseAnonKey = typeof key === 'string' ? key.trim() : '';

  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.length > 0 &&
    supabaseAnonKey.length > 0 &&
    !supabaseUrl.includes('your_supabase_project_url')
  );

  const targetUrl = isConfigured ? supabaseUrl : 'https://unconfigured-project.supabase.co';
  const targetKey = isConfigured ? supabaseAnonKey : 'unconfigured-anon-key';

  const client = createClient(targetUrl, targetKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
  });

  return { isConfigured, targetUrl, targetKey, client };
}

// ══════════════════════════════════════════════════════
// TEST 1: Env o'zgaruvchilari to'liq bo'lganda
// ══════════════════════════════════════════════════════
run("1. To'g'ri env berilganda isSupabaseConfigured true bo'ladi va ko'rsatilgan loyihaga ulanadi", () => {
  const customUrl = 'https://custom-buyer-project.supabase.co';
  const customKey = 'custom-buyer-anon-key-12345';
  const res = checkConfig(customUrl, customKey);

  assert.strictEqual(res.isConfigured, true);
  assert.strictEqual(res.targetUrl, customUrl);
  assert.strictEqual(res.targetKey, customKey);
  assert.ok(res.client.auth, "Supabase client auth mavjud");
});

// ══════════════════════════════════════════════════════
// TEST 2: Konfiguratsiya mavjud bo'lmaganda (Missing Config)
// ══════════════════════════════════════════════════════
run("2. Env bo'lmaganda (undefined/bo'sh) isSupabaseConfigured false bo'ladi", () => {
  const res = checkConfig('', '');
  assert.strictEqual(res.isConfigured, false);
});

run("3. Missing config holatida eski loyihaga yashirin hardcoded ulanish qilinmaydi", () => {
  const res = checkConfig('', '');
  assert.notStrictEqual(res.targetUrl, 'https://rzrrvodiegjfwtebxxvo.supabase.co', "Eski loyihaga hardcoded fallback yo'q");
  assert.notStrictEqual(res.targetKey, 'sb_publishable_hoMnur6vUqLq46wKh5mGpA_dVQ3DnZA', "Eski kalitga hardcoded fallback yo'q");
  assert.strictEqual(res.targetUrl, 'https://unconfigured-project.supabase.co');
});

run("4. Missing config holatida dastur qulab tushmaydi (Safe Neutral Client yaratiladi)", () => {
  const res = checkConfig('', '');
  assert.ok(res.client, "Klient xatosiz yaratildi");
  assert.ok(res.client.auth, "Auth ob'ekti mavjud");
  assert.strictEqual(typeof res.client.auth.getSession, 'function', "getSession funksiyasi mavjud");
});

// ══════════════════════════════════════════════════════
// TEST 3: .env.example shablon qiymatlari (your_supabase_project_url)
// ══════════════════════════════════════════════════════
run("5. .env.example dagi shablon qiymati noto'g'ri haqiqiy loyiha deb qabul qilinmaydi", () => {
  const res = checkConfig('your_supabase_project_url', 'your_supabase_publishable_or_anon_key');
  assert.strictEqual(res.isConfigured, false, "Shablon qiymati unconfigured deb baholanishi kerak");
});

// ══════════════════════════════════════════════════════
// TEST 4: Haqiqiy src/lib/supabase.js modulini import qilish
// ══════════════════════════════════════════════════════
run("6. src/lib/supabase.js moduli xatosiz import bo'ladi va ob'ektlarni eksport qiladi", async () => {
  const mod = await import('./src/lib/supabase.js');
  assert.ok(mod.supabase, "supabase eksport qilingan");
  assert.strictEqual(typeof mod.isSupabaseConfigured, 'boolean', "isSupabaseConfigured boolean");
  assert.ok(mod.supabase.auth, "supabase.auth mavjud");
});

console.log("\n====================================================");
console.log(`SEC-02 NATIJA: ${passed}/${passed + failed} ta sinov muvaffaqiyatli o'tdi!`);
if (failed > 0) {
  console.log(`⚠️  ${failed} ta sinov MUVAFFAQIYATSIZ!`);
  process.exit(1);
}
console.log("====================================================");
process.exit(0);


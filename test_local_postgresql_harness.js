/**
 * test_local_postgresql_harness.js
 *
 * Local PostgreSQL 18.3 Migration Validation Harness for Savatchi POS (Phase 3.2-B).
 *
 * XAVFSIZLIK KAFOLATLARI:
 * - Faqat "savatchi_migration_test_" prefiksi bilan boshlanadigan vaqtinchalik
 *   bazalarga o'qish/yozish/o'chirish amallarini bajaradi (qat'iy regex tekshiruvi).
 * - setupTestDb() avvaldan mavjud bazani o'chirmaydi — aniq xabar bilan to'xtatadi.
 * - Faqat joriy ishga tushirishda muvaffaqiyatli YARATILGAN bazalar tozalanadi.
 * - try/finally bilan qoplangan: migratsiya xatosi ham tozalashni ta'minlaydi.
 * - DROP DATABASE FORCE ishlatilmaydi.
 * - Remote Supabase ga mutlaqo murojaat qilinmaydi.
 * - Parollar logga chiqarilmaydi; -w bayrog'i bilan faqat -pgpass orqali kirish.
 * - psql har bir chaqiruvida -v ON_ERROR_STOP=1 va -X orqali ishga tushiriladi.
 * - "authenticated" va "anon" rollari avtomatik yaratilmaydi; ularning
 *   yo'qligi aniq xabar bilan hisobot beriladi va test to'xtatiladi.
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// KONFIGURATSIYA
// ============================================================================
const PSQL_EXE = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
const MIGRATIONS_DIR = path.join(__dirname, 'supabase', 'migrations');
const PG_HOST = process.env.PGHOST || 'localhost';
const PG_PORT = process.env.PGPORT || '5432';
const PG_USER = process.env.PGUSER || 'postgres';

// Ruxsat etilgan baza nomlari uchun qat'iy regex
const SAFE_DB_NAME_REGEX = /^savatchi_migration_test_[a-z0-9_]{1,40}$/;

// Joriy ishga tushirishda YARATILGAN bazalarni kuzatuvchi ro'yxat
// (faqat muvaffaqiyatli CREATE DATABASE keyin bu ro'yxatga qo'shiladi)
const createdDbsThisRun = [];

const migrations = [
  '20261028_staff_and_invitations.sql',
  '20261102_stores_and_products.sql',
  '20261103_stores_and_products_foundation.sql',
  '20261104_stores_products_integrity_hardening.sql',
  '20261105_stores_products_fk_strict_validation.sql',
  '20261107_owner_employee_active_store_sync.sql',
  '20261108_sales_debts_orders_rentals_installments.sql',
  '20261109_cloud_schema_alignment.sql'
];

// ============================================================================
// PSQL CHAQIRUV YORDAMCHI FUNKSIYALARI
// ============================================================================

/**
 * Psql ga bitta SQL buyruq yuboradi.
 * -X: foydalanuvchi .psqlrc faylini chetlab o'tadi.
 * -w: parol so'ramaydi (faqat pgpass yoki pg_hba trust orqali kiradi).
 * -v ON_ERROR_STOP=1: birinchi SQL xatosida psql darhol 1 kod bilan chiqadi.
 * Barcha argumentlar massiv sifatida beriladi (shell injection xavfidan himoya).
 */
function runPsqlCommand(cmd, db = 'postgres', timeoutMs = 5000) {
  const args = [
    '-h', PG_HOST,
    '-p', PG_PORT,
    '-U', PG_USER,
    '-d', db,
    '-w',
    '-X',
    '-v', 'ON_ERROR_STOP=1',
    '-c', cmd
  ];
  const res = spawnSync(PSQL_EXE, args, {
    encoding: 'utf8',
    timeout: timeoutMs,
    env: process.env
  });
  return {
    code: res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    error: res.error
  };
}

/**
 * Psql ga fayl yuboradi.
 * Yuqoridagi runPsqlCommand bilan bir xil xavfsizlik bayroqlari.
 */
function runPsqlFile(filePath, db = 'postgres', timeoutMs = 15000) {
  const args = [
    '-h', PG_HOST,
    '-p', PG_PORT,
    '-U', PG_USER,
    '-d', db,
    '-w',
    '-X',
    '-v', 'ON_ERROR_STOP=1',
    '-f', filePath
  ];
  const res = spawnSync(PSQL_EXE, args, {
    encoding: 'utf8',
    timeout: timeoutMs,
    env: process.env
  });
  return {
    code: res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    error: res.error
  };
}

// ============================================================================
// XAVFSIZLIK: BAZA NOMINI TEKSHIRISH
// ============================================================================

/**
 * Baza nomini qat'iy regex orqali tekshiradi.
 * Faqat "savatchi_migration_test_" prefiksi bilan boshlanadigan nomlar ruxsat.
 * Tizim bazalari (postgres, template0, template1) va boshqa loyiha bazalariga
 * tegmaslik shu funksiya orqali kafolatlanadi.
 */
function assertSafeDbName(dbName) {
  if (typeof dbName !== 'string' || !SAFE_DB_NAME_REGEX.test(dbName)) {
    throw new Error(
      `XAVFSIZLIK BLOKIROVKASI: "${dbName}" baza nomi ruxsat etilmagan!\n` +
      `Faqat /^savatchi_migration_test_[a-z0-9_]{1,40}$/ formatiga mos nomlar ishlatilishi mumkin.\n` +
      `Tizim bazalari (postgres, template0, va boshqa loyiha bazalari) himoyalangan.`
    );
  }
}

// ============================================================================
// TEST BAZA YORDAMCHI FUNKSIYALARI
// ============================================================================

/**
 * Yangi test bazasini xavfsiz yaratadi.
 * - Baza allaqachon mavjud bo'lsa, uni O'CHIRMAYDI — aniq xabar bilan to'xtatadi.
 * - Faqat muvaffaqiyatli yaratilgandan so'ng createdDbsThisRun ga qo'shadi.
 * - AUTH_STUB_SQL ni yangi bazaga qo'llaydi.
 */
function setupTestDb(dbName) {
  assertSafeDbName(dbName);

  // Avvaldan mavjud bazani tekshirish
  const checkRes = runPsqlCommand(
    `SELECT 1 FROM pg_database WHERE datname = '${dbName}';`,
    'postgres',
    5000
  );
  if (checkRes.code === 0 && checkRes.stdout.includes('1')) {
    throw new Error(
      `Baza allaqachon mavjud: "${dbName}".\n` +
      `Bu ishga tushirishda yaratilmagan bazaga tegish taqiqlangan.\n` +
      `Avvalgi test noto'g'ri to'xtatilgan bo'lishi mumkin. Bazani qo'lda tekshiring.`
    );
  }

  // Yangi baza yaratish
  const createRes = runPsqlCommand(`CREATE DATABASE "${dbName}";`, 'postgres', 8000);
  if (createRes.code !== 0) {
    throw new Error(
      `"${dbName}" bazasini yaratib bo'lmadi.\n` +
      `psql stderr: ${createRes.stderr.trim()}`
    );
  }

  // Muvaffaqiyatli yaratilgan bazani ro'yxatga qo'shish
  createdDbsThisRun.push(dbName);
  console.log(`  [CREATE] "${dbName}" bazasi muvaffaqiyatli yaratildi.`);

  // Auth stub qo'llash
  const stubRes = runPsqlCommand(AUTH_STUB_SQL, dbName, 8000);
  if (stubRes.code !== 0) {
    throw new Error(
      `"${dbName}" bazasida auth stub yaratib bo'lmadi.\n` +
      `psql stderr: ${stubRes.stderr.trim()}`
    );
  }
  console.log(`  [STUB]   auth schema va funksiyalari "${dbName}" bazasiga o'rnatildi.`);
}

/**
 * Faqat joriy ishga tushirishda YARATILGAN bazalarni xavfsiz o'chiradi.
 * - DROP DATABASE FORCE ishlatilmaydi.
 * - Tozalash xatosi asosiy xatolikni yashirmaydi.
 * - assertSafeDbName tekshiruvi tozalash paytida ham ishlaydi.
 */
function cleanupCreatedDbs() {
  if (createdDbsThisRun.length === 0) return;
  console.log('\n[TOZALASH] Joriy ishga tushirishda yaratilgan test bazalari o\'chirilmoqda...');
  for (const dbName of createdDbsThisRun) {
    try {
      assertSafeDbName(dbName); // Ikki marta tekshiruv (defense in depth)
      const dropRes = runPsqlCommand(`DROP DATABASE IF EXISTS "${dbName}";`, 'postgres', 8000);
      if (dropRes.code !== 0) {
        console.warn(`  [OGOHLANTIRISH] "${dbName}" o'chirishda xatolik: ${dropRes.stderr.trim()}`);
      } else {
        console.log(`  [DROP]   "${dbName}" bazasi muvaffaqiyatli o'chirildi.`);
      }
    } catch (cleanErr) {
      console.warn(`  [OGOHLANTIRISH] "${dbName}" tozalashda xato: ${cleanErr.message}`);
    }
  }
}

/**
 * Sxema tekshiruvi: products jadvalidagi PK va FK constraintlarini ko'rsatadi.
 */
function validateSchema(dbName, scenarioName) {
  assertSafeDbName(dbName);
  const query = [
    "SELECT c.conname, c.contype, c.confdeltype,",
    "       array_agg(a.attname ORDER BY array_position(c.conkey, a.attnum)) AS cols",
    "FROM pg_constraint c",
    "JOIN pg_class t ON c.conrelid = t.oid",
    "JOIN pg_namespace n ON t.relnamespace = n.oid",
    "JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)",
    "WHERE n.nspname = 'public' AND t.relname = 'products'",
    "  AND c.contype IN ('p', 'f')",
    "GROUP BY c.conname, c.contype, c.confdeltype;"
  ].join(' ');

  const res = runPsqlCommand(query, dbName, 5000);
  if (res.code !== 0) {
    console.warn(`  [OGOHLANTIRISH] Sxema tekshiruvida xatolik (${scenarioName}): ${res.stderr.trim()}`);
  } else {
    console.log(`  [SXEMA - ${scenarioName}]:`);
    console.log(res.stdout);
  }
}

// ============================================================================
// SUPABASE AUTH STUB
// (authenticated va anon rollari YARATILMAYDI — mavjudligi tekshiriladi)
// ============================================================================

const AUTH_STUB_SQL = `
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY,
  email TEXT,
  raw_user_meta_data JSONB
);
CREATE OR REPLACE FUNCTION auth.uid()
  RETURNS UUID AS $$
  SELECT '00000000-0000-0000-0000-000000000001'::uuid;
  $$ LANGUAGE sql STABLE;
CREATE OR REPLACE FUNCTION auth.jwt()
  RETURNS JSONB AS $$
  SELECT '{"email":"test@example.com"}'::jsonb;
  $$ LANGUAGE sql STABLE;
`;

// ============================================================================
// ASOSIY BOSQIMLAR
// ============================================================================

console.log('================================================================');
console.log('SAVATCHI: LOCAL POSTGRESQL 18.3 MIGRATION VALIDATION HARNESS');
console.log('                      Phase 3.2-B');
console.log('================================================================\n');

// 1. psql bajariladigan faylini tekshirish
if (!fs.existsSync(PSQL_EXE)) {
  console.error(`[XATOLIK] psql topilmadi: ${PSQL_EXE}`);
  console.log('Yakuniy qaror: C) BLOCKED — psql bajariladigan fayli topilmadi.');
  process.exit(2);
}

// 2. Ulanish sinovi
console.log('[1/5] PostgreSQL 18.3 ga ulanish tekshirilmoqda...');
console.log(`      Host: ${PG_HOST}:${PG_PORT}, User: ${PG_USER}`);
const probe = runPsqlCommand('SELECT version();', 'postgres', 4000);

if (probe.code !== 0) {
  const errOut = (probe.stderr || probe.stdout || '').trim();
  console.log('\n[DIAGNOSTIKA]: Ulanish xatosi aniqlandi:');
  console.log(`> ${errOut}`);

  if (errOut.includes('no password supplied') || errOut.includes('password authentication failed')) {
    console.log('\n----------------------------------------------------------------');
    console.log('HOLAT: LOKAL POSTGRESQL AUTENTIFIKATSIYA TALAB QILMOQDA');
    console.log('Sabab: pg_hba.conf da localhost uchun parol (scram-sha-256) yoqilgan.');
    console.log('Tizim xavfsizlik cheklovlari bo\'yicha parol so\'ralmaydi.');
    console.log('\nSINOVNI BOSHLASH UCHUN:');
    console.log('  1. Windows PowerShell:');
    console.log('     New-Item -ItemType Directory -Path "$env:APPDATA\\postgresql" -Force');
    console.log('     "localhost:5432:*:postgres:PAROLINGIZ" | Out-File -FilePath "$env:APPDATA\\postgresql\\pgpass.conf" -Encoding ASCII');
    console.log('  2. Keyin yana: node test_local_postgresql_harness.js');
    console.log('----------------------------------------------------------------\n');
    console.log('Yakuniy qaror: C) BLOCKED BY AUTHENTICATION\n');
    process.exit(10);
  } else if (errOut.includes('Connection refused') || errOut.includes('could not connect')) {
    console.log('\nYakuniy qaror: C) BLOCKED — PostgreSQL serveri ishlamayapti yoki port yopiq.\n');
    process.exit(10);
  } else {
    console.log('\nYakuniy qaror: C) BLOCKED — Noma\'lum ulanish xatosi.\n');
    process.exit(1);
  }
}

console.log('  [OK] PostgreSQL ga ulanish muvaffaqiyatli o\'rnatildi.');
console.log(`       ${probe.stdout.trim().split('\n')[0]}\n`);

// 3. authenticated va anon rollarini TEKSHIRISH (yaratmasdan)
console.log('[2/5] Supabase rollari mavjudligini tekshirish...');
const roleCheck = runPsqlCommand(
  "SELECT rolname FROM pg_roles WHERE rolname IN ('authenticated', 'anon') ORDER BY rolname;",
  'postgres',
  4000
);

if (roleCheck.code !== 0) {
  console.error(`[XATOLIK] Rollarni tekshirib bo'lmadi: ${roleCheck.stderr.trim()}`);
  process.exit(1);
}

const foundRoles = roleCheck.stdout;
const hasAuthenticated = foundRoles.includes('authenticated');
const hasAnon = foundRoles.includes('anon');

if (!hasAuthenticated || !hasAnon) {
  const missing = [];
  if (!hasAuthenticated) missing.push('"authenticated"');
  if (!hasAnon) missing.push('"anon"');
  console.error('\n[BLOKIROVKA]: Supabase rollari topilmadi!');
  console.error(`Mavjud bo\'lmagan rollar: ${missing.join(', ')}`);
  console.log('\nBu rollar Supabase PostgreSQL muhitida avtomatik yaratiladi,');
  console.log('ammo oddiy (vanilla) lokal PostgreSQL 18.3 da mavjud emas.');
  console.log('\nYECHIM VARIANTLARI:');
  console.log('  A) pgAdmin 4 SQL Tool orqali quyidagini bajarib ko\'ring:');
  console.log('       CREATE ROLE authenticated;');
  console.log('       CREATE ROLE anon;');
  console.log('     (Bu faqat sinov muhiti uchun; production rollari BOSHQACHA sozlanadi)');
  console.log('  B) Supabase Local Development muhiti (docker) orqali sinov o\'tkazing.');
  console.log('\nEslatma: Bu harness rolllarni AVTOMATIK YARATMAYDI — ixtiyoringiz sizda.\n');
  console.log('Yakuniy qaror: C) BLOCKED — Supabase rollari (authenticated, anon) mavjud emas.\n');
  process.exit(11);
}

console.log(`  [OK] "authenticated" roli mavjud.`);
console.log(`  [OK] "anon" roli mavjud.\n`);

// 4. Noyob test bazasi nomlarini yaratish
// Har ishga tushirishda Unix timestamp asosida noyob nomlar
const runId = Date.now();
const dbA = `savatchi_migration_test_a${runId}`;
const dbB = `savatchi_migration_test_b${runId}`;

// Regex tekshiruvini erta ishga tushirish (agar mantig'imiz to'g'ri bo'lsa, bu o'tishi shart)
assertSafeDbName(dbA);
assertSafeDbName(dbB);
console.log(`[3/5] Test baza nomlari:`);
console.log(`      Ssenariy A: ${dbA}`);
console.log(`      Ssenariy B: ${dbB}\n`);

// ============================================================================
// ASOSIY TEST BLOKI — try/finally bilan qoplangan
// ============================================================================

let mainError = null;

try {

  // --------------------------------------------------------------------------
  // SSENARIY A: Bo'sh test bazasi (Barcha 5 migratsiya ketma-ket)
  // --------------------------------------------------------------------------
  console.log('[4/5] SSENARIY A: Bo\'sh test bazasiga ketma-ket qo\'llash...');
  setupTestDb(dbA);

  for (const m of migrations) {
    const fPath = path.join(MIGRATIONS_DIR, m);
    if (!fs.existsSync(fPath)) {
      throw new Error(`Migratsiya fayli topilmadi: ${fPath}`);
    }
    const mRes = runPsqlFile(fPath, dbA);
    if (mRes.code !== 0) {
      throw new Error(
        `Migratsiya xato berdi: ${m}\n` +
        `psql stderr: ${mRes.stderr.trim()}\n` +
        `psql stdout: ${mRes.stdout.trim()}`
      );
    }
    console.log(`  [OK] ${m}`);
  }
  validateSchema(dbA, 'Ssenariy A');

  // --------------------------------------------------------------------------
  // SSENARIY B: 20261102 gacha bo'lgan baza -> 1103, 1104, 1105
  // --------------------------------------------------------------------------
  console.log('\n[5/5] SSENARIY B: 20261102 gacha bazani yangilash...');
  setupTestDb(dbB);

  const baselineMigrations = [
    '20261028_staff_and_invitations.sql',
    '20261102_stores_and_products.sql'
  ];
  for (const m of baselineMigrations) {
    const fPath = path.join(MIGRATIONS_DIR, m);
    const mRes = runPsqlFile(fPath, dbB);
    if (mRes.code !== 0) {
      throw new Error(
        `Baseline migratsiya xato berdi: ${m}\n` +
        `psql stderr: ${mRes.stderr.trim()}`
      );
    }
    console.log(`  [BASE] ${m}`);
  }
  console.log('  [OK] Baza 20261102 holatiga keltirildi.');

  const upgradeMigrations = [
    '20261103_stores_and_products_foundation.sql',
    '20261104_stores_products_integrity_hardening.sql',
    '20261105_stores_products_fk_strict_validation.sql'
  ];
  for (const m of upgradeMigrations) {
    const fPath = path.join(MIGRATIONS_DIR, m);
    const mRes = runPsqlFile(fPath, dbB);
    if (mRes.code !== 0) {
      throw new Error(
        `Yangilash migratsiya xato berdi: ${m}\n` +
        `psql stderr: ${mRes.stderr.trim()}`
      );
    }
    console.log(`  [OK] ${m}`);
  }
  validateSchema(dbB, 'Ssenariy B');

  // --------------------------------------------------------------------------
  // SSENARIY C & D: Idempotentlik (20261104 va 20261105 ni dbA da qayta bajarish)
  // --------------------------------------------------------------------------
  console.log('\n[SSENARIY C] Idempotentlik: 20261104 va 20261105 ni dbA da qayta bajarish...');

  const idemp1104 = runPsqlFile(
    path.join(MIGRATIONS_DIR, '20261104_stores_products_integrity_hardening.sql'),
    dbA,
    15000
  );
  if (idemp1104.code !== 0) {
    throw new Error(
      `Idempotentlik xatosi (20261104, 2-marta):\n` +
      `psql stderr: ${idemp1104.stderr.trim()}`
    );
  }
  console.log('  [OK] 20261104 takroriy bajarildi — xatolik yo\'q (Idempotent).');

  const idemp1105 = runPsqlFile(
    path.join(MIGRATIONS_DIR, '20261105_stores_products_fk_strict_validation.sql'),
    dbA,
    15000
  );
  if (idemp1105.code !== 0) {
    throw new Error(
      `Idempotentlik xatosi (20261105, 2-marta):\n` +
      `psql stderr: ${idemp1105.stderr.trim()}`
    );
  }
  console.log('  [OK] 20261105 takroriy bajarildi — xatolik yo\'q (Idempotent).');

  console.log('\n[YAKUN]: Barcha lokal PostgreSQL sinovlari to\'liq muvaffaqiyatli o\'tdi!');
  console.log('Yakuniy qaror: A) LOCAL POSTGRESQL TESTS PASSED\n');

} catch (err) {
  mainError = err;
  console.error('\n[XATOLIK]:', err.message);
  console.log('Yakuniy qaror: B) CODE FIX REQUIRED');

} finally {
  // Har doim ishga tushadi — xato bo'lsa ham
  cleanupCreatedDbs();

  // Asosiy xatolikni yashirmasdan qayta ko'tarish
  if (mainError) {
    process.exit(1);
  }
}

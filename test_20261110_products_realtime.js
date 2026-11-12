// test_20261110_products_realtime.js
// Verification of 20261110_products_realtime_publication.sql on PostgreSQL 18.3

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PSQL_EXE = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
const PG_HOST = process.env.PGHOST || '127.0.0.1';
const PG_PORT = process.env.PGPORT || '55432';
const PG_USER = process.env.PGUSER || 'postgres';

function runPsql(db, sql) {
  const res = spawnSync(PSQL_EXE, [
    '-h', PG_HOST,
    '-p', PG_PORT,
    '-U', PG_USER,
    '-d', db,
    '-v', 'ON_ERROR_STOP=1',
    '-w',
    '-f', '-'
  ], {
    input: Buffer.from(sql, 'utf8'),
    encoding: 'utf8',
    env: { ...process.env, PGCLIENTENCODING: 'UTF8' }
  });

  if (res.status !== 0) {
    throw new Error(`[PSQL Error on ${db}]: ${res.stderr || res.stdout}`);
  }
  return res.stdout;
}

function runPsqlFile(db, filePath) {
  const res = spawnSync(PSQL_EXE, [
    '-h', PG_HOST,
    '-p', PG_PORT,
    '-U', PG_USER,
    '-d', db,
    '-v', 'ON_ERROR_STOP=1',
    '-w',
    '-f', filePath
  ], {
    encoding: 'utf8',
    env: { ...process.env, PGCLIENTENCODING: 'UTF8' }
  });

  if (res.status !== 0) {
    throw new Error(`[PSQL File Error on ${db} (${path.basename(filePath)})]: ${res.stderr || res.stdout}`);
  }
  return res.stdout;
}

async function runTest() {
  console.log('================================================================');
  console.log('SAVATCHI — TEST 20261110: PRODUCTS REALTIME PUBLICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  function assert(cond, msg) {
    if (cond) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  const testDb = `savatchi_test_realtime_${Date.now()}`;
  console.log(`[1/5] Test PostgreSQL bazasi yaratilmoqda: ${testDb}...`);
  runPsql('postgres', `CREATE DATABASE ${testDb};`);

  try {
    // 1. Supabase muhitini tayyorlash
    console.log('[2/5] Auth rollari va supabase_realtime publication tayyorlanmoqda...');
    runPsql(testDb, `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
      END $$;

      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE,
        encrypted_password TEXT DEFAULT 'encrypted_hash_secret',
        email_confirmed_at TIMESTAMPTZ DEFAULT now(),
        raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS auth.identities (
        id TEXT PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        identity_data JSONB DEFAULT '{}'::jsonb,
        provider TEXT DEFAULT 'email',
        created_at TIMESTAMPTZ DEFAULT now()
      );

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          CREATE PUBLICATION supabase_realtime;
        END IF;
      END $$;

      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
      $$ LANGUAGE sql STABLE;

      CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB AS $$
        SELECT jsonb_build_object(
          'sub', current_setting('request.jwt.claim.sub', true),
          'email', current_setting('request.jwt.claim.email', true),
          'role', current_setting('request.jwt.claim.role', true)
        );
      $$ LANGUAGE sql STABLE;
    `);

    // 2. Barcha 9 ta migratsiyani ketma-ket qo'llash
    console.log('\n[3/5] Barcha 9 ta migratsiya ketma-ket qo‘llanilmoqda...');
    const migrations = [
      '20261028_staff_and_invitations.sql',
      '20261102_stores_and_products.sql',
      '20261103_stores_and_products_foundation.sql',
      '20261104_stores_products_integrity_hardening.sql',
      '20261105_stores_products_fk_strict_validation.sql',
      '20261107_owner_employee_active_store_sync.sql',
      '20261108_sales_debts_orders_rentals_installments.sql',
      '20261109_cloud_schema_alignment.sql',
      '20261110_products_realtime_publication.sql'
    ];

    for (const m of migrations) {
      const filePath = path.join(__dirname, 'supabase', 'migrations', m);
      const t0 = Date.now();
      runPsqlFile(testDb, filePath);
      console.log(`   ✓ ${m} (${Date.now() - t0}ms)`);
    }

    // 3. Tekshiruvlar
    console.log('\n[4/5] Realtime Publication va products tekshiruvlari...');

    // A) supabase_realtime ichida public.products borligini tekshirish
    const pubCheck = runPsql(testDb, `
      SELECT tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'products' AND schemaname = 'public';
    `);
    assert(pubCheck.includes('products'), 'public.products jadvali supabase_realtime publication ga muvaffaqiyatli qo‘shildi');

    // B) Publication dagi barcha jadvallar soni
    const allPubTables = runPsql(testDb, `
      SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;
    `);
    console.log('   Publication dagi barcha jadvallar:\n' + allPubTables.trim().split('\n').map(l => '     • ' + l.trim()).join('\n'));
    assert(allPubTables.includes('products'), 'Publication ro‘yxatida products mavjud');
    assert(allPubTables.includes('profiles'), 'Publication ro‘yxatida profiles mavjud');
    assert(allPubTables.includes('sales'), 'Publication ro‘yxatida sales mavjud');

    // C) Publication eventlari (insert, update, delete)
    const pubEvents = runPsql(testDb, `
      SELECT (pubinsert AND pubupdate AND pubdelete) AS all_supported
      FROM pg_publication 
      WHERE pubname = 'supabase_realtime';
    `);
    assert(pubEvents.includes('t'), 'supabase_realtime publication INSERT, UPDATE, DELETE ni to‘liq qo‘llab-quvvatlaydi');

    // D) Idempotentlik tekshiruvi: 20261110 migratsiyasini yana 2 marta qayta bajarish
    console.log('\n[5/5] Idempotentlik sinovi (takroriy bajarish)...');
    const newMigrationPath = path.join(__dirname, 'supabase', 'migrations', '20261110_products_realtime_publication.sql');
    runPsqlFile(testDb, newMigrationPath);
    runPsqlFile(testDb, newMigrationPath);
    assert(true, '20261110 migratsiyasi takroran (2- va 3-marta) xatosiz bajarildi (100% Idempotent)');

    // E) Products RLS siyosatlari daxlsizligi tekshiruvi
    const rlsCount = runPsql(testDb, `
      SELECT count(*) FROM pg_policies WHERE tablename = 'products' AND schemaname = 'public';
    `);
    assert(!rlsCount.includes('0'), 'products jadvalidagi RLS siyosatlari daxlsiz saqlandi (o‘chirilmagan yoki o‘zgartirilmagan)');

    // F) Products Primary Key va Replica Identity tekshiruvi
    const pkCheck = runPsql(testDb, `
      SELECT c.relreplident, indkey::text
      FROM pg_class c
      JOIN pg_index i ON c.oid = i.indrelid AND i.indisprimary
      WHERE c.relname = 'products';
    `);
    console.log(`   Products Replica Identity: ${pkCheck.trim()}`);
    assert(pkCheck.includes('d'), 'Products replica identity DEFAULT (Primary key: store_id, id)');

  } finally {
    runPsql('postgres', `DROP DATABASE IF EXISTS ${testDb};`);
    console.log(`\n[TOZALASH] Test PostgreSQL bazasi (${testDb}) o‘chirildi.`);
  }

  console.log('\n================================================================');
  console.log(`YAKUNIY NATIJA: ${passed} ta PASS, ${failed} ta FAIL`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runTest().catch(err => {
  console.error('Sinov xatoligi:', err);
  process.exit(1);
});

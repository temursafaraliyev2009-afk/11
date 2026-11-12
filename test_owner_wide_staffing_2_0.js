// test_owner_wide_staffing_2_0.js
// SAVATCHI — Owner-Wide Unified Staffing (Phase 2.0) PostgreSQL Test
// Tests: SQL migration, is_store_member(), accept_staff_invitation_rpc,
//        remove_store_employee_rpc, Owner-Wide RLS, backfill logic

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PSQL_EXE = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
const PG_HOST = process.env.PGHOST || '127.0.0.1';
const PG_PORT = process.env.PGPORT || '55432';
const PG_USER = process.env.PGUSER || 'postgres';

function runPsql(db, sql) {
  const res = spawnSync(PSQL_EXE, [
    '-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER,
    '-d', db, '-v', 'ON_ERROR_STOP=1', '-w', '-t', '-A', '-f', '-'
  ], {
    input: Buffer.from(sql, 'utf8'),
    encoding: 'utf8',
    env: { ...process.env, PGCLIENTENCODING: 'UTF8' }
  });
  if (res.status !== 0) throw new Error(`[PSQL Error on ${db}]: ${res.stderr || res.stdout}`);
  return res.stdout;
}

function runPsqlFile(db, filePath) {
  const res = spawnSync(PSQL_EXE, [
    '-h', PG_HOST, '-p', PG_PORT, '-U', PG_USER,
    '-d', db, '-v', 'ON_ERROR_STOP=1', '-w', '-f', filePath
  ], {
    encoding: 'utf8',
    env: { ...process.env, PGCLIENTENCODING: 'UTF8' }
  });
  if (res.status !== 0) throw new Error(`[PSQL File Error (${path.basename(filePath)})]: ${res.stderr || res.stdout}`);
  return res.stdout;
}

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++; }
  else       { console.error(`  ❌ FAIL: ${msg}`); failed++; }
}

const MIGRATIONS = [
  '20261028_staff_and_invitations.sql',
  '20261102_stores_and_products.sql',
  '20261103_stores_and_products_foundation.sql',
  '20261104_stores_products_integrity_hardening.sql',
  '20261105_stores_products_fk_strict_validation.sql',
  '20261107_owner_employee_active_store_sync.sql',
  '20261108_sales_debts_orders_rentals_installments.sql',
  '20261109_cloud_schema_alignment.sql',
  '20261110_products_realtime_publication.sql',
  '20261111_owner_wide_unified_staffing.sql',   // NEW
];

function testAsUser(db, userId, sql) {
  const wrapped = `
    SET LOCAL "request.jwt.claim.sub" = '${userId}';
    SET LOCAL "request.jwt.claim.role" = 'authenticated';
    SET LOCAL "request.jwt.claims" = '{"sub":"${userId}","role":"authenticated","email":"user_${userId.slice(0,8)}@test.uz"}';
    SET ROLE authenticated;
    ${sql}
  `;
  try {
    return { success: true, output: runPsql(db, wrapped) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SAVATCHI — Owner-Wide Unified Staffing 2.0 — PostgreSQL Test');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const testDb = `savatchi_test_ows_${Date.now()}`;
  console.log(`[Setup] Izolyatsiyalangan test DB: ${testDb}`);
  runPsql('postgres', `CREATE DATABASE "${testDb}";`);

  try {
    // ── Setup ──────────────────────────────────────────────────────────
    console.log('\n[1/9] Barcha migrationlarni qo\'llash...');
    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

    // Mock auth schema
    runPsql(testDb, `
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT,
        email_confirmed_at TIMESTAMPTZ,
        raw_user_meta_data JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS auth.identities (
        id TEXT PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id),
        identity_data JSONB DEFAULT '{}'
      );
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
      CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
        SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon');
      $$ LANGUAGE sql STABLE;
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
      END $$;
      GRANT USAGE ON SCHEMA public TO authenticated;
      GRANT USAGE ON SCHEMA auth TO authenticated;
    `);

    for (const f of MIGRATIONS) {
      try {
        runPsqlFile(testDb, path.join(migrationsDir, f));
        console.log(`  ✅ Applied: ${f}`);
      } catch (e) {
        console.error(`  ❌ Failed: ${f}\n    ${e.message.slice(0, 200)}`);
        failed++;
      }
    }

    // Supabase standard permissions for authenticated role
    runPsql(testDb, `
      GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
      GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;
    `);

    // ── Test UUIDs ──────────────────────────────────────────────────────
    const ownerUUID = '11111111-1111-1111-1111-111111111111';
    const empUUID   = '22222222-2222-2222-2222-222222222222';
    const owner2UUID= '33333333-3333-3333-3333-333333333333';
    const emp2UUID  = '44444444-4444-4444-4444-444444444444';
    const invUUID   = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';

    // Insert test users
    runPsql(testDb, `
      INSERT INTO auth.users (id, email, email_confirmed_at)
      VALUES
        ('${ownerUUID}', 'owner@test.uz', now()),
        ('${empUUID}',   'emp@test.uz',   now()),
        ('${owner2UUID}','owner2@test.uz', now()),
        ('${emp2UUID}',  'emp2@test.uz',  now())
      ON CONFLICT DO NOTHING;
    `);

    // ── [2] Migration sxema tekshiruvi ──────────────────────────────────
    console.log('\n[2/9] Migration sxema tekshiruvi...');

    const col = runPsql(testDb,
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema='public' AND table_name='store_employees'
         AND column_name='owner_id';`
    );
    assert(col.includes('owner_id'), 'store_employees.owner_id ustuni mavjud');

    const idx = runPsql(testDb,
      `SELECT indexname FROM pg_indexes
       WHERE tablename='store_employees' AND indexname='idx_store_employees_owner';`
    );
    assert(idx.includes('idx_store_employees_owner'), 'idx_store_employees_owner indeksi mavjud');

    const fnSrc = runPsql(testDb,
      `SELECT prosrc FROM pg_proc WHERE proname='is_store_member';`
    );
    assert(fnSrc.includes('v_store_owner_id'), 'is_store_member() Owner-Wide logikasini o\'z ichiga olgan');
    assert(fnSrc.includes('owner_id = v_store_owner_id'), 'is_store_member() owner_id bo\'yicha tekshiruv mavjud');

    const accRpc = runPsql(testDb,
      `SELECT prosrc FROM pg_proc WHERE proname='accept_staff_invitation_rpc';`
    );
    assert(accRpc.includes('from_user_id'), 'accept_staff_invitation_rpc owner_id ni from_user_id dan oladi');

    const remRpc = runPsql(testDb,
      `SELECT prosrc FROM pg_proc WHERE proname='remove_store_employee_rpc';`
    );
    assert(remRpc.includes('owner_id = v_caller_id'), 'remove_store_employee_rpc Owner-Wide o\'chirish mantiqini o\'z ichiga olgan');

    // ── [3] Asosiy ma'lumotlarni sozlash ────────────────────────────────
    console.log('\n[3/9] Owner A, B, C do\'konlari va Employee sozlash...');

    runPsql(testDb, `
      -- Profillar
      INSERT INTO public.profiles (id, email, role)
      VALUES
        ('${ownerUUID}',  'owner@test.uz',  'Foydalanuvchi'),
        ('${empUUID}',    'emp@test.uz',    'Foydalanuvchi'),
        ('${owner2UUID}', 'owner2@test.uz', 'Foydalanuvchi'),
        ('${emp2UUID}',   'emp2@test.uz',   'Foydalanuvchi')
      ON CONFLICT (id) DO NOTHING;

      -- Owner 1 ning do'konlari (3 ta)
      INSERT INTO public.stores (id, owner_id, name, type)
      VALUES
        ('store-A', '${ownerUUID}', 'Do''kon A', 'grocery'),
        ('store-B', '${ownerUUID}', 'Do''kon B', 'phone'),
        ('store-C', '${ownerUUID}', 'Do''kon C', 'food')
      ON CONFLICT DO NOTHING;

      -- Owner 2 ning do'koni (Begona)
      INSERT INTO public.stores (id, owner_id, name, type)
      VALUES ('store-X', '${owner2UUID}', 'Begona Do''kon', 'food')
      ON CONFLICT DO NOTHING;

      -- Staff invitation: Owner 1 Employee ni Store-A ga taklif qildi
      INSERT INTO public.staff_invitations
        (id, store_id, store_name, store_type, from_user_id, from_user_name, from_user_email, to_email, status)
      VALUES
        ('${invUUID}', 'store-A', 'Do''kon A', 'grocery', '${ownerUUID}', 'Owner 1', 'owner@test.uz', 'emp@test.uz', 'Kutilmoqda')
      ON CONFLICT DO NOTHING;
    `);

    console.log('  ✅ Test ma\'lumotlari sozlandi');

    // ── [4] accept_staff_invitation_rpc testi ───────────────────────────
    console.log('\n[4/9] accept_staff_invitation_rpc: Store-A ga qo\'shilish...');

    const acceptSql = `
      SET "request.jwt.claim.sub" = '${empUUID}';
      SET "request.jwt.claim.email" = 'emp@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';
      SELECT public.accept_staff_invitation_rpc('${invUUID}'::UUID);
    `;
    let acceptResult;
    try {
      acceptResult = runPsql(testDb, acceptSql);
      assert(acceptResult.includes('"success": true') || acceptResult.includes('"success":true'), 'accept_staff_invitation_rpc muvaffaqiyatli bajarildi');
    } catch (e) {
      assert(false, `accept_staff_invitation_rpc: ${e.message.slice(0,150)}`);
    }

    // Employee store_employees ga qo'shilganini tekshirish
    const empRow = runPsql(testDb,
      `SELECT store_id, owner_id::text, email, role, status FROM public.store_employees WHERE email='emp@test.uz';`
    );
    assert(empRow.includes('store-A'),    'Employee store-A ga qo\'shildi');
    assert(empRow.includes(ownerUUID),    'Employee yozuvida owner_id = Owner UUID');
    assert(empRow.includes('Xodim'),      'Employee roli = Xodim');
    assert(empRow.includes('Faol'),       'Employee statusi = Faol');

    // Taklif holati yangilanganini tekshirish
    const invStatus = runPsql(testDb,
      `SELECT status FROM public.staff_invitations WHERE id='${invUUID}';`
    );
    assert(invStatus.includes('Qabul qilindi'), 'Taklif holati Qabul qilindi ga o\'zgardi');

    // ── [5] Owner-Wide is_store_member() testi ─────────────────────────
    console.log('\n[5/9] is_store_member() — Owner-Wide ruxsat testi...');

    // Store-A da to'g'ridan-to'g'ri a'zo (eski test)
    const ismA = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${empUUID}';
      SET "request.jwt.claim.email" = 'emp@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';
      SELECT public.is_store_member('store-A');
    `);
    assert(ismA.includes('t'), 'is_store_member(store-A) Employee uchun TRUE (to\'g\'ridan-to\'g\'ri a\'zo)');

    // Store-B da to'g'ridan-to'g'ri a'zo emas, lekin Owner-Wide ruxsat bor
    const ismB = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${empUUID}';
      SET "request.jwt.claim.email" = 'emp@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';
      SELECT public.is_store_member('store-B');
    `);
    assert(ismB.includes('t'), 'is_store_member(store-B) Employee uchun TRUE (Owner-Wide)');

    // Store-C da ham ruxsat
    const ismC = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${empUUID}';
      SET "request.jwt.claim.email" = 'emp@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';
      SELECT public.is_store_member('store-C');
    `);
    assert(ismC.includes('t'), 'is_store_member(store-C) Employee uchun TRUE (Owner-Wide)');

    // Begona do'konga RUXSAT YO'Q
    const ismX = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${empUUID}';
      SET "request.jwt.claim.email" = 'emp@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';
      SELECT public.is_store_member('store-X');
    `);
    assert(ismX.includes('f'), 'is_store_member(store-X) Employee uchun FALSE (Begona Owner\'s store)');

    // Owner o'z do'konida TRUE
    const ismOwner = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${ownerUUID}';
      SET "request.jwt.claim.email" = 'owner@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';
      SELECT public.is_store_member('store-A');
    `);
    assert(ismOwner.includes('t'), 'is_store_member(store-A) Owner uchun TRUE');

    // ── [6] RLS: Mahsulot ko'rish va qo'shish ──────────────────────────
    console.log('\n[6/9] RLS: Employee Store-B va Store-C da mahsulot ko\'rish...');

    // Store-B ga mahsulot qo'shish (Owner sifatida)
    runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${ownerUUID}';
      SET "request.jwt.claim.email" = 'owner@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';
      SET ROLE authenticated;
      INSERT INTO public.products (store_id, id, name, category, unit, stock, price, cost_price, status)
      VALUES
        ('store-A', 'p-a1', 'Non', 'Oziq-ovqat', 'dona', 50, 2000, 1500, 'Yetarli'),
        ('store-B', 'p-b1', 'Shakar', 'Oziq-ovqat', 'kg', 100, 14000, 11000, 'Yetarli'),
        ('store-C', 'p-c1', 'Tuz', 'Oziq-ovqat', 'kg', 200, 3000, 2000, 'Yetarli');
      RESET ROLE;
    `);

    // Employee Store-B mahsulotini ko'ra olishi (Owner-Wide RLS orqali)
    const prodB = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${empUUID}';
      SET "request.jwt.claim.email" = 'emp@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';
      SET ROLE authenticated;
      SELECT name FROM public.products WHERE store_id='store-B';
      RESET ROLE;
    `);
    assert(prodB.includes('Shakar'), 'Employee Store-B mahsulotini ko\'ra oldi (Owner-Wide RLS)');

    // Employee Store-C mahsulotini ko'ra olishi
    const prodC = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${empUUID}';
      SET "request.jwt.claim.email" = 'emp@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';
      SET ROLE authenticated;
      SELECT name FROM public.products WHERE store_id='store-C';
      RESET ROLE;
    `);
    assert(prodC.includes('Tuz'), 'Employee Store-C mahsulotini ko\'ra oldi (Owner-Wide RLS)');

    // Employee begona do'kon mahsulotini ko'ra olmasligi
    // (store-X da mahsulot yo'q, lekin RLS tekshiruvi uchun)
    runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${owner2UUID}';
      SET "request.jwt.claim.email" = 'owner2@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';
      SET ROLE authenticated;
      INSERT INTO public.products (store_id, id, name, category, unit, stock, price, cost_price, status)
      VALUES ('store-X', 'p-x1', 'Begona Mahsulot', 'Boshqa', 'dona', 10, 5000, 4000, 'Yetarli');
      RESET ROLE;
    `);
    const prodX = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${empUUID}';
      SET "request.jwt.claim.email" = 'emp@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';
      SET ROLE authenticated;
      SELECT count(*) FROM public.products WHERE store_id='store-X';
      RESET ROLE;
    `);
    assert(prodX.includes('0'), 'Employee Begona Owner\'s mahsulotini KO\'RA OLMADI (RLS himoyasi)');

    // ── [7] store_employees SELECT RLS ─────────────────────────────────
    console.log('\n[7/9] store_employees SELECT RLS: Xodimlar ro\'yxati...');

    // Owner store_employees ni ko'ra olishi
    const empList = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${ownerUUID}';
      SET "request.jwt.claim.email" = 'owner@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';
      SET ROLE authenticated;
      SELECT email FROM public.store_employees;
      RESET ROLE;
    `);
    assert(empList.includes('emp@test.uz'), 'Owner Xodimlar ro\'yxatini ko\'ra oldi');

    // Employee begona do'konning xodimlarini ko'ra olmasligi
    // (Owner2 ga emp2 ni qo'shamiz va tekshiramiz)
    runPsql(testDb, `
      INSERT INTO public.store_employees (store_id, owner_id, user_id, name, email, role, status)
      VALUES ('store-X', '${owner2UUID}', '${emp2UUID}', 'Emp2', 'emp2@test.uz', 'Xodim', 'Faol')
      ON CONFLICT DO NOTHING;
    `);
    const empListX = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${empUUID}';
      SET "request.jwt.claim.email" = 'emp@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';
      SET ROLE authenticated;
      SELECT email FROM public.store_employees WHERE store_id='store-X';
      RESET ROLE;
    `);
    assert(!empListX.includes('emp2@test.uz'), 'Employee Begona Owner\'s xodimlarini KO\'RA OLMADI (RLS himoyasi)');

    // ── [8] remove_store_employee_rpc Owner-Wide o'chirish ──────────────
    console.log('\n[8/9] remove_store_employee_rpc: Owner-Wide o\'chirish...');

    // Store-B va Store-C da ham Employee yozuvini qo'shamiz (multi-store scenario)
    runPsql(testDb, `
      INSERT INTO public.store_employees (store_id, owner_id, user_id, name, email, role, status)
      VALUES
        ('store-B', '${ownerUUID}', '${empUUID}', 'Emp', 'emp@test.uz', 'Xodim', 'Faol'),
        ('store-C', '${ownerUUID}', '${empUUID}', 'Emp', 'emp@test.uz', 'Xodim', 'Faol')
      ON CONFLICT (store_id, email) DO NOTHING;
    `);

    const beforeCount = runPsql(testDb,
      `SELECT count(*) FROM public.store_employees WHERE email='emp@test.uz';`
    );
    console.log(`  ℹ️  O'chirishdan oldin: ${beforeCount.trim()} ta yozuv`);

    // Owner Store-A orqali xodimni o'chiradi (RPC barcha do'konlardan o'chirishi kerak)
    const removeSql = `
      SET "request.jwt.claim.sub" = '${ownerUUID}';
      SET "request.jwt.claim.email" = 'owner@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';
      SELECT public.remove_store_employee_rpc('store-A', NULL, 'emp@test.uz');
    `;
    let removeResult;
    try {
      removeResult = runPsql(testDb, removeSql);
      assert(removeResult.includes('"success": true') || removeResult.includes('"success":true'),
        'remove_store_employee_rpc muvaffaqiyatli bajarildi');
    } catch (e) {
      assert(false, `remove_store_employee_rpc: ${e.message.slice(0,150)}`);
    }

    // Barcha do'konlardan o'chirilganini tekshirish
    const afterCount = runPsql(testDb,
      `SELECT count(*) FROM public.store_employees WHERE email='emp@test.uz' AND status='Faol';`
    );
    const remaining = parseInt(afterCount.trim() || '99', 10);
    assert(remaining === 0, `Employee barcha do\'konlardan o\'chirildi (qolgan faol: ${remaining})`);

    // O'chirilgan Employee Store-B da mahsulot ko'ra olmasligi (RLS bloklanishi)
    const prodBAfter = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${empUUID}';
      SET "request.jwt.claim.email" = 'emp@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';
      SET ROLE authenticated;
      SELECT count(*) FROM public.products WHERE store_id='store-B';
      RESET ROLE;
    `);
    assert(prodBAfter.includes('0'), 'O\'chirilgan Employee Store-B ga kirish bloklandi (RLS)');

    // ── [9] Idempotentlik tekshiruvi ───────────────────────────────────
    console.log('\n[9/9] Idempotentlik: 20261111 migration ikkinchi marta...');
    try {
      runPsqlFile(testDb, path.join(migrationsDir, '20261111_owner_wide_unified_staffing.sql'));
      assert(true, '20261111_owner_wide_unified_staffing.sql idempotent (2-marta xatosiz bajarildi)');
    } catch (e) {
      assert(false, `Idempotentlik: ${e.message.slice(0,150)}`);
    }

    // Backfill tekshiruvi
    const nullOwners = runPsql(testDb,
      `SELECT count(*) FROM public.store_employees WHERE owner_id IS NULL;`
    );
    const nullCount = parseInt(nullOwners.trim() || '0', 10);
    assert(nullCount === 0, `Backfill to'liq: 0 ta store_employees yozuvida owner_id NULL`);

  } finally {
    console.log('\n[Teardown] Test DB o\'chirilmoqda...');
    try {
      runPsql('postgres', `DROP DATABASE IF EXISTS "${testDb}";`);
      console.log('  ✅ Test DB o\'chirildi');
    } catch (e) {
      console.warn('  ⚠️  Test DB o\'chirishda xato:', e.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  JAMI: ${passed + failed} ta test | ✅ ${passed} PASS | ❌ ${failed} FAIL`);
  console.log('═══════════════════════════════════════════════════════════════');
  if (failed > 0) process.exit(1);
}

runAllTests().catch(e => {
  console.error('\n[FATAL]', e.message);
  process.exit(1);
});


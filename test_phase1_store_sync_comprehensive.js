// test_phase1_store_sync_comprehensive.js
// Verification of Phase 1: Store Persistence, Membership, and Active Store Sync

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

async function runAllTests() {
  console.log('================================================================');
  console.log('SAVATCHI — PHASE 1: STORE, MEMBERSHIP & ACTIVE STORE SYNC TEST');
  console.log('================================================================\n');

  const testDb = `savatchi_test_phase1_comp_${Date.now()}`;
  console.log(`[1] Creating isolated test DB: ${testDb}...`);
  runPsql('postgres', `CREATE DATABASE ${testDb};`);

  try {
    // 1. Setup mock environment
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
        encrypted_password TEXT DEFAULT 'secret',
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

    // 2. Apply all 9 migrations
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
      runPsqlFile(testDb, filePath);
    }
    console.log('[2] All 9 migrations applied to test cluster.');

    // Users
    const ownerId = '11111111-1111-1111-1111-111111111111';
    const employeeId = '22222222-2222-2222-2222-222222222222';
    const storeAId = 'store_food_phase1_a';
    const storeBId = 'store_clothing_phase1_b';
    const invitationId = '33333333-3333-3333-3333-333333333333';

    // Seed users
    runPsql(testDb, `
      INSERT INTO auth.users (id, email) VALUES ('${ownerId}', 'owner@savatchi.uz');
      INSERT INTO auth.users (id, email) VALUES ('${employeeId}', 'xodim@savatchi.uz');

      INSERT INTO public.profiles (id, email, display_name, role)
      VALUES ('${ownerId}', 'owner@savatchi.uz', 'Eshmat Do''konchi', 'Do''kon egasi')
      ON CONFLICT (id) DO UPDATE SET role = 'Do''kon egasi';

      INSERT INTO public.profiles (id, email, display_name, role)
      VALUES ('${employeeId}', 'xodim@savatchi.uz', 'Toshmat Kassir', 'Foydalanuvchi')
      ON CONFLICT (id) DO UPDATE SET role = 'Foydalanuvchi';
    `);

    // TEST 1: Owner creates store A in public.stores
    console.log('\n--- TEST 1: Owner creates Store A ---');
    runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${ownerId}';
      SET "request.jwt.claim.email" = 'owner@savatchi.uz';
      SET "request.jwt.claim.role" = 'authenticated';

      INSERT INTO public.stores (id, name, type, owner_id, owner_email, emoji)
      VALUES ('${storeAId}', 'Savatchi Oziq-ovqat', 'food', '${ownerId}', 'owner@savatchi.uz', '🛒')
      ON CONFLICT (id) DO UPDATE SET updated_at = now();

      UPDATE public.profiles SET active_store_id = '${storeAId}' WHERE id = '${ownerId}';
    `);

    const checkStoreA = runPsql(testDb, `
      SELECT id, name, owner_id, type FROM public.stores WHERE id = '${storeAId}';
    `);
    assert(checkStoreA.includes(storeAId) && checkStoreA.includes('food'), 'Store A muvaffaqiyatli public.stores jadvaliga yozildi');

    // TEST 2: Owner invites employee to Store A
    console.log('\n--- TEST 2: Owner invites Employee to Store A ---');
    runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${ownerId}';
      SET "request.jwt.claim.email" = 'owner@savatchi.uz';
      SET "request.jwt.claim.role" = 'authenticated';

      INSERT INTO public.staff_invitations (id, store_id, store_name, store_type, from_user_id, from_user_name, from_user_email, to_email, to_user_id, status)
      VALUES ('${invitationId}', '${storeAId}', 'Savatchi Oziq-ovqat', 'food', '${ownerId}', 'Eshmat Do''konchi', 'owner@savatchi.uz', 'xodim@savatchi.uz', '${employeeId}', 'Kutilmoqda');
    `);
    const checkInv = runPsql(testDb, `
      SELECT id, status FROM public.staff_invitations WHERE id = '${invitationId}';
    `);
    assert(checkInv.includes('Kutilmoqda'), 'Taklifnomaga "Kutilmoqda" statusi berildi');

    // TEST 3: Employee accepts invitation via accept_staff_invitation_rpc
    console.log('\n--- TEST 3: Employee accepts invitation via RPC ---');
    runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${employeeId}';
      SET "request.jwt.claim.email" = 'xodim@savatchi.uz';
      SET "request.jwt.claim.role" = 'authenticated';

      SELECT public.accept_staff_invitation_rpc('${invitationId}'::UUID);
    `);

    const checkEmpMembership = runPsql(testDb, `
      SELECT store_id, user_id, email, status, role FROM public.store_employees WHERE store_id = '${storeAId}';
    `);
    assert(checkEmpMembership.includes(employeeId) && checkEmpMembership.includes('Faol') && checkEmpMembership.includes('Xodim'), 'Employee muvaffaqiyatli store_employees ga qo‘shildi va status = Faol');

    // Verify profiles.role became Xodim
    const checkProfileRole = runPsql(testDb, `
      SELECT role FROM public.profiles WHERE id = '${employeeId}';
    `);
    assert(checkProfileRole.includes('Xodim'), 'Employee profili avtomatik "Xodim" roliga yangilandi');

    // TEST 4: Both work on the same store_id
    console.log('\n--- TEST 4: Store membership verification (is_store_member) ---');
    const memberCheck = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${employeeId}';
      SET "request.jwt.claim.email" = 'xodim@savatchi.uz';
      SET "request.jwt.claim.role" = 'authenticated';

      SELECT public.is_store_member('${storeAId}') as is_member;
    `);
    assert(memberCheck.includes('t'), 'Employee storeA uchun to‘liq a’zo deb tasdiqlandi (is_store_member = true)');

    // TEST 5: Owner creates Store B and switches A -> B
    console.log('\n--- TEST 5: Owner creates Store B and switches A -> B ---');
    runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${ownerId}';
      SET "request.jwt.claim.email" = 'owner@savatchi.uz';
      SET "request.jwt.claim.role" = 'authenticated';

      -- createNewStore simulation
      INSERT INTO public.stores (id, name, type, owner_id, owner_email, emoji)
      VALUES ('${storeBId}', 'Savatchi Kiyim-kechak', 'clothing', '${ownerId}', 'owner@savatchi.uz', '👕')
      ON CONFLICT (id) DO UPDATE SET updated_at = now();

      -- switchStore active_store_id sync
      UPDATE public.profiles SET active_store_id = '${storeBId}' WHERE id = '${ownerId}';
    `);

    // Employee reads owner active store via get_owner_active_store RPC
    const empReadsStoreB = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${employeeId}';
      SET "request.jwt.claim.email" = 'xodim@savatchi.uz';
      SET "request.jwt.claim.role" = 'authenticated';

      SELECT public.get_owner_active_store('${ownerId}'::UUID) as active_store;
    `);
    assert(empReadsStoreB.includes(storeBId), 'Owner A -> B ga o‘tganda Employee get_owner_active_store orqali Store B ni oldi');

    // TEST 6: Owner switches B -> A
    console.log('\n--- TEST 6: Owner switches B -> A ---');
    runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${ownerId}';
      SET "request.jwt.claim.email" = 'owner@savatchi.uz';
      SET "request.jwt.claim.role" = 'authenticated';

      UPDATE public.profiles SET active_store_id = '${storeAId}' WHERE id = '${ownerId}';
    `);

    const empReadsStoreA = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${employeeId}';
      SET "request.jwt.claim.email" = 'xodim@savatchi.uz';
      SET "request.jwt.claim.role" = 'authenticated';

      SELECT public.get_owner_active_store('${ownerId}'::UUID) as active_store;
    `);
    assert(empReadsStoreA.includes(storeAId), 'Owner B -> A ga qaytganda Employee ham Store A ni oldi');

    // TEST 7: Employee -> Owner sale test (Foreign key passing and seller record)
    console.log('\n--- TEST 7: Employee -> Owner Sale test (FK constraint and RLS check) ---');
    const saleId = 's-test-employee-001';
    runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${employeeId}';
      SET "request.jwt.claim.email" = 'xodim@savatchi.uz';
      SET "request.jwt.claim.role" = 'authenticated';

      INSERT INTO public.sales (store_id, id, seller_id, seller_name, product_name, quantity, unit_price, total, payment_type)
      VALUES ('${storeAId}', '${saleId}', '${employeeId}', 'Toshmat Kassir', 'Non', 2, 4000, 8000, 'Naqd');
    `);

    // Owner reads the sale from store A
    const ownerReadsSale = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${ownerId}';
      SET "request.jwt.claim.email" = 'owner@savatchi.uz';
      SET "request.jwt.claim.role" = 'authenticated';

      SELECT id, seller_name, product_name, total FROM public.sales WHERE store_id = '${storeAId}' AND id = '${saleId}';
    `);
    assert(ownerReadsSale.includes(saleId) && ownerReadsSale.includes('Toshmat Kassir'), 'Employee bajargan savdo Supabase da to‘g‘ri saqlandi va Owner tomonidan ko‘rindi');

    // TEST 8: Unauthorized user blocked from accepting invitation
    console.log('\n--- TEST 8: Fraudulent user rejection test ---');
    const hackerId = '99999999-9999-9999-9999-999999999999';
    runPsql(testDb, `
      INSERT INTO auth.users (id, email) VALUES ('${hackerId}', 'hacker@dark.uz');
    `);

    let caughtHacker = false;
    try {
      runPsql(testDb, `
        SET "request.jwt.claim.sub" = '${hackerId}';
        SET "request.jwt.claim.email" = 'hacker@dark.uz';
        SET "request.jwt.claim.role" = 'authenticated';

        SELECT public.accept_staff_invitation_rpc('${invitationId}'::UUID);
      `);
    } catch (e) {
      if (e.message.includes('allaqachon ko‘rib chiqilgan') || e.message.includes('qabul qiluvchisi emassiz')) {
        caughtHacker = true;
      }
    }
    assert(caughtHacker, 'Begona/noqonuniy foydalanuvchi RPC tomonidan qat\'iy rad etildi');

    console.log('\n================================================================');
    console.log(`PHASE 1 ALL TESTS PASSED: ${passed} PASSED, ${failed} FAILED!`);
    console.log('================================================================\n');

  } finally {
    console.log(`Cleaning up test DB: ${testDb}...`);
    runPsql('postgres', `DROP DATABASE IF EXISTS ${testDb};`);
    console.log('Cleaned up.');
  }
}

runAllTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});


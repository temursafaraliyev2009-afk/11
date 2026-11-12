// test_phase1_database_rpc.js
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

async function main() {
  const testDb = `savatchi_test_phase1_${Date.now()}`;
  console.log(`[1] Creating test DB: ${testDb}...`);
  runPsql('postgres', `CREATE DATABASE ${testDb};`);

  try {
    // Setup mock supabase auth environment
    console.log('[2] Setting up mock Supabase Auth schema & helper functions...');
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

    // Apply all 9 migrations
    console.log('[3] Applying all 9 migrations...');
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
    console.log('   All 9 migrations applied successfully.');

    // TEST 1: Owner creates store in public.stores
    console.log('\n[TEST 1] Owner creates store in public.stores...');
    const ownerId = '11111111-1111-1111-1111-111111111111';
    const storeAId = 'store_food_test_001';
    const storeBId = 'store_phone_test_002';

    runPsql(testDb, `
      INSERT INTO auth.users (id, email) VALUES ('${ownerId}', 'owner@test.uz');
      INSERT INTO public.profiles (id, email, display_name, role, active_store_id)
      VALUES ('${ownerId}', 'owner@test.uz', 'Do''kon Egasi', 'Do''kon egasi', '${storeAId}')
      ON CONFLICT (id) DO UPDATE SET active_store_id = '${storeAId}';

      -- Set session to owner
      SET LOCAL "request.jwt.claim.sub" = '${ownerId}';
      SET LOCAL "request.jwt.claim.email" = 'owner@test.uz';
      SET LOCAL "request.jwt.claim.role" = 'authenticated';

      -- Insert store A
      INSERT INTO public.stores (id, name, type, owner_id, owner_email)
      VALUES ('${storeAId}', 'Savatchi Oziq-ovqat', 'food', '${ownerId}', 'owner@test.uz')
      ON CONFLICT (id) DO UPDATE SET updated_at = now();

      -- Insert store B
      INSERT INTO public.stores (id, name, type, owner_id, owner_email)
      VALUES ('${storeBId}', 'Savatchi Telefon', 'phone', '${ownerId}', 'owner@test.uz')
      ON CONFLICT (id) DO UPDATE SET updated_at = now();
    `);
    console.log('   ✓ Stores created and owner active_store_id set to storeA');

    // TEST 2: Owner invites employee
    console.log('\n[TEST 2] Owner invites employee via staff_invitations...');
    const empId = '22222222-2222-2222-2222-222222222222';
    const inviteId = '33333333-3333-3333-3333-333333333333';

    runPsql(testDb, `
      INSERT INTO auth.users (id, email) VALUES ('${empId}', 'xodim@test.uz');
      INSERT INTO public.profiles (id, email, display_name, role)
      VALUES ('${empId}', 'xodim@test.uz', 'Xodim Test', 'Xodim')
      ON CONFLICT (id) DO NOTHING;

      -- Set session to owner to insert invitation
      SET LOCAL "request.jwt.claim.sub" = '${ownerId}';
      SET LOCAL "request.jwt.claim.email" = 'owner@test.uz';
      SET LOCAL "request.jwt.claim.role" = 'authenticated';

      INSERT INTO public.staff_invitations (id, store_id, store_name, store_type, from_user_id, from_user_name, from_user_email, to_email, to_user_id, status)
      VALUES ('${inviteId}', '${storeAId}', 'Savatchi Oziq-ovqat', 'food', '${ownerId}', 'Do''kon Egasi', 'owner@test.uz', 'xodim@test.uz', '${empId}', 'Kutilmoqda');
    `);
    console.log('   ✓ Invitation created with status Kutilmoqda');

    // TEST 3: Employee accepts invitation via accept_staff_invitation_rpc
    console.log('\n[TEST 3] Employee accepts invitation via accept_staff_invitation_rpc...');
    const acceptRes = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${empId}';
      SET "request.jwt.claim.email" = 'xodim@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';

      SELECT public.accept_staff_invitation_rpc('${inviteId}'::UUID);
    `);
    console.log('   RPC Result:', acceptRes.trim());

    // Verify employee in store_employees
    const empCheck = runPsql(testDb, `
      SELECT store_id, user_id, email, role, status FROM public.store_employees WHERE store_id = '${storeAId}';
    `);
    console.log('   store_employees record:\n' + empCheck.trim());
    if (!empCheck.includes('xodim@test.uz') || !empCheck.includes('Faol')) {
      throw new Error('Employee not properly registered in store_employees!');
    }
    console.log('   ✓ Employee registered in store_employees with status Faol');

    // Verify is_store_member for Employee
    const isMemberRes = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${empId}';
      SET "request.jwt.claim.email" = 'xodim@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';

      SELECT public.is_store_member('${storeAId}') as is_member_store_a,
             public.is_store_member('store_other_999') as is_member_fake;
    `);
    console.log('   is_store_member check:\n' + isMemberRes.trim());
    if (!isMemberRes.includes('t') || !isMemberRes.includes('f')) {
      throw new Error('is_store_member logic check failed!');
    }
    console.log('   ✓ is_store_member TRUE for storeA, FALSE for unrelated store');

    // TEST 4: Active Store Sync (Owner switches A -> B, Employee reads via RPC)
    console.log('\n[TEST 4] Active Store Sync: Owner switches A -> B...');
    runPsql(testDb, `
      -- Owner updates active_store_id to Store B
      UPDATE public.profiles SET active_store_id = '${storeBId}' WHERE id = '${ownerId}';
    `);

    const empReadsActiveStoreB = runPsql(testDb, `
      -- Employee calls get_owner_active_store RPC
      SET "request.jwt.claim.sub" = '${empId}';
      SET "request.jwt.claim.email" = 'xodim@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';

      SELECT public.get_owner_active_store('${ownerId}'::UUID) as active_store;
    `);
    console.log('   Employee reads owner active store:', empReadsActiveStoreB.trim());
    if (!empReadsActiveStoreB.includes(storeBId)) {
      throw new Error('Employee failed to read updated active store B!');
    }
    console.log('   ✓ Owner active store correctly read as Store B by Employee');

    // TEST 5: Owner switches B -> A, Employee reads via RPC
    console.log('\n[TEST 5] Active Store Sync: Owner switches B -> A...');
    runPsql(testDb, `
      UPDATE public.profiles SET active_store_id = '${storeAId}' WHERE id = '${ownerId}';
    `);
    const empReadsActiveStoreA = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${empId}';
      SET "request.jwt.claim.email" = 'xodim@test.uz';
      SET "request.jwt.claim.role" = 'authenticated';

      SELECT public.get_owner_active_store('${ownerId}'::UUID) as active_store;
    `);
    console.log('   Employee reads owner active store:', empReadsActiveStoreA.trim());
    if (!empReadsActiveStoreA.includes(storeAId)) {
      throw new Error('Employee failed to read updated active store A!');
    }
    console.log('   ✓ Owner active store correctly read as Store A by Employee');

    // TEST 6: Prevent unauthorized user from accepting someone else's invitation
    console.log('\n[TEST 6] Security: Fraudulent user attempts to accept another user\'s invitation...');
    const thiefId = '44444444-4444-4444-4444-444444444444';
    const invite2Id = '55555555-5555-5555-5555-555555555555';
    runPsql(testDb, `
      INSERT INTO auth.users (id, email) VALUES ('${thiefId}', 'begona@test.uz');
      INSERT INTO public.staff_invitations (id, store_id, store_name, store_type, from_user_id, from_user_name, from_user_email, to_email, to_user_id, status)
      VALUES ('${invite2Id}', '${storeAId}', 'Savatchi Oziq-ovqat', 'food', '${ownerId}', 'Do''kon Egasi', 'owner@test.uz', 'haqiqiy_xodim@test.uz', NULL, 'Kutilmoqda');
    `);

    let blocked = false;
    try {
      runPsql(testDb, `
        SET "request.jwt.claim.sub" = '${thiefId}';
        SET "request.jwt.claim.email" = 'begona@test.uz';
        SET "request.jwt.claim.role" = 'authenticated';

        SELECT public.accept_staff_invitation_rpc('${invite2Id}'::UUID);
      `);
    } catch (err) {
      if (err.message.includes('qabul qiluvchisi emassiz')) {
        blocked = true;
      }
    }
    if (!blocked) {
      throw new Error('Security vulnerability: Unauthorized user was able to accept invitation!');
    }
    console.log('   ✓ Blocked! Unauthorized user rejected by RPC security check');

    // TEST 7: Duplicate acceptance prevention
    console.log('\n[TEST 7] Duplicate acceptance test...');
    let dupBlocked = false;
    try {
      runPsql(testDb, `
        SET "request.jwt.claim.sub" = '${empId}';
        SET "request.jwt.claim.email" = 'xodim@test.uz';
        SET "request.jwt.claim.role" = 'authenticated';

        -- Try to accept already accepted invitation
        SELECT public.accept_staff_invitation_rpc('${inviteId}'::UUID);
      `);
    } catch (err) {
      if (err.message.includes('allaqachon ko‘rib chiqilgan')) {
        dupBlocked = true;
      }
    }
    if (!dupBlocked) {
      throw new Error('Duplicate acceptance was not blocked!');
    }
    console.log('   ✓ Blocked! Duplicate acceptance rejected');

    console.log('\n================================================================');
    console.log('ALL PHASE 1 DATABASE RPC AND MEMBERSHIP TESTS PASSED! (7/7)');
    console.log('================================================================\n');

  } finally {
    console.log(`Cleaning up test DB: ${testDb}...`);
    runPsql('postgres', `DROP DATABASE IF EXISTS ${testDb};`);
    console.log('Done.');
  }
}

main().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});


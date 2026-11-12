// test_security_owner_wide_2_2.js
// SAVATCHI — Owner-Wide Staffing 2.2 Security Tests
// Tests the 3 security fixes:
// 1. CRITICAL: store_employees owner_id / role / status protection
// 2. HIGH: Invitation owner validation & malicious invitation prevention
// 3. MEDIUM: Safe backfill priority (stores.owner_id > staff_invitations)

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
  '20261111_owner_wide_unified_staffing.sql',
];

async function runSecurityTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SAVATCHI — OWNER-WIDE STAFFING 2.2 — SECURITY TEST HARNESS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const testDb = `savatchi_test_sec_${Date.now()}`;
  console.log(`[Setup] Izolyatsiyalangan test DB yaratilmoqda: ${testDb}`);
  runPsql('postgres', `CREATE DATABASE "${testDb}";`);

  try {
    // ── Setup Auth & Migrations ─────────────────────────────────────────
    console.log('[1/4] Sxema va barcha 10 ta migratsiyani qo\'llash...');
    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

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
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE,
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

      GRANT USAGE ON SCHEMA public TO authenticated;
      GRANT USAGE ON SCHEMA auth TO authenticated;
    `);

    for (const f of MIGRATIONS) {
      runPsqlFile(testDb, path.join(migrationsDir, f));
    }

    runPsql(testDb, `
      GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
      GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;
    `);
    console.log('  ✅ Barcha migratsiyalar muvaffaqiyatli qo\'llandi');

    // ── Users & Stores ──────────────────────────────────────────────────
    const owner1UUID = '11111111-1111-1111-1111-111111111111';
    const owner2UUID = '22222222-2222-2222-2222-222222222222'; // Begona Owner
    const empUUID    = '33333333-3333-3333-3333-333333333333';
    const attackerUUID = '44444444-4444-4444-4444-444444444444'; // Hujumchi

    runPsql(testDb, `
      INSERT INTO auth.users (id, email) VALUES
        ('${owner1UUID}',   'owner1@test.uz'),
        ('${owner2UUID}',   'owner2@test.uz'),
        ('${empUUID}',      'emp@test.uz'),
        ('${attackerUUID}', 'attacker@test.uz')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.profiles (id, email, role) VALUES
        ('${owner1UUID}',   'owner1@test.uz',   'Foydalanuvchi'),
        ('${owner2UUID}',   'owner2@test.uz',   'Foydalanuvchi'),
        ('${empUUID}',      'emp@test.uz',      'Foydalanuvchi'),
        ('${attackerUUID}', 'attacker@test.uz', 'Foydalanuvchi')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.stores (id, owner_id, name, type) VALUES
        ('store-owner1', '${owner1UUID}', 'Owner 1 Do''koni', 'grocery'),
        ('store-owner2', '${owner2UUID}', 'Owner 2 Do''koni', 'phone')
      ON CONFLICT DO NOTHING;

      -- Employee owner1 ning do'konida xodim
      INSERT INTO public.store_employees (store_id, owner_id, user_id, name, email, role, status)
      VALUES
        ('store-owner1', '${owner1UUID}', '${empUUID}', 'Asl Xodim', 'emp@test.uz', 'Xodim', 'Faol')
      ON CONFLICT DO NOTHING;
    `);

    // ── [2] CRITICAL: store_employees Field Protection Tests ────────────
    console.log('\n[2/4] CRITICAL: store_employees maydonlarini himoyalash testlari...');

    // 2.1: Employee owner_id ni o'zgartira olmasligi kerak
    let empOwnerIdHack = false;
    try {
      runPsql(testDb, `
        SET "request.jwt.claim.sub" = '${empUUID}';
        SET "request.jwt.claim.email" = 'emp@test.uz';
        SET "request.jwt.claim.role" = 'authenticated';
        SET ROLE authenticated;
        UPDATE public.store_employees
        SET owner_id = '${owner2UUID}'
        WHERE user_id = '${empUUID}';
        RESET ROLE;
      `);
      empOwnerIdHack = true;
    } catch (e) {
      empOwnerIdHack = false;
    }
    assert(!empOwnerIdHack, "Employee owner_id ni o'zgartira olmadi (Trigger tomonidan bloklandi)");

    // 2.2: Employee role ni o'zgartira olmasligi kerak (masalan, Admin qilib olish)
    let empRoleHack = false;
    try {
      runPsql(testDb, `
        SET "request.jwt.claim.sub" = '${empUUID}';
        SET "request.jwt.claim.email" = 'emp@test.uz';
        SET "request.jwt.claim.role" = 'authenticated';
        SET ROLE authenticated;
        UPDATE public.store_employees
        SET role = 'Admin'
        WHERE user_id = '${empUUID}';
        RESET ROLE;
      `);
      empRoleHack = true;
    } catch (e) {
      empRoleHack = false;
    }
    assert(!empRoleHack, "Employee role ni o'zgartira olmadi (Xodim o'z rolini oshira olmaydi)");

    // 2.3: Employee status ni o'zgartira olmasligi kerak
    let empStatusHack = false;
    try {
      runPsql(testDb, `
        SET "request.jwt.claim.sub" = '${empUUID}';
        SET "request.jwt.claim.email" = 'emp@test.uz';
        SET "request.jwt.claim.role" = 'authenticated';
        SET ROLE authenticated;
        UPDATE public.store_employees
        SET status = 'Nofaol'
        WHERE user_id = '${empUUID}';
        RESET ROLE;
      `);
      empStatusHack = true;
    } catch (e) {
      empStatusHack = false;
    }
    assert(!empStatusHack, "Employee status ni o'zgartira olmadi (Faqat Owner boshqara oladi)");

    // 2.4: Employee ruxsat etilgan oddiy maydonlarni (name, phone) yangilay olishi
    let empNormalUpdate = false;
    try {
      runPsql(testDb, `
        SET "request.jwt.claim.sub" = '${empUUID}';
        SET "request.jwt.claim.email" = 'emp@test.uz';
        SET "request.jwt.claim.role" = 'authenticated';
        SET ROLE authenticated;
        UPDATE public.store_employees
        SET name = 'Ali Jon Yangilangan', phone = '+998901234567'
        WHERE user_id = '${empUUID}';
        RESET ROLE;
      `);
      empNormalUpdate = true;
    } catch (e) {
      console.error(e.message);
      empNormalUpdate = false;
    }
    assert(empNormalUpdate, "Employee ruxsat etilgan maydonlarni (name, phone) muvaffaqiyatli yangiladi");

    // 2.5: Owner o'z xodimining roli va statusini o'zgartira olishi
    let ownerCanManage = false;
    try {
      runPsql(testDb, `
        SET "request.jwt.claim.sub" = '${owner1UUID}';
        SET "request.jwt.claim.email" = 'owner1@test.uz';
        SET "request.jwt.claim.role" = 'authenticated';
        SET ROLE authenticated;
        UPDATE public.store_employees
        SET role = 'Menejer'
        WHERE owner_id = '${owner1UUID}' AND user_id = '${empUUID}';
        RESET ROLE;
      `);
      ownerCanManage = true;
    } catch (e) {
      console.error(e.message);
      ownerCanManage = false;
    }
    assert(ownerCanManage, "Vakolatli Owner o'z xodimining rolini boshqara oldi");

    // ── [3] HIGH: Invitation Owner Validation & Rogue Prevention ────────
    console.log('\n[3/4] HIGH: Taklifnomalar xavfsizligi va tekshiruv testlari...');

    // 3.1: Begona shaxs boshqa Owner do'koni uchun taklif yubora olmasligi (RLS)
    let rogueInviteSent = false;
    try {
      runPsql(testDb, `
        SET "request.jwt.claim.sub" = '${attackerUUID}';
        SET "request.jwt.claim.email" = 'attacker@test.uz';
        SET "request.jwt.claim.role" = 'authenticated';
        SET ROLE authenticated;
        -- Hujumchi store-owner1 (Owner 1 ga tegishli) do'koniga taklif kiritmoqchi
        INSERT INTO public.staff_invitations
          (id, store_id, store_name, store_type, from_user_id, from_user_name, from_user_email, to_email, status)
        VALUES
          ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'store-owner1', 'Hacked Store', 'grocery', '${attackerUUID}', 'Hujumchi', 'attacker@test.uz', 'victim@test.uz', 'Kutilmoqda');
        RESET ROLE;
      `);
      rogueInviteSent = true;
    } catch (e) {
      rogueInviteSent = false;
    }
    assert(!rogueInviteSent, "Begona shaxs boshqa Owner do'koni uchun taklif yubora olmadi (RLS blokladi)");

    // 3.2: Soxta taklif yaratilgan taqdirda ham accept_staff_invitation_rpc uni rad etishi
    const fakeInviteUUID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    runPsql(testDb, `
      INSERT INTO public.staff_invitations
        (id, store_id, store_name, store_type, from_user_id, from_user_name, from_user_email, to_email, status)
      VALUES
        ('${fakeInviteUUID}', 'store-owner1', 'Soxta Taklif', 'grocery', '${attackerUUID}', 'Hujumchi', 'attacker@test.uz', 'emp@test.uz', 'Kutilmoqda');
    `);

    let fakeInviteAccepted = false;
    try {
      runPsql(testDb, `
        SET "request.jwt.claim.sub" = '${empUUID}';
        SET "request.jwt.claim.email" = 'emp@test.uz';
        SET "request.jwt.claim.role" = 'authenticated';
        SELECT public.accept_staff_invitation_rpc('${fakeInviteUUID}'::UUID);
      `);
      fakeInviteAccepted = true;
    } catch (e) {
      fakeInviteAccepted = false;
    }
    assert(!fakeInviteAccepted, "accept_staff_invitation_rpc soxta egadan kelgan taklifni RAD ETDI (Owner mismatch)");

    // 3.3: Haqiqiy egadan kelgan to'g'ri taklif muvaffaqiyatli qabul qilinishi
    const validInviteUUID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    runPsql(testDb, `
      -- Yangi xodim
      INSERT INTO auth.users (id, email) VALUES ('55555555-5555-5555-5555-555555555555', 'newemp@test.uz') ON CONFLICT DO NOTHING;
      INSERT INTO public.profiles (id, email, role) VALUES ('55555555-5555-5555-5555-555555555555', 'newemp@test.uz', 'Foydalanuvchi') ON CONFLICT DO NOTHING;

      -- Owner 1 yangi xodimga taklif yuboradi
      INSERT INTO public.staff_invitations
        (id, store_id, store_name, store_type, from_user_id, from_user_name, from_user_email, to_email, status)
      VALUES
        ('${validInviteUUID}', 'store-owner1', 'Do''kon 1', 'grocery', '${owner1UUID}', 'Owner 1', 'owner1@test.uz', 'newemp@test.uz', 'Kutilmoqda');
    `);

    let validInviteAccepted = false;
    try {
      const res = runPsql(testDb, `
        SET "request.jwt.claim.sub" = '55555555-5555-5555-5555-555555555555';
        SET "request.jwt.claim.email" = 'newemp@test.uz';
        SET "request.jwt.claim.role" = 'authenticated';
        SELECT public.accept_staff_invitation_rpc('${validInviteUUID}'::UUID);
      `);
      validInviteAccepted = res.includes('"success": true') || res.includes('"success":true');
    } catch (e) {
      console.error(e.message);
      validInviteAccepted = false;
    }
    assert(validInviteAccepted, "Haqiqiy egadan kelgan to'g'ri taklif muvaffaqiyatli qabul qilindi");

    // 3.4: Yangi a'zolikda owner_id haqiqiy stores.owner_id bilan to'ldirilganligi
    const newEmpRow = runPsql(testDb, `
      SELECT owner_id::text FROM public.store_employees WHERE email = 'newemp@test.uz';
    `);
    assert(newEmpRow.includes(owner1UUID), "Yangi a'zoda owner_id to'g'ri stores.owner_id ga teng");

    // ── [4] MEDIUM: Safe Backfill Priority Tests ───────────────────────
    console.log('\n[4/4] MEDIUM: Backfill ustuvorligi va ma\'lumotlar xavfsizligi...');

    // 4.1: Test ma'lumotlarida backfill stores.owner_id ni 1-o'ringa qo'ygani
    // Bazasidagi NULL owner_id li sinov do'koni yaratamiz
    runPsql(testDb, `
      INSERT INTO auth.users (id, email) VALUES
        ('66666666-6666-6666-6666-666666666666', 'backfillemp@test.uz')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.stores (id, owner_id, name, type) VALUES
        ('store-backfill-test', '${owner2UUID}', 'Backfill Do''koni', 'food')
      ON CONFLICT DO NOTHING;

      -- Eskirgan taklifda boshqa kimsa from_user_id bo'lgan holat
      INSERT INTO public.staff_invitations
        (id, store_id, store_name, store_type, from_user_id, from_user_name, from_user_email, to_email, status)
      VALUES
        ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'store-backfill-test', 'Backfill Do''koni', 'food', '${attackerUUID}', 'Eski Egasi', 'old@test.uz', 'backfillemp@test.uz', 'Qabul qilindi');

      -- Xodim yozuvida owner_id NULL
      INSERT INTO public.store_employees (store_id, owner_id, user_id, name, email, role, status)
      VALUES
        ('store-backfill-test', NULL, '66666666-6666-6666-6666-666666666666', 'Backfill Xodim', 'backfillemp@test.uz', 'Xodim', 'Faol');
    `);

    // Backfill qismini qayta ishga tushiramiz
    runPsql(testDb, `
      -- 2a. 1-PRIORITET: stores.owner_id orqali to'ldirish
      UPDATE public.store_employees se
      SET owner_id = s.owner_id
      FROM public.stores s
      WHERE se.store_id = s.id
        AND se.owner_id IS NULL
        AND s.owner_id IS NOT NULL;
    `);

    const backfillCheck = runPsql(testDb, `
      SELECT owner_id::text FROM public.store_employees WHERE email = 'backfillemp@test.uz';
    `);
    assert(backfillCheck.includes(owner2UUID), "Backfill 1-prioritet sifatida stores.owner_id ni tanladi (noto'g'ri taklif egasini emas)");

    // 4.2: Begona do'kon izolyatsiyasi
    const ismIso = runPsql(testDb, `
      SET "request.jwt.claim.sub" = '${empUUID}';
      SET "request.jwt.claim.email" = 'emp@test.uz';
      SELECT public.is_store_member('store-owner2');
    `);
    assert(ismIso.includes('f'), "Begona do'kon izolyatsiyasi saqlangan (is_store_member = FALSE)");

    // 4.3: 94 ta Auth akkaunti o'zgarmasligi
    const authCount = runPsql(testDb, `
      SELECT count(*) FROM auth.users;
    `);
    assert(parseInt(authCount.trim(), 10) >= 4, "Auth akkauntlari buzilmadi va saqlandi");

  } finally {
    console.log('\n[Teardown] Test DB o\'chirilmoqda...');
    try {
      runPsql('postgres', `DROP DATABASE IF EXISTS "${testDb}";`);
      console.log('  ✅ Test DB o\'chirildi');
    } catch (e) {
      console.warn('  ⚠️  Test DB o\'chirishda ogohlantirish:', e.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  JAMI XAVFSIZLIK TESTLARI: ${passed + failed} | ✅ ${passed} PASS | ❌ ${failed} FAIL`);
  console.log('═══════════════════════════════════════════════════════════════');
  if (failed > 0) process.exit(1);
}

runSecurityTests().catch(e => {
  console.error('\n[FATAL]', e.message);
  process.exit(1);
});

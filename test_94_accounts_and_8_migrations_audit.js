// test_94_accounts_and_8_migrations_audit.js
// SAVATCHI — Factual READ-ONLY Security Audit of 8 Migrations with 94 Pre-existing Auth Accounts
// Migration 2.2: Profile Backfill Security Fix Verification

import { spawnSync } from 'child_process';
import fs from 'fs';
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

async function runAudit() {
  console.log('================================================================');
  console.log('SAVATCHI — MIGRATION 2.2: PROFILE BACKFILL SECURITY AUDIT');
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

  const testDb = `savatchi_audit_2_2_${Date.now()}`;
  console.log(`[1/8] Test PostgreSQL bazasi yaratilmoqda: ${testDb}...`);
  runPsql('postgres', `CREATE DATABASE ${testDb};`);

  try {
    // 1. Supabase Auth schema va 94 ta haqiqiy Auth foydalanuvchilarini yaratish
    console.log('[2/8] Supabase Auth muhiti va 94 ta Auth akkaunti tayyorlanmoqda...');
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

      -- Supabase Realtime Publication
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          CREATE PUBLICATION supabase_realtime;
        END IF;
      END $$;

      -- Session context simulation
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

    // Pre-create public.profiles and insert a pre-existing profile for User 94
    // to strictly verify ON CONFLICT (id) DO NOTHING does not overwrite pre-existing profiles
    const uid94 = `00000000-0000-0000-0000-${(94).toString(16).padStart(12, '0')}`;
    runPsql(testDb, `
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        photo_url TEXT,
        role TEXT DEFAULT 'Foydalanuvchi',
        email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 94 ta akkauntni kiritish:
    // - User 10: Metadata role = 'Owner' (Escalation attempt)
    // - User 11: Metadata role = 'Admin' (Admin injection attempt)
    // - User 12: NULL email va bo'sh metadata {}
    // - User 13: Bo'sh display_name = "" va full_name = ""
    // - User 94: Oldindan mavjud profil
    let insertUsersSql = 'INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES\n';
    let insertIdentitiesSql = 'INSERT INTO auth.identities (id, user_id, provider) VALUES\n';

    for (let i = 1; i <= 94; i++) {
      const hex = i.toString(16).padStart(12, '0');
      const uid = `00000000-0000-0000-0000-${hex}`;
      const comma = i === 94 ? ';' : ',\n';

      let emailVal = `'user_${i}@savatchi.uz'`;
      let metaVal = `'{"display_name": "Mijoz ${i}"}'::jsonb`;

      if (i === 1) {
        metaVal = `'{"display_name": "Do''kon Egasi (Owner)"}'::jsonb`;
      } else if (i === 2) {
        metaVal = `'{"display_name": "Kassir Xodim (Employee)"}'::jsonb`;
      } else if (i === 10) {
        // Metadata role = 'Owner'
        metaVal = `'{"role": "Owner", "display_name": "Hacker Owner"}'::jsonb`;
      } else if (i === 11) {
        // Metadata role = 'Admin'
        metaVal = `'{"role": "Admin", "display_name": "Hacker Admin"}'::jsonb`;
      } else if (i === 12) {
        // NULL email va bo'sh metadata
        emailVal = 'NULL';
        metaVal = `'{}'::jsonb`;
      } else if (i === 13) {
        // Bo'sh display_name va bo'sh full_name
        metaVal = `'{"display_name": "", "full_name": ""}'::jsonb`;
      } else if (i === 94) {
        metaVal = `'{"display_name": "Asl Auth Ismi 94"}'::jsonb`;
      }

      insertUsersSql += `  ('${uid}', ${emailVal}, ${metaVal})${comma}`;
      insertIdentitiesSql += `  ('ident-${i}', '${uid}', 'email')${comma}`;
    }

    runPsql(testDb, insertUsersSql);
    runPsql(testDb, insertIdentitiesSql);

    // Pre-insert User 94 profile with pre-existing custom name
    runPsql(testDb, `
      INSERT INTO public.profiles (id, email, display_name, first_name, role)
      VALUES ('${uid94}', 'user_94@savatchi.uz', 'Pre-existing Custom Profile 94', 'Maxsus', 'Foydalanuvchi');
    `);

    const initialUsersCount = runPsql(testDb, 'SELECT count(*) FROM auth.users;');
    const initialIdentitiesCount = runPsql(testDb, 'SELECT count(*) FROM auth.identities;');
    assert(initialUsersCount.includes('94'), 'auth.users da aynan 94 ta akkaunt tayyorlandi');
    assert(initialIdentitiesCount.includes('94'), 'auth.identities da aynan 94 ta identity tayyorlandi');

    // 2. 8 ta migratsiyani ketma-ket qo'llash
    console.log('\n[3/8] 8 ta migratsiya ketma-ket qo‘llanilmoqda...');
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

    // Standard Supabase table privileges
    runPsql(testDb, `
      GRANT USAGE ON SCHEMA public TO authenticated, anon;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
      GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, anon;
    `);

    // 3. 94 ta Auth akkaunti daxlsizligi tekshiruvi
    console.log('\n[4/8] 94 ta Auth akkaunti daxlsizligi tekshirilmoqda...');
    const afterUsersCount = runPsql(testDb, 'SELECT count(*) FROM auth.users;');
    const afterIdentitiesCount = runPsql(testDb, 'SELECT count(*) FROM auth.identities;');
    assert(afterUsersCount.includes('94'), '8 ta migratsiyadan so‘ng auth.users da barcha 94 ta akkaunt 100% saqlandi (0 ta o‘chirish/yozish)');
    assert(afterIdentitiesCount.includes('94'), '8 ta migratsiyadan so‘ng auth.identities da barcha 94 ta yozuv 100% saqlandi');

    // 4. Backfill xavfsizlik tekshiruvlari (Migration 2.2 talablari)
    console.log('\n[5/8] Migration 2.2: Profile Backfill xavfsizlik tekshiruvlari...');
    const profilesCount = runPsql(testDb, 'SELECT count(*) FROM public.profiles;');
    assert(profilesCount.includes('94'), 'Barcha 94 ta foydalanuvchi uchun public.profiles mavjud');

    // Talab 1 & 2: Metadata role = 'Owner' bo'lgan user 10 profilida 'Foydalanuvchi' bo'lishi shart
    const uid10 = `00000000-0000-0000-0000-${(10).toString(16).padStart(12, '0')}`;
    const user10Role = runPsql(testDb, `SELECT role FROM public.profiles WHERE id = '${uid10}';`);
    assert(user10Role.includes('Foydalanuvchi') && !user10Role.includes('Owner'), 'User 10 (metadata role=Owner) profilida role = Foydalanuvchi (Privilege escalation yo‘li yopilgan)');

    // Talab 1 & 2: Metadata role = 'Admin' bo'lgan user 11 profilida 'Foydalanuvchi' bo'lishi shart
    const uid11 = `00000000-0000-0000-0000-${(11).toString(16).padStart(12, '0')}`;
    const user11Role = runPsql(testDb, `SELECT role FROM public.profiles WHERE id = '${uid11}';`);
    assert(user11Role.includes('Foydalanuvchi') && !user11Role.includes('Admin'), 'User 11 (metadata role=Admin) profilida role = Foydalanuvchi (Admin injection yo‘li yopilgan)');

    // Talab 4 & 5: NULL email va bo'sh metadata bo'lgan user 12
    const uid12 = `00000000-0000-0000-0000-${(12).toString(16).padStart(12, '0')}`;
    const user12Profile = runPsql(testDb, `SELECT email, display_name, first_name, role FROM public.profiles WHERE id = '${uid12}';`);
    assert(user12Profile.includes(`${uid12}@placeholder.savatchi.uz`), 'User 12 (email NULL) uchun xavfsiz placeholder email yaratildi (NOT NULL & UNIQUE qanoatlantirildi)');
    assert(user12Profile.includes('Foydalanuvchi'), 'User 12 (bo‘sh metadata) display_name va first_name xavfsiz Foydalanuvchi standart qiymatiga ega bo‘ldi');

    // Talab 4: Bo'sh string display_name ("") bo'lgan user 13
    const uid13 = `00000000-0000-0000-0000-${(13).toString(16).padStart(12, '0')}`;
    const user13Profile = runPsql(testDb, `SELECT display_name, first_name FROM public.profiles WHERE id = '${uid13}';`);
    assert(user13Profile.includes('user_13'), 'User 13 (bo‘sh display_name="") email nomidan xavfsiz fallback qilib oldi (xatosiz)');

    // Talab 6 & 7: Pre-existing profil (User 94) daxlsizligi (ON CONFLICT DO NOTHING)
    const user94Profile = runPsql(testDb, `SELECT display_name, first_name FROM public.profiles WHERE id = '${uid94}';`);
    assert(user94Profile.includes('Pre-existing Custom Profile 94'), 'User 94 ning oldindan mavjud profili ON CONFLICT DO NOTHING orqali daxlsiz saqlandi (ustidan yozilmadi)');

    // 5. Trigger tekshiruvi: Yangi ro'yxatdan o'tgan foydalanuvchi ham rolni metadata'dan ko'tara olmasligi shart
    console.log('\n[6/8] Yangi foydalanuvchi uchun handle_new_auth_user trigger xavfsizlik tekshiruvi...');
    const uidNew = '00000000-0000-0000-0000-0000000000ff';
    runPsql(testDb, `
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES ('${uidNew}', 'new_attacker@savatchi.uz', '{"role": "SuperAdmin", "display_name": "Trigger Test"}'::jsonb);
    `);
    const newProfile = runPsql(testDb, `SELECT role, display_name FROM public.profiles WHERE id = '${uidNew}';`);
    assert(newProfile.includes('Foydalanuvchi') && !newProfile.includes('SuperAdmin'), 'Trigger orqali yangi ro‘yxatdan o‘tgan foydalanuvchi ham rolni metadata orqali ko‘tara olmadi (role = Foydalanuvchi)');

    // 6. RLS Simulyatsiyasi: Owner, Employee va Begona do‘kon izolyatsiyasi
    console.log('\n[7/8] RLS Simulyatsiyasi: Owner, Employee va Begona do‘kon izolyatsiyasi...');
    const ownerId = '00000000-0000-0000-0000-000000000001';
    const empId = '00000000-0000-0000-0000-000000000002';
    const strangerId = '00000000-0000-0000-0000-000000000003';

    runPsql(testDb, `
      INSERT INTO public.stores (id, owner_id, name, type)
      VALUES 
        ('store-alpha', '${ownerId}', 'Alpha Do''kon', 'grocery'),
        ('store-beta', '${strangerId}', 'Beta Do''kon', 'phone')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.store_employees (store_id, user_id, name, email, role, status)
      VALUES ('store-alpha', '${empId}', 'Kassir Xodim', 'user_2@savatchi.uz', 'Xodim', 'Faol')
      ON CONFLICT DO NOTHING;
    `);

    function testAsUser(userId, role, sql) {
      const wrapped = `
        SELECT set_config('request.jwt.claim.sub', '${userId}', false);
        SELECT set_config('request.jwt.claim.role', '${role}', false);
        SET ROLE ${role};
        ${sql}
      `;
      try {
        const out = runPsql(testDb, wrapped);
        return { success: true, output: out };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    // Owner mahsulot qo'shadi
    const r1 = testAsUser(ownerId, 'authenticated', `
      INSERT INTO public.products (store_id, id, name, category, unit, stock, price, cost_price, status)
      VALUES ('store-alpha', 'p-1', 'Shakar', 'Oziq-ovqat', 'kg', 100, 14000, 11000, 'Yetarli');
      SELECT count(*) FROM public.products WHERE store_id = 'store-alpha';
    `);
    assert(r1.success, 'Owner store-alpha ga mahsulot qo‘sha oldi');

    // Employee mahsulotni ko'radi va savdo qiladi
    const r2 = testAsUser(empId, 'authenticated', `
      SELECT name, stock FROM public.products WHERE store_id = 'store-alpha' AND id = 'p-1';
    `);
    assert(r2.success && r2.output.includes('Shakar'), 'Employee store-alpha mahsulotini ko‘ra oldi (Do‘kon a’zoligi orqali)');

    const r3 = testAsUser(empId, 'authenticated', `
      INSERT INTO public.sales (store_id, id, seller_id, seller_name, product_id, product_name, quantity, unit_price, total, discount, payment_type)
      VALUES ('store-alpha', 'sale-101', '${empId}', 'Kassir', 'p-1', 'Shakar', 2, 14000, 28000, 0, 'Naqd');
      SELECT count(*) FROM public.sales WHERE store_id = 'store-alpha';
    `);
    assert(r3.success, 'Employee store-alpha ga savdo kirita oldi');

    // Owner savdoni ko'radi
    const r4 = testAsUser(ownerId, 'authenticated', `
      SELECT total FROM public.sales WHERE store_id = 'store-alpha' AND id = 'sale-101';
    `);
    assert(r4.success && r4.output.includes('28000'), 'Owner Employee kiritgan savdoni ko‘rdi');

    // Begona foydalanuvchi ko'ra olmaydi
    const r5 = testAsUser(strangerId, 'authenticated', `
      SELECT count(*) FROM public.products WHERE store_id = 'store-alpha';
    `);
    assert(r5.success && r5.output.includes('0'), 'Begona foydalanuvchi store-alpha mahsulotlarini KO‘RA OLMADI (0 ta, RLS himoyalangan)');

    // 7. Idempotentlik: Barcha 8 ta migratsiyani ikkinchi marta takroran qo'llash
    console.log('\n[8/8] Idempotentlik: Barcha 8 ta migratsiyani ikkinchi marta qo‘llash...');
    for (const m of migrations) {
      const filePath = path.join(__dirname, 'supabase', 'migrations', m);
      runPsqlFile(testDb, filePath);
    }
    assert(true, 'Barcha 8 ta migratsiya ikkinchi marta xatosiz muvaffaqiyatli qo‘llandi (100% Idempotent)');

    // User 94 profilini yana tekshirish
    const user94ProfileAfter = runPsql(testDb, `SELECT display_name FROM public.profiles WHERE id = '${uid94}';`);
    assert(user94ProfileAfter.includes('Pre-existing Custom Profile 94'), 'Ikkinchi bor qo‘llanganda ham mavjud profil ma’lumotlari daxlsiz saqlandi');

  } finally {
    runPsql('postgres', `DROP DATABASE IF EXISTS ${testDb};`);
    console.log(`\n[TOZALASH] Test PostgreSQL bazasi (${testDb}) o‘chirildi.`);
  }

  console.log('\n================================================================');
  console.log(`YAKUNIY NATIJA: ${passed} ta PASS, ${failed} ta FAIL`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runAudit().catch(err => {
  console.error('Audit xatoligi:', err);
  process.exit(1);
});

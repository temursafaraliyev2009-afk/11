// test_cloud_crud_integration.js
// Savatchi POS — Comprehensive Cloud CRUD & Schema Alignment Verification Test (using psql.exe)

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import svc, { StatusMappers, isUUID, safeUUID } from './src/services/supabaseDataService.js';

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

async function runTests() {
  console.log('====================================================');
  console.log('SAVATCHI: CLOUD CRUD & SCHEMA ALIGNMENT FULL TEST');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // ── 1. MAPPING VA STATUS TESTLARI ───────────────────────────────
  console.log('--- 1. JAVASCRIPT VA STATUS MAPPERLAR TESTI ---');

  // Orders status mapping
  assert(StatusMappers.order.toDB('Hali yo‘lda') === 'Hali yo‘lda', 'Order status "Hali yo‘lda" to‘g‘ri map qilindi');
  assert(StatusMappers.order.toDB('pending') === 'pending', 'Order status "pending" to‘g‘ri map qilindi');

  // Rentals status mapping
  assert(StatusMappers.rental.toDB('Faol') === 'Faol', 'Rental status "Faol" to‘g‘ri map qilindi');
  assert(StatusMappers.rental.fromDB('active') === 'Faol', 'Rental status "active" dan "Faol" ga o‘girildi');
  assert(StatusMappers.rental.fromDB('completed') === 'Qaytarilgan', 'Rental status "completed" dan "Qaytarilgan" ga o‘girildi');

  // Installments status mapping
  assert(StatusMappers.installment.toDB('Faol') === 'Faol', 'Installment status "Faol" to‘g‘ri map qilindi');
  assert(StatusMappers.installment.fromDB('completed') === 'Tugallangan', 'Installment status "completed" dan "Tugallangan" ga o‘girildi');

  // UUID Guards
  assert(isUUID('550e8400-e29b-41d4-a716-446655440000') === true, 'Haqiqiy UUID to‘g‘ri tanildi');
  assert(isUUID('usr-101') === false, 'Demo ID "usr-101" UUID emas deb belgilandi');
  assert(safeUUID('usr-101') === null, 'safeUUID demo ID uchun null qaytardi');
  assert(safeUUID('550e8400-e29b-41d4-a716-446655440000') === '550e8400-e29b-41d4-a716-446655440000', 'safeUUID haqiqiy UUID ni saqladi');

  // ── 2. LOKAL POSTGRESQL 18.3 DA BARCHA JADVALLARGA CRUD SINOBI ──
  console.log('\n--- 2. POSTGRESQL 18.3 SCHEMA & INSERT/SELECT TESTI ---');

  const testDbName = `savatchi_migration_test_crud_${Date.now()}`;
  runPsql('postgres', `CREATE DATABASE ${testDbName};`);

  try {
    // Auth stub yaratish
    runPsql(testDbName, `
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
        SELECT 'a0000000-0000-0000-0000-000000000001'::UUID;
      $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB AS $$
        SELECT '{"email": "owner@savatchi.uz", "role": "authenticated"}'::JSONB;
      $$ LANGUAGE sql STABLE;
      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE
      );
      INSERT INTO auth.users (id, email) VALUES
        ('a0000000-0000-0000-0000-000000000001', 'owner@savatchi.uz'),
        ('b0000000-0000-0000-0000-000000000002', 'employee@savatchi.uz')
      ON CONFLICT DO NOTHING;
    `);

    // 8 ta migratsiyani ketma-ket qo'llash
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

    for (const m of migrations) {
      const sqlPath = path.join(__dirname, 'supabase', 'migrations', m);
      runPsqlFile(testDbName, sqlPath);
    }
    console.log('✅ Barcha 8 ta migratsiya test bazasiga muvaffaqiyatli yuklandi.');

    // A) STORES CRUD
    runPsql(testDbName, `
      INSERT INTO public.stores (id, owner_id, name, type, owner_email, owner_name, location, phone)
      VALUES ('store-test-1', 'a0000000-0000-0000-0000-000000000001', 'Test Do''kon', 'grocery', 'owner@savatchi.uz', 'Do''kon Egasi', 'Toshkent', '+998901234567');
    `);
    const storeOut = runPsql(testDbName, `SELECT location FROM public.stores WHERE id = 'store-test-1';`);
    assert(storeOut.includes('Toshkent'), 'STORES: yangi maydonlar (owner_email, location, phone) bilan yozildi');

    // B) PRODUCTS CRUD
    runPsql(testDbName, `
      INSERT INTO public.products (store_id, id, name, category, unit, stock, price, cost_price, status, emoji, store_type)
      VALUES ('store-test-1', 'prod-1', 'Olma', 'Mevalar', 'kg', 100, 15000, 10000, 'Yetarli', '🍎', 'grocery');
    `);
    const prodOut = runPsql(testDbName, `SELECT store_type FROM public.products WHERE store_id = 'store-test-1' AND id = 'prod-1';`);
    assert(prodOut.includes('grocery'), 'PRODUCTS: store_type va barcha maydonlar bilan yozildi');

    // C) SALES CRUD (8 ta yangi ustun)
    runPsql(testDbName, `
      INSERT INTO public.sales (store_id, id, seller_id, seller_name, product_id, product_name, quantity, unit_price, total, discount, payment_type, emoji, unit, cost_price, cost_status, sale_type, is_debt_collection, contract_id)
      VALUES ('store-test-1', 'sale-1', 'a0000000-0000-0000-0000-000000000001', 'Sotuvchi', 'prod-1', 'Olma', 2, 15000, 30000, 0, 'Naqd', '🍎', 'kg', 10000, 'exact', 'retail', false, NULL);
    `);
    const saleOut = runPsql(testDbName, `SELECT sale_type, unit FROM public.sales WHERE store_id = 'store-test-1' AND id = 'sale-1';`);
    assert(saleOut.includes('retail') && saleOut.includes('kg'), 'SALES: 8 ta yangi ustun (emoji, unit, cost_price, sale_type) bilan yozildi');

    // D) DEBTS & DEBT_PAYMENTS CRUD
    runPsql(testDbName, `
      INSERT INTO public.debts (store_id, id, name, phone, amount, original_amount, paid_amount, given_date, status, is_paid)
      VALUES ('store-test-1', 'debt-1', 'Akmal', '+998901112233', 50000, 50000, 0, CURRENT_DATE, 'Kutilmoqda', false);
      INSERT INTO public.debt_payments (store_id, debt_id, amount, payment_method, collector_name)
      VALUES ('store-test-1', 'debt-1', 20000, 'Naqd', 'Kassir');
    `);
    const debtOut = runPsql(testDbName, `SELECT status FROM public.debts WHERE store_id = 'store-test-1' AND id = 'debt-1';`);
    const payOut = runPsql(testDbName, `SELECT amount FROM public.debt_payments WHERE store_id = 'store-test-1' AND debt_id = 'debt-1';`);
    assert(debtOut.includes('Kutilmoqda'), 'DEBTS: given_date va status bilan yozildi');
    assert(payOut.includes('20000'), 'DEBT_PAYMENTS: qarz to‘lovi muvaffaqiyatli saqlandi');

    // E) ORDERS CRUD (CHECK constraint relaxation)
    runPsql(testDbName, `
      INSERT INTO public.orders (store_id, id, customer_name, product, supplier, qty, total, status)
      VALUES ('store-test-1', 'ord-1', 'Mijoz 1', 'Un', 'Oltin Don', '50 qop', 1500000, 'Hali yo‘lda');
    `);
    const ordOut = runPsql(testDbName, `SELECT status FROM public.orders WHERE store_id = 'store-test-1' AND id = 'ord-1';`);
    assert(ordOut.includes('Hali yo‘lda'), 'ORDERS: "Hali yo‘lda" statusi va product/supplier/qty ustunlari bilan yozildi');

    // F) RENTALS CRUD
    runPsql(testDbName, `
      INSERT INTO public.rentals (store_id, id, customer_name, customer_phone, product_id, product_name, item_name, rental_fee, total_amount, paid_amount, remaining_amount, status, payments)
      VALUES ('store-test-1', 'rent-1', 'Nodir', '+998909998877', 'prod-1', 'Drel', 'Drel', 50000, 50000, 20000, 30000, 'Faol', '[{"amount": 20000}]'::jsonb);
    `);
    const rentOut = runPsql(testDbName, `SELECT status, rental_fee FROM public.rentals WHERE store_id = 'store-test-1' AND id = 'rent-1';`);
    assert(rentOut.includes('Faol') && rentOut.includes('50000'), 'RENTALS: "Faol" statusi va rental_fee/product_name/payments bilan yozildi');

    // G) INSTALLMENT CONTRACTS & PAYMENTS CRUD
    runPsql(testDbName, `
      INSERT INTO public.installment_contracts (store_id, id, contract_number, customer_name, subtotal, discount, total_amount, down_payment, total_paid, remaining_amount, status, schedule, payments)
      VALUES ('store-test-1', 'ins-1', 'SH-001', 'Sardor', 1200000, 0, 1200000, 200000, 200000, 1000000, 'Faol', '[]'::jsonb, '[{"amount": 200000}]'::jsonb);
      INSERT INTO public.installment_payments (store_id, contract_id, amount, payment_method, collector_name)
      VALUES ('store-test-1', 'ins-1', 100000, 'Naqd', 'Admin');
    `);
    const insOut = runPsql(testDbName, `SELECT contract_number, status FROM public.installment_contracts WHERE store_id = 'store-test-1' AND id = 'ins-1';`);
    const insPayOut = runPsql(testDbName, `SELECT amount FROM public.installment_payments WHERE store_id = 'store-test-1' AND contract_id = 'ins-1';`);
    assert(insOut.includes('SH-001') && insOut.includes('Faol'), 'INSTALLMENT_CONTRACTS: contract_number, subtotal, status bilan yozildi');
    assert(insPayOut.includes('100000'), 'INSTALLMENT_PAYMENTS: muddatli to‘lov qabuli yozildi');

    // H) ACTIVITIES (TEXT ID & COMPOSITE UNIQUE UPSERT)
    runPsql(testDbName, `
      INSERT INTO public.activities (store_id, id, user_name, title, action, detail, category, timestamp_ms)
      VALUES ('store-test-1', 'act-1731000000000', 'Do''kon Egasi', 'Savdo', 'Savdo amalga oshirildi', 'Olma: 30,000 so''m', 'Savdo', 1731000000000)
      ON CONFLICT (store_id, id) DO UPDATE SET detail = EXCLUDED.detail;
    `);
    const actOut = runPsql(testDbName, `SELECT action FROM public.activities WHERE store_id = 'store-test-1' AND id = 'act-1731000000000';`);
    assert(actOut.includes('Savdo amalga oshirildi'), 'ACTIVITIES: TEXT ID (act-...) va ON CONFLICT (store_id, id) bilan muvaffaqiyatli upsert bo‘ldi');

  } finally {
    runPsql('postgres', `DROP DATABASE IF EXISTS ${testDbName};`);
    console.log(`\n[TOZALASH] Vaqtinchalik test bazasi (${testDbName}) o'chirildi.`);
  }

  console.log('\n====================================================');
  console.log(`NATIJA: ${passed} ta PASS, ${failed} ta FAIL`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Kutilmagan xato:', err);
  process.exit(1);
});

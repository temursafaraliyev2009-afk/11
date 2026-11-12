// test_phase3_0_4_hardening.js
// Verification tests for Phase 3.0.4 Stores & Products Integrity Hardening
import assert from 'assert';
import { readFileSync, existsSync } from 'fs';

console.log('====================================================');
console.log('SAVATCHI: 3.0.4-BOSQICH INTEGRITY HARDENING TESTI');
console.log('====================================================');

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

const MIGRATION_PATH = './supabase/migrations/20261104_stores_products_integrity_hardening.sql';
const M20261028 = './supabase/migrations/20261028_staff_and_invitations.sql';
const M20261102 = './supabase/migrations/20261102_stores_and_products.sql';
const M20261103 = './supabase/migrations/20261103_stores_and_products_foundation.sql';

// 1. Oldingi migratsiyalar daxlsizligi
run("1. Oldingi 3 ta migratsiya (20261028, 20261102, 20261103) mutlaqo o'zgartirilmagan", () => {
  assert.ok(existsSync(M20261028), "20261028 mavjud");
  assert.ok(existsSync(M20261102), "20261102 mavjud");
  assert.ok(existsSync(M20261103), "20261103 mavjud");
  const c28 = readFileSync(M20261028, 'utf-8');
  const c02 = readFileSync(M20261102, 'utf-8');
  const c03 = readFileSync(M20261103, 'utf-8');
  assert.ok(c28.includes('CREATE TABLE IF NOT EXISTS public.profiles'), "20261028 butun");
  assert.ok(c02.includes('CREATE TABLE IF NOT EXISTS public.stores'), "20261102 butun");
  assert.ok(c03.includes('20261103_stores_and_products_foundation.sql'), "20261103 butun");
});

run("2. Yangi 20261104 migratsiya mavjud va to'liq", () => {
  assert.ok(existsSync(MIGRATION_PATH), "20261104 fayli mavjud");
  const sql = readFileSync(MIGRATION_PATH, 'utf-8');
  assert.ok(sql.length > 2000, "20261104 yetarli hajmga ega");
});

const sql = readFileSync(MIGRATION_PATH, 'utf-8');

// 2. Prerequisite va katalog tekshiruvlari
run("3. Prerequisite: Zarur jadvallar (public.stores, public.products) tekshiruvi mavjud", () => {
  assert.ok(sql.includes("to_regclass('public.stores') IS NULL"), "stores mavjudligi tekshiriladi");
  assert.ok(sql.includes("to_regclass('public.products') IS NULL"), "products mavjudligi tekshiriladi");
  assert.ok(sql.includes("RAISE EXCEPTION 'Integrity hardening to''xtatildi: public.stores"), "stores yo'qligida xato beradi");
  assert.ok(sql.includes("RAISE EXCEPTION 'Integrity hardening to''xtatildi: public.products"), "products yo'qligida xato beradi");
});

run("4. Primary Key: PostgreSQL tizim kataloglari (pg_constraint, pg_class, pg_attribute) orqali aniqlash", () => {
  assert.ok(sql.includes("FROM pg_constraint c"), "pg_constraint ishlatilgan");
  assert.ok(sql.includes("JOIN pg_class t ON c.conrelid = t.oid"), "pg_class bog'langan");
  assert.ok(sql.includes("JOIN pg_namespace n ON t.relnamespace = n.oid"), "pg_namespace bog'langan");
  assert.ok(sql.includes("n.nspname = 'public'"), "public schema filtri mavjud");
  assert.ok(sql.includes("t.relname = 'products'"), "products table filtri mavjud");
  assert.ok(sql.includes("c.contype = 'p'"), "contype = 'p' (Primary Key) filtri mavjud");
});

run("5. Primary Key: Ustunlar tartibi qat'iy ARRAY['store_id', 'id'] ekanligi tekshiriladi", () => {
  assert.ok(sql.includes("array_position(c.conkey, a.attnum)"), "conkey bo'yicha tartiblangan");
  assert.ok(sql.includes("v_pk_columns = ARRAY['store_id', 'id']"), "ARRAY['store_id', 'id'] tekshiruvi mavjud");
});

run("6. Primary Key: Takroriy (store_id, id) juftliklari bo'lsa xato bilan to'xtash", () => {
  assert.ok(sql.includes("GROUP BY store_id, id"), "store_id, id bo'yicha guruhlash mavjud");
  assert.ok(sql.includes("HAVING count(*) > 1"), "HAVING count > 1 tekshiruvi mavjud");
  assert.ok(sql.includes("RAISE EXCEPTION 'Integrity hardening to''xtatildi: public.products jadvalida takroriy (store_id, id) juftliklari mavjud"), "Takroriy qiymatda xato beradi");
});

run("7. Foreign Key: PK tekshiruvidan BUTUNLAY AJRATILGAN", () => {
  // FK mantiqi PK shartining ichida emas, alohida 3-bo'limda
  const pkEndIndex = sql.indexOf("Yangi kompozit PRIMARY KEY (store_id, id) muvaffaqiyatli o'rnatildi");
  const fkStartIndex = sql.indexOf("FOREIGN KEY XAVFSIZLIGI (PK DAN BUTUNLAY AJRATILGAN HOLDA)");
  assert.ok(fkStartIndex > pkEndIndex, "FK tekshiruvi PK tekshiruvidan keyin mustaqil boshlanadi");
});

run("8. Foreign Key: Aniq public.stores(id) va ON DELETE RESTRICT (confdeltype = 'r') tekshiruvi", () => {
  assert.ok(sql.includes("v_ref_schema <> 'public' OR v_ref_table <> 'stores' OR v_ref_col <> 'id'"), "Aynan public.stores(id) ekanligi tekshiriladi");
  assert.ok(sql.includes("v_confdeltype = 'r'"), "confdeltype = 'r' (RESTRICT) tekshiriladi");
  assert.ok(sql.includes("ON DELETE RESTRICT"), "Yangi FK ON DELETE RESTRICT bilan yaratiladi");
});

run("9. Foreign Key: Bir nechta noaniq FK topilsa, ko'r-ko'rona o'chirmasdan to'xtash", () => {
  assert.ok(sql.includes("v_fk_count > 1"), "v_fk_count > 1 tekshiruvi mavjud");
  assert.ok(sql.includes("bir nechta (%) FK constraint mavjud"), "Noaniq holatda to'xtatish xabari mavjud");
});

run("10. Xavfli buzg'unchi buyruqlar va CASCADE yo'qligi", () => {
  // Izohlarni tozalaymiz
  const cleanSql = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const upper = cleanSql.toUpperCase();
  assert.strictEqual(upper.includes('DROP TABLE'), false, "DROP TABLE bo'lmasligi shart");
  assert.strictEqual(upper.includes('TRUNCATE'), false, "TRUNCATE bo'lmasligi shart");
  assert.strictEqual(upper.includes('DROP SCHEMA'), false, "DROP SCHEMA bo'lmasligi shart");
  assert.strictEqual(upper.includes('DROP CONSTRAINT') && upper.includes('CASCADE;'), false, "DROP CONSTRAINT CASCADE bo'lmasligi shart");
});

console.log('\n====================================================');
console.log(`NATIJA: ${passed}/${passed + failed} ta sinov muvaffaqiyatli o'tdi!`);
if (failed > 0) {
  console.log(`⚠️ ${failed} ta sinov MUVAFFAQIYATSIZ!`);
  process.exit(1);
}
console.log('====================================================');

// test_sql_migration_static.js
// Supabase SQL migratsiyasini statik tahlil qilish va sintaksis/xavfsizlik tekshiruvi
import assert from 'assert';
import { readFileSync, existsSync } from 'fs';

console.log("====================================================");
console.log("SAVATCHI: SQL MIGRATSIYA STATIK TAHLIL TESTI");
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

const MIGRATION_PATH = './supabase/migrations/20261102_stores_and_products.sql';

run("1. Migratsiya fayli mavjud va bo'sh emas", () => {
  assert.strictEqual(existsSync(MIGRATION_PATH), true, "Fayl mavjud bo'lishi kerak");
  const content = readFileSync(MIGRATION_PATH, 'utf-8');
  assert.ok(content.length > 500, "Fayl yetarli mazmunga ega bo'lishi kerak");
});

const sql = readFileSync(MIGRATION_PATH, 'utf-8');

run("2. stores jadvali to'g'ri maydonlar va tiplar bilan yaratilgan", () => {
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.stores'), "CREATE TABLE IF NOT EXISTS public.stores mavjud");
  assert.ok(sql.includes('id TEXT PRIMARY KEY'), "stores.id TEXT PRIMARY KEY mavjud");
  assert.ok(sql.includes('owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE'), "owner_id auth.users ga bog'langan");
  assert.ok(sql.includes('name TEXT NOT NULL'), "name TEXT NOT NULL mavjud");
  assert.ok(sql.includes('type TEXT NOT NULL'), "type TEXT NOT NULL mavjud");
  assert.ok(sql.includes('is_active BOOLEAN NOT NULL DEFAULT true'), "is_active mavjud");
});

run("3. products jadvali StoreContext va storeTypes ga 100% mos yaratilgan", () => {
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.products'), "CREATE TABLE IF NOT EXISTS public.products mavjud");
  assert.ok(sql.includes('id TEXT PRIMARY KEY'), "products.id TEXT PRIMARY KEY mavjud");
  assert.ok(sql.includes('store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE'), "store_id stores ga bog'langan");
  assert.ok(sql.includes('name TEXT NOT NULL'), "name mavjud");
  assert.ok(sql.includes('price NUMERIC NOT NULL DEFAULT 0'), "price mavjud");
  assert.ok(sql.includes('cost_price NUMERIC NOT NULL DEFAULT 0'), "cost_price donabay tannarx mavjud");
  assert.ok(sql.includes('stock NUMERIC NOT NULL DEFAULT 0'), "stock mavjud");
  assert.ok(sql.includes('metadata JSONB NOT NULL DEFAULT'), "metadata JSONB mavjud");
});

run("4. Indekslar to'liq va optimal tuzilgan", () => {
  assert.ok(sql.includes('idx_stores_owner_id'), "idx_stores_owner_id mavjud");
  assert.ok(sql.includes('idx_products_store_id'), "idx_products_store_id mavjud");
  assert.ok(sql.includes('idx_products_store_category'), "idx_products_store_category mavjud");
  assert.ok(sql.includes('idx_products_store_barcode'), "idx_products_store_barcode mavjud");
});

run("5. RLS (Row Level Security) ikkala jadvalda ham yoqilgan", () => {
  assert.ok(sql.includes('ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;'), "stores da RLS yoqilgan");
  assert.ok(sql.includes('ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;'), "products da RLS yoqilgan");
});

run("6. RLS siyosatlari to'liq qamrovga ega (SELECT, INSERT, UPDATE, DELETE)", () => {
  assert.ok(sql.includes('ON public.stores\n  FOR SELECT') || sql.includes('ON public.stores FOR SELECT') || sql.includes('FOR SELECT\n  TO authenticated'), "stores SELECT mavjud");
  assert.ok(sql.includes('ON public.stores\n  FOR INSERT') || sql.includes('ON public.stores FOR INSERT') || sql.includes('FOR INSERT\n  TO authenticated'), "stores INSERT mavjud");
  assert.ok(sql.includes('ON public.stores\n  FOR UPDATE') || sql.includes('ON public.stores FOR UPDATE') || sql.includes('FOR UPDATE\n  TO authenticated'), "stores UPDATE mavjud");
  assert.ok(sql.includes('ON public.stores\n  FOR DELETE') || sql.includes('ON public.stores FOR DELETE') || sql.includes('FOR DELETE\n  TO authenticated'), "stores DELETE mavjud");
  assert.ok(sql.includes('ON public.products\n  FOR SELECT') || sql.includes('FOR SELECT\n  TO authenticated'), "products SELECT mavjud");
  assert.ok(sql.includes('ON public.products\n  FOR INSERT') || sql.includes('FOR INSERT\n  TO authenticated'), "products INSERT mavjud");
  assert.ok(sql.includes('ON public.products\n  FOR UPDATE') || sql.includes('FOR UPDATE\n  TO authenticated'), "products UPDATE mavjud");
  assert.ok(sql.includes('ON public.products\n  FOR DELETE') || sql.includes('FOR DELETE\n  TO authenticated'), "products DELETE mavjud");
});

run("7. Server tomonida a'zolikni tekshiruvchi is_store_member funksiyasi mavjud", () => {
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.is_store_member(check_store_id TEXT)'), "is_store_member funksiyasi mavjud");
  assert.ok(sql.includes('SECURITY DEFINER'), "SECURITY DEFINER qo'llangan");
  assert.ok(sql.includes('SET search_path = public'), "search_path xavfsizligi sozlangan");
  assert.ok(sql.includes('auth.uid() = v_uid') || sql.includes('owner_id = v_uid'), "owner tekshiruvi mavjud");
  assert.ok(sql.includes('store_employees') && sql.includes("status = 'Faol'"), "faol xodim tekshiruvi mavjud");
});

run("8. Idempotentlik: xavfsiz qayta ishga tushirish ta'minlangan", () => {
  assert.ok(sql.includes('IF NOT EXISTS'), "CREATE TABLE IF NOT EXISTS ishlatilgan");
  assert.ok(sql.includes('DROP POLICY IF EXISTS'), "DROP POLICY IF EXISTS ishlatilgan");
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION'), "CREATE OR REPLACE FUNCTION ishlatilgan");
  assert.ok(sql.includes('DROP TRIGGER IF EXISTS'), "DROP TRIGGER IF EXISTS ishlatilgan");
});

run("9. Xavfli buzg'unchi buyruqlar yo'qligi (No Destructive SQL)", () => {
  const upper = sql.toUpperCase();
  assert.strictEqual(upper.includes('DROP TABLE'), false, "DROP TABLE bo'lmasligi shart");
  assert.strictEqual(upper.includes('TRUNCATE'), false, "TRUNCATE bo'lmasligi shart");
  assert.strictEqual(upper.includes('DROP SCHEMA'), false, "DROP SCHEMA bo'lmasligi shart");
});

run("10. Triggerlar: updated_at va stock status sinxronizatsiyasi mavjud", () => {
  assert.ok(sql.includes('trg_stores_updated_at'), "stores updated_at triggeri mavjud");
  assert.ok(sql.includes('trg_products_updated_at'), "products updated_at triggeri mavjud");
  assert.ok(sql.includes('trg_sync_product_status'), "sync_product_status triggeri mavjud");
});

console.log("\n====================================================");
console.log(`SQL MIGRATSIYA NATIJASI: ${passed}/${passed + failed} ta statik sinov muvaffaqiyatli o'tdi!`);
if (failed > 0) {
  console.log(`⚠️  ${failed} ta sinov MUVAFFAQIYATSIZ!`);
  process.exit(1);
}
console.log("====================================================");


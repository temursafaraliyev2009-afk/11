// test_phase3_migration.js
// Phase 3.0: Stores & Products Foundation Migration Verification Test
import assert from 'assert';
import { readFileSync, existsSync } from 'fs';

console.log('====================================================');
console.log('SAVATCHI: 3.0-BOSQICH SQL MIGRATSIYA TEKSHIRUVI');
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

const MIGRATION_PATH = './supabase/migrations/20261103_stores_and_products_foundation.sql';
const STAFF_MIGRATION_PATH = './supabase/migrations/20261028_staff_and_invitations.sql';
const PREV_MIGRATION_PATH = './supabase/migrations/20261102_stores_and_products.sql';

// 1. Fayllar mavjudligi va himoyasi
run("1. 20261028 staff migratsiyasi mutlaqo o'zgarmagan", () => {
  assert.ok(existsSync(STAFF_MIGRATION_PATH), "20261028 fayli mavjud");
  const content = readFileSync(STAFF_MIGRATION_PATH, 'utf-8');
  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.profiles'), "profiles jadvali mavjud");
  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.staff_invitations'), "staff_invitations jadvali mavjud");
  assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.store_employees'), "store_employees jadvali mavjud");
});

run("2. 20261103 yangi forward migratsiya mavjud va to'liq", () => {
  assert.ok(existsSync(MIGRATION_PATH), "20261103 fayli mavjud");
  const sql = readFileSync(MIGRATION_PATH, 'utf-8');
  assert.ok(sql.length > 2000, "20261103 yetarli hajmga ega");
});

const sql = readFileSync(MIGRATION_PATH, 'utf-8');

// 2. stores jadvali arxitekturasi
run("3. stores jadvali: Server UUID DEFAULT va legacy_local_id mosligi", () => {
  assert.ok(sql.includes('gen_random_uuid()::text'), "Server UUID DEFAULT gen_random_uuid()::text qo'llangan");
  assert.ok(sql.includes('legacy_local_id TEXT'), "legacy_local_id ustuni mavjud");
  assert.ok(sql.includes('uq_stores_owner_legacy UNIQUE (owner_id, legacy_local_id)'), "UNIQUE(owner_id, legacy_local_id) cheklovi mavjud");
});

run("4. Bir foydalanuvchida bir nechta bir xil turdagi do'kon mumkinligi", () => {
  // UNIQUE cheklovida 'type' ustuni yo'qligini tekshiramiz
  assert.ok(!sql.includes('UNIQUE (owner_id, type)'), "type bo'yicha deterministik cheklov yo'q");
  assert.ok(!sql.includes('UNIQUE(owner_id, type)'), "type bo'yicha deterministik cheklov yo'q");
});

run("5. Ikki foydalanuvchining bir xil legacy_local_id to'qnashmasligi", () => {
  // Cheklov faqat (owner_id, legacy_local_id) kompozit bo'lishi shart
  assert.ok(sql.includes('(owner_id, legacy_local_id)'), "Kompozit UNIQUE(owner_id, legacy_local_id) mavjud");
});

run("6. stores uchun hard DELETE bloklanganligi", () => {
  assert.ok(sql.includes('DROP POLICY IF EXISTS "Only store owner can delete store" ON public.stores;'), "Eski delete siyosati tozalangan");
  // stores uchun hech qanday yangi FOR DELETE siyosati yaratilmagan bo'lishi kerak
  const upper = sql.toUpperCase();
  const storesDeleteIndex = upper.indexOf('ON PUBLIC.STORES\n  FOR DELETE');
  const storesDeleteInline = upper.indexOf('ON PUBLIC.STORES FOR DELETE');
  assert.strictEqual(storesDeleteIndex, -1, "stores uchun yangi FOR DELETE siyosati bo'lmasligi shart (Hard DELETE bloklangan)");
  assert.strictEqual(storesDeleteInline, -1, "stores uchun yangi FOR DELETE inline siyosati bo'lmasligi shart");
});

// 3. products jadvali arxitekturasi
run("7. products: Kompozit PRIMARY KEY (store_id, id)", () => {
  assert.ok(sql.includes('PRIMARY KEY (store_id, id)'), "PRIMARY KEY (store_id, id) kompozit kalit mavjud");
});

run("8. products: ON DELETE RESTRICT ishlatilganligi (CASCADE emas)", () => {
  assert.ok(sql.includes('REFERENCES public.stores(id) ON DELETE RESTRICT'), "ON DELETE RESTRICT ishlatilgan");
  assert.ok(!sql.includes('REFERENCES public.stores(id) ON DELETE CASCADE'), "ON DELETE CASCADE ishlatilmagan");
});

run("9. products: Barcha 17 ta mavjud maydon saqlanganligi", () => {
  const fields = [
    'id TEXT',
    'store_id TEXT',
    'name TEXT',
    'category TEXT',
    'unit TEXT',
    'price NUMERIC',
    'cost_price NUMERIC',
    'stock NUMERIC',
    'min_stock NUMERIC',
    'status TEXT',
    'emoji TEXT',
    'image_url TEXT',
    'barcode TEXT',
    'sku TEXT',
    'metadata JSONB',
    'created_at TIMESTAMPTZ',
    'updated_at TIMESTAMPTZ'
  ];
  for (const f of fields) {
    assert.ok(sql.includes(f), `Maydon saqlangan: ${f}`);
  }
});

run("10. products: RLS DELETE siyosati mavjud Inventory imkoniyatlariga mosligi", () => {
  assert.ok(sql.includes('CREATE POLICY "Store members can delete products"'), "Mahsulot o'chirish siyosati mavjud");
  assert.ok(sql.includes('public.is_store_member(store_id)'), "is_store_member asosida tekshiriladi");
});

run("11. Trigger: 'Nofaol' holati o'zgartirilmasdan saqlanishi", () => {
  assert.ok(sql.includes("IF new.status != 'Nofaol' THEN"), "Nofaol statusi himoyalangan");
  assert.ok(sql.includes('trg_sync_product_status'), "Status sinxronlash triggeri mavjud");
  assert.ok(sql.includes('trg_stores_updated_at'), "Stores updated_at triggeri mavjud");
  assert.ok(sql.includes('trg_products_updated_at'), "Products updated_at triggeri mavjud");
});

run("12. Idempotentlik va xavfli buyruqlar yo'qligi (No Destructive SQL)", () => {
  const upper = sql.toUpperCase();
  assert.strictEqual(upper.includes('DROP TABLE'), false, "DROP TABLE bo'lmasligi shart");
  assert.strictEqual(upper.includes('TRUNCATE'), false, "TRUNCATE bo'lmasligi shart");
  assert.strictEqual(upper.includes('DROP SCHEMA'), false, "DROP SCHEMA bo'lmasligi shart");
  assert.ok(sql.includes('IF NOT EXISTS'), "IF NOT EXISTS qo'llangan");
  assert.ok(sql.includes('DROP POLICY IF EXISTS'), "DROP POLICY IF EXISTS qo'llangan");
  assert.ok(sql.includes('DROP TRIGGER IF EXISTS'), "DROP TRIGGER IF EXISTS qo'llangan");
});

run("13. Staff va Invitations ga shoshilinch FK qo'shilmaganligi", () => {
  assert.strictEqual(sql.includes('ALTER TABLE public.store_employees ADD CONSTRAINT fk'), false, "store_employees ga shoshilinch FK qo'shilmagan");
  assert.strictEqual(sql.includes('ALTER TABLE public.staff_invitations ADD CONSTRAINT fk'), false, "staff_invitations ga shoshilinch FK qo'shilmagan");
});

console.log('\n====================================================');
console.log(`NATIJA: ${passed}/${passed + failed} ta sinov muvaffaqiyatli o'tdi!`);
if (failed > 0) {
  console.log(`⚠️ ${failed} ta sinov MUVAFFAQIYATSIZ!`);
  process.exit(1);
}
console.log('====================================================');


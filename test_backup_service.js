// test_backup_service.js
// Savatchi POS — Comprehensive Automated Tests for LocalStorage Backup & Verification Service

import { isBusinessStorageKey, generateBackupSnapshot, validateBackupData } from './src/utils/backupService.js';

function createMockStorage(initialData = {}) {
  const map = new Map(Object.entries(initialData));
  return {
    get length() { return map.size; },
    key(i) { return Array.from(map.keys())[i] || null; },
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    clear() { map.clear(); }
  };
}

function runTests() {
  console.log('====================================================');
  console.log('SAVATCHI: LOCALSTORAGE BACKUP SERVICE TEST HARNESS');
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

  // ── 1. KALITLARNI FILTRLASH TESTLARI (isBusinessStorageKey) ──
  console.log('--- 1. XAVFSIZ KALITLARNI FILTRLASH TESTLARI ---');
  assert(isBusinessStorageKey('savatchi_user_stores') === true, 'savatchi_user_stores ruxsat etildi');
  assert(isBusinessStorageKey('savatchi_usr1_products_store1') === true, 'savatchi_usr1_products_store1 ruxsat etildi');
  assert(isBusinessStorageKey('savatchi_usr1_sales_store1') === true, 'savatchi_usr1_sales_store1 ruxsat etildi');
  assert(isBusinessStorageKey('savatchi_usr1_debts_store1') === true, 'savatchi_usr1_debts_store1 ruxsat etildi');
  assert(isBusinessStorageKey('savatchi_usr1_orders_store1') === true, 'savatchi_usr1_orders_store1 ruxsat etildi');
  assert(isBusinessStorageKey('savatchi_usr1_rentals_store1') === true, 'savatchi_usr1_rentals_store1 ruxsat etildi');
  assert(isBusinessStorageKey('savatchi_usr1_installments_store1') === true, 'savatchi_usr1_installments_store1 ruxsat etildi');
  assert(isBusinessStorageKey('savatchi_mail_messages') === true, 'savatchi_mail_messages ruxsat etildi');
  assert(isBusinessStorageKey('savatchi_deleted_employees_store1') === true, 'savatchi_deleted_employees_store1 ruxsat etildi');

  // Taqiqlar:
  assert(isBusinessStorageKey('sb-rzrrvodiegjfwtebxxvo-auth-token') === false, 'sb-auth-token QAT’IY BLOKLANDI');
  assert(isBusinessStorageKey('savatchi_registered_accounts') === false, 'registered_accounts (parollar) QAT’IY BLOKLANDI');
  assert(isBusinessStorageKey('savatchi_current_user') === false, 'current_user sessiyasi QAT’IY BLOKLANDI');
  assert(isBusinessStorageKey('savatchi_saved_email') === false, 'saved_email QAT’IY BLOKLANDI');
  assert(isBusinessStorageKey('savatchi_cart') === false, 'savatchi_cart kesh QAT’IY BLOKLANDI');
  assert(isBusinessStorageKey('savatchi_theme') === false, 'savatchi_theme QAT’IY BLOKLANDI');
  assert(isBusinessStorageKey('some_other_key') === false, 'begona kalit BLOKLANDI');

  // ── 2. REAL BIZNES MA’LUMOTLARI BILAN SNAPSHOT YARATISH ──
  console.log('\n--- 2. REAL BIZNES MA’LUMOTLARI SNAPSHOT TESTI ---');

  const sampleStorageData = {
    // Biznes ma'lumotlari
    'savatchi_owner1_user_stores': JSON.stringify([
      { id: 'store-1', name: 'Bosh Do‘kon', ownerId: 'owner-1', type: 'grocery' }
    ]),
    'savatchi_owner1_products_store-1': JSON.stringify([
      { id: 'p-1', name: 'Guruch', price: 18000, costPrice: 15000, stock: 45, unit: 'kg' },
      { id: 'p-2', name: 'Yog‘', price: 22000, costPrice: 19000, stock: 30, unit: 'litr' }
    ]),
    'savatchi_owner1_sales_store-1': JSON.stringify([
      { id: 's-1', total: 36000, paymentType: 'cash', date: '2026-11-08', sellerName: 'Kassir' }
    ]),
    'savatchi_owner1_debts_store-1': JSON.stringify([
      {
        id: 'd-1',
        customerName: 'Anvar',
        amount: 50000,
        payments: [
          { amount: 20000, date: '2026-11-08', paymentMethod: 'Naqd' }
        ]
      }
    ]),
    'savatchi_owner1_orders_store-1': JSON.stringify([
      { id: 'o-1', product: 'Un', supplier: 'Kombinat', qty: '10 qop', status: 'Hali yo‘lda' }
    ]),
    'savatchi_owner1_rentals_store-1': JSON.stringify([
      {
        id: 'r-1',
        itemName: 'Drel',
        rentalFee: 40000,
        status: 'Faol',
        payments: [{ amount: 40000, date: '2026-11-08' }]
      }
    ]),
    'savatchi_owner1_installments_store-1': JSON.stringify([
      {
        id: 'ins-1',
        customerName: 'Dilshod',
        totalAmount: 1200000,
        schedule: [
          { month: 1, amount: 400000, status: 'To‘langan' },
          { month: 2, amount: 400000, status: 'Kutilmoqda' }
        ],
        payments: [
          { amount: 400000, date: '2026-11-08' }
        ]
      }
    ]),
    'savatchi_mail_messages': JSON.stringify([
      { id: 'msg-1', storeId: 'store-1', toEmail: 'emp@savatchi.uz', status: 'Qabul qilindi' }
    ]),
    'savatchi_owner1_selected_store': 'store-1',

    // Maxfiy / Keraksiz ma'lumotlar (Chiqarib tashlanishi SHART bo'lganlar):
    'sb-rzrrvodiegjfwtebxxvo-auth-token': JSON.stringify({ access_token: 'secret-jwt-12345' }),
    'savatchi_registered_accounts': JSON.stringify([
      { id: 'acc-1', email: 'owner@savatchi.uz', password: 'plain_secret_password_123' }
    ]),
    'savatchi_current_user': JSON.stringify({ id: 'owner-1', token: 'active-session-token' }),
    'savatchi_saved_email': 'owner@savatchi.uz',
    'savatchi_cart': JSON.stringify([{ id: 'cart-1', qty: 1 }]),
    'savatchi_theme': 'dark'
  };

  const initialCount = Object.keys(sampleStorageData).length;
  const mockStorage = createMockStorage(sampleStorageData);

  // Snapshot olish
  const snapshot = generateBackupSnapshot(mockStorage, 'kassa-kompyuteri-profile');

  // Asl xotira o'zgarmaganligini tasdiqlash
  assert(mockStorage.length === initialCount, 'Asl LocalStorage ga bitta ham yozuv qo‘shilmadi yoki o‘chirilmadi (Read-Only)');
  assert(mockStorage.getItem('savatchi_registered_accounts').includes('plain_secret_password_123'), 'Asl ma’lumotlar daxlsiz saqlandi');

  // Chiqarib tashlanganligini tekshirish
  assert(snapshot.data['sb-rzrrvodiegjfwtebxxvo-auth-token'] === undefined, 'Snapshot ichida sb-*-auth-token umuman yo‘q');
  assert(snapshot.data['savatchi_registered_accounts'] === undefined, 'Snapshot ichida registered_accounts (parollar) umuman yo‘q');
  assert(snapshot.data['savatchi_current_user'] === undefined, 'Snapshot ichida current_user sessiyasi yo‘q');
  assert(snapshot.data['savatchi_cart'] === undefined, 'Snapshot ichida savatchi_cart yo‘q');

  // Biznes ma'lumotlari kiritilganligini tekshirish
  assert(snapshot.data['savatchi_owner1_products_store-1'].length === 2, '2 ta mahsulot to‘liq kiritildi');
  assert(snapshot.data['savatchi_owner1_debts_store-1'][0].payments.length === 1, 'Qarz ichidagi payments[] to‘liq saqlandi');
  assert(snapshot.data['savatchi_owner1_installments_store-1'][0].schedule.length === 2, 'Muddatli to‘lov schedule[] to‘liq saqlandi');
  assert(snapshot.data['savatchi_owner1_rentals_store-1'][0].payments.length === 1, 'Arenda payments[] to‘liq saqlandi');

  // Xulosa statistikasi
  assert(snapshot.summary.storesCount === 1, 'Summary: 1 ta do‘kon hisoblandi');
  assert(snapshot.summary.productsCount === 2, 'Summary: 2 ta mahsulot hisoblandi');
  assert(snapshot.summary.salesCount === 1, 'Summary: 1 ta savdo hisoblandi');
  assert(snapshot.summary.debtsCount === 1, 'Summary: 1 ta qarz hisoblandi');
  assert(snapshot.summary.ordersCount === 1, 'Summary: 1 ta buyurtma hisoblandi');
  assert(snapshot.summary.rentalsCount === 1, 'Summary: 1 ta arenda hisoblandi');
  assert(snapshot.summary.installmentsCount === 1, 'Summary: 1 ta muddatli to‘lov hisoblandi');
  assert(snapshot.summary.mailMessagesCount === 1, 'Summary: 1 ta taklifnoma hisoblandi');

  // ── 3. ZAXIRA TO‘LIQLIGI VA XAVFSIZLIGINI VALIDATSIYA QILISH ──
  console.log('\n--- 3. ZAXIRA VALIDATSIYA TESTLARI ---');

  const validReport = validateBackupData(snapshot);
  assert(validReport.isValid === true, 'To‘g‘ri zaxira muvaffaqiyatli validatsiyadan o‘tdi (isValid = true)');
  assert(validReport.violations.length === 0, 'Hech qanday qoidabuzarlik (violations) topilmadi');
  assert(validReport.keysVerified.length === snapshot.summary.totalKeys, 'Barcha kalitlar tekshiruvdan o‘tdi');

  // Buzilgan JSON bilan sinov
  const corruptedReport = validateBackupData('{ "app": "Savatchi POS", data: INVALID ');
  assert(corruptedReport.isValid === false, 'Buzilgan JSON to‘g‘ri aniqlandi va rad etildi');

  // Maxfiy kalit qo'shilgan soxta backup bilan sinov
  const compromisedSnapshot = JSON.parse(JSON.stringify(snapshot));
  compromisedSnapshot.data['sb-fake-token'] = 'hacked-token';
  const compReport = validateBackupData(compromisedSnapshot);
  assert(compReport.isValid === false, 'Taqiqlangan kalit sun’iy kiritilganda validator darhol ushladi');

  // ── 4. MULTI-PROFILE (HAR BIR BRAUZER PROFILIDAN ALOHIDA EXPORT) ──
  console.log('\n--- 4. MULTI-PROFILE EXPORT TESTI ---');
  const empStorage = createMockStorage({
    'savatchi_emp2_user_stores': JSON.stringify([{ id: 'store-1', name: 'Do‘kon', role: 'Xodim' }]),
    'savatchi_emp2_sales_store-1': JSON.stringify([{ id: 's-emp-1', total: 15000, sellerName: 'Xodim 2' }])
  });
  const empSnapshot = generateBackupSnapshot(empStorage, 'employee-kassa-2');
  assert(empSnapshot.profileLabel === 'employee-kassa-2', 'Employee profili alohida belgilandi');
  assert(empSnapshot.summary.salesCount === 1, 'Employee savdolari alohida to‘g‘ri ajratildi');

  console.log('\n====================================================');
  console.log(`TEST NATIJASI: ${passed} ta PASS, ${failed} ta FAIL`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTests();


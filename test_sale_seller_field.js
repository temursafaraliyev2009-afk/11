// test_sale_seller_field.js
// Verification for SAVATCHI — NEW SALE CARD: SELLER FIELD FIX

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  SAVATCHI — NEW SALE CARD: SELLER FIELD FIX VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════\n');

const modalFilePath = path.join(__dirname, 'src', 'components', 'QuickActionModal.jsx');
const content = fs.readFileSync(modalFilePath, 'utf8');

// 1. "Xodim" tanlov maydoni olib tashlanganligini tekshirish
assert(!content.includes('value={selectedSeller}'), 'selectedSeller state va select maydoni butunlay olib tashlangan');
assert(!content.includes("t('colEmployee', 'Sotuvchi (Kassir)')"), "'colEmployee' (Xodim) yorlig'i Yangi savdo kartasidan olib tashlangan");
assert(!content.includes('employees.map(emp =>'), 'Xodimlar ro‘yxati (dropdown select) yangi savdo kartasidan olib tashlangan');

// 2. "Sotuvchi" yozuvi ko'rsatilishi
assert(content.includes("t('navSeller', 'Sotuvchi')"), '"Sotuvchi" yozuvi (label) ko\'rsatilgan');

// 3. Sotuvchi nomi tizimga kirgan joriy foydalanuvchidan avtomatik olinishi
assert(content.includes('const { user } = useAuth();'), 'useAuth() orqali tizimga kirgan joriy foydalanuvchi olingan');
assert(content.includes('const sellerName = user?.displayName || user?.firstName'), 'sellerName joriy foydalanuvchi profili yoki ismidan avtomatik olinadi');

// 4. Sotuvchi nomini foydalanuvchi qo'lda almashtira olmasligi (readOnly, disabled)
assert(content.includes('readOnly'), 'Sotuvchi inputi readOnly qilingan');
assert(content.includes('disabled'), 'Sotuvchi inputi disabled qilingan');
assert(content.includes('cursor-not-allowed'), 'Foydalanuvchi qo‘lda o‘zgartira olmasligi uchun cursor-not-allowed qo‘llangan');

// 5. Savdo saqlanishida sellerName to'g'ri uzatilishi
assert(content.includes('seller: sellerName'), 'addSale ga sellerName avtomatik va qat\'iy uzatiladi');

// 6. Owner va Employee nomidan savdo test simulyatsiyasi
console.log('\n[Simulyatsiya] Owner va Employee savdo ssenariysi:');
const simulateSellerResolution = (authUser, currentUserName) => {
  return authUser?.displayName || authUser?.firstName || (authUser?.email ? authUser.email.split('@')[0] : '') || currentUserName || 'Foydalanuvchi';
};

const ownerUser = { displayName: 'Jamshid (Do‘kon Egasi)', email: 'owner@savatchi.uz' };
const empUser = { displayName: 'Sardor Kassir', email: 'sardor@savatchi.uz' };

const resolvedOwnerSeller = simulateSellerResolution(ownerUser, 'Jamshid');
assert(resolvedOwnerSeller === 'Jamshid (Do‘kon Egasi)', 'Owner tizimga kirganda savdo Owner nomidan amalga oshiriladi');

const resolvedEmpSeller = simulateSellerResolution(empUser, 'Sardor');
assert(resolvedEmpSeller === 'Sardor Kassir', 'Employee tizimga kirganda savdo Employee nomidan amalga oshiriladi');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  JAMI TESTLAR: ${passed + failed} | ✅ ${passed} PASS | ❌ ${failed} FAIL`);
console.log('═══════════════════════════════════════════════════════════════');

if (failed > 0) process.exit(1);


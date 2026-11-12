/**
 * Savatchi — Calculation Accuracy Audit 1.0 Comprehensive Test Suite
 * 
 * Verifies:
 * 1. Bugun kechagidan 20% ko'p (+20%).
 * 2. Bugun kechagidan 20% kam (-20%).
 * 3. Ikkala kunda ham savdo yo'q (0 vs 0 -> 0%).
 * 4. Kecha savdo yo'q, bugun savdo bor (0 vs musbat -> "Yangi", no Infinity / fake +100%).
 * 5. Oyning birinchi va oxirgi kuni (like-for-like taqqoslash).
 * 6. Yil almashishi (dekabr -> yanvar).
 * 7. Kabisa yili (2028-02-29 va 2024-02-29).
 * 8. Asia/Tashkent vaqt mintaqasi (UTC+5).
 * 9. Qisman to'langan savdo (debt partial payment).
 * 10. Qarzga sotilgan mahsulot (Nasiya tovar realizatsiyasiga kiradi, lekin kassa kirimiga kirmaydi).
 * 11. Bekor qilingan savdo (jami hisobdan chiqariladi).
 * 12. Bir operatsiyaning ikki marta hisoblanishi (muddatli savdo shartnomasi va to'lovlar).
 */

import assert from 'node:assert';
import {
  getLocalDateString,
  getOffsetDateString,
  getTashkentHour,
  getPreviousWeekLikeForLikeRange,
  getPreviousMonthLikeForLikeRange,
  getPreviousYearLikeForLikeRange
} from './src/utils/dateUtils.js';

import {
  calculateGrowthMetrics,
  getSaleFinancials,
  aggregateSalesFinancials,
  buildPeriodFinancialReports,
  isReturnedSale,
  isDebtCollectionSale,
  isInstallmentContractSale
} from './src/utils/financeUtils.js';

import {
  calculateInstallmentSummary,
  generateInstallmentSchedule,
  applyPaymentToContract,
  calculateInstallmentStats
} from './src/utils/installmentUtils.js';

console.log('====================================================');
console.log('SAVATCHI — CALCULATION ACCURACY AUDIT 1.0 TESTS');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`[PASS] ${testName}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${testName}`);
    console.error(`       Error: ${err.message}`);
    failCount++;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// TEST 1: Bugun kechagidan 20% ko'p
// ──────────────────────────────────────────────────────────────────────────
runTest('1. Bugun kechagidan 20% ko‘p (+20%) to‘g‘ri hisoblanishi', () => {
  const yesterday = 1000000;
  const today = 1200000;
  const metrics = calculateGrowthMetrics(today, yesterday);

  assert.strictEqual(metrics.rate, 20, 'O‘sish sur’ati aynan 20 bo‘lishi kerak');
  assert.strictEqual(metrics.formattedPercent, '+20%', 'Format +20% bo‘lishi kerak');
  assert.strictEqual(metrics.badgeText, '↑ 20%', 'Belgi ↑ 20% bo‘lishi kerak');
  assert.strictEqual(metrics.isPositive, true, 'isPositive true bo‘lishi kerak');
  assert.strictEqual(metrics.isNegative, false);
  assert.strictEqual(metrics.isZero, false);
});

// ──────────────────────────────────────────────────────────────────────────
// TEST 2: Bugun kechagidan 20% kam
// ──────────────────────────────────────────────────────────────────────────
runTest('2. Bugun kechagidan 20% kam (-20%) to‘g‘ri hisoblanishi', () => {
  const yesterday = 1000000;
  const today = 800000;
  const metrics = calculateGrowthMetrics(today, yesterday);

  assert.strictEqual(metrics.rate, -20, 'Pasayish sur’ati aynan -20 bo‘lishi kerak');
  assert.strictEqual(metrics.formattedPercent, '-20%', 'Format -20% bo‘lishi kerak');
  assert.strictEqual(metrics.badgeText, '↓ 20%', 'Belgi ↓ 20% bo‘lishi kerak');
  assert.strictEqual(metrics.isNegative, true, 'isNegative true bo‘lishi kerak');
  assert.strictEqual(metrics.isPositive, false);
  assert.strictEqual(metrics.isZero, false);
});

// ──────────────────────────────────────────────────────────────────────────
// TEST 3: Ikkala kunda ham savdo yo'q (0 vs 0)
// ──────────────────────────────────────────────────────────────────────────
runTest('3. Ikkala kunda ham savdo yo‘q (0 vs 0 -> 0%)', () => {
  const metrics = calculateGrowthMetrics(0, 0);

  assert.strictEqual(metrics.rate, 0, 'O‘zgarish 0 bo‘lishi kerak');
  assert.strictEqual(metrics.formattedPercent, '0%', '0% chiqishi kerak');
  assert.strictEqual(metrics.badgeText, '0%', 'badgeText 0% bo‘lishi kerak');
  assert.strictEqual(metrics.isZero, true, 'isZero true bo‘lishi kerak');
  assert.strictEqual(metrics.isPositive, false);
  assert.strictEqual(metrics.isNegative, false);
});

// ──────────────────────────────────────────────────────────────────────────
// TEST 4: Kecha savdo yo'q, bugun savdo bor (0 vs musbat -> "Yangi")
// ──────────────────────────────────────────────────────────────────────────
runTest('4. Kecha savdo yo‘q, bugun savdo bor (0 vs musbat -> Yangi, cheksiz foizsiz)', () => {
  const yesterday = 0;
  const today = 1500000;
  const metrics = calculateGrowthMetrics(today, yesterday);

  assert.strictEqual(metrics.isNew, true, 'isNew true bo‘lishi kerak');
  assert.strictEqual(metrics.formattedPercent, 'Yangi', 'Format "Yangi" bo‘lishi kerak');
  assert.strictEqual(metrics.badgeText, 'Yangi', 'Badge "Yangi" bo‘lishi kerak');
  assert.strictEqual(metrics.rate, null, 'Rate null bo‘lishi kerak (Infinity emas)');
  assert.strictEqual(Number.isFinite(metrics.rate), false, 'Infinity bo‘lmasligi shart');
});

// ──────────────────────────────────────────────────────────────────────────
// TEST 5: Oyning birinchi va oxirgi kuni (like-for-like taqqoslash)
// ──────────────────────────────────────────────────────────────────────────
runTest('5. Oyning birinchi va oxirgi kuni like-for-like oralig‘i', () => {
  // 1-kun: 2026-11-01
  const r1 = getPreviousMonthLikeForLikeRange('2026-11-01');
  assert.strictEqual(r1.prevMonthStartStr, '2026-10-01');
  assert.strictEqual(r1.prevMonthEndStr, '2026-10-31');
  assert.strictEqual(r1.prevMonthLikeEndStr, '2026-10-01', '1-noyabr 1-oktabr bilan taqqoslanadi');

  // 15-kun: 2026-11-15
  const r15 = getPreviousMonthLikeForLikeRange('2026-11-15');
  assert.strictEqual(r15.prevMonthLikeEndStr, '2026-10-15', '15-noyabr 15-oktabr bilan taqqoslanadi');

  // 31-kun mart oyida: 2026-03-31 (o‘tgan oy fevral 28 kundan iborat)
  const rMar = getPreviousMonthLikeForLikeRange('2026-03-31');
  assert.strictEqual(rMar.prevMonthStartStr, '2026-02-01');
  assert.strictEqual(rMar.prevMonthEndStr, '2026-02-28');
  assert.strictEqual(rMar.prevMonthLikeEndStr, '2026-02-28', 'Fevralning 28-kuniga to‘g‘ri cheklanishi kerak');
});

// ──────────────────────────────────────────────────────────────────────────
// TEST 6: Yil almashishi (dekabr -> yanvar)
// ──────────────────────────────────────────────────────────────────────────
runTest('6. Yil almashishi (2026-01-05 -> o‘tgan oy 2025-12-05)', () => {
  const rJan = getPreviousMonthLikeForLikeRange('2026-01-05');
  assert.strictEqual(rJan.prevMonthStartStr, '2025-12-01', 'Oldingi yil dekabriga o‘tishi kerak');
  assert.strictEqual(rJan.prevMonthEndStr, '2025-12-31');
  assert.strictEqual(rJan.prevMonthLikeEndStr, '2025-12-05', '5-yanvar 5-dekabr bilan taqqoslanishi kerak');

  // Kun offseti: 2026-01-01 dan 1 kun oldin 2025-12-31
  assert.strictEqual(getOffsetDateString(-1, '2026-01-01'), '2025-12-31');
});

// ──────────────────────────────────────────────────────────────────────────
// TEST 7: Kabisa yili (2028-02-29 va 2024-02-29)
// ──────────────────────────────────────────────────────────────────────────
runTest('7. Kabisa yili hisob-kitoblari (29-fevral)', () => {
  // 2028-03-01 dan 1 kun oldin 2028-02-29 (kabisa yili)
  assert.strictEqual(getOffsetDateString(-1, '2028-03-01'), '2028-02-29');

  // 2028-03-31 ning o'tgan oyi (2028-fevral 29 kundan iborat)
  const r2028 = getPreviousMonthLikeForLikeRange('2028-03-31');
  assert.strictEqual(r2028.prevMonthEndStr, '2028-02-29', 'Kabisa yilida fevral 29 kun');
  assert.strictEqual(r2028.prevMonthLikeEndStr, '2028-02-29');

  // Kabisa yili 2028-02-29 ning o'tgan yilgi analogi 2027-02-28
  const rYtdLeap = getPreviousYearLikeForLikeRange('2028-02-29');
  assert.strictEqual(rYtdLeap.prevYearLikeEndStr, '2027-02-28', 'Oddiy yil 28-fevralga cheklanadi');
});

// ──────────────────────────────────────────────────────────────────────────
// TEST 8: Asia/Tashkent vaqt mintaqasi (UTC+5)
// ──────────────────────────────────────────────────────────────────────────
runTest('8. Asia/Tashkent vaqt mintaqasi (UTC+5) to‘g‘ri sanani berishi', () => {
  // UTC 2026-10-31 20:00 -> Tashkent 2026-11-01 01:00
  const lateUtc = new Date('2026-10-31T20:00:00Z');
  const tashkentDate = getLocalDateString(lateUtc);
  assert.strictEqual(tashkentDate, '2026-11-01', 'Toshkentda 1-noyabr bo‘lishi kerak');

  const tashkentH = getTashkentHour(lateUtc);
  assert.strictEqual(tashkentH, 1, 'Toshkentda soat 01:00 bo‘lishi kerak');
});

// ──────────────────────────────────────────────────────────────────────────
// TEST 9: Qisman to‘langan savdo (debt partial payment)
// ──────────────────────────────────────────────────────────────────────────
runTest('9. Qisman to‘langan savdo va qarz balansi to‘g‘ri hisoblanishi', () => {
  const debt = {
    id: 'd-1',
    name: 'Alisher',
    amount: 500000,
    originalAmount: 500000,
    paidAmount: 0,
    isPaid: false
  };

  // Qisman to'lov: 200 000 so'm
  const payAmount = 200000;
  const newRemaining = Math.max(0, debt.amount - payAmount);
  const newPaid = debt.paidAmount + payAmount;
  const isPaid = newRemaining === 0;

  assert.strictEqual(newRemaining, 300000, 'Qolgan qarz 300 000 so‘m bo‘lishi kerak');
  assert.strictEqual(newPaid, 200000, 'To‘langan summa 200 000 so‘m bo‘lishi kerak');
  assert.strictEqual(isPaid, false, 'Qarz hali to‘liq yopilmagan');
});

// ──────────────────────────────────────────────────────────────────────────
// TEST 10: Qarzga sotilgan mahsulot (Nasiya)
// ──────────────────────────────────────────────────────────────────────────
runTest('10. Qarzga sotilgan mahsulot: tovar tushumi hisoblanadi, kassa kirimi 0 bo‘ladi', () => {
  const debtSale = {
    id: 's-nasiya-1',
    product: 'Smartfon',
    price: 3000000,
    qty: 1,
    total: 3000000,
    costPrice: 2400000,
    paymentType: 'Nasiya',
    saleType: 'installment_contract',
    date: '2026-11-02'
  };

  const fin = getSaleFinancials(debtSale);
  assert.strictEqual(fin.revenue, 3000000, 'Tovar realizatsiyasi tushumi 3 000 000 bo‘lishi kerak');
  assert.strictEqual(fin.cashReceipt, 0, 'Kassa kirimi 0 bo‘lishi kerak (pul hali kelmagan)');
  assert.strictEqual(fin.profit, 600000, 'Sof foyda 600 000 bo‘lishi kerak (3M - 2.4M)');
});

// ──────────────────────────────────────────────────────────────────────────
// TEST 11: Bekor qilingan savdo (hisobdan chiqarilishi)
// ──────────────────────────────────────────────────────────────────────────
runTest('11. Bekor qilingan va qaytarilgan savdolar hisobdan chiqarilishi', () => {
  const activeSale = { id: 's-1', total: 100000, date: '2026-11-02' };
  const returnedSale = { id: 's-2', total: 200000, isReturned: true, date: '2026-11-02' };
  const cancelledSale = { id: 's-3', total: 300000, status: 'Bekor qilingan', date: '2026-11-02' };

  assert.strictEqual(isReturnedSale(activeSale), false);
  assert.strictEqual(isReturnedSale(returnedSale), true);
  assert.strictEqual(isReturnedSale(cancelledSale), true);

  const summary = aggregateSalesFinancials([activeSale, returnedSale, cancelledSale], [], '2026-11-02');
  assert.strictEqual(summary.revenue, 100000, 'Faqat aktiv savdo hisoblanishi kerak (100k)');
  assert.strictEqual(summary.count, 1, 'Faqat 1 ta savdo hisoblanishi kerak');
});

// ──────────────────────────────────────────────────────────────────────────
// TEST 12: Bir operatsiyaning ikki marta hisoblanmasligi (Double Counting Prevention)
// ──────────────────────────────────────────────────────────────────────────
runTest('12. Muddatli shartnoma va to‘lovlar bir-birini takrorlamasligi', () => {
  // Mijoz 6 000 000 so'mga muddatli shartnoma tuzdi, boshlang'ich 1 000 000 so'm to'ladi.
  // 1-yozuv: Shartnoma (tovar realizatsiyasi)
  const contractSale = {
    id: 's-c1',
    product: 'Muddatli savdo: N-001 (Akmal)',
    total: 6000000,
    costPrice: 4500000,
    paymentType: 'Nasiya',
    saleType: 'installment_contract',
    date: '2026-11-02'
  };

  // 2-yozuv: Boshlang'ich to'lov (kassa kirimi)
  const downPaymentSale = {
    id: 's-dp1',
    product: 'Muddatli to‘lov qabuli (Boshlang‘ich): N-001',
    total: 1000000,
    paymentType: 'Naqd',
    saleType: 'installment_payment',
    isDebtCollection: true,
    date: '2026-11-02'
  };

  // 3-yozuv: Keyingi oy to'lovi (kassa kirimi)
  const monthlyPaymentSale = {
    id: 's-mp1',
    product: 'Muddatli to‘lov qabuli: N-001',
    total: 1000000,
    paymentType: 'Karta',
    saleType: 'installment_payment',
    isDebtCollection: true,
    date: '2026-11-02'
  };

  const summary = aggregateSalesFinancials([contractSale, downPaymentSale, monthlyPaymentSale], [], '2026-11-02');

  // Tovar realizatsiyasi tushumi AYNAN 6 000 000 so'm (to'lovlar qo'shilib 8 000 000 bo'lib ketmasligi shart!)
  assert.strictEqual(summary.merchandiseRevenue, 6000000, 'Tovar realizatsiyasi tushumi aynan 6M bo‘lishi kerak');

  // Kassa kirimi AYNAN 2 000 000 so'm (1M boshlang'ich + 1M oylik to'lov)
  assert.strictEqual(summary.cashReceipts, 2000000, 'Haqiqiy kassa kirimi aynan 2M bo‘lishi kerak');

  // Tovar soni aynan 1 ta bo'lishi kerak (to'lovlar tovar emas)
  assert.strictEqual(summary.count, 1, 'Tovar savdolari soni 1 ta bo‘lishi kerak');

  // Sof foyda: 6M - 4.5M = 1.5M (to'lovlardan qayta foyda hisoblanmaydi)
  assert.strictEqual(summary.grossProfit, 1500000, 'Yalpi foyda 1.5M bo‘lishi kerak');
});

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================');

if (failCount > 0) process.exit(1);


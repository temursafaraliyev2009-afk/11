// test_charts_and_financials.js
// Grafiklar va moliyaviy hisob-kitoblar uchun keng qamrovli test to'plami
import assert from 'assert';
import {
  getLocalDateString,
  getOffsetDateString,
  getTashkentHour,
  isToday,
  isYesterday,
  formatDisplayDate
} from './src/utils/dateUtils.js';

import {
  isReturnedSale,
  isDebtCollectionSale,
  isInstallmentContractSale,
  getSaleFinancials,
  aggregateSalesFinancials,
  buildPeriodFinancialReports
} from './src/utils/financeUtils.js';

console.log("====================================================");
console.log("SAVATCHI: GRAFIKLAR VA MOLIYAVIY HISOB-KITOB TESTLARI");
console.log("====================================================");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err.message || err);
    failed++;
  }
}

// ─── 1. ASIA/TASHKENT SANA VA VAQT TESTLARI ─────────────────────────────────
runTest("1. Asia/Tashkent vaqt zonasi bo'yicha to'g'ri sana va soat aniqlanishi", () => {
  // Masalan: UTC bo'yicha 2026-10-31 soat 20:30 bo'lsa, Toshkentda (UTC+5) 2026-11-01 soat 01:30 bo'ladi
  const utcDate = new Date('2026-10-31T20:30:00Z');
  const tashkentStr = getLocalDateString(utcDate);
  assert.strictEqual(tashkentStr, '2026-11-01', "Toshkent vaqti bo'yicha sana 2026-11-01 bo'lishi kerak");

  const tashkentH = getTashkentHour(utcDate);
  assert.strictEqual(tashkentH, 1, "Toshkent soati 1 (01:30) bo'lishi kerak");

  // String shaklida berilgan '2026-11-01' sanasi o'zgarmasligi kerak
  assert.strictEqual(getLocalDateString('2026-11-01'), '2026-11-01');
});

runTest("2. Sana offsetlari (kecha, 7 kun, 30 kun, kabisa yillari) to'g'ri hisoblanishi", () => {
  const base = '2026-11-01';
  assert.strictEqual(getOffsetDateString(-1, base), '2026-10-31', "1 kun oldin 31-oktabr");
  assert.strictEqual(getOffsetDateString(-6, base), '2026-10-26', "7 kunlik davr boshlanishi (bugun + 6 kun)");
  assert.strictEqual(getOffsetDateString(-29, base), '2026-10-03', "30 kunlik davr boshlanishi (bugun + 29 kun)");

  // Kabisa yili (2024-03-01 dan 1 kun oldin 2024-02-29)
  assert.strictEqual(getOffsetDateString(-1, '2024-03-01'), '2024-02-29');
  // Oddiy yil (2025-03-01 dan 1 kun oldin 2025-02-28)
  assert.strictEqual(getOffsetDateString(-1, '2025-03-01'), '2025-02-28');
});

// ─── 2. KELAJAK SANALARI VA SOATLARINI BLOKLASH ─────────────────────────────
runTest("3. Kelajak sanalaridagi va kelajak soatlaridagi sotuvlar grafikga kirmasligi", () => {
  const mockNow = new Date('2026-11-01T14:00:00+05:00'); // 14:00 Toshkent vaqti
  const todayStr = getLocalDateString(mockNow);

  const testSales = [
    // O'tgan haqiqiy savdo (soat 10:00) -> kiritilishi shart
    { id: 's1', date: todayStr, time: '10:00', total: 100000, qty: 1, product: 'Non' },
    // O'tgan haqiqiy savdo (soat 13:30) -> kiritilishi shart
    { id: 's2', date: todayStr, time: '13:30', total: 200000, qty: 1, product: 'Sut' },
    // Kelajak soatidagi savdo (soat 18:00, hozir 14:00) -> BLOKLANISHI SHART!
    { id: 's3', date: todayStr, time: '18:00', total: 500000, qty: 1, product: 'Shakar' },
    // Ertangi kundagi savdo -> BLOKLANISHI SHART!
    { id: 's4', date: getOffsetDateString(1, mockNow), time: '10:00', total: 900000, qty: 1, product: 'Yog\'' }
  ];

  const reports = buildPeriodFinancialReports(testSales, [], mockNow);
  const bugun = reports['Bugun'];

  // s1, s2 va s3 hisoblanishi kerak (100k + 200k + 500k = 800k); ertangi s4 bloklanadi
  assert.strictEqual(bugun.currentRevenue, 800000, "Bugungi tushum barcha bugungi savdolarni o'z ichiga olishi kerak");
  assert.strictEqual(bugun.salesCount, 3, "Faqat bugungi 3 ta savdo hisoblanishi kerak");

  // Grafikdagi 16:00, 18:00 va 20:00 slotlari qat'iy 0 bo'lishi kerak
  const slot18 = bugun.chartData.find(s => s.label === '18:00');
  assert.ok(slot18, "18:00 sloti mavjud");
  assert.strictEqual(slot18.savdo, 0, "Kelajakdagi 18:00 slotida savdo 0 bo'lishi shart!");

  const slot20 = bugun.chartData.find(s => s.label === '20:00');
  assert.strictEqual(slot20.savdo, 0, "Kelajakdagi 20:00 slotida savdo 0 bo'lishi shart!");
});

// ─── 3. GRAFIK VA KARTALAR YIG'INDILARI MOSLIGI ──────────────────────────────
runTest("4. Bugungi grafik slotlari yig'indisi karta tushumiga 100% teng bo'lishi", () => {
  const mockNow = new Date('2026-11-01T23:00:00+05:00');
  const todayStr = getLocalDateString(mockNow);

  const testSales = [
    { id: 's1', date: todayStr, time: '08:30', total: 50000, qty: 1 },
    { id: 's2', date: todayStr, time: '10:15', total: 120000, qty: 1 },
    { id: 's3', date: todayStr, time: '12:45', total: 80000, qty: 1 },
    { id: 's4', date: todayStr, time: '15:20', total: 210000, qty: 1 },
    { id: 's5', date: todayStr, time: '17:05', total: 95000, qty: 1 },
    { id: 's6', date: todayStr, time: '19:40', total: 160000, qty: 1 },
    { id: 's7', date: todayStr, time: '21:10', total: 300000, qty: 1 }
  ];

  const totalExpected = 50000 + 120000 + 80000 + 210000 + 95000 + 160000 + 300000; // 1,015,000
  const reports = buildPeriodFinancialReports(testSales, [], mockNow);
  const bugun = reports['Bugun'];

  assert.strictEqual(bugun.currentRevenue, totalExpected, "Karta tushumi to'g'ri");
  const chartSum = bugun.chartData.reduce((sum, d) => sum + d.savdo, 0);
  assert.strictEqual(chartSum, totalExpected, "Grafik slotlari yig'indisi karta tushumiga aynan teng");
});

runTest("5. Haftalik grafik kunlari yig'indisi haftalik karta tushumiga 100% teng bo'lishi", () => {
  const mockNow = new Date('2026-11-01T23:00:00+05:00'); // Yakshanba
  const todayStr = getLocalDateString(mockNow);

  // Hafta kunlari: 2026-10-26 (Dush) dan 2026-11-01 (Yak) gacha
  const testSales = [
    { id: 'w1', date: '2026-10-26', total: 100000, qty: 1 },
    { id: 'w2', date: '2026-10-27', total: 150000, qty: 1 },
    { id: 'w3', date: '2026-10-28', total: 200000, qty: 1 },
    { id: 'w4', date: '2026-10-29', total: 250000, qty: 1 },
    { id: 'w5', date: '2026-10-30', total: 300000, qty: 1 },
    { id: 'w6', date: '2026-10-31', total: 350000, qty: 1 },
    { id: 'w7', date: '2026-11-01', total: 400000, qty: 1 },
    // O'tgan haftadagi savdo (hafta hisobiga kirmasligi kerak)
    { id: 'old', date: '2026-10-25', total: 999999, qty: 1 }
  ];

  const expectedWeekTotal = 100000 + 150000 + 200000 + 250000 + 300000 + 350000 + 400000; // 1,750,000
  const reports = buildPeriodFinancialReports(testSales, [], mockNow);
  const hafta = reports['Hafta'];

  assert.strictEqual(hafta.currentRevenue, expectedWeekTotal, "Hafta karta tushumi to'g'ri");
  const chartSum = hafta.chartData.reduce((sum, d) => sum + d.savdo, 0);
  assert.strictEqual(chartSum, expectedWeekTotal, "Hafta grafigidagi 7 kun yig'indisi karta tushumiga aynan teng");
});

runTest("6. Oylik va yillik grafik intervallari yig'indisi karta tushumiga 100% teng bo'lishi", () => {
  const mockNow = new Date('2026-11-01T23:00:00+05:00');
  const testSales = [
    { id: 'm1', date: '2026-11-01', total: 500000, qty: 1 },
    // 2026-yilning boshqa oylari
    { id: 'y1', date: '2026-01-15', total: 1000000, qty: 1 },
    { id: 'y2', date: '2026-05-20', total: 2000000, qty: 1 },
    // O'tgan yil (2025)
    { id: 'prevY', date: '2025-11-01', total: 888888, qty: 1 }
  ];

  const reports = buildPeriodFinancialReports(testSales, [], mockNow);
  const oy = reports['Oy'];
  const yil = reports['Yil'];

  // Oy bo'yicha: faqat noyabr
  assert.strictEqual(oy.currentRevenue, 500000);
  const oyChartSum = oy.chartData.reduce((sum, d) => sum + d.savdo, 0);
  assert.strictEqual(oyChartSum, 500000, "Oy intervallari yig'indisi to'g'ri");

  // Yil bo'yicha: 500k + 1M + 2M = 3.5M
  assert.strictEqual(yil.currentRevenue, 3500000);
  const yilChartSum = yil.chartData.reduce((sum, d) => sum + d.savdo, 0);
  assert.strictEqual(yilChartSum, 3500000, "Yil oylari yig'indisi to'g'ri");
});

// ─── 4. BEKOR QILINGAN / QAYTARILGAN VA QARZ UNDIRUVI SAVDOLARI ─────────────
runTest("7. Qaytarilgan yoki bekor qilingan savdolar grafikda hisoblanmasligi", () => {
  const mockNow = new Date('2026-11-01T12:00:00+05:00');
  const todayStr = getLocalDateString(mockNow);

  const testSales = [
    { id: 's1', date: todayStr, time: '10:00', total: 200000, qty: 1, status: 'Bajarildi' },
    { id: 's2', date: todayStr, time: '11:00', total: 300000, qty: 1, isReturned: true }, // qaytarilgan
    { id: 's3', date: todayStr, time: '11:30', total: 400000, qty: 1, status: 'Qaytarilgan' }, // qaytarilgan
    { id: 's4', date: todayStr, time: '11:45', total: 500000, qty: 1, status: 'Bekor qilingan' } // bekor qilingan
  ];

  const reports = buildPeriodFinancialReports(testSales, [], mockNow);
  const bugun = reports['Bugun'];

  assert.strictEqual(bugun.currentRevenue, 200000, "Faqat faol s1 hisoblanishi kerak");
  assert.strictEqual(bugun.salesCount, 1);
});

// ─── 5. YANGI DO'KON VA BO'SH MA'LUMOTLAR HOLATI ─────────────────────────────
runTest("8. Yangi do'kon va 0 sotuv holatida grafiklar to'g'ri 0 aks etishi", () => {
  const reports = buildPeriodFinancialReports([], [], new Date());
  
  ['Bugun', 'Hafta', 'Oy', 'Yil'].forEach(period => {
    const rep = reports[period];
    assert.strictEqual(rep.currentRevenue, 0, `${period} tushumi 0 bo'lishi kerak`);
    assert.strictEqual(rep.profit, 0, `${period} foydasi 0 bo'lishi kerak`);
    assert.strictEqual(rep.cost, 0, `${period} xarajati 0 bo'lishi kerak`);
    assert.strictEqual(rep.salesCount, 0, `${period} sotuvlar soni 0 bo'lishi kerak`);

    const hasAnyPositive = rep.chartData.some(d => d.savdo > 0 || d.foyda > 0);
    assert.strictEqual(hasAnyPositive, false, `${period} grafigida hech qanday soxta musbat son bo'lmasligi kerak`);
  });
});

// ─── 6. NATIJA ───────────────────────────────────────────────────────────────
console.log("\n====================================================");
console.log(`NATIJA: ${passed}/${passed + failed} ta sinov muvaffaqiyatli o'tdi!`);
if (failed > 0) {
  console.log(`⚠️  ${failed} ta sinov MUVAFFAQIYATSIZ tugadi!`);
  process.exit(1);
}
console.log("====================================================");


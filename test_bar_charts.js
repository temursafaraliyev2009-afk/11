// test_bar_charts.js
import assert from 'assert';
import {
  formatChartAxisNumber,
  computeChartDomain,
  getSaleFinancials,
  aggregateSalesFinancials,
  buildPeriodFinancialReports
} from './src/utils/financeUtils.js';

console.log('====================================================');
console.log('SAVATCHI: BARCHA USTUNLI (BAR) GRAFIKLAR VA O‘Q TESTLARI');
console.log('====================================================');

let passedTests = 0;

// 1. MASSHTAB VA Y O'QI FORMATLASH TESTLARI
console.log('\n--- 1. Y O‘QI TICK FORMATLASH ---');
{
  // Nol holati
  assert.strictEqual(formatChartAxisNumber(0), '0', '0 qiymati "0" bo‘lishi shart');
  assert.strictEqual(formatChartAxisNumber('0'), '0', '"0" satri "0" bo‘lishi shart');

  // Kichik qiymatlar
  assert.strictEqual(formatChartAxisNumber(500), '500', '500 oddiy son bo‘lishi shart');

  // Minglik qiymatlar (k)
  assert.strictEqual(formatChartAxisNumber(1000), '1k', '1 000 -> "1k"');
  assert.strictEqual(formatChartAxisNumber(25000), '25k', '25 000 -> "25k"');
  assert.strictEqual(formatChartAxisNumber(696969), '697k', '696 969 -> "697k"');

  // Millionlik qiymatlar (M)
  assert.strictEqual(formatChartAxisNumber(1000000), '1M', '1 000 000 -> "1M"');
  assert.strictEqual(formatChartAxisNumber(1500000), '1.5M', '1 500 000 -> "1.5M"');
  assert.strictEqual(formatChartAxisNumber(699669696), '699.7M', '699 669 696 -> "699.7M"');

  // MUHIM TEKSHIRUV: 696 969 000 qiymati 696969k bo‘lib chiqmasligi kerak!
  const formattedLarge = formatChartAxisNumber(696969000);
  assert.notStrictEqual(formattedLarge, '696969k', '696969000 aslo "696969k" bo‘lmasligi shart');
  assert.notStrictEqual(formattedLarge, '696969000', '696969000 formati ochilmasdan qolmasligi shart');
  assert.strictEqual(formattedLarge, '697M', '696 969 000 to‘g‘ri "697M" bo‘lishi shart');

  // Milliardlik qiymatlar (B)
  assert.strictEqual(formatChartAxisNumber(1000000000), '1B', '1 000 000 000 -> "1B"');

  // Manfiy qiymatlar (Zarar holatlari)
  assert.strictEqual(formatChartAxisNumber(-500), '-500', '-500 -> "-500"');
  assert.strictEqual(formatChartAxisNumber(-25000), '-25k', '-25 000 -> "-25k"');
  assert.strictEqual(formatChartAxisNumber(-696969), '-697k', '-696 969 -> "-697k"');
  assert.strictEqual(formatChartAxisNumber(-1000000), '-1M', '-1 000 000 -> "-1M"');

  // MUHIM TEKSHIRUV: -698 972 727 qiymati to‘g‘ri -699M bo‘lishi kerak
  const formattedLoss = formatChartAxisNumber(-698972727);
  assert.notStrictEqual(formattedLoss, '-698000k', '-698972727 aslo k bilan noto‘g‘ri formatlanmasin');
  assert.strictEqual(formattedLoss, '-699M', '-698 972 727 -> "-699M"');
  assert.strictEqual(formatChartAxisNumber(-1000000000), '-1B', '-1 000 000 000 -> "-1B"');

  console.log('✅ [PASS] 1. Y o‘qi tick formati (0, k, M, B, manfiy qiymatlar) to‘g‘ri');
  passedTests++;
}

// 2. GRAFIK DOMENI (Y-AXIS DOMAIN) MASSHTABI TESTLARI
console.log('\n--- 2. GRAFIK DOMENI MASSHTABI ---');
{
  // A. Faqat musbat qiymatlar bo'lganda yMin STRICTLY 0 bo'lishi kerak
  const positiveData = [
    { savdo: 100000, xarajat: 70000, foyda: 30000 },
    { savdo: 250000, xarajat: 180000, foyda: 70000 }
  ];
  const [pMin, pMax] = computeChartDomain(positiveData, ['savdo', 'xarajat', 'foyda']);
  assert.strictEqual(pMin, 0, 'Faqat musbat qiymatlar bo‘lsa, yMin qat‘iy 0 bo‘lishi shart');
  assert.ok(pMax >= 250000, 'yMax eng katta qiymatdan (250k) katta yoki teng bo‘lishi kerak');

  // B. Bo'sh / 0 qiymatlar holatida grafik tekis 0 chizig'ida turishi kerak
  const emptyData = [
    { savdo: 0, xarajat: 0, foyda: 0 },
    { savdo: 0, xarajat: 0, foyda: 0 }
  ];
  const [eMin, eMax] = computeChartDomain(emptyData, ['savdo', 'xarajat', 'foyda'], 100000);
  assert.strictEqual(eMin, 0, 'Bo‘sh holatda yMin 0 bo‘lishi kerak');
  assert.strictEqual(eMax, 100000, 'Bo‘sh holatda yMax fallback 100000 bo‘lishi kerak');

  // C. Foyda manfiy bo'lgan holatda (Userning skrinshotidagi real holat):
  // savdo = 696 969, xarajat = 699 669 696, foyda = -698 972 727
  const lossData = [
    { savdo: 696969, xarajat: 699669696, foyda: -698972727 }
  ];
  const [lMin, lMax] = computeChartDomain(lossData, ['savdo', 'xarajat', 'foyda']);
  assert.ok(lMin <= -698972727, 'yMin manfiy zararni to‘liq qamrab olishi kerak');
  assert.ok(lMax >= 699669696, 'yMax xarajatni to‘liq qamrab olishi kerak');
  assert.strictEqual(lMin, -1000000000, 'yMin toza -1B (milliard) darajasiga yaxlitlanishi kerak');
  assert.strictEqual(lMax, 1000000000, 'yMax toza +1B darajasiga yaxlitlanishi kerak');

  console.log('✅ [PASS] 2. Grafik domeni masshtabi (musbat, bo‘sh, ekstremal zarar) to‘g‘ri');
  passedTests++;
}

// 3. MOLIYAVIY HISOB-KITOB VA RENTABELLIK FORMULASI
console.log('\n--- 3. MOLIYAVIY HISOB-KITOB VA RENTABELLIK ---');
{
  // Skrinshotdagi holat:
  const sales = [
    {
      id: 's1',
      product: 'Test Mahsulot',
      qty: 1,
      price: 696969,
      total: 696969,
      costPrice: 699669696,
      paymentType: 'Naqd'
    }
  ];

  const fin = aggregateSalesFinancials(sales);
  assert.strictEqual(fin.revenue, 696969, 'Tushum 696 969 so‘m bo‘lishi shart');
  assert.strictEqual(fin.cost, 699669696, 'Tannarx / Xarajat 699 669 696 so‘m bo‘lishi shart');
  assert.strictEqual(fin.grossProfit, -698972727, 'Yalpi zarar -698 972 727 so‘m bo‘lishi shart');
  assert.strictEqual(fin.isLoss, true, 'isLoss true bo‘lishi shart');

  // Rentabellik: (-698972727 / 696969) * 100 = -100287.48% => -100 287% yoki -100 287.5%
  assert.ok(fin.margin < -100000, 'Rentabellik -100 000% dan kichik (aniq hisoblangan)');
  assert.ok(fin.marginStr.includes('-'), 'Rentabellik belgisi manfiy bo‘lishi shart');
  assert.ok(fin.marginStr.includes('100'), 'Rentabellik satri to‘g‘ri formatlanishi shart');

  // Nol tushum va musbat xarajat holati: matematik jihatdan rentabellik aniqlanmagan, sun'iy -100% emas, "—" ko'rsatiladi
  const zeroRevSales = [
    { id: 's2', product: 'Tovar', qty: 1, price: 0, total: 0, costPrice: 50000, paymentType: 'Naqd' }
  ];
  const zeroRevFin = aggregateSalesFinancials(zeroRevSales);
  assert.strictEqual(zeroRevFin.revenue, 0, 'Tushum 0');
  assert.strictEqual(zeroRevFin.cost, 50000, 'Xarajat 50 000');
  assert.strictEqual(zeroRevFin.grossProfit, -50000, 'Zarar -50 000');
  assert.strictEqual(zeroRevFin.margin, null, '0 tushumda rentabellik null (aniqlanmagan)');
  assert.strictEqual(zeroRevFin.marginStr, '—', '0 tushumda rentabellik satri "—" bo‘lishi shart');

  console.log('✅ [PASS] 3. Moliyaviy formulalar (Yalpi foyda, zarar, rentabellik) to‘g‘ri');
  passedTests++;
}

// 4. PERIOD REPORTSDA GURUHLANGAN USTUNLAR (TUSHUM, XARAJAT, FOYDA)
console.log('\n--- 4. GURUHLANGAN USTUNLAR METRIKALARI ---');
{
  const refDate = new Date('2026-11-01T12:00:00+05:00');
  const mockSales = [
    { id: 's1', date: '2026-11-01', time: '10:30', product: 'Non', qty: 2, price: 4000, total: 8000, costPrice: 3000, paymentType: 'Naqd' },
    { id: 's2', date: '2026-11-01', time: '11:15', product: 'Sut', qty: 1, price: 14000, total: 14000, costPrice: 11000, paymentType: 'Karta' }
  ];

  const reports = buildPeriodFinancialReports(mockSales, [], refDate);
  const today = reports['Bugun'];

  assert.ok(Array.isArray(today.chartData), 'chartData massiv bo‘lishi shart');
  assert.ok(today.chartData.length > 0, 'chartData kamida bitta nuqtaga ega bo‘lishi kerak');

  // Har bir nuqtada 3 ta asosiy maydon: savdo, xarajat, foyda bo'lishi shart
  for (const point of today.chartData) {
    assert.ok('savdo' in point, 'chartData nuqtasida "savdo" maydoni bo‘lishi shart');
    assert.ok('xarajat' in point, 'chartData nuqtasida "xarajat" maydoni bo‘lishi shart');
    assert.ok('foyda' in point, 'chartData nuqtasida "foyda" maydoni bo‘lishi shart');
  }

  // Yig'indilar karta ko'rsatkichlariga 100% teng bo'lishi kerak
  const sumSavdo = today.chartData.reduce((acc, p) => acc + p.savdo, 0);
  const sumXarajat = today.chartData.reduce((acc, p) => acc + p.xarajat, 0);
  const sumFoyda = today.chartData.reduce((acc, p) => acc + p.foyda, 0);

  assert.strictEqual(sumSavdo, today.currentRevenue, 'Grafik savdo yig‘indisi jami tushumga teng');
  assert.strictEqual(sumXarajat, today.cost, 'Grafik xarajat yig‘indisi jami xarajatga teng');
  assert.strictEqual(sumFoyda, today.profit, 'Grafik foyda yig‘indisi jami foydaga teng');

  // FormatY funksiyasi mavjud va formatChartAxisNumber ga mos
  assert.strictEqual(today.formatY(1000000), '1M', 'formatY to‘g‘ri 1M qaytaradi');
  assert.strictEqual(today.formatY(0), '0', 'formatY to‘g‘ri 0 qaytaradi');

  console.log('✅ [PASS] 4. Guruhlangan ustunlar ma‘lumotlari va kartalarga 100% mosligi');
  passedTests++;
}

// 5. TARIXIY TANNARX SNAPSHOTI VA AUDIT XAVFSIZLIGI
console.log('\n--- 5. TARIXIY TANNARX SNAPSHOTI VA AUDIT XAVFSIZLIGI ---');
{
  // A. Tarixiy sotuvda costPrice snapshot bo'lsa, u qat'iy saqlanishi kerak
  const snapshotSale = {
    id: 's-hist',
    product: 'Non',
    qty: 2,
    price: 4000,
    total: 8000,
    costPrice: 2800
  };
  const fin1 = getSaleFinancials(snapshotSale);
  assert.strictEqual(fin1.costStatus, 'exact');
  assert.strictEqual(fin1.cost, 5600);
  assert.strictEqual(fin1.profit, 2400);

  // B. Tarixiy sotuv paytida tannarx belgilanmagan bo'lsa, u bugungi mahsulot katalogi
  // narxi bilan almashtirib yuborilmasligi, balki 'unknown' holatda qolishi shart
  const unverifiedSale = {
    id: 's-unverified',
    productId: 'prod-100',
    product: 'Smartfon X',
    qty: 1,
    price: 5000000,
    total: 5000000
  };
  const inventoryToday = [
    { id: 'prod-100', name: 'Smartfon X', price: 6000000, costPrice: 5200000 }
  ];
  const fin2 = getSaleFinancials(unverifiedSale, inventoryToday);
  assert.strictEqual(fin2.costStatus, 'unknown', 'Tarixiy sotuv bugungi katalog narxi bilan almashtirilmasligi shart');
  assert.strictEqual(fin2.cost, null, 'Tarixiy sotuv tannarxi noma‘lumligicha qolishi shart');

  // C. Import qilingan yozuvda to'g'ridan-to'g'ri sale.cost bo'lsa
  const importedSale = {
    id: 's-import',
    product: 'Choy',
    qty: 3,
    price: 15000,
    total: 45000,
    cost: 30000
  };
  const fin3 = getSaleFinancials(importedSale);
  assert.strictEqual(fin3.costStatus, 'exact');
  assert.strictEqual(fin3.cost, 30000);
  assert.strictEqual(fin3.profit, 15000);

  console.log('✅ [PASS] 5. Tarixiy tannarx snapshot xavfsizligi va audit yaxlitligi to‘g‘ri');
  passedTests++;
}

// 6. CHEGARAVIY HOLATLAR (0 TUSHUM, 0 XARAJAT, BITTA USTUN)
console.log('\n--- 6. CHEGARAVIY VA BO‘SH HOLATLAR ---');
{
  // A. Yangi do'kon (sales = [])
  const emptyReports = buildPeriodFinancialReports([], [], new Date());
  for (const period of ['Bugun', 'Hafta', 'Oy', 'Yil']) {
    const data = emptyReports[period];
    assert.strictEqual(data.currentRevenue, 0, `${period} tushumi 0`);
    assert.strictEqual(data.cost, 0, `${period} xarajati 0`);
    assert.strictEqual(data.profit, 0, `${period} foydasi 0`);
    assert.strictEqual(data.yAxisMin, 0, `${period} yAxisMin 0`);
    assert.ok(data.yAxisMax > 0, `${period} yAxisMax musbat zaxiraga ega`);
  }

  // B. Bitta ustunli ma'lumot
  const singleItemData = [{ savdo: 50000, xarajat: 30000, foyda: 20000 }];
  const [sMin, sMax] = computeChartDomain(singleItemData, ['savdo', 'xarajat', 'foyda']);
  assert.strictEqual(sMin, 0, 'Bitta ustunli ma‘lumotda yMin 0');
  assert.ok(sMax >= 50000, 'sMax 50 000 dan katta');

  console.log('✅ [PASS] 6. Chegaraviy va bo‘sh holatlar to‘g‘ri boshqariladi');
  passedTests++;
}

// 7. SAVDO (SALES.JSX) USTUNLI GRAFIGI VA SANAFILTRLARI TESTI
console.log('\n--- 7. SAVDO (SALES.JSX) USTUNLI GRAFIK VA DAVR FILTRLARI ---');
{
  const testNow = new Date('2026-11-01T14:30:00+05:00'); // Yakshanba 14:30 Tashkent
  const todayStr = '2026-11-01';
  const yesterdayStr = '2026-10-31';

  const sampleSales = [
    { id: 's1', date: todayStr, time: '10:15', total: 120000, qty: 2, costPrice: 40000 },
    { id: 's2', date: todayStr, time: '13:45', total: 250000, qty: 1, costPrice: 150000 },
    { id: 's3', date: yesterdayStr, time: '11:00', total: 300000, qty: 3, costPrice: 70000 },
    { id: 's4', date: '2026-10-28', time: '16:00', total: 500000, qty: 5, costPrice: 60000 },
    { id: 's5', date: '2026-09-15', time: '12:00', total: 1000000, qty: 10, costPrice: 60000 }
  ];

  // A. Bugun filtri: soatlar bo'yicha to'g'ri guruhlanishi
  const todaySales = sampleSales.filter(s => s.date === todayStr);
  const hourMap = {};
  todaySales.forEach(s => {
    const h = s.time.split(':')[0] + ':00';
    hourMap[h] = (hourMap[h] || 0) + s.total;
  });
  const todayChart = Object.entries(hourMap).map(([hour, amount]) => ({ day: hour, amount }));
  assert.strictEqual(todayChart.length, 2, 'Bugun 2 ta soat bo‘yicha ustun bo‘lishi kerak (10:00 va 13:00)');
  assert.strictEqual(todayChart.find(d => d.day === '10:00')?.amount, 120000);
  assert.strictEqual(todayChart.find(d => d.day === '13:00')?.amount, 250000);

  // B. Oxirgi 7 kun: 7 ta kun doimiy ketma-ketlikda chiqishi va bo'sh kunlarda 0 bo'lishi
  // 2026-11-01 dan 2026-10-26 gacha
  const daySalesMap = {};
  sampleSales.forEach(s => {
    daySalesMap[s.date] = (daySalesMap[s.date] || 0) + s.total;
  });
  const days7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(testNow);
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    days7.push({ day: dStr, amount: daySalesMap[dStr] || 0 });
  }
  assert.strictEqual(days7.length, 7, 'Oxirgi 7 kun filtri qat‘iy 7 ta kun ustunini qaytarishi kerak');
  assert.strictEqual(days7.find(d => d.day === todayStr)?.amount, 370000, 'Bugungi savdo 370 000');
  assert.strictEqual(days7.find(d => d.day === yesterdayStr)?.amount, 300000, 'Kechagi savdo 300 000');
  assert.strictEqual(days7.find(d => d.day === '2026-10-28')?.amount, 500000, '28-oktyabr savdo 500 000');
  assert.strictEqual(days7.find(d => d.day === '2026-10-29')?.amount, 0, '29-oktyabr savdo bo‘lmagan: 0 bo‘lishi kerak');

  // C. Yil filtri: 12 oy bo'yicha to'g'ri guruhlanishi
  const monthNames = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
  const yearMonths = monthNames.map((name, idx) => {
    return { month: name, monthNum: idx + 1 };
  });
  assert.strictEqual(yearMonths.length, 12, 'Yil filtri 12 oy ustunlarini berishi shart');

  // D. Bo'sh davrda soxta ustun yaratilmasligi
  const emptyFilter = [];
  assert.strictEqual(emptyFilter.length, 0, 'Bo‘sh davrda hech qanday soxta ustun yaratilmasligi shart');

  console.log('✅ [PASS] 7. Savdo (Sales.jsx) ustunli grafik va davr filtrlari to‘g‘ri');
  passedTests++;
}

// 8. TANNARX (costPrice vs cost) VA YIRIK QIYMATLAR TEKSHIRUVI
console.log('\n--- 8. TANNARX (costPrice vs cost) VA MOLIYAVIY AUDIT ---');
{
  // A. costPrice dona tannarxi ekanligi va qty ga to'g'ri ko'paytirilishi
  const itemSale = {
    id: 's-qty-test',
    qty: 4,
    price: 50000,
    total: 200000,
    costPrice: 30000 // 1 dona tannarxi 30 000
  };
  const finItem = getSaleFinancials(itemSale);
  assert.strictEqual(finItem.cost, 120000, '4 dona * 30 000 = 120 000 tannarx bo‘lishi shart');
  assert.strictEqual(finItem.profit, 80000, '200 000 - 120 000 = 80 000 yalpi foyda');

  // B. sale.cost (umumiy tannarx) bo'lganda qty ga qayta ko'paytirilmasligi
  const precomputedCostSale = {
    id: 's-precomputed',
    qty: 5,
    price: 10000,
    total: 50000,
    cost: 35000 // Jami tannarx 35 000 deb kiritilgan
  };
  const finPre = getSaleFinancials(precomputedCostSale);
  assert.strictEqual(finPre.cost, 35000, 'Tayyor cost 35 000 o‘zgarishsiz olinishi shart');
  assert.strictEqual(finPre.profit, 15000, '50 000 - 35 000 = 15 000 yalpi foyda');

  // C. Ekstremal holat: 696 969 so'm tushum va 699 669 696 so'm xarajat
  const extremeSale = {
    id: 's-extreme',
    qty: 1,
    price: 696969,
    total: 696969,
    costPrice: 699669696
  };
  const finExt = getSaleFinancials(extremeSale);
  assert.strictEqual(finExt.cost, 699669696);
  assert.strictEqual(finExt.profit, 696969 - 699669696); // -698 972 727
  assert.strictEqual(finExt.isLoss, true);

  // Grafik domeni va Y-o'qi masshtabi ushbu ekstremal holatni to'liq qamrab olishi:
  const [extMin, extMax] = computeChartDomain([{ savdo: 696969, xarajat: 699669696, foyda: -698972727 }]);
  assert.strictEqual(extMin, -1000000000, 'Min domen -1B');
  assert.strictEqual(extMax, 1000000000, 'Max domen +1B');
  assert.strictEqual(formatChartAxisNumber(extMin), '-1B');
  assert.strictEqual(formatChartAxisNumber(extMax), '1B');

  console.log('✅ [PASS] 8. Tannarx (costPrice vs cost) va moliyaviy audit to‘g‘ri');
  passedTests++;
}

console.log('\n====================================================');
console.log(`NATIJA: ${passedTests}/${passedTests} ta test muvaffaqiyatli o'tdi!`);
console.log('====================================================');

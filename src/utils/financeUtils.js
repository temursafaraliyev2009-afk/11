import {
  getLocalDateString,
  getOffsetDateString,
  getTashkentHour,
  getPreviousWeekLikeForLikeRange,
  getPreviousMonthLikeForLikeRange,
  getPreviousYearLikeForLikeRange
} from './dateUtils.js';

/**
 * Checks if a sale record represents a returned or cancelled sale.
 * @param {Object} sale
 * @returns {boolean}
 */
export const isReturnedSale = (sale) => {
  if (!sale) return false;
  return (
    sale.isReturned === true ||
    sale.status === 'Qaytarilgan' ||
    sale.status === 'Bekor qilingan' ||
    sale.status === 'Qaytarildi'
  );
};

/**
 * Checks if a sale record represents a cash receipt / debt collection / installment payment
 * rather than a new retail merchandise sale.
 * @param {Object} sale
 * @returns {boolean}
 */
export const isDebtCollectionSale = (sale) => {
  if (!sale) return false;
  if (sale.isDebtCollection === true) return true;
  if (sale.saleType === 'installment_payment' || sale.saleType === 'debt_collection') return true;
  const name = sale.product || sale.productName || '';
  return /^(Muddatli to‘lov qabuli|Muddatli to'lov qabuli|Muddatli to‘lov badali|Muddatli savdo \(Boshlang‘ich to‘lov\)|Qarz to‘lovi|Qarz undiruvi)/i.test(name);
};

/**
 * Checks if a sale record represents an installment contract (merchandise credit sale),
 * which accounts for merchandise revenue, but NOT immediate cash inflow.
 * @param {Object} sale
 * @returns {boolean}
 */
export const isInstallmentContractSale = (sale) => {
  if (!sale) return false;
  if (sale.saleType === 'installment_contract') return true;
  if (sale.contractId && !sale.isDebtCollection && sale.saleType !== 'installment_payment' && !isDebtCollectionSale(sale)) return true;
  const name = sale.product || sale.productName || '';
  return /^Muddatli savdo:/i.test(name);
};

/**
 * Hisob-kitoblar aniqligi: Foizli o'zgarishni yagona formula bo'yicha markazlashgan hisoblash.
 * Formula: ((Joriy - Oldingi) / |Oldingi|) * 100
 *
 * Qoidalar:
 * 1. Ikkala qiymat ham 0 bo'lsa: 0% ko'rsatiladi, arrow yo'q, neutral.
 * 2. Oldingi 0, joriy musbat bo'lsa: sun'iy 100% yoki cheksiz foiz emas, "Yangi" ko'rsatiladi.
 * 3. Oldingi 0, joriy manfiy bo'lsa: "Zarar" yoki minusli ko'rsatkich.
 * 4. Oldingi qiymat != 0 bo'lsa:
 *    - diff = current - previous
 *    - rate = (diff / |previous|) * 100
 *    - Yaxlitlash: 1 kasr xona, agar butun bo'lsa butun (masalan: 20% yoki 12.5%).
 *    - O'sish (+) va pasayish (-) belgilari qat'iy to'g'ri bo'ladi.
 * 5. Manfiy, null, undefined va NaN qiymatlar xavfsiz boshqariladi.
 *
 * @param {number} current
 * @param {number} previous
 * @returns {Object}
 */
export const calculateGrowthMetrics = (current = 0, previous = 0) => {
  const curr = Number(current) || 0;
  const prev = Number(previous) || 0;
  const diff = curr - prev;

  // Ikkala qiymat ham 0
  if (prev === 0 && curr === 0) {
    return {
      rate: 0,
      diff: 0,
      formattedPercent: '0%',
      badgeText: '0%',
      arrow: '',
      sign: '',
      isPositive: false,
      isNegative: false,
      isZero: true,
      isNew: false
    };
  }

  // Oldingi 0, joriy musbat ("Yangi" savdo holati)
  if (prev === 0 && curr > 0) {
    return {
      rate: null,
      diff: curr,
      formattedPercent: 'Yangi',
      badgeText: 'Yangi',
      arrow: '↑',
      sign: '+',
      isPositive: true,
      isNegative: false,
      isZero: false,
      isNew: true
    };
  }

  // Oldingi 0, joriy manfiy (sof zarar)
  if (prev === 0 && curr < 0) {
    return {
      rate: null,
      diff: curr,
      formattedPercent: 'Zarar',
      badgeText: 'Zarar',
      arrow: '↓',
      sign: '-',
      isPositive: false,
      isNegative: true,
      isZero: false,
      isNew: false
    };
  }

  // Oldingi != 0
  const rawRate = (diff / Math.abs(prev)) * 100;
  const roundedAbs = Math.round(Math.abs(rawRate) * 10) / 10;
  const pctStr = `${roundedAbs % 1 === 0 ? roundedAbs.toFixed(0) : roundedAbs.toFixed(1)}%`;

  if (rawRate > 0) {
    return {
      rate: roundedAbs,
      diff,
      formattedPercent: `+${pctStr}`,
      badgeText: `↑ ${pctStr}`,
      arrow: '↑',
      sign: '+',
      isPositive: true,
      isNegative: false,
      isZero: false,
      isNew: false
    };
  } else if (rawRate < 0) {
    return {
      rate: -roundedAbs,
      diff,
      formattedPercent: `-${pctStr}`,
      badgeText: `↓ ${pctStr}`,
      arrow: '↓',
      sign: '-',
      isPositive: false,
      isNegative: true,
      isZero: false,
      isNew: false
    };
  } else {
    return {
      rate: 0,
      diff: 0,
      formattedPercent: '0%',
      badgeText: '0%',
      arrow: '',
      sign: '',
      isPositive: false,
      isNegative: false,
      isZero: true,
      isNew: false
    };
  }
};

/**
 * Calculates financial metrics for a single sale item.
 *
 * Tovar Tushumi (Merchandise Revenue) = sale.total
 * Kassa Kirimi (Cash Receipts) = Haqiqatda qabul qilingan to'lov
 * Tannarx (COGS) = unitCost * qty (faqat aniq tannarxli tovarlar uchun)
 * Yalpi Foyda (Gross Profit) = Tovar Tushumi - Haqiqiy Tannarx
 *
 * @param {Object} sale - Sale object
 * @param {Array} productsList - Available products in store inventory
 * @returns {Object} Financial metrics object
 */
export const getSaleFinancials = (sale, productsList = []) => {
  if (!sale) {
    return {
      revenue: 0,
      cost: 0,
      profit: 0,
      grossProfit: 0,
      cashReceipt: 0,
      cashSales: 0,
      cardSales: 0,
      isLoss: false,
      isProfit: false,
      qty: 0,
      unitCost: null,
      isReturned: false,
      isDebtCollection: false,
      isInstallmentContract: false,
      costStatus: 'unknown',
      profitStatus: 'unknown'
    };
  }

  // 1. Qaytarilgan yoki bekor qilingan savdolar
  if (isReturnedSale(sale)) {
    return {
      revenue: 0,
      cost: 0,
      profit: 0,
      grossProfit: 0,
      cashReceipt: 0,
      cashSales: 0,
      cardSales: 0,
      isLoss: false,
      isProfit: false,
      qty: 0,
      unitCost: null,
      isReturned: true,
      isDebtCollection: false,
      isInstallmentContract: false,
      costStatus: 'returned',
      profitStatus: 'returned'
    };
  }

  // 2. Qarz yoki muddatli to'lov badali undiruvi (Kassa kirimi)
  if (isDebtCollectionSale(sale)) {
    const collectedAmount = Number(sale.total) !== undefined && !isNaN(Number(sale.total))
      ? Number(sale.total)
      : (Number(sale.price) || 0);

    const isCard = sale.paymentType === 'Karta';

    return {
      revenue: 0, // Tovar realizatsiyasi tushumiga kirmaydi
      cost: 0,    // Tannarx hisoblanmaydi (chunki tovar chiqarilganda hisoblangan)
      profit: 0,
      grossProfit: 0,
      cashReceipt: collectedAmount, // Faqat haqiqiy kassa kirimi
      cashSales: isCard ? 0 : collectedAmount,
      cardSales: isCard ? collectedAmount : 0,
      isLoss: false,
      isProfit: false,
      qty: 0,     // Tovar sotuvi soniga kirmaydi
      unitCost: 0,
      isReturned: false,
      isDebtCollection: true,
      isInstallmentContract: false,
      costStatus: 'not_applicable',
      profitStatus: 'not_applicable'
    };
  }

  // 3. Haqiqiy tovar savdosi (Merchandise Sale)
  const isContract = isInstallmentContractSale(sale);
  const qty = Number(sale.qty) || 1;
  const revenue = Number(sale.total) !== undefined && !isNaN(Number(sale.total))
    ? Number(sale.total)
    : (Number(sale.price) || 0) * qty;

  // MUHIM: Muddatli savdo shartnomasida umumiy summa (masalan 6 000 000 so‘m) tovar realizatsiyasi hisoblanadi,
  // lekin kassa kirimi ZERO (0). Kassa kirimi faqat haqiqiy qabul qilingan boshlang‘ich va keyingi to‘lovlardan hisoblanadi!
  let cashReceipt = 0;
  let cashSales = 0;
  let cardSales = 0;

  if (!isContract && sale.paymentType !== 'Nasiya') {
    if (sale.paymentType === 'Karta') {
      cashReceipt = revenue;
      cardSales = revenue;
    } else {
      // 'Naqd' yoki sukut bo'yicha
      cashReceipt = revenue;
      cashSales = revenue;
    }
  }

  // Tannarx snapshotini tekshirish (Tarixiy savdo paytidagi snapshot)
  let unitCost = null;
  let costStatus = 'unknown';

  if (sale.costPrice !== undefined && sale.costPrice !== null && !isNaN(Number(sale.costPrice)) && Number(sale.costPrice) >= 0) {
    unitCost = Number(sale.costPrice);
    costStatus = 'exact';
  } else if (sale.cost !== undefined && sale.cost !== null && !isNaN(Number(sale.cost)) && Number(sale.cost) >= 0) {
    unitCost = qty > 0 ? Number(sale.cost) / qty : Number(sale.cost);
    costStatus = 'exact';
  } else {
    // Tarixiy sotuvda tannarx snapshot bo'lmagan bo'lsa, uni bugungi katalog narxi bilan
    // almashtirib yuborish taqiqlanadi (tarixiy hisobot xavfsizligi va audit yaxlitligi)
    unitCost = null;
    costStatus = 'unknown';
  }

  let cost = null;
  let profit = null;
  let isLoss = false;
  let isProfit = false;
  let profitStatus = 'unknown';

  if (costStatus === 'exact') {
    cost = Math.round(unitCost * qty);
    profit = revenue - cost;
    isLoss = profit < 0;
    isProfit = profit >= 0;
    profitStatus = 'exact';
  } else {
    // Tannarxi noma'lum bo'lsa, foyda noma'lum qoladi (0 yoki 100% deb soxtalashtirilmaydi)
    cost = null;
    profit = null;
    isLoss = false;
    isProfit = false;
    profitStatus = 'unknown';
  }

  // Faqat ma'lumot uchun ehtimoliy indikator (rasmiy hisobga kiritilmaydi)
  const salePrice = Number(sale.price) || (qty > 0 ? revenue / qty : 0);
  const estimatedUnitCost = Math.round(salePrice * 0.72);
  const estimatedCost = Math.round(estimatedUnitCost * qty);
  const estimatedProfit = revenue - estimatedCost;

  return {
    revenue,
    cost,
    profit,
    grossProfit: profit,
    cashReceipt,
    cashSales,
    cardSales,
    isLoss,
    isProfit,
    qty,
    unitCost,
    isReturned: false,
    isDebtCollection: false,
    isInstallmentContract: isContract,
    costStatus,
    profitStatus,
    estimatedCost,
    estimatedProfit
  };
};

/**
 * Aggregates a list of sales into overall financial summary.
 * Strictly distinguishes merchandise revenue, cash receipts, and audited gross profit.
 *
 * @param {Array} salesList
 * @param {Array} productsList
 * @param {string} maxDateStr - Maximum allowed date (defaults to today)
 * @returns {Object} Summary metrics
 */
export const aggregateSalesFinancials = (salesList = [], productsList = [], maxDateStr = null) => {
  const todayStr = maxDateStr || getLocalDateString();

  if (!Array.isArray(salesList) || salesList.length === 0) {
    return {
      revenue: 0,
      merchandiseRevenue: 0,
      cashReceipts: 0,
      cashSales: 0,
      cardSales: 0,
      cost: 0,
      auditedCost: 0,
      profit: 0,
      grossProfit: 0,
      auditedGrossProfit: 0,
      unverifiedRevenue: 0,
      unverifiedCount: 0,
      isLoss: false,
      isZero: true,
      isProfit: false,
      margin: null,
      marginStr: '—',
      count: 0,
      itemsSold: 0,
      collectionsCount: 0,
      collectionsAmount: 0,
      avgCheck: 0,
      hasUnverifiedCosts: false
    };
  }

  let totalMerchandiseRevenue = 0;
  let totalCashReceipts = 0;
  let totalCashSales = 0;
  let totalCardSales = 0;
  let totalAuditedCost = 0;
  let totalAuditedRevenue = 0;
  let totalAuditedProfit = 0;
  let totalUnverifiedRevenue = 0;
  let unverifiedSalesCount = 0;
  let validSalesCount = 0;
  let totalItemsSold = 0;
  let totalCollectionsCount = 0;
  let totalCollectionsAmount = 0;

  for (const sale of salesList) {
    if (!sale) continue;
    // Kelajak sanalarini hisobga olmaslik
    const sDate = sale.date || todayStr;
    if (sDate > todayStr) continue;

    // Qaytarilgan savdolarni hisobdan chiqarish
    if (isReturnedSale(sale)) continue;

    const fin = getSaleFinancials(sale, productsList);

    if (fin.isDebtCollection) {
      // Qarz yoki muddatli to'lov badali
      totalCashReceipts += fin.cashReceipt;
      totalCashSales += (fin.cashSales || 0);
      totalCardSales += (fin.cardSales || 0);
      totalCollectionsCount += 1;
      totalCollectionsAmount += fin.cashReceipt;
      continue;
    }

    // Haqiqiy tovar savdosi (Oddiy yoki Muddatli shartnoma)
    totalMerchandiseRevenue += fin.revenue;
    totalCashReceipts += fin.cashReceipt;
    totalCashSales += (fin.cashSales || 0);
    totalCardSales += (fin.cardSales || 0);
    validSalesCount += 1;
    totalItemsSold += fin.qty;

    if (fin.costStatus === 'exact') {
      totalAuditedRevenue += fin.revenue;
      totalAuditedCost += (fin.cost || 0);
      totalAuditedProfit += (fin.profit || 0);
    } else {
      totalUnverifiedRevenue += fin.revenue;
      unverifiedSalesCount += 1;
    }
  }

  const isLoss = totalAuditedProfit < 0;
  const isZero = totalAuditedProfit === 0;
  const isProfit = totalAuditedProfit > 0;
  const margin = totalAuditedRevenue > 0
    ? (totalAuditedProfit / totalAuditedRevenue) * 100
    : null;
  const avgCheck = validSalesCount > 0 ? Math.round(totalMerchandiseRevenue / validSalesCount) : 0;

  let marginStr = '—';
  if (margin !== null) {
    if (margin === 0) {
      marginStr = '0.0%';
    } else {
      const absMargin = Math.abs(margin);
      const sign = margin < 0 ? '-' : '+';
      if (absMargin >= 1000) {
        marginStr = `${sign}${Math.round(absMargin).toLocaleString('uz-UZ')}%`;
      } else {
        marginStr = `${sign}${absMargin.toFixed(1)}%`;
      }
    }
  }

  return {
    revenue: totalMerchandiseRevenue,
    merchandiseRevenue: totalMerchandiseRevenue,
    cashReceipts: totalCashReceipts,
    cashSales: totalCashSales,
    cardSales: totalCardSales,
    cost: totalAuditedCost,
    auditedCost: totalAuditedCost,
    profit: totalAuditedProfit,
    grossProfit: totalAuditedProfit,
    auditedGrossProfit: totalAuditedProfit,
    unverifiedRevenue: totalUnverifiedRevenue,
    unverifiedCount: unverifiedSalesCount,
    isLoss,
    isZero,
    isProfit,
    margin,
    marginStr,
    count: validSalesCount,
    itemsSold: totalItemsSold,
    collectionsCount: totalCollectionsCount,
    collectionsAmount: totalCollectionsAmount,
    avgCheck,
    hasUnverifiedCosts: unverifiedSalesCount > 0
  };
};

/**
 * Calculates product profitability for inventory items.
 *
 * @param {Object} product
 * @returns {Object}
 */
export const calculateProductProfitability = (product) => {
  if (!product) {
    return { price: 0, cost: null, unitProfit: null, isLoss: false, margin: '0.0', costStatus: 'unknown' };
  }
  const price = Number(product.price) || 0;
  const hasCost = product.costPrice !== undefined && product.costPrice !== null && !isNaN(Number(product.costPrice)) && Number(product.costPrice) >= 0;

  if (hasCost) {
    const cost = Number(product.costPrice);
    const unitProfit = price - cost;
    const isLoss = unitProfit < 0;
    const margin = price > 0 ? ((unitProfit / price) * 100).toFixed(1) : '0.0';
    return {
      price,
      cost,
      unitProfit,
      isLoss,
      margin,
      costStatus: 'exact'
    };
  }

  return {
    price,
    cost: null,
    unitProfit: null,
    isLoss: false,
    margin: null,
    costStatus: 'unknown',
    estimatedCost: Math.round(price * 0.72)
  };
};

/**
 * Universal Y-axis and chart tick formatter.
 * Formats numbers into clean, human-readable representations:
 * - 0 => '0'
 * - 500 => '500'
 * - 1 000 => '1k'
 * - 25 000 => '25k'
 * - 696 969 => '697k'
 * - 1 000 000 => '1M'
 * - 1 500 000 => '1.5M'
 * - 696 969 000 => '697M' (NEVER '696969k' or '696969000')
 * - 1 000 000 000 => '1B'
 * - Negative values format symmetrically with a leading '-':
 *   -698 972 727 => '-699M' (NEVER '-698000k' or '696969k')
 *
 * @param {number|string} val
 * @returns {string}
 */
export const formatChartAxisNumber = (val) => {
  if (val === 0 || val === '0') return '0';
  const num = Number(val);
  if (isNaN(num)) return '';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    const formatted = (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
    return `${sign}${formatted}B`;
  }
  if (abs >= 1_000_000) {
    const formatted = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${sign}${formatted}M`;
  }
  if (abs >= 1_000) {
    const formatted = (abs / 1_000).toFixed(1).replace(/\.0$/, '');
    return `${sign}${formatted}k`;
  }
  return `${sign}${Math.round(abs)}`;
};

/**
 * Calculates neat and proportional [yMin, yMax] domain limits for charts.
 * Guarantees:
 * 1. If all values are non-negative, yMin is strictly 0 (no wasted negative area).
 * 2. If negative values exist (e.g. gross loss), yMin expands to a clean negative power of 10.
 * 3. Grouped bars (savdo, xarajat, foyda) are all encompassed within the domain so bars never overflow.
 * 4. Empty or all-zero data returns a clean [0, fallbackMax] baseline.
 *
 * @param {Array} data - Array of chart data objects
 * @param {Array} keys - Numeric keys to evaluate, e.g. ['savdo', 'xarajat', 'foyda']
 * @param {number} fallbackMax - Default maximum when all data is 0
 * @returns {[number, number]} [yMin, yMax]
 */
export const computeChartDomain = (data = [], keys = ['savdo', 'xarajat', 'foyda'], fallbackMax = 100000) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [0, fallbackMax];
  }

  let maxVal = 0;
  let minVal = 0;

  for (const item of data) {
    if (!item) continue;
    for (const key of keys) {
      const v = Number(item[key]);
      if (!isNaN(v)) {
        if (v > maxVal) maxVal = v;
        if (v < minVal) minVal = v;
      }
    }
  }

  if (maxVal === 0 && minVal === 0) {
    return [0, fallbackMax];
  }

  let yMax = 0;
  if (maxVal > 0) {
    const exponent = Math.floor(Math.log10(maxVal));
    const power = Math.pow(10, exponent);
    const fraction = maxVal / power;
    let niceMultiplier;
    if (fraction <= 1) niceMultiplier = 1.25;
    else if (fraction <= 2) niceMultiplier = 2.5;
    else if (fraction <= 5) niceMultiplier = 6;
    else niceMultiplier = 10;
    yMax = Math.ceil(niceMultiplier * power);
  }

  let yMin = 0;
  if (minVal < 0) {
    const absMin = Math.abs(minVal);
    const exponent = Math.floor(Math.log10(absMin));
    const power = Math.pow(10, exponent);
    const fraction = absMin / power;
    let niceMultiplier;
    if (fraction <= 1) niceMultiplier = 1.25;
    else if (fraction <= 2) niceMultiplier = 2.5;
    else if (fraction <= 5) niceMultiplier = 6;
    else niceMultiplier = 10;
    yMin = -Math.ceil(niceMultiplier * power);
  }

  if (minVal >= 0) {
    yMin = 0;
  }
  if (maxVal <= 0) {
    yMax = 0;
  }

  return [yMin, yMax];
};

/**
 * Generates period-based financial chart data and comparison KPI cards
 * for Bugun, Hafta, Oy, and Yil using audited Gross Profit rules.
 *
 * @param {Array} sales
 * @param {Array} products
 * @param {Date} referenceDate
 * @returns {Object} Map of period data
 */
export const buildPeriodFinancialReports = (sales = [], products = [], referenceDate = new Date()) => {
  const now = referenceDate instanceof Date ? referenceDate : new Date();
  const todayStr = getLocalDateString(now);
  const currentHour = getTashkentHour(now);
  const currentYear = todayStr.substring(0, 4);
  const currentYearMonth = todayStr.substring(0, 7);
  const currentDayOfMonth = parseInt(todayStr.substring(8, 10), 10);
  const currentMonthNum = parseInt(todayStr.substring(5, 7), 10);

  // Filter valid sales (excluding returns and future dates only)
  const validSales = (Array.isArray(sales) ? sales : []).filter(s => {
    if (!s) return false;
    if (isReturnedSale(s)) return false;
    const sDate = s.date || todayStr;
    if (sDate > todayStr) return false;
    return true;
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. BUGUN: joriy kunning to'liq ma'lumotlari
  // ──────────────────────────────────────────────────────────────────────────
  const todaySales = validSales.filter(s => (s.date === todayStr || !s.date));
  const todayHours = [
    { label: '08:00', startHour: 8, endHour: 9 },
    { label: '10:00', startHour: 10, endHour: 11 },
    { label: '12:00', startHour: 12, endHour: 13 },
    { label: '14:00', startHour: 14, endHour: 15 },
    { label: '16:00', startHour: 16, endHour: 17 },
    { label: '18:00', startHour: 18, endHour: 19 },
    { label: '20:00', startHour: 20, endHour: 23 },
  ];

  const todayChartData = todayHours.map((slot) => {
    // Kelajak soatlar uchun grafikda qat'iy 0 ko'rsatiladi
    if (slot.startHour > currentHour) {
      return {
        label: slot.label,
        fullDate: `Bugun, ${slot.label}`,
        savdo: 0,
        foyda: 0,
        xarajat: 0,
        isLoss: false
      };
    }

    const slotSales = todaySales.filter(s => {
      const h = parseInt((s.time || '12:00').split(':')[0], 10);
      if (isNaN(h)) return slot.startHour === 12;
      if (slot.startHour === 8 && h < 8) return true;
      if (slot.startHour === 20 && h >= 20) return true;
      return h >= slot.startHour && h <= slot.endHour;
    });
    const slotFin = aggregateSalesFinancials(slotSales, products, todayStr);

    return {
      label: slot.label,
      fullDate: `Bugun, ${slot.label}`,
      savdo: slotFin.revenue,
      foyda: slotFin.grossProfit,
      xarajat: slotFin.cost,
      isLoss: slotFin.grossProfit < 0
    };
  });

  const todayFin = aggregateSalesFinancials(todaySales, products, todayStr);
  const todayRevTotal = todayFin.revenue;
  const todayCashTotal = todayFin.cashReceipts;
  const todayProfitTotal = todayFin.grossProfit;

  // Max for chart domain
  const [todayYMin, todayYMax] = computeChartDomain(todayChartData, ['savdo', 'xarajat', 'foyda'], 100000);

  // Yesterday sales for comparison
  const yesterdayStr = getOffsetDateString(-1, now);
  const yesterdaySales = validSales.filter(s => s.date === yesterdayStr);
  const yesterdayFin = aggregateSalesFinancials(yesterdaySales, products, yesterdayStr);
  const todayPrevRev = yesterdayFin.revenue;
  const todayPrevProfit = yesterdayFin.grossProfit;

  const todayGrowthMetrics = calculateGrowthMetrics(todayRevTotal, todayPrevRev);
  const todayProfitGrowthMetrics = calculateGrowthMetrics(todayProfitTotal, todayPrevProfit);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. HAFTA: Current week breakdown (Dushanba - Yakshanba, Asia/Tashkent)
  // ──────────────────────────────────────────────────────────────────────────
  const dayNames = ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'];
  const currentDayOfWeek = (now.getDay() + 6) % 7; // 0=Monday, 6=Sunday
  const weekStartStr = getOffsetDateString(-currentDayOfWeek, now);
  const weekEndStr = getOffsetDateString(6 - currentDayOfWeek, now);

  const weekDaysInfo = [];
  for (let i = 0; i < 7; i++) {
    const dStr = getOffsetDateString(i - currentDayOfWeek, now);
    const parts = dStr.split('-');
    const formattedDate = `${parts[2]}.${parts[1]}`;
    weekDaysInfo.push({
      label: dayNames[i],
      dateStr: dStr,
      fullDate: `${dayNames[i]}, ${formattedDate}`
    });
  }

  const weekChartData = weekDaysInfo.map(d => {
    // Kelajak kunlari uchun grafikda 0 ko'rsatiladi
    if (d.dateStr > todayStr) {
      return {
        label: d.label,
        fullDate: d.fullDate,
        savdo: 0,
        foyda: 0,
        xarajat: 0,
        isLoss: false
      };
    }

    const daySales = validSales.filter(s => (s.date || todayStr) === d.dateStr);
    const dayFin = aggregateSalesFinancials(daySales, products, todayStr);

    return {
      label: d.label,
      fullDate: d.fullDate,
      savdo: dayFin.revenue,
      foyda: dayFin.grossProfit,
      xarajat: dayFin.cost,
      isLoss: dayFin.grossProfit < 0
    };
  });

  const weekSalesList = validSales.filter(s => {
    const sDate = s.date || todayStr;
    return sDate >= weekStartStr && sDate <= weekEndStr;
  });
  const weekFin = aggregateSalesFinancials(weekSalesList, products, todayStr);
  const weekRevTotal = weekFin.revenue;
  const weekCashTotal = weekFin.cashReceipts;
  const weekProfitTotal = weekFin.grossProfit;

  // Previous week (like-for-like elapsed weekdays)
  const { prevWeekStartStr, prevWeekLikeEndStr } = getPreviousWeekLikeForLikeRange(now);
  const prevWeekSales = validSales.filter(s => {
    const sDate = s.date || todayStr;
    return sDate >= prevWeekStartStr && sDate <= prevWeekLikeEndStr;
  });
  const prevWeekFin = aggregateSalesFinancials(prevWeekSales, products, todayStr);
  const weekPrevRev = prevWeekFin.revenue;
  const weekPrevProfit = prevWeekFin.grossProfit;

  const weekGrowthMetrics = calculateGrowthMetrics(weekRevTotal, weekPrevRev);
  const weekProfitGrowthMetrics = calculateGrowthMetrics(weekProfitTotal, weekPrevProfit);

  const [weekYMin, weekYMax] = computeChartDomain(weekChartData, ['savdo', 'xarajat', 'foyda'], 100000);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. OY: Current month 4-interval breakdown (1-7, 8-14, 15-21, 22-oxiri)
  // ──────────────────────────────────────────────────────────────────────────
  const monthIntervals = [
    { label: '1-7', startDay: 1, endDay: 7 },
    { label: '8-14', startDay: 8, endDay: 14 },
    { label: '15-21', startDay: 15, endDay: 21 },
    { label: '22-oxiri', startDay: 22, endDay: 31 },
  ];

  const monthChartData = monthIntervals.map(inter => {
    // Kelajak oraliqlari uchun 0
    if (inter.startDay > currentDayOfMonth) {
      return {
        label: inter.label,
        fullDate: `${inter.label}-kunlar`,
        savdo: 0,
        foyda: 0,
        xarajat: 0,
        isLoss: false
      };
    }

    const interSales = validSales.filter(s => {
      const sDate = s.date || todayStr;
      if (!sDate.startsWith(currentYearMonth)) return false;
      const day = parseInt(sDate.split('-')[2], 10);
      return day >= inter.startDay && day <= inter.endDay;
    });
    const interFin = aggregateSalesFinancials(interSales, products, todayStr);

    return {
      label: inter.label,
      fullDate: `${inter.label}-kunlar`,
      savdo: interFin.revenue,
      foyda: interFin.grossProfit,
      xarajat: interFin.cost,
      isLoss: interFin.grossProfit < 0
    };
  });

  const monthSalesList = validSales.filter(s => (s.date || todayStr).startsWith(currentYearMonth));
  const monthFin = aggregateSalesFinancials(monthSalesList, products, todayStr);
  const monthRevTotal = monthFin.revenue;
  const monthCashTotal = monthFin.cashReceipts;
  const monthProfitTotal = monthFin.grossProfit;

  // Previous month (like-for-like elapsed days of month)
  const prevMonthRange = getPreviousMonthLikeForLikeRange(now);
  const prevMonthSales = validSales.filter(s => {
    const sDate = s.date || todayStr;
    return sDate >= prevMonthRange.prevMonthStartStr && sDate <= prevMonthRange.prevMonthLikeEndStr;
  });
  const prevMonthFin = aggregateSalesFinancials(prevMonthSales, products, todayStr);
  const monthPrevRev = prevMonthFin.revenue;
  const monthPrevProfit = prevMonthFin.grossProfit;

  const monthGrowthMetrics = calculateGrowthMetrics(monthRevTotal, monthPrevRev);
  const monthProfitGrowthMetrics = calculateGrowthMetrics(monthProfitTotal, monthPrevProfit);

  const [monthYMin, monthYMax] = computeChartDomain(monthChartData, ['savdo', 'xarajat', 'foyda'], 500000);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. YIL: 12-month breakdown (Yan - Dek)
  // ──────────────────────────────────────────────────────────────────────────
  const monthShortNames = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
  const yearChartData = monthShortNames.map((mName, idx) => {
    const monthNum = idx + 1;
    // Kelajak oylari uchun 0
    if (monthNum > currentMonthNum) {
      return {
        label: mName,
        fullDate: `${mName} ${currentYear}`,
        savdo: 0,
        foyda: 0,
        xarajat: 0,
        isLoss: false
      };
    }

    const monthStr = String(monthNum).padStart(2, '0');
    const targetPrefix = `${currentYear}-${monthStr}`;
    const mSales = validSales.filter(s => (s.date || todayStr).startsWith(targetPrefix));
    const mFin = aggregateSalesFinancials(mSales, products, todayStr);

    return {
      label: mName,
      fullDate: `${mName} ${currentYear}`,
      savdo: mFin.revenue,
      foyda: mFin.grossProfit,
      xarajat: mFin.cost,
      isLoss: mFin.grossProfit < 0
    };
  });

  const yearSalesList = validSales.filter(s => (s.date || todayStr).startsWith(currentYear));
  const yearFin = aggregateSalesFinancials(yearSalesList, products, todayStr);
  const yearRevTotal = yearFin.revenue;
  const yearCashTotal = yearFin.cashReceipts;
  const yearProfitTotal = yearFin.grossProfit;

  // Previous year (like-for-like Year-to-Date)
  const prevYearRange = getPreviousYearLikeForLikeRange(now);
  const prevYearSales = validSales.filter(s => {
    const sDate = s.date || todayStr;
    return sDate >= prevYearRange.prevYearStartStr && sDate <= prevYearRange.prevYearLikeEndStr;
  });
  const prevYearFin = aggregateSalesFinancials(prevYearSales, products, todayStr);
  const yearPrevRev = prevYearFin.revenue;
  const yearPrevProfit = prevYearFin.grossProfit;

  const yearGrowthMetrics = calculateGrowthMetrics(yearRevTotal, yearPrevRev);
  const yearProfitGrowthMetrics = calculateGrowthMetrics(yearProfitTotal, yearPrevProfit);

  const [yearYMin, yearYMax] = computeChartDomain(yearChartData, ['savdo', 'xarajat', 'foyda'], 5000000);

  return {
    'Bugun': {
      salesList: todaySales,
      merchandiseSales: todaySales.filter(s => !isDebtCollectionSale(s)),
      currentRevenue: todayRevTotal,
      cashReceipts: todayCashTotal,
      cashSales: todayFin.cashSales,
      cardSales: todayFin.cardSales,
      previousRevenue: todayPrevRev,
      cost: todayFin.cost,
      growthPct: todayGrowthMetrics.badgeText,
      profitGrowthPct: todayProfitGrowthMetrics.badgeText,
      growthMetrics: todayGrowthMetrics,
      profitGrowthMetrics: todayProfitGrowthMetrics,
      salesCount: todayFin.count,
      itemsSold: todayFin.itemsSold,
      profit: todayProfitTotal,
      grossProfit: todayProfitTotal,
      previousProfit: todayPrevProfit,
      isLoss: todayFin.isLoss,
      isZero: todayFin.isZero ?? (todayProfitTotal === 0),
      isProfit: todayFin.isProfit ?? (todayProfitTotal > 0),
      profitMargin: todayFin.marginStr,
      chartData: todayChartData,
      yAxisMin: todayYMin,
      yAxisMax: todayYMax,
      hasUnverifiedCosts: todayFin.hasUnverifiedCosts,
      unverifiedRevenue: todayFin.unverifiedRevenue,
      unverifiedCount: todayFin.unverifiedCount,
      formatY: formatChartAxisNumber
    },
    'Hafta': {
      salesList: weekSalesList,
      merchandiseSales: weekSalesList.filter(s => !isDebtCollectionSale(s)),
      currentRevenue: weekRevTotal,
      cashReceipts: weekCashTotal,
      cashSales: weekFin.cashSales,
      cardSales: weekFin.cardSales,
      previousRevenue: weekPrevRev,
      cost: weekFin.cost,
      growthPct: weekGrowthMetrics.badgeText,
      profitGrowthPct: weekProfitGrowthMetrics.badgeText,
      growthMetrics: weekGrowthMetrics,
      profitGrowthMetrics: weekProfitGrowthMetrics,
      salesCount: weekFin.count,
      itemsSold: weekFin.itemsSold,
      profit: weekProfitTotal,
      grossProfit: weekProfitTotal,
      previousProfit: weekPrevProfit,
      isLoss: weekFin.isLoss,
      isZero: weekFin.isZero ?? (weekProfitTotal === 0),
      isProfit: weekFin.isProfit ?? (weekProfitTotal > 0),
      profitMargin: weekFin.marginStr,
      chartData: weekChartData,
      yAxisMin: weekYMin,
      yAxisMax: weekYMax,
      hasUnverifiedCosts: weekFin.hasUnverifiedCosts,
      unverifiedRevenue: weekFin.unverifiedRevenue,
      unverifiedCount: weekFin.unverifiedCount,
      formatY: formatChartAxisNumber
    },
    'Oy': {
      salesList: monthSalesList,
      merchandiseSales: monthSalesList.filter(s => !isDebtCollectionSale(s)),
      currentRevenue: monthRevTotal,
      cashReceipts: monthCashTotal,
      cashSales: monthFin.cashSales,
      cardSales: monthFin.cardSales,
      previousRevenue: monthPrevRev,
      cost: monthFin.cost,
      growthPct: monthGrowthMetrics.badgeText,
      profitGrowthPct: monthProfitGrowthMetrics.badgeText,
      growthMetrics: monthGrowthMetrics,
      profitGrowthMetrics: monthProfitGrowthMetrics,
      salesCount: monthFin.count,
      itemsSold: monthFin.itemsSold,
      profit: monthProfitTotal,
      grossProfit: monthProfitTotal,
      previousProfit: monthPrevProfit,
      isLoss: monthFin.isLoss,
      isZero: monthFin.isZero ?? (monthProfitTotal === 0),
      isProfit: monthFin.isProfit ?? (monthProfitTotal > 0),
      profitMargin: monthFin.marginStr,
      chartData: monthChartData,
      yAxisMin: monthYMin,
      yAxisMax: monthYMax,
      hasUnverifiedCosts: monthFin.hasUnverifiedCosts,
      unverifiedRevenue: monthFin.unverifiedRevenue,
      unverifiedCount: monthFin.unverifiedCount,
      formatY: formatChartAxisNumber
    },
    'Yil': {
      salesList: yearSalesList,
      merchandiseSales: yearSalesList.filter(s => !isDebtCollectionSale(s)),
      currentRevenue: yearRevTotal,
      cashReceipts: yearCashTotal,
      cashSales: yearFin.cashSales,
      cardSales: yearFin.cardSales,
      previousRevenue: yearPrevRev,
      cost: yearFin.cost,
      growthPct: yearGrowthMetrics.badgeText,
      profitGrowthPct: yearProfitGrowthMetrics.badgeText,
      growthMetrics: yearGrowthMetrics,
      profitGrowthMetrics: yearProfitGrowthMetrics,
      salesCount: yearFin.count,
      itemsSold: yearFin.itemsSold,
      profit: yearProfitTotal,
      grossProfit: yearProfitTotal,
      previousProfit: yearPrevProfit,
      isLoss: yearFin.isLoss,
      isZero: yearFin.isZero ?? (yearProfitTotal === 0),
      isProfit: yearFin.isProfit ?? (yearProfitTotal > 0),
      profitMargin: yearFin.marginStr,
      chartData: yearChartData,
      yAxisMin: yearYMin,
      yAxisMax: yearYMax,
      hasUnverifiedCosts: yearFin.hasUnverifiedCosts,
      unverifiedRevenue: yearFin.unverifiedRevenue,
      unverifiedCount: yearFin.unverifiedCount,
      formatY: formatChartAxisNumber
    }
  };
};

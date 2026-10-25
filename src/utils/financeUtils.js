import { getLocalDateString, getOffsetDateString } from './dateUtils.js';

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

  // Tannarx snapshotini tekshirish
  let unitCost = null;
  let costStatus = 'unknown';

  if (sale.costPrice !== undefined && sale.costPrice !== null && !isNaN(Number(sale.costPrice)) && Number(sale.costPrice) >= 0) {
    unitCost = Number(sale.costPrice);
    costStatus = 'exact';
  } else {
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
      isProfit: false,
      margin: 0,
      marginStr: '0.0%',
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
  const margin = totalAuditedRevenue > 0 ? (totalAuditedProfit / totalAuditedRevenue) * 100 : 0;
  const avgCheck = validSalesCount > 0 ? Math.round(totalMerchandiseRevenue / validSalesCount) : 0;

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
    isProfit: !isLoss,
    margin,
    marginStr: `${margin.toFixed(1)}%`,
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
  const currentHour = now.getHours();
  const currentDayOfMonth = now.getDate();
  const currentMonthNum = now.getMonth() + 1; // 1-12
  const currentYear = todayStr.substring(0, 4);
  const currentYearMonth = todayStr.substring(0, 7);

  // Filter valid sales up to today (excluding future dates, future hours of today, and returns)
  const validSales = (Array.isArray(sales) ? sales : []).filter(s => {
    if (!s) return false;
    const sDate = s.date || todayStr;
    if (sDate > todayStr) return false;
    if (sDate === todayStr && s.time) {
      const h = parseInt(s.time.split(':')[0], 10);
      if (!isNaN(h) && h > currentHour) return false;
    }
    return !isReturnedSale(s);
  });

  const todaySales = validSales.filter(s => (s.date === todayStr || !s.date));

  // ──────────────────────────────────────────────────────────────────────────
  // 1. BUGUN: hourly breakdown
  // ──────────────────────────────────────────────────────────────────────────
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
    const isFutureSlot = currentHour < slot.startHour;
    let savdo = 0;
    let foyda = 0;
    let xarajat = 0;

    if (!isFutureSlot) {
      const slotSales = todaySales.filter(s => {
        const h = parseInt((s.time || '12:00').split(':')[0], 10);
        return h >= slot.startHour && h <= slot.endHour && h <= currentHour;
      });
      const slotFin = aggregateSalesFinancials(slotSales, products, todayStr);
      savdo = slotFin.revenue;
      foyda = slotFin.grossProfit;
      xarajat = slotFin.cost;
    }

    return {
      label: slot.label,
      fullDate: `Bugun, ${slot.label}`,
      savdo,
      foyda,
      xarajat,
      isLoss: foyda < 0
    };
  });

  const todayFin = aggregateSalesFinancials(todaySales, products, todayStr);
  const todayRevTotal = todayFin.revenue;
  const todayCashTotal = todayFin.cashReceipts;
  const todayProfitTotal = todayFin.grossProfit;

  // Max for chart domain
  const todayMaxVal = Math.max(...todayChartData.map(d => Math.max(d.savdo, d.foyda)), 100000);
  const todayMinVal = Math.min(0, ...todayChartData.map(d => d.foyda));
  const todayYMax = Math.ceil((todayMaxVal * 1.25) / 100000) * 100000;
  const todayYMin = todayMinVal < 0 ? Math.floor(todayMinVal / 50000) * 50000 : 0;

  // Yesterday sales for comparison
  const yesterdayStr = getOffsetDateString(-1, now);
  const yesterdaySales = validSales.filter(s => s.date === yesterdayStr);
  const yesterdayFin = aggregateSalesFinancials(yesterdaySales, products, yesterdayStr);
  const todayPrevRev = yesterdayFin.revenue;
  const todayPrevProfit = yesterdayFin.grossProfit;

  const calcGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? '+100' : '0';
    return (((current - previous) / Math.abs(previous)) * 100).toFixed(1);
  };

  const todayGrowth = calcGrowth(todayRevTotal, todayPrevRev);
  const todayProfitGrowth = calcGrowth(todayProfitTotal, todayPrevProfit);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. HAFTA: Current week breakdown (Dush - Yak)
  // ──────────────────────────────────────────────────────────────────────────
  const dayNames = ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'];
  const currentDayOfWeek = (now.getDay() + 6) % 7; // 0=Monday, 6=Sunday
  const monday = new Date(now);
  monday.setDate(now.getDate() - currentDayOfWeek);
  monday.setHours(0, 0, 0, 0);

  const weekDaysInfo = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dStr = getLocalDateString(d);
    const parts = dStr.split('-');
    const formattedDate = `${parts[2]}.${parts[1]}`;
    weekDaysInfo.push({
      label: dayNames[i],
      dateStr: dStr,
      fullDate: `${dayNames[i]}, ${formattedDate}`,
      isFuture: dStr > todayStr
    });
  }

  const weekChartData = weekDaysInfo.map(d => {
    let savdo = 0;
    let foyda = 0;
    let xarajat = 0;

    if (!d.isFuture) {
      const daySales = validSales.filter(s => (s.date || todayStr) === d.dateStr);
      const dayFin = aggregateSalesFinancials(daySales, products, todayStr);
      savdo = dayFin.revenue;
      foyda = dayFin.grossProfit;
      xarajat = dayFin.cost;
    }

    return {
      label: d.label,
      fullDate: d.fullDate,
      savdo,
      foyda,
      xarajat,
      isLoss: foyda < 0
    };
  });

  const weekSalesList = validSales.filter(s => {
    const sDate = s.date || todayStr;
    return weekDaysInfo.some(w => !w.isFuture && w.dateStr === sDate);
  });
  const weekFin = aggregateSalesFinancials(weekSalesList, products, todayStr);
  const weekRevTotal = weekFin.revenue;
  const weekCashTotal = weekFin.cashReceipts;
  const weekProfitTotal = weekFin.grossProfit;

  // Previous week (7 days before Monday)
  const prevWeekMonday = new Date(monday);
  prevWeekMonday.setDate(prevWeekMonday.getDate() - 7);
  const prevWeekDays = [];
  for (let i = 0; i < 7; i++) {
    const pd = new Date(prevWeekMonday);
    pd.setDate(prevWeekMonday.getDate() + i);
    prevWeekDays.push(getLocalDateString(pd));
  }
  const prevWeekSales = validSales.filter(s => prevWeekDays.includes(s.date));
  const prevWeekFin = aggregateSalesFinancials(prevWeekSales, products, todayStr);
  const weekPrevRev = prevWeekFin.revenue;
  const weekPrevProfit = prevWeekFin.grossProfit;

  const weekGrowth = calcGrowth(weekRevTotal, weekPrevRev);
  const weekProfitGrowth = calcGrowth(weekProfitTotal, weekPrevProfit);

  const weekMaxVal = Math.max(...weekChartData.map(d => Math.max(d.savdo, d.foyda)), 100000);
  const weekMinVal = Math.min(0, ...weekChartData.map(d => d.foyda));
  const weekYMax = Math.ceil((weekMaxVal * 1.25) / 100000) * 100000;
  const weekYMin = weekMinVal < 0 ? Math.floor(weekMinVal / 50000) * 50000 : 0;

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
    const isFutureInterval = currentDayOfMonth < inter.startDay;
    let savdo = 0;
    let foyda = 0;
    let xarajat = 0;

    if (!isFutureInterval) {
      const interSales = validSales.filter(s => {
        const sDate = s.date || todayStr;
        if (!sDate.startsWith(currentYearMonth)) return false;
        const day = parseInt(sDate.split('-')[2], 10);
        return day >= inter.startDay && day <= Math.min(inter.endDay, currentDayOfMonth);
      });
      const interFin = aggregateSalesFinancials(interSales, products, todayStr);
      savdo = interFin.revenue;
      foyda = interFin.grossProfit;
      xarajat = interFin.cost;
    }

    return {
      label: inter.label,
      fullDate: `${inter.label}-kunlar`,
      savdo,
      foyda,
      xarajat,
      isLoss: foyda < 0
    };
  });

  const monthSalesList = validSales.filter(s => (s.date || todayStr).startsWith(currentYearMonth));
  const monthFin = aggregateSalesFinancials(monthSalesList, products, todayStr);
  const monthRevTotal = monthFin.revenue;
  const monthCashTotal = monthFin.cashReceipts;
  const monthProfitTotal = monthFin.grossProfit;

  // Previous month
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYearMonth = getLocalDateString(prevMonthDate).substring(0, 7);
  const prevMonthSales = validSales.filter(s => (s.date || todayStr).startsWith(prevYearMonth));
  const prevMonthFin = aggregateSalesFinancials(prevMonthSales, products, todayStr);
  const monthPrevRev = prevMonthFin.revenue;
  const monthPrevProfit = prevMonthFin.grossProfit;

  const monthGrowth = calcGrowth(monthRevTotal, monthPrevRev);
  const monthProfitGrowth = calcGrowth(monthProfitTotal, monthPrevProfit);

  const monthMaxVal = Math.max(...monthChartData.map(d => Math.max(d.savdo, d.foyda)), 1000000);
  const monthMinVal = Math.min(0, ...monthChartData.map(d => d.foyda));
  const monthYMax = Math.ceil((monthMaxVal * 1.25) / 500000) * 500000;
  const monthYMin = monthMinVal < 0 ? Math.floor(monthMinVal / 500000) * 500000 : 0;

  // ──────────────────────────────────────────────────────────────────────────
  // 4. YIL: 12-month breakdown (Yan - Dek)
  // ──────────────────────────────────────────────────────────────────────────
  const monthShortNames = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
  const yearChartData = monthShortNames.map((mName, idx) => {
    const monthNum = idx + 1;
    const isFutureMonth = monthNum > currentMonthNum;
    let savdo = 0;
    let foyda = 0;
    let xarajat = 0;

    if (!isFutureMonth) {
      const monthStr = String(monthNum).padStart(2, '0');
      const targetPrefix = `${currentYear}-${monthStr}`;
      const mSales = validSales.filter(s => (s.date || todayStr).startsWith(targetPrefix));
      const mFin = aggregateSalesFinancials(mSales, products, todayStr);
      savdo = mFin.revenue;
      foyda = mFin.grossProfit;
      xarajat = mFin.cost;
    }

    return {
      label: mName,
      fullDate: `${mName} ${currentYear}`,
      savdo,
      foyda,
      xarajat,
      isLoss: foyda < 0
    };
  });

  const yearSalesList = validSales.filter(s => (s.date || todayStr).startsWith(currentYear));
  const yearFin = aggregateSalesFinancials(yearSalesList, products, todayStr);
  const yearRevTotal = yearFin.revenue;
  const yearCashTotal = yearFin.cashReceipts;
  const yearProfitTotal = yearFin.grossProfit;

  // Previous year
  const prevYear = String(Number(currentYear) - 1);
  const prevYearSales = validSales.filter(s => (s.date || todayStr).startsWith(prevYear));
  const prevYearFin = aggregateSalesFinancials(prevYearSales, products, todayStr);
  const yearPrevRev = prevYearFin.revenue;
  const yearPrevProfit = prevYearFin.grossProfit;

  const yearGrowth = calcGrowth(yearRevTotal, yearPrevRev);
  const yearProfitGrowth = calcGrowth(yearProfitTotal, yearPrevProfit);

  const yearMaxVal = Math.max(...yearChartData.map(d => Math.max(d.savdo, d.foyda)), 10000000);
  const yearMinVal = Math.min(0, ...yearChartData.map(d => d.foyda));
  const yearYMax = Math.ceil((yearMaxVal * 1.25) / 5000000) * 5000000;
  const yearYMin = yearMinVal < 0 ? Math.floor(yearMinVal / 5000000) * 5000000 : 0;

  return {
    'Bugun': {
      currentRevenue: todayRevTotal,
      cashReceipts: todayCashTotal,
      cashSales: todayFin.cashSales,
      cardSales: todayFin.cardSales,
      previousRevenue: todayPrevRev,
      cost: todayFin.cost,
      growthPct: `${Number(todayGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(todayGrowth))}%`,
      profitGrowthPct: `${Number(todayProfitGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(todayProfitGrowth))}%`,
      salesCount: todayFin.count,
      itemsSold: todayFin.itemsSold,
      profit: todayProfitTotal,
      grossProfit: todayProfitTotal,
      previousProfit: todayPrevProfit,
      isLoss: todayFin.isLoss,
      profitMargin: todayFin.marginStr,
      chartData: todayChartData,
      yAxisMin: todayYMin,
      yAxisMax: todayYMax,
      hasUnverifiedCosts: todayFin.hasUnverifiedCosts,
      unverifiedRevenue: todayFin.unverifiedRevenue,
      unverifiedCount: todayFin.unverifiedCount,
      formatY: (val) => val >= 1000000 ? `${(val / 1000000).toFixed(1).replace('.0', '')}M` : `${Math.round(val / 1000)}k`
    },
    'Hafta': {
      currentRevenue: weekRevTotal,
      cashReceipts: weekCashTotal,
      cashSales: weekFin.cashSales,
      cardSales: weekFin.cardSales,
      previousRevenue: weekPrevRev,
      cost: weekFin.cost,
      growthPct: `${Number(weekGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(weekGrowth))}%`,
      profitGrowthPct: `${Number(weekProfitGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(weekProfitGrowth))}%`,
      salesCount: weekFin.count,
      itemsSold: weekFin.itemsSold,
      profit: weekProfitTotal,
      grossProfit: weekProfitTotal,
      previousProfit: weekPrevProfit,
      isLoss: weekFin.isLoss,
      profitMargin: weekFin.marginStr,
      chartData: weekChartData,
      yAxisMin: weekYMin,
      yAxisMax: weekYMax,
      hasUnverifiedCosts: weekFin.hasUnverifiedCosts,
      unverifiedRevenue: weekFin.unverifiedRevenue,
      unverifiedCount: weekFin.unverifiedCount,
      formatY: (val) => val >= 1000000 ? `${(val / 1000000).toFixed(1).replace('.0', '')}M` : `${Math.round(val / 1000)}k`
    },
    'Oy': {
      currentRevenue: monthRevTotal,
      cashReceipts: monthCashTotal,
      cashSales: monthFin.cashSales,
      cardSales: monthFin.cardSales,
      previousRevenue: monthPrevRev,
      cost: monthFin.cost,
      growthPct: `${Number(monthGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(monthGrowth))}%`,
      profitGrowthPct: `${Number(monthProfitGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(monthProfitGrowth))}%`,
      salesCount: monthFin.count,
      itemsSold: monthFin.itemsSold,
      profit: monthProfitTotal,
      grossProfit: monthProfitTotal,
      previousProfit: monthPrevProfit,
      isLoss: monthFin.isLoss,
      profitMargin: monthFin.marginStr,
      chartData: monthChartData,
      yAxisMin: monthYMin,
      yAxisMax: monthYMax,
      hasUnverifiedCosts: monthFin.hasUnverifiedCosts,
      unverifiedRevenue: monthFin.unverifiedRevenue,
      unverifiedCount: monthFin.unverifiedCount,
      formatY: (val) => `${(val / 1000000).toFixed(1).replace('.0', '')}M`
    },
    'Yil': {
      currentRevenue: yearRevTotal,
      cashReceipts: yearCashTotal,
      cashSales: yearFin.cashSales,
      cardSales: yearFin.cardSales,
      previousRevenue: yearPrevRev,
      cost: yearFin.cost,
      growthPct: `${Number(yearGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(yearGrowth))}%`,
      profitGrowthPct: `${Number(yearProfitGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(yearProfitGrowth))}%`,
      salesCount: yearFin.count,
      itemsSold: yearFin.itemsSold,
      profit: yearProfitTotal,
      grossProfit: yearProfitTotal,
      previousProfit: yearPrevProfit,
      isLoss: yearFin.isLoss,
      profitMargin: yearFin.marginStr,
      chartData: yearChartData,
      yAxisMin: yearYMin,
      yAxisMax: yearYMax,
      hasUnverifiedCosts: yearFin.hasUnverifiedCosts,
      unverifiedRevenue: yearFin.unverifiedRevenue,
      unverifiedCount: yearFin.unverifiedCount,
      formatY: (val) => `${(val / 1000000).toFixed(0)}M`
    }
  };
};

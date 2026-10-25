// src/pages/Reports.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Layers,
  Calendar,
  Wallet,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  User,
  ShoppingBag,
  Building
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalDateString, getOffsetDateString, isToday } from '../utils/dateUtils';

export const Reports = () => {
  const {
    storeConfig,
    stats,
    products = [],
    debts = [],
    sales = [],
    currentStore,
    isEmployee,
    isDebtsAllowed,
    isInstallmentAllowed,
    installments = []
  } = useStore();
  const { t, tProduct, tCategory, tUnit } = useLanguage();
  const [activeReportTab, setActiveReportTab] = useState('sales'); // 'sales' | 'profit' | 'inventory' | 'debt' | 'installments'
  const [timeFilter, setTimeFilter] = useState('Bugun'); // 'Bugun' | 'Hafta' | 'Oy' | 'Yil'

  useEffect(() => {
    if (activeReportTab === 'debt' && !isDebtsAllowed) {
      setActiveReportTab('sales');
    }
    if (activeReportTab === 'installments' && !isInstallmentAllowed) {
      setActiveReportTab('sales');
    }
  }, [activeReportTab, isDebtsAllowed, isInstallmentAllowed]);


  // Store revenue scale based on product prices
  const storeRevenueScale = useMemo(() => {
    const avgPrice = storeConfig.sampleProducts?.length
      ? storeConfig.sampleProducts.reduce((sum, p) => sum + (p.price || 0), 0) / storeConfig.sampleProducts.length
      : 25000;
    const foodBaseline = 20000;
    const ratio = avgPrice / foodBaseline;
    return Math.min(15, Math.max(0.8, ratio));
  }, [storeConfig]);

  // Average profit margin from actual products
  const avgMargin = useMemo(() => {
    if (products.length > 0) {
      const sumMargin = products.reduce((acc, p) => {
        const pr = Number(p.price) || 0;
        const cp = Number(p.costPrice) || (pr * 0.72);
        return acc + (pr > 0 ? (pr - cp) / pr : 0.3);
      }, 0);
      return Math.min(0.6, Math.max(0.15, sumMargin / products.length));
    }
    return 0.337;
  }, [products]);

  // Dynamic Time periods configuration and real data model for sales
  const periodDataMap = useMemo(() => {
    const now = new Date();
    const today = getLocalDateString(now);
    const currentHour = now.getHours();
    const currentDayOfMonth = now.getDate();
    const currentMonthNum = now.getMonth() + 1; // 1-12
    const currentYear = today.substring(0, 4);
    const currentYearMonth = today.substring(0, 7);

    // Filter valid sales up to today
    const validSales = sales.filter(s => {
      const sDate = s.date || today;
      return sDate <= today;
    });

    const todaySales = validSales.filter(s => (s.date === today || !s.date));
    const marginPctStr = (avgMargin * 100).toFixed(1) + '%';

    // 1. BUGUN: hourly breakdown
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
      if (!isFutureSlot) {
        const slotSales = todaySales.filter(s => {
          const h = parseInt((s.time || '12:00').split(':')[0], 10);
          return h >= slot.startHour && h <= slot.endHour && h <= currentHour;
        });
        savdo = slotSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      }
      const foyda = Math.round(savdo * avgMargin);
      const xarajat = savdo - foyda;
      return {
        label: slot.label,
        fullDate: `Bugun, ${slot.label}`,
        savdo,
        foyda,
        xarajat
      };
    });

    const todayRevTotal = todayChartData.reduce((s, d) => s + d.savdo, 0);
    const todayProfitTotal = todayChartData.reduce((s, d) => s + d.foyda, 0);
    const todayMax = Math.max(...todayChartData.map(d => d.savdo), 100000);
    const todayYMax = Math.ceil((todayMax * 1.25) / 100000) * 100000;

    // Yesterday sales for comparison
    const yesterdayStr = getOffsetDateString(-1, now);
    const yesterdaySales = validSales.filter(s => s.date === yesterdayStr);
    const todayPrevRev = yesterdaySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const todayPrevProfit = Math.round(todayPrevRev * avgMargin);
    const todayGrowth = todayPrevRev > 0 ? (((todayRevTotal - todayPrevRev) / todayPrevRev) * 100).toFixed(1) : (todayRevTotal > 0 ? '+100' : '0');
    const todayProfitGrowth = todayPrevProfit > 0 ? (((todayProfitTotal - todayPrevProfit) / todayPrevProfit) * 100).toFixed(1) : (todayProfitTotal > 0 ? '+100' : '0');

    // 2. HAFTA: Current week breakdown (Dush - Yak)
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
        isFuture: dStr > today
      });
    }

    const weekChartData = weekDaysInfo.map(d => {
      let savdo = 0;
      if (!d.isFuture) {
        const daySales = validSales.filter(s => (s.date || today) === d.dateStr);
        savdo = daySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      }
      const foyda = Math.round(savdo * avgMargin);
      const xarajat = savdo - foyda;
      return {
        label: d.label,
        fullDate: d.fullDate,
        savdo,
        foyda,
        xarajat
      };
    });

    const weekRevTotal = weekChartData.reduce((s, d) => s + d.savdo, 0);
    const weekProfitTotal = weekChartData.reduce((s, d) => s + d.foyda, 0);
    const weekSalesList = validSales.filter(s => {
      const sDate = s.date || today;
      return weekDaysInfo.some(w => !w.isFuture && w.dateStr === sDate);
    });

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
    const weekPrevRev = prevWeekSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const weekPrevProfit = Math.round(weekPrevRev * avgMargin);
    const weekGrowth = weekPrevRev > 0 ? (((weekRevTotal - weekPrevRev) / weekPrevRev) * 100).toFixed(1) : (weekRevTotal > 0 ? '+100' : '0');
    const weekProfitGrowth = weekPrevProfit > 0 ? (((weekProfitTotal - weekPrevProfit) / weekPrevProfit) * 100).toFixed(1) : (weekProfitTotal > 0 ? '+100' : '0');
    const weekMax = Math.max(...weekChartData.map(d => d.savdo), 100000);
    const weekYMax = Math.ceil((weekMax * 1.25) / 100000) * 100000;

    // 3. OY: 4 weeks breakdown in current month
    const monthWeeks = [
      { label: '1-hafta', fullDate: '1-7 kunlar', minDay: 1, maxDay: 7 },
      { label: '2-hafta', fullDate: '8-14 kunlar', minDay: 8, maxDay: 14 },
      { label: '3-hafta', fullDate: '15-21 kunlar', minDay: 15, maxDay: 21 },
      { label: '4-hafta', fullDate: '22-oxiri', minDay: 22, maxDay: 31 },
    ];

    const monthSales = validSales.filter(s => (s.date || today).startsWith(currentYearMonth));

    const monthChartData = monthWeeks.map(w => {
      let savdo = 0;
      if (w.minDay <= currentDayOfMonth) {
        const wSales = monthSales.filter(s => {
          const dayNum = parseInt((s.date || today).split('-')[2], 10);
          return dayNum >= w.minDay && dayNum <= Math.min(w.maxDay, currentDayOfMonth);
        });
        savdo = wSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      }
      const foyda = Math.round(savdo * avgMargin);
      const xarajat = savdo - foyda;
      return {
        label: w.label,
        fullDate: `${w.label} (${w.fullDate})`,
        savdo,
        foyda,
        xarajat
      };
    });

    const monthRevTotal = monthChartData.reduce((s, d) => s + d.savdo, 0);
    const monthProfitTotal = monthChartData.reduce((s, d) => s + d.foyda, 0);

    // Previous month sales
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYearMonth = getLocalDateString(prevMonthDate).substring(0, 7);
    const prevMonthSales = validSales.filter(s => (s.date || '').startsWith(prevYearMonth));
    const monthPrevRev = prevMonthSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const monthPrevProfit = Math.round(monthPrevRev * avgMargin);
    const monthGrowth = monthPrevRev > 0 ? (((monthRevTotal - monthPrevRev) / monthPrevRev) * 100).toFixed(1) : (monthRevTotal > 0 ? '+100' : '0');
    const monthProfitGrowth = monthPrevProfit > 0 ? (((monthProfitTotal - monthPrevProfit) / monthPrevProfit) * 100).toFixed(1) : (monthProfitTotal > 0 ? '+100' : '0');
    const monthMax = Math.max(...monthChartData.map(d => d.savdo), 200000);
    const monthYMax = Math.ceil((monthMax * 1.25) / 200000) * 200000;

    // 4. YIL: 12 months breakdown
    const yearMonthLabels = [
      'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun',
      'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'
    ];
    const yearSales = validSales.filter(s => (s.date || today).startsWith(currentYear));

    const yearChartData = yearMonthLabels.map((mLabel, i) => {
      let savdo = 0;
      const monthIndex = i + 1; // 1-12
      if (monthIndex <= currentMonthNum) {
        const mStr = String(monthIndex).padStart(2, '0');
        const mSales = yearSales.filter(s => (s.date || today).substring(5, 7) === mStr);
        savdo = mSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      }
      const foyda = Math.round(savdo * avgMargin);
      const xarajat = savdo - foyda;
      return {
        label: mLabel,
        fullDate: `${mLabel} ${currentYear}`,
        savdo,
        foyda,
        xarajat
      };
    });

    const yearRevTotal = yearChartData.reduce((s, d) => s + d.savdo, 0);
    const yearProfitTotal = yearChartData.reduce((s, d) => s + d.foyda, 0);

    // Previous year sales
    const prevYearStr = String(now.getFullYear() - 1);
    const prevYearSales = validSales.filter(s => (s.date || '').startsWith(prevYearStr));
    const yearPrevRev = prevYearSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const yearPrevProfit = Math.round(yearPrevRev * avgMargin);
    const yearGrowth = yearPrevRev > 0 ? (((yearRevTotal - yearPrevRev) / yearPrevRev) * 100).toFixed(1) : (yearRevTotal > 0 ? '+100' : '0');
    const yearProfitGrowth = yearPrevProfit > 0 ? (((yearProfitTotal - yearPrevProfit) / yearPrevProfit) * 100).toFixed(1) : (yearProfitTotal > 0 ? '+100' : '0');
    const yearMax = Math.max(...yearChartData.map(d => d.savdo), 1000000);
    const yearYMax = Math.ceil((yearMax * 1.25) / 1000000) * 1000000;

    return {
      'Bugun': {
        currentRevenue: todayRevTotal,
        previousRevenue: todayPrevRev,
        growthPct: `${Number(todayGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(todayGrowth))}%`,
        profitGrowthPct: `${Number(todayProfitGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(todayProfitGrowth))}%`,
        salesCount: todaySales.length,
        comparisonText: t('comparisonVsYesterday', 'kechagiga nisbatan'),
        profit: todayProfitTotal,
        previousProfit: todayPrevProfit,
        profitMargin: marginPctStr,
        chartData: todayChartData,
        yAxisMax: todayYMax,
        yAxisTicks: [0, Math.round(todayYMax / 3), Math.round((todayYMax * 2) / 3), todayYMax],
        formatY: (val) => val >= 1000000 ? `${(val / 1000000).toFixed(1).replace('.0', '')}M` : `${Math.round(val / 1000)}k`
      },
      'Hafta': {
        currentRevenue: weekRevTotal,
        previousRevenue: weekPrevRev,
        growthPct: `${Number(weekGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(weekGrowth))}%`,
        profitGrowthPct: `${Number(weekProfitGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(weekProfitGrowth))}%`,
        salesCount: weekSalesList.length,
        comparisonText: t('comparisonVsPrevious', 'o‘tgan haftaga nisbatan'),
        profit: weekProfitTotal,
        previousProfit: weekPrevProfit,
        profitMargin: marginPctStr,
        chartData: weekChartData,
        yAxisMax: weekYMax,
        yAxisTicks: [0, Math.round(weekYMax / 3), Math.round((weekYMax * 2) / 3), weekYMax],
        formatY: (val) => val >= 1000000 ? `${(val / 1000000).toFixed(1).replace('.0', '')}M` : `${Math.round(val / 1000)}k`
      },
      'Oy': {
        currentRevenue: monthRevTotal,
        previousRevenue: monthPrevRev,
        growthPct: `${Number(monthGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(monthGrowth))}%`,
        profitGrowthPct: `${Number(monthProfitGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(monthProfitGrowth))}%`,
        salesCount: monthSales.length,
        comparisonText: t('comparisonVsPreviousMonth', 'o‘tgan oyga nisbatan'),
        profit: monthProfitTotal,
        previousProfit: monthPrevProfit,
        profitMargin: marginPctStr,
        chartData: monthChartData,
        yAxisMax: monthYMax,
        yAxisTicks: [0, Math.round(monthYMax / 4), Math.round(monthYMax / 2), Math.round((monthYMax * 3) / 4), monthYMax],
        formatY: (val) => `${(val / 1000000).toFixed(1).replace('.0', '')}M`
      },
      'Yil': {
        currentRevenue: yearRevTotal,
        previousRevenue: yearPrevRev,
        growthPct: `${Number(yearGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(yearGrowth))}%`,
        profitGrowthPct: `${Number(yearProfitGrowth) >= 0 ? '↑' : '↓'} ${Math.abs(Number(yearProfitGrowth))}%`,
        salesCount: yearSales.length,
        comparisonText: t('comparisonVsPreviousYear', 'o‘tgan yilga nisbatan'),
        profit: yearProfitTotal,
        previousProfit: yearPrevProfit,
        profitMargin: marginPctStr,
        chartData: yearChartData,
        yAxisMax: yearYMax,
        yAxisTicks: [0, Math.round(yearYMax / 4), Math.round(yearYMax / 2), Math.round((yearYMax * 3) / 4), yearYMax],
        formatY: (val) => `${(val / 1000000).toFixed(0)}M`
      }
    };
  }, [sales, avgMargin, storeRevenueScale, t]);

  const activePeriodData = periodDataMap[timeFilter] || periodDataMap['Bugun'] || periodDataMap['Hafta'];

  // Real inventory calculations
  const totalStockCount = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const totalStockRetailValue = stats.totalInventoryValue ?? products.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0);
  const totalStockCostValue = products.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.costPrice) || (Number(p.price) * 0.72))), 0);
  const potentialInventoryProfit = Math.max(0, totalStockRetailValue - totalStockCostValue);

  // Real debt calculations
  const activeDebtsList = debts.filter(d => !d.isPaid && Number(d.amount) > 0);
  const totalActiveDebt = stats.totalDebtsAmount ?? activeDebtsList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalPaidDebt = debts.reduce((sum, d) => sum + (Number(d.paidAmount) || (d.isPaid ? Number(d.originalAmount || d.amount) : 0)), 0);
  const overdueDebtsCount = debts.filter(d => d.status === 'Kechikkan').length;

  // Real profit calculations linked directly to activePeriodData
  const baseRevenue = activePeriodData.currentRevenue;
  const realCost = Math.round(baseRevenue * (1 - avgMargin));
  const realProfit = Math.round(baseRevenue - realCost);
  const realMarginPct = (avgMargin * 100).toFixed(1) + '%';

  const getInventoryStatusBadge = (status) => {
    if (status === 'Yetarli') return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
    if (status === 'Kam') return 'bg-amber-50 text-amber-700 border border-amber-200/80';
    return 'bg-rose-50 text-rose-700 border border-rose-200/80';
  };

  const getDebtStatusBadge = (status) => {
    if (status === 'Qarz to‘landi') return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
    if (status === 'Kechikkan') return 'bg-rose-50 text-rose-700 border border-rose-200/80';
    if (status === 'Bugun to‘lanishi kerak') return 'bg-purple-50 text-purple-700 border border-purple-200/80';
    return 'bg-amber-50 text-amber-700 border border-amber-200/80';
  };

  // Real installments report metrics
  const installmentReportStats = useMemo(() => {
    const list = Array.isArray(installments) ? installments : [];
    let totalContracts = list.length;
    let totalPrincipal = 0;
    let totalCollected = 0;
    let totalRemaining = 0;
    let overdueContracts = 0;
    const todayStr = getLocalDateString();

    list.forEach(c => {
      totalPrincipal += Number(c.totalAmount || 0);
      totalCollected += Number(c.totalPaid || 0);
      totalRemaining += Math.max(0, Number(c.remainingAmount || 0));
      const hasOverdue = (c.schedule || []).some(sch => !sch.isPaid && sch.dueDate < todayStr && (sch.amount - (sch.paidAmount || 0)) > 0);
      if (hasOverdue && c.status !== 'cancelled' && c.status !== 'completed') {
        overdueContracts++;
      }
    });

    return {
      totalContracts,
      totalPrincipal,
      totalCollected,
      totalRemaining,
      overdueContracts
    };
  }, [installments]);

  const getInstallmentStatusBadge = (status) => {
    if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
    if (status === 'overdue') return 'bg-rose-50 text-rose-700 border border-rose-200/80';
    if (status === 'due') return 'bg-amber-50 text-amber-700 border border-amber-200/80';
    if (status === 'cancelled') return 'bg-slate-100 text-slate-500 border border-slate-200/80';
    return 'bg-blue-50 text-blue-700 border border-blue-200/80';
  };

  if (isEmployee) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto mt-12 font-sans select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-800">Ruxsat cheklangan</h3>
        <p className="text-xs text-slate-500 mt-2 font-medium">
          Do‘kon hisobotlari va moliyaviy ma’lumotlar faqat do‘kon egasi yoki administrator uchun mo‘ljallangan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 font-sans select-none max-w-[1600px] mx-auto">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>{t('reportsPageTitle', 'HISOBOTLAR VA ANALITIKA')}</span>
            <span className="text-xs font-black px-3 py-1 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 shadow-xs">
              {currentStore?.name || storeConfig.name}
            </span>
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            {t('reportsSubtitle', 'Savdo va do‘kon faoliyati bo‘yicha hisobotlarni ko‘ring.')}
          </p>
        </div>
      </div>

      {/* Tabs and Time Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveReportTab('sales')}
            className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeReportTab === 'sales'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25 font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('tabSalesReport', 'Savdo hisoboti')}
          </button>
          <button
            onClick={() => setActiveReportTab('profit')}
            className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeReportTab === 'profit'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25 font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('tabProfitReport', 'Foyda va zarar')}
          </button>
          <button
            onClick={() => setActiveReportTab('inventory')}
            className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeReportTab === 'inventory'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/25 font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('tabInventoryReport', 'Ombor hisoboti')}
          </button>
          {isDebtsAllowed && (
            <button
              onClick={() => setActiveReportTab('debt')}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeReportTab === 'debt'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('tabDebtsReport', 'Qarzlar hisoboti')}
            </button>
          )}
          {isInstallmentAllowed && (
            <button
              onClick={() => setActiveReportTab('installments')}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeReportTab === 'installments'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25 font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('navInstallments', 'Muddatli to‘lov hisoboti')}
            </button>
          )}
        </div>

        {/* Time Filter Pills (Active for Sales & Profit) */}
        {(activeReportTab === 'sales' || activeReportTab === 'profit') && (
          <div className="flex items-center space-x-1.5 p-1 bg-slate-50 border border-slate-200/80 rounded-2xl">
            {['Bugun', 'Hafta', 'Oy', 'Yil'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  timeFilter === tf
                    ? 'bg-white text-slate-900 shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: SAVDO HISOBOTI                                                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeReportTab === 'sales' && (
        <div className="space-y-6 sm:space-y-8">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* Card 1: Jami tushum */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t('revenueTitle', 'Jami tushum')}
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">
                  {activePeriodData.currentRevenue.toLocaleString()} <span className="text-sm font-bold text-slate-400">{t('sum', 'so‘m')}</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                  <span>{activePeriodData.growthPct}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{activePeriodData.comparisonText}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0 group-hover:scale-105 transition-transform">
                <Wallet className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            {/* Card 2: Sof foyda */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t('netProfitTitle', 'Sof foyda')}
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-emerald-600 tracking-tight">
                  {activePeriodData.profit.toLocaleString()} <span className="text-sm font-bold text-emerald-600/70">{t('sum', 'so‘m')}</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                  <span>{activePeriodData.profitGrowthPct}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{activePeriodData.comparisonText}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            {/* Card 3: Rentabellik */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-purple-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t('profitMarginTitle', 'Rentabellik')}
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-purple-600 tracking-tight">
                  {activePeriodData.profitMargin}
                </div>
                <div className="text-[11px] font-bold text-slate-400 mt-1">
                  {t('relativeToSalesTurnover', 'Savdo aylanmasiga nisbatan')}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 shrink-0 group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            {/* Card 4: Xarajatlar */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t('totalExpensesTitle', 'Xarajatlar')}
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-amber-600 tracking-tight">
                  {(activePeriodData.currentRevenue - activePeriodData.profit).toLocaleString()} <span className="text-sm font-bold text-amber-500">{t('sum', 'so‘m')}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-400 mt-1">
                  {t('costAndOperatingExpenses', 'Tannarx va operatsion xarajatlar')}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <Wallet className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* Main Chart Section: Tushum va Xarajatlar taqqoslashi */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-black text-base sm:text-lg text-slate-900">
                  {t('profitExpenseChart', 'Tushum va xarajatlar taqqoslashi')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('selectedPeriod', 'Tanlangan davr')}: {timeFilter}
                </p>
              </div>

              <div className="flex items-center space-x-4 text-xs font-bold">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                  <span className="text-slate-700">{t('revenueTitle', 'Tushum')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-700">{t('netProfitTitle', 'Sof foyda')}</span>
                </div>
              </div>
            </div>

            <div className="h-[320px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activePeriodData.chartData} margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
                  <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} fontWeight={700} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} fontWeight={600} axisLine={false} tickLine={false} tickFormatter={activePeriodData.formatY} domain={[0, activePeriodData.yAxisMax]} ticks={activePeriodData.yAxisTicks} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white p-3.5 rounded-2xl shadow-xl border border-slate-100 text-xs font-bold space-y-1 font-sans">
                            <div className="text-slate-400 text-[10px] uppercase font-black">{item.fullDate || item.label}</div>
                            <div className="text-blue-600">{t('revenueTitle', 'Tushum')}: {payload[0].value.toLocaleString()} {t('sum', 'so‘m')}</div>
                            {payload[1] && <div className="text-emerald-600">{t('netProfitTitle', 'Foyda')}: {payload[1].value.toLocaleString()} {t('sum', 'so‘m')}</div>}
                            <div className="text-slate-500 text-[11px]">{t('totalExpensesTitle', 'Xarajat')}: {(item.xarajat || 0).toLocaleString()} {t('sum', 'so‘m')}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="savdo" fill="#3B82F6" radius={[8, 8, 0, 0]} maxBarSize={45} />
                  <Bar dataKey="foyda" fill="#10B981" radius={[8, 8, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: FOYDA VA ZARAR (P&L)                                               */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeReportTab === 'profit' && (
        <div className="space-y-6 sm:space-y-8">
          {/* 4 P&L KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Jami Savdo Tushumi
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">
                  {baseRevenue.toLocaleString()} <span className="text-sm font-bold text-slate-400">{t('sum', 'so‘m')}</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                  <span>{activePeriodData.salesCount} ta savdo tranzaksiyasi</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0 group-hover:scale-105 transition-transform">
                <Wallet className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Mahsulotlar Tannarxi
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-amber-600 tracking-tight">
                  {realCost.toLocaleString()} <span className="text-sm font-bold text-amber-500">{t('sum', 'so‘m')}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-400 mt-1">
                  {t('basedOnPurchasePrice', 'Xarid narxi asosida')}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t('netOperatingProfit', 'Sof Operatsion Foyda')}
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-emerald-600 tracking-tight">
                  {realProfit.toLocaleString()} <span className="text-sm font-bold text-emerald-600/70">{t('sum', 'so‘m')}</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                  <span>{t('grossProfitability', 'Yalpi daromadlilik')}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-purple-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t('profitabilityRate', 'Rentabellik Ko‘rsatkichi')}
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-purple-600 tracking-tight">
                  {realMarginPct}
                </div>
                <div className="text-[11px] font-bold text-slate-400 mt-1">
                  {t('netMarginPct', 'Sof marja foizi')}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 shrink-0 group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* Profit Breakdown Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {t('productProfitabilityTitle', 'Mahsulotlar Bo‘yicha Daromadlilik va Marja Tahlili')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('productProfitabilitySubtitle', 'Do‘kondagi mavjud tovarlarning sotish va tannarx nisbati')}
                </p>
              </div>
              <span className="text-xs font-black px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                {products.length} {t('productsCountSuffix', 'ta mahsulot')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm font-sans">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-400 font-extrabold uppercase text-[11px] tracking-wider border-b border-slate-200/80">
                    <th className="py-4 px-6">{t('colProduct', 'Mahsulot nomi')}</th>
                    <th className="py-4 px-6">{t('colCategory', 'Kategoriya')}</th>
                    <th className="py-4 px-6">{t('colPrice', 'Sotish narxi')}</th>
                    <th className="py-4 px-6">{t('colCostPrice', 'Tannarxi')}</th>
                    <th className="py-4 px-6">{t('unitProfit', 'Birlik foydasi')}</th>
                    <th className="py-4 px-6 text-right">{t('marginCol', 'Rentabellik (Marja)')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {products.map(p => {
                    const price = Number(p.price) || 0;
                    const cost = Number(p.costPrice) || Math.round(price * 0.72);
                    const unitProfit = Math.max(0, price - cost);
                    const margin = price > 0 ? ((unitProfit / price) * 100).toFixed(1) : '0';
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2">
                          <span>{p.emoji || '📦'}</span>
                          <span>{tProduct(p.name)}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-500 font-medium">{tCategory(p.category || 'Asosiy')}</td>
                        <td className="py-4 px-6 font-bold text-slate-800">{price.toLocaleString()} {t('sum', 'so‘m')}</td>
                        <td className="py-4 px-6 font-medium text-slate-500">{cost.toLocaleString()} {t('sum', 'so‘m')}</td>
                        <td className="py-4 px-6 font-black text-emerald-600">+{unitProfit.toLocaleString()} {t('sum', 'so‘m')}</td>
                        <td className="py-4 px-6 text-right">
                          <span className="inline-block px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            {margin}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: OMBOR HISOBOTI                                                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeReportTab === 'inventory' && (
        <div className="space-y-6 sm:space-y-8">
          {/* 4 Inventory KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-purple-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t('totalProductTypes', 'Jami Tovar Turlari')}
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">
                  {products.length} <span className="text-sm font-bold text-slate-400">{t('itemsUnit', 'ta')}</span>
                </div>
                <div className="text-[11px] font-bold text-purple-600 mt-1">
                  {t('activePositions', 'Faol pozitsiyalar')}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 shrink-0 group-hover:scale-105 transition-transform">
                <Package className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t('totalStockQuantity', 'Umumiy Zaxira Miqdori')}
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-blue-600 tracking-tight">
                  {totalStockCount.toLocaleString()} <span className="text-sm font-bold text-blue-500">{t('unitPiece', 'dona')}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-400 mt-1">
                  {t('totalPhysicalStock', 'Umumiy fizik zaxira')}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0 group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t('totalInventoryValue', 'Ombor Umumiy Qiymati')}
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">
                  {totalStockRetailValue.toLocaleString()} <span className="text-sm font-bold text-slate-400">{t('sum', 'so‘m')}</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-600 mt-1">
                  {t('byRetailPrice', 'Sotish narxi bo‘yicha')}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <Wallet className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t('expectedGrossProfit', 'Kutilayotgan Yalpi Foyda')}
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-amber-600 tracking-tight">
                  {potentialInventoryProfit.toLocaleString()} <span className="text-sm font-bold text-amber-500">{t('sum', 'so‘m')}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-400 mt-1">
                  {t('ifFullyRealized', 'To‘liq realizatsiya qilinsa')}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {t('inventoryStockListTitle', 'Ombor Qoldig‘i va Tovar Zaxiralari Ro‘yxati')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('inventoryStockListSubtitle', 'Mavjud ombor menyusi bilan to‘liq integratsiyalashgan hisobot')}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm font-sans">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-400 font-extrabold uppercase text-[11px] tracking-wider border-b border-slate-200/80">
                    <th className="py-4 px-6">{t('colProduct', 'Mahsulot nomi')}</th>
                    <th className="py-4 px-6">{t('colCategory', 'Kategoriya')}</th>
                    <th className="py-4 px-6">{t('colStock', 'Qoldiq miqdor')}</th>
                    <th className="py-4 px-6">{t('colPrice', 'Sotish narxi')}</th>
                    <th className="py-4 px-6">{t('colTotalValue', 'Jami qiymati')}</th>
                    <th className="py-4 px-6 text-right">{t('colStatus', 'Holati')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {products.map(p => {
                    const price = Number(p.price) || 0;
                    const stock = Number(p.stock) || 0;
                    const totalVal = stock * price;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2">
                          <span>{p.emoji || '📦'}</span>
                          <span>{tProduct(p.name)}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-500 font-medium">{tCategory(p.category || 'Boshqa')}</td>
                        <td className="py-4 px-6 font-bold text-slate-800">
                          {stock} {tUnit(p.unit || 'dona')}
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-600">{price.toLocaleString()} {t('sum', 'so‘m')}</td>
                        <td className="py-4 px-6 font-black text-slate-900">{totalVal.toLocaleString()} {t('sum', 'so‘m')}</td>
                        <td className="py-4 px-6 text-right">
                          <span className={`inline-block px-3 py-1 rounded-xl text-xs font-extrabold ${getInventoryStatusBadge(p.status)}`}>
                            {p.status === 'Yetarli' ? t('statusInStock', 'Yetarli') : p.status === 'Kam' ? t('statusLow', 'Kam') : p.status || t('statusInStock', 'Yetarli')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: QARZLAR HISOBOTI                                                   */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeReportTab === 'debt' && isDebtsAllowed && (
        <div className="space-y-6 sm:space-y-8">
          {/* 4 Debts KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t('totalActiveDebts', 'Jami Faol Qarzlar')}
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-amber-600 tracking-tight">
                  {totalActiveDebt.toLocaleString()} <span className="text-sm font-bold text-amber-500">{t('sum', 'so‘m')}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-400 mt-1">
                  {t('customerOutstandingDebt', 'Mijozlar zimmasidagi qarz')}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <Receipt className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t('recoveredDebts', 'Qaytarilgan Qarzlar')}
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-emerald-600 tracking-tight">
                  {totalPaidDebt.toLocaleString()} <span className="text-sm font-bold text-emerald-600/70">{t('sum', 'so‘m')}</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-600 mt-1">
                  {t('successfullyRecovered', 'Muvaffaqiyatli undirilgan')}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t('activeDebtorsCount', 'Faol Qarzdorlar Soni')}
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">
                  {activeDebtsList.length} <span className="text-sm font-bold text-slate-400">{t('clientUnit', 'mijoz')}</span>
                </div>
                <div className="text-[11px] font-bold text-blue-600 mt-1">
                  {t('activeAccounts', 'Faol hisoblar')}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0 group-hover:scale-105 transition-transform">
                <User className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-rose-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t('overdueDebts', 'Muddati O‘tgan Qarzlar')}
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-rose-600 tracking-tight">
                  {overdueDebtsCount} <span className="text-sm font-bold text-rose-500">{t('itemsUnit', 'ta')}</span>
                </div>
                <div className="text-[11px] font-bold text-rose-600 mt-1">
                  {t('requiresUrgentAttention', 'Tezkor e\'tibor talab')}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/25 shrink-0 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* Debts Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden w-full">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {t('debtorsRegistryTitle', 'Mijozlar Qarzdorlik Reestri va Holati')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('debtorsRegistrySubtitle', 'Mavjud Qarzlar menyusi bilan bir xil shared state asosida')}
                </p>
              </div>
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full text-left text-xs font-sans table-fixed border-collapse">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[18%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50/90 text-slate-400 font-extrabold uppercase text-[10px] sm:text-[11px] tracking-wider border-b border-slate-200/80">
                    <th className="py-3 px-3 truncate">{t('colDebtorName', 'Mijoz ismi')}</th>
                    <th className="py-3 px-3 truncate">{t('colDebtorPhone', 'Telefon')}</th>
                    <th className="py-3 px-3 truncate">{t('colDebtorGivenDate', 'Berilgan sana')}</th>
                    <th className="py-3 px-3 truncate">{t('colDebtorDueDate', 'To‘lov muddati')}</th>
                    <th className="py-3 px-3 truncate">{t('colDebtorAmount', 'Qarz summasi')}</th>
                    <th className="py-3 px-3 text-right truncate">{t('colStatus', 'Holati')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {debts.map(d => {
                    const amount = Number(d.amount) || 0;
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900">
                          {d.name}
                          {d.note && (
                            <div className="text-[11px] text-slate-400 font-normal mt-0.5">{d.note}</div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-500 font-mono text-xs">{d.phone || '—'}</td>
                        <td className="py-4 px-6 text-slate-500">{d.givenDate || '—'}</td>
                        <td className="py-4 px-6 font-semibold text-slate-700">{d.dueDate || '—'}</td>
                        <td className="py-4 px-6 font-black text-slate-900">
                          {amount.toLocaleString()} {t('sum', 'so‘m')}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className={`inline-block px-3 py-1 rounded-xl text-xs font-extrabold ${getDebtStatusBadge(d.status)}`}>
                            {d.status === 'Qarz to‘landi'
                              ? t('debtStatusPaid', 'Qarz to‘landi')
                              : d.status === 'Kechikkan'
                              ? t('debtStatusOverdue', 'Kechikkan')
                              : d.status === 'Bugun to‘lanishi kerak'
                              ? t('debtStatusDueToday', 'Bugun to‘lanishi kerak')
                              : d.status || t('activeStatus', 'Faol')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: MUDDATLI TO‘LOV HISOBOTI                                           */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeReportTab === 'installments' && isInstallmentAllowed && (
        <div className="space-y-6 sm:space-y-8">
          {/* 4 Installment KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* Card 1: Jami shartnomalar summasi */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Jami muddatli savdo
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">
                  {installmentReportStats.totalPrincipal.toLocaleString()} <span className="text-sm font-bold text-slate-400">{t('sum', 'so‘m')}</span>
                </div>
                <div className="text-[11px] font-bold text-blue-600 mt-1">
                  {installmentReportStats.totalContracts} ta shartnoma
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0 group-hover:scale-105 transition-transform">
                <Wallet className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            {/* Card 2: Undirilgan to'lovlar */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Undirilgan to‘lovlar
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-emerald-600 tracking-tight">
                  {installmentReportStats.totalCollected.toLocaleString()} <span className="text-sm font-bold text-emerald-600/70">{t('sum', 'so‘m')}</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-600 mt-1">
                  Haqiqiy pul tushumi
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            {/* Card 3: Qolgan qarz summasi */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Kutilayotgan qoldiq
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-amber-600 tracking-tight">
                  {installmentReportStats.totalRemaining.toLocaleString()} <span className="text-sm font-bold text-amber-600/70">{t('sum', 'so‘m')}</span>
                </div>
                <div className="text-[11px] font-bold text-amber-600 mt-1">
                  Muddati kelmagan majburiyat
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <Clock className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            {/* Card 4: Kechikkan shartnomalar */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-rose-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Kechikkan shartnomalar
                </span>
                <div className="text-2xl sm:text-[26px] font-black text-rose-600 tracking-tight">
                  {installmentReportStats.overdueContracts} <span className="text-sm font-bold text-rose-600/70">ta</span>
                </div>
                <div className="text-[11px] font-bold text-rose-600 mt-1">
                  Nazorat talab qiladi
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* Installment Contracts Monitoring Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden w-full">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Muddatli Savdo Shartnomalari Monitoringi
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Bo‘lib to‘lash shartnomalari, to‘langan va kutilayotgan mablag‘lar
                </p>
              </div>
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full text-left border-collapse text-xs table-fixed">
                <colgroup>
                  <col className="w-[14%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[14%]" />
                  <col className="w-[13%]" />
                  <col className="w-[13%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-3 truncate">Shartnoma #</th>
                    <th className="py-3 px-3 truncate">Mijoz</th>
                    <th className="py-3 px-3 truncate">Mahsulotlar</th>
                    <th className="py-3 px-3 truncate">Umumiy summa</th>
                    <th className="py-3 px-3 truncate">To‘langan</th>
                    <th className="py-3 px-3 truncate">Qolgan qarz</th>
                    <th className="py-3 px-3 text-right truncate">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {installments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 font-semibold">
                        Hozircha muddatli to‘lov shartnomalari mavjud emas.
                      </td>
                    </tr>
                  ) : (
                    installments.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900">
                          {c.contractNumber || c.id}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-900">
                          <div>{c.customerName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{c.customerPhone || '—'}</div>
                        </td>
                        <td className="py-4 px-6 text-slate-600 truncate max-w-[200px]">
                          {c.productsSummary || '—'}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-900">
                          {Number(c.totalAmount || 0).toLocaleString()} {t('sum', 'so‘m')}
                        </td>
                        <td className="py-4 px-6 font-black text-emerald-600">
                          {Number(c.totalPaid || 0).toLocaleString()} {t('sum', 'so‘m')}
                        </td>
                        <td className="py-4 px-6 font-black text-rose-600">
                          {Number(c.remainingAmount || 0).toLocaleString()} {t('sum', 'so‘m')}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className={`inline-block px-3 py-1 rounded-xl text-xs font-extrabold ${getInstallmentStatusBadge(c.status)}`}>
                            {c.status === 'completed'
                              ? 'To‘liq to‘langan'
                              : c.status === 'overdue'
                              ? 'Muddati o‘tgan'
                              : c.status === 'due'
                              ? 'Bugun to‘lov'
                              : c.status === 'cancelled'
                              ? 'Bekor qilingan'
                              : 'Faol'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// src/pages/Sales.jsx
import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Receipt,
  Banknote,
  CreditCard,
  LineChart as LineChartIcon,
  Scale,
  Trophy,
  Users,
  ArrowUpRight,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalDateString, getOffsetDateString } from '../utils/dateUtils';

export const Sales = () => {
  const { storeConfig, employees, currentStore, sales = [], products = [] } = useStore();
  const { t } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState('Bugun');

  const periods = [
    { key: 'Bugun', labelKey: 'periodToday', fallback: 'Bugun' },
    { key: 'Kecha', labelKey: 'periodYesterday', fallback: 'Kecha' },
    { key: 'Oxirgi 7 kun', labelKey: 'period7Days', fallback: 'Oxirgi 7 kun' },
    { key: 'Oxirgi 30 kun', labelKey: 'period30Days', fallback: 'Oxirgi 30 kun' },
    { key: 'Yil', labelKey: 'periodYear', fallback: 'Yil' }
  ];

  // Store-type price multiplier
  const storeRevenueScale = useMemo(() => {
    const avgPrice = storeConfig.sampleProducts?.length
      ? storeConfig.sampleProducts.reduce((sum, p) => sum + (p.price || 0), 0) / storeConfig.sampleProducts.length
      : 25000;
    const foodBaseline = 20000;
    const ratio = avgPrice / foodBaseline;
    return Math.min(15, Math.max(0.8, ratio));
  }, [storeConfig]);

  // Helper: filter sales by date range
  const filterSalesByPeriod = (period) => {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    switch(period) {
      case 'Bugun':
        return sales.filter(s => s.date === todayStr || !s.date);
      case 'Kecha': {
        const y = getOffsetDateString(-1, now);
        return sales.filter(s => s.date === y);
      }
      case 'Oxirgi 7 kun': {
        const d7 = getOffsetDateString(-7, now);
        return sales.filter(s => {
          const sDate = s.date || todayStr;
          return sDate >= d7 && sDate <= todayStr;
        });
      }
      case 'Oxirgi 30 kun': {
        const d30 = getOffsetDateString(-30, now);
        return sales.filter(s => {
          const sDate = s.date || todayStr;
          return sDate >= d30 && sDate <= todayStr;
        });
      }
      case 'Yil': {
        const yearStart = now.getFullYear() + '-01-01';
        return sales.filter(s => {
          const sDate = s.date || todayStr;
          return sDate >= yearStart && sDate <= todayStr;
        });
      }
      default:
        return sales.filter(s => (s.date || todayStr) <= todayStr);
    }
  };

  // Dynamic period-based statistics model from REAL sales data with true comparison
  const periodDataMap = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    const getPeriodFilter = (p) => {
      if (p === 'Bugun') {
        const y = getOffsetDateString(-1, now);
        return {
          current: (s) => (s.date === todayStr || !s.date),
          previous: (s) => s.date === y,
          label: t('comparisonVsYesterday', 'kechagiga nisbatan')
        };
      }
      if (p === 'Kecha') {
        const y = getOffsetDateString(-1, now);
        const y2 = getOffsetDateString(-2, now);
        return {
          current: (s) => s.date === y,
          previous: (s) => s.date === y2,
          label: t('comparisonVsPrevDay', 'undan oldingi kunga nisbatan')
        };
      }
      if (p === 'Oxirgi 7 kun') {
        const d7 = getOffsetDateString(-7, now);
        const d14 = getOffsetDateString(-14, now);
        return {
          current: (s) => {
            const sDate = s.date || todayStr;
            return sDate >= d7 && sDate <= todayStr;
          },
          previous: (s) => {
            const sDate = s.date || todayStr;
            return sDate >= d14 && sDate < d7;
          },
          label: t('comparisonVsPrevious', 'oldingi 7 kunga nisbatan')
        };
      }
      if (p === 'Oxirgi 30 kun') {
        const d30 = getOffsetDateString(-30, now);
        const d60 = getOffsetDateString(-60, now);
        return {
          current: (s) => {
            const sDate = s.date || todayStr;
            return sDate >= d30 && sDate <= todayStr;
          },
          previous: (s) => {
            const sDate = s.date || todayStr;
            return sDate >= d60 && sDate < d30;
          },
          label: t('comparisonVsPreviousMonth', 'oldingi 30 kunga nisbatan')
        };
      }
      // Yil
      const yStart = now.getFullYear() + '-01-01';
      const prevYStart = (now.getFullYear() - 1) + '-01-01';
      return {
        current: (s) => {
          const sDate = s.date || todayStr;
          return sDate >= yStart && sDate <= todayStr;
        },
        previous: (s) => {
          const sDate = s.date || todayStr;
          return sDate >= prevYStart && sDate < yStart;
        },
        label: t('comparisonVsPreviousYear', 'o‘tgan yilga nisbatan')
      };
    };

    const computeStats = (period) => {
      const cfg = getPeriodFilter(period);
      const filtered = sales.filter(cfg.current);
      const prevFiltered = sales.filter(cfg.previous);

      const totalSales = filtered.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      const prevTotalSales = prevFiltered.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      const diffSales = totalSales - prevTotalSales;
      const growthPct = prevTotalSales > 0 ? (((totalSales - prevTotalSales) / prevTotalSales) * 100).toFixed(1) : (totalSales > 0 ? '+100' : '0');

      const itemsSold = filtered.reduce((sum, s) => sum + (Number(s.qty) || 1), 0);
      const prevItemsSold = prevFiltered.reduce((sum, s) => sum + (Number(s.qty) || 1), 0);
      const itemsGrowthPct = prevItemsSold > 0 ? (((itemsSold - prevItemsSold) / prevItemsSold) * 100).toFixed(1) : (itemsSold > 0 ? '+100' : '0');

      const salesCount = filtered.length;
      const prevSalesCount = prevFiltered.length;
      const salesCountGrowthPct = prevSalesCount > 0 ? (((salesCount - prevSalesCount) / prevSalesCount) * 100).toFixed(1) : (salesCount > 0 ? '+100' : '0');

      const averageCheck = salesCount > 0 ? Math.round(totalSales / salesCount) : 0;
      const prevAvgCheck = prevSalesCount > 0 ? Math.round(prevTotalSales / prevSalesCount) : 0;
      const avgCheckGrowthPct = prevAvgCheck > 0 ? (((averageCheck - prevAvgCheck) / prevAvgCheck) * 100).toFixed(1) : (averageCheck > 0 ? '+100' : '0');

      const cashFiltered = filtered.filter(s => s.paymentType === 'Naqd' || !s.paymentType);
      const cardFiltered = filtered.filter(s => s.paymentType === 'Karta');
      const cashSales = cashFiltered.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      const cardSales = cardFiltered.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      const cashPct = totalSales > 0 ? ((cashSales / totalSales) * 100).toFixed(1) : '0';
      const cardPct = totalSales > 0 ? ((cardSales / totalSales) * 100).toFixed(1) : '0';

      return {
        totalSales,
        previousSales: prevTotalSales,
        diffSales,
        diffPct: Math.abs(Number(growthPct)),
        growthPct,
        itemsSold,
        itemsGrowthPct,
        salesCount,
        salesCountGrowthPct,
        averageCheck,
        avgCheckGrowthPct,
        cashSales,
        cashPct,
        cardSales,
        cardPct,
        comparisonSubtext: cfg.label,
        previousLabel: t('previousSalesLabel', 'Oldingi davr'),
        chartMultiplier: 1,
        multiplier: 1
      };
    };

    return {
      'Bugun': computeStats('Bugun'),
      'Kecha': computeStats('Kecha'),
      'Oxirgi 7 kun': computeStats('Oxirgi 7 kun'),
      'Oxirgi 30 kun': computeStats('Oxirgi 30 kun'),
      'Yil': computeStats('Yil'),
    };
  }, [sales, t]);

  const currentStats = periodDataMap[selectedPeriod] || periodDataMap['Bugun'];

  // Dynamic Sales trend chart data from real sales
  const chartData = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const currentHour = now.getHours();

    const filtered = filterSalesByPeriod(selectedPeriod);
    if (filtered.length === 0) {
      return [{ day: '-', date: 'Ma\'lumot yo\'q', amount: 0 }];
    }

    // Group by appropriate time unit
    if (selectedPeriod === 'Bugun' || selectedPeriod === 'Kecha') {
      // Group by hour
      const hourMap = {};
      filtered.forEach(s => {
        const hNum = parseInt((s.time || '12:00').split(':')[0], 10);
        if (selectedPeriod === 'Bugun' && hNum > currentHour) {
          return;
        }
        const h = String(hNum).padStart(2, '0') + ':00';
        if (!hourMap[h]) hourMap[h] = 0;
        hourMap[h] += Number(s.total) || 0;
      });
      const sorted = Object.entries(hourMap).sort((a, b) => a[0].localeCompare(b[0]));
      if (sorted.length === 0) {
        return [{ day: '-', date: 'Ma\'lumot yo\'q', amount: 0 }];
      }
      return sorted.map(([hour, amount]) => ({
        day: hour,
        date: selectedPeriod + ', ' + hour,
        amount
      }));
    }

    // Group by date for longer periods
    const dateMap = {};
    filtered.forEach(s => {
      const d = s.date || todayStr;
      if (d > todayStr) return;
      if (!dateMap[d]) dateMap[d] = 0;
      dateMap[d] += Number(s.total) || 0;
    });
    const sorted = Object.entries(dateMap).sort((a, b) => a[0].localeCompare(b[0]));
    if (sorted.length === 0) {
      return [{ day: '-', date: 'Ma\'lumot yo\'q', amount: 0 }];
    }

    // Format labels
    return sorted.map(([date, amount]) => {
      const parts = date.split('-');
      const label = parts.length === 3 ? parts[2] + '.' + parts[1] : date;
      return { day: label, date, amount };
    });
  }, [selectedPeriod, sales]);

  const chartMax = useMemo(() => {
    const maxVal = Math.max(...chartData.map(d => d.amount), 1000);
    return Math.ceil(maxVal * 1.15);
  }, [chartData]);

  const chartTicks = useMemo(() => {
    const step = chartMax / 4;
    return [0, Math.round(step), Math.round(step * 2), Math.round(step * 3), Math.round(chartMax)];
  }, [chartMax]);

  const formatYAxis = (val) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1).replace('.0', '')}M`;
    if (val >= 1000) return `${val / 1000}k`;
    return val;
  };

  // Payment Breakdown
  const paymentPieData = [
    { name: t('kpiCash', 'Naqd'), value: currentStats.cashSales, color: '#10B981' },
    { name: t('kpiCard', 'Karta'), value: currentStats.cardSales, color: '#3B82F6' },
  ];

  // Top Products from real sales data
  const topProductsList = useMemo(() => {
    const filtered = filterSalesByPeriod(selectedPeriod);
    const productMap = {};
    filtered.forEach(s => {
      const name = s.product || 'Noma\'lum';
      if (!productMap[name]) productMap[name] = { qty: 0, total: 0, unit: s.unit || 'dona' };
      productMap[name].qty += Number(s.qty) || 1;
      productMap[name].total += Number(s.total) || 0;
    });
    const sorted = Object.entries(productMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);
    return sorted.map(([name, data], i) => ({
      rank: i + 1,
      name,
      qty: data.qty,
      unit: data.unit,
      total: data.total
    }));
  }, [sales, selectedPeriod]);

  // Seller Stats from real sales data
  const sellerStats = useMemo(() => {
    const filtered = filterSalesByPeriod(selectedPeriod);
    const sellerMap = {};
    filtered.forEach(s => {
      const seller = s.seller || 'Noma\'lum';
      if (!sellerMap[seller]) sellerMap[seller] = { salesCount: 0, total: 0, itemsSold: 0 };
      sellerMap[seller].salesCount += 1;
      sellerMap[seller].total += Number(s.total) || 0;
      sellerMap[seller].itemsSold += Number(s.qty) || 1;
    });
    const bgColors = ['bg-blue-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600'];
    return Object.entries(sellerMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, data], i) => ({
        name,
        salesCount: data.salesCount,
        total: data.total,
        itemsSold: data.itemsSold,
        initial: name.charAt(0).toUpperCase(),
        bg: bgColors[i % bgColors.length]
      }));
  }, [sales, selectedPeriod]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 font-sans select-none max-w-[1600px] mx-auto">
      {/* 1. Header & Period Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>{t('salesTitle', 'SAVDO TAHLILI')}</span>
            <span className="text-xs font-black px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shadow-xs">
              {currentStore?.name || storeConfig.name}
            </span>
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Savdolar, tushum va sotilgan mahsulotlarni kuzating.
          </p>
        </div>

        {/* Period Selector Pills */}
        <div className="flex items-center space-x-1.5 p-1.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto">
          {periods.map((p) => {
            const isSelected = selectedPeriod === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setSelectedPeriod(p.key)}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25 font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {t(p.labelKey, p.fallback)}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. KPI Cards (6 in a row) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Jami savdo */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-200 transition-all group">
          <div className="flex items-center space-x-3 mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-tight">
              {t('kpiTotalSales', 'Jami savdo')}
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {currentStats.totalSales.toLocaleString()} <span className="text-xs font-bold text-slate-400">{t('sum', 'so‘m')}</span>
            </div>
            <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
              <span>{Number(currentStats.growthPct) >= 0 ? '↑' : '↓'} {Math.abs(Number(currentStats.growthPct))}%</span>
              <span className="text-[10px] text-slate-400 font-medium truncate">{currentStats.comparisonSubtext}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Sotilgan tovarlar */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-blue-200 transition-all group">
          <div className="flex items-center space-x-3 mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-tight">
              {t('kpiSoldProducts', 'Sotilgan tovarlar')}
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {currentStats.itemsSold} <span className="text-xs font-bold text-slate-400">{t('itemsUnit', 'ta')}</span>
            </div>
            <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
              <span>{Number(currentStats.itemsGrowthPct) >= 0 ? '↑' : '↓'} {Math.abs(Number(currentStats.itemsGrowthPct))}%</span>
              <span className="text-[10px] text-slate-400 font-medium truncate">{currentStats.comparisonSubtext}</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Savdolar soni */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-purple-200 transition-all group">
          <div className="flex items-center space-x-3 mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
              <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-tight">
              {t('kpiSalesCount', 'Savdolar soni')}
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {currentStats.salesCount} <span className="text-xs font-bold text-slate-400">{t('itemsUnit', 'ta')}</span>
            </div>
            <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
              <span>{Number(currentStats.salesCountGrowthPct) >= 0 ? '↑' : '↓'} {Math.abs(Number(currentStats.salesCountGrowthPct))}%</span>
              <span className="text-[10px] text-slate-400 font-medium truncate">{currentStats.comparisonSubtext}</span>
            </div>
          </div>
        </div>

        {/* KPI 4: O'rtacha chek */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-amber-200 transition-all group">
          <div className="flex items-center space-x-3 mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Receipt className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-tight">
              {t('kpiAverageCheck', 'O‘rtacha chek')}
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {currentStats.averageCheck.toLocaleString()} <span className="text-xs font-bold text-slate-400">{t('sum', 'so‘m')}</span>
            </div>
            <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
              <span>{Number(currentStats.avgCheckGrowthPct) >= 0 ? '↑' : '↓'} {Math.abs(Number(currentStats.avgCheckGrowthPct))}%</span>
              <span className="text-[10px] text-slate-400 font-medium truncate">{currentStats.comparisonSubtext}</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Naqd */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-200 transition-all group">
          <div className="flex items-center space-x-3 mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Banknote className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-tight">
              {t('kpiCash', 'Naqd')}
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {currentStats.cashSales.toLocaleString()} <span className="text-xs font-bold text-slate-400">{t('sum', 'so‘m')}</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              {currentStats.cashPct}% ulush
            </div>
          </div>
        </div>

        {/* KPI 6: Karta */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-blue-200 transition-all group">
          <div className="flex items-center space-x-3 mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
              <CreditCard className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 leading-tight">
              {t('kpiCard', 'Karta')}
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {currentStats.cardSales.toLocaleString()} <span className="text-xs font-bold text-slate-400">{t('sum', 'so‘m')}</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              {currentStats.cardPct}% ulush
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Dynamic Sales Graph (Left 8 cols) + Right stack (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Chart: SAVDO DINAMIKASI */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <LineChartIcon className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                {t('salesDynamics', 'Savdo dinamikasi grafigi')}
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {selectedPeriod}
            </span>
          </div>

          <div className="h-[290px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
                <defs>
                  <linearGradient id="salesLineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  axisLine={{ stroke: '#F1F5F9' }}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={formatYAxis}
                  domain={[0, chartMax]}
                  ticks={chartTicks}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-100 text-center font-sans">
                          <div className="text-[10px] text-slate-400 font-extrabold">
                            {payload[0].payload.day} ({payload[0].payload.date})
                          </div>
                          <div className="text-xs sm:text-sm font-black text-blue-600 mt-0.5">
                            {payload[0].value.toLocaleString()} {t('sum', 'so‘m')}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#salesLineGrad)"
                  dot={{ r: 4, fill: '#3B82F6', stroke: '#FFFFFF', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Stack: Bugun va oldingi savdo + To'lov turlari */}
        <div className="lg:col-span-4 space-y-5">
          {/* Section 1: Bugun va oldingi savdo */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <Scale className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                {t('todayVsPrev', 'Bugun va oldingi savdo')}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-3 pt-1">
              <div>
                <div className="text-[11px] font-semibold text-slate-400">{t('currentSalesLabel', 'Joriy savdo')}</div>
                <div className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                  {currentStats.totalSales.toLocaleString()} {t('sum', 'so‘m')}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-400">{currentStats.previousLabel}</div>
                <div className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                  {currentStats.previousSales.toLocaleString()} {t('sum', 'so‘m')}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-400">{t('differenceLabel', 'Farq')}</div>
                <div className="text-xs sm:text-sm font-black text-emerald-600 mt-0.5">
                  {currentStats.diffSales >= 0 ? '+ ' : ''}{currentStats.diffSales.toLocaleString()} {t('sum', 'so‘m')}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-400">{t('changePctLabel', 'O‘zgarish')}</div>
                <div className="text-xs sm:text-sm font-black text-emerald-600 mt-0.5 flex items-center gap-1">
                  <span>{currentStats.diffSales >= 0 ? '↑' : '↓'} {currentStats.diffPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: To‘lov turlari */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 mb-3">
              {t('paymentTypesTitle', 'To‘lov turlari taqsimoti')}
            </h3>

            <div className="flex items-center justify-between">
              {/* Donut Chart with center value */}
              <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentPieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={60}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {paymentPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="space-y-3 pl-3 w-full">
                <div className="flex items-center space-x-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {t('kpiCash', 'Naqd')} <span className="font-semibold text-slate-500">{currentStats.cashSales.toLocaleString()} {t('sum', 'so‘m')}</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-400">
                      ({currentStats.cashPct}%)
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></span>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {t('kpiCard', 'Karta')} <span className="font-semibold text-slate-500">{currentStats.cardSales.toLocaleString()} {t('sum', 'so‘m')}</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-400">
                      ({currentStats.cardPct}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Eng ko‘p sotilgan mahsulotlar + Sotuvchilar bo‘yicha savdo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Eng ko‘p sotilgan mahsulotlar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                  <Trophy className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  {t('topSellingProductsTitle', 'Eng ko‘p sotilgan tovarlar')}
                </h3>
              </div>
            </div>

            {/* List of 5 Products */}
            <div className="space-y-3">
              {topProductsList.map((item) => (
                <div
                  key={item.rank}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-3.5 truncate">
                    <span className="w-6 text-xs font-black text-blue-600">
                      #{item.rank}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-slate-600" />
                    </div>
                    <span className="font-extrabold text-xs sm:text-sm text-slate-800 truncate">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center space-x-6 text-right shrink-0">
                    <span className="text-xs font-bold text-blue-600 min-w-[60px]">
                      {item.qty} {item.unit}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 min-w-[90px]">
                      {item.total.toLocaleString()} {t('sum', 'so‘m')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Sotuvchilar bo‘yicha savdo */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                  <Users className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  {t('sellerPerformanceTitle', 'Sotuvchilar bo‘yicha savdo')}
                </h3>
              </div>
            </div>

            {/* Seller Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm font-sans">
                <thead>
                  <tr className="text-slate-400 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3 font-semibold">{t('colEmployee', 'Xodim')}</th>
                    <th className="pb-3 text-center font-semibold">{t('colSalesCount', 'Savdolar')}</th>
                    <th className="pb-3 text-right font-semibold">{t('colTotalSales', 'Jami savdo')}</th>
                    <th className="pb-3 text-right font-semibold">{t('colItemsSold', 'Sotilgan tovarlar')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sellerStats.map((seller, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-8 h-8 rounded-full ${seller.bg} text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0`}>
                            {seller.initial}
                          </div>
                          <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                            {seller.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-bold text-slate-700">
                        {seller.salesCount}
                      </td>
                      <td className="py-3.5 text-right font-black text-slate-900">
                        {seller.total.toLocaleString()} {t('sum', 'so‘m')}
                      </td>
                      <td className="py-3.5 text-right font-bold text-slate-600">
                        {seller.itemsSold} {t('itemsUnit', 'ta')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

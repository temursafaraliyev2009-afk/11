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
  Tooltip,
  Cell,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalDateString, getOffsetDateString, isToday } from '../utils/dateUtils';
import { buildPeriodFinancialReports, calculateProductProfitability, getSaleFinancials } from '../utils/financeUtils.js';

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
    installments = [],
    expenses = []
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

  // Average profit margin from actual products with verified cost
  const avgMargin = useMemo(() => {
    const verifiedProducts = products.filter(p => p.costPrice !== undefined && p.costPrice !== null && !isNaN(Number(p.costPrice)) && Number(p.costPrice) >= 0);
    if (verifiedProducts.length > 0) {
      const sumMargin = verifiedProducts.reduce((acc, p) => {
        const pr = Number(p.price) || 0;
        const cp = Number(p.costPrice) || 0;
        return acc + (pr > 0 ? (pr - cp) / pr : 0);
      }, 0);
      return Math.min(0.6, Math.max(0.15, sumMargin / verifiedProducts.length));
    }
    return 0.3;
  }, [products]);

  // Dynamic Time periods configuration and real data model for sales
  const periodDataMap = useMemo(() => {
    const reports = buildPeriodFinancialReports(sales, products);
    reports['Bugun'].comparisonText = t('comparisonVsYesterday', 'kechagiga nisbatan');
    reports['Hafta'].comparisonText = t('comparisonVsPrevious', 'o‘tgan haftaga nisbatan');
    reports['Oy'].comparisonText = t('comparisonVsPreviousMonth', 'o‘tgan oyga nisbatan');
    reports['Yil'].comparisonText = t('comparisonVsPreviousYear', 'o‘tgan yilga nisbatan');
    return reports;
  }, [sales, products, t]);

  const activePeriodData = periodDataMap[timeFilter] || periodDataMap['Bugun'] || periodDataMap['Hafta'];

  // Qo'shimcha xarajatlarni tanlangan davr bo'yicha filtrlash
  const periodExpenses = useMemo(() => {
    if (!Array.isArray(expenses) || expenses.length === 0) return 0;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const year = todayStr.substring(0, 4);
    const yearMonth = todayStr.substring(0, 7);
    return expenses.filter(e => {
      const d = e.date || '';
      if (!d) return false;
      if (timeFilter === 'Bugun') return d === todayStr;
      if (timeFilter === 'Hafta') {
        const dayMs = 7 * 24 * 60 * 60 * 1000;
        const eDate = new Date(d);
        return eDate >= new Date(now.getTime() - dayMs) && d <= todayStr;
      }
      if (timeFilter === 'Oy') return d.startsWith(yearMonth);
      if (timeFilter === 'Yil') return d.startsWith(year);
      return false;
    }).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses, timeFilter]);

  // Real inventory calculations (separating verified cost from unknown cost)
  const totalStockCount = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const totalStockRetailValue = stats.totalInventoryValue ?? products.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0);
  const verifiedCostProducts = products.filter(p => p.costPrice !== undefined && p.costPrice !== null && !isNaN(Number(p.costPrice)) && Number(p.costPrice) >= 0);
  const totalStockCostValue = verifiedCostProducts.reduce((sum, p) => sum + ((Number(p.stock) || 0) * Number(p.costPrice)), 0);
  const unverifiedStockProductsCount = products.length - verifiedCostProducts.length;
  const potentialInventoryProfit = Math.max(0, totalStockRetailValue - totalStockCostValue);

  // Real debt calculations
  const activeDebtsList = debts.filter(d => !d.isPaid && Number(d.amount) > 0);
  const totalActiveDebt = stats.totalDebtsAmount ?? activeDebtsList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalPaidDebt = debts.reduce((sum, d) => sum + (Number(d.paidAmount) || (d.isPaid ? Number(d.originalAmount || d.amount) : 0)), 0);
  const overdueDebtsCount = debts.filter(d => d.status === 'Kechikkan').length;

  // Real profit calculations linked directly to activePeriodData
  const baseRevenue = activePeriodData.currentRevenue;
  const realCost = activePeriodData.cost;
  const realProfit = activePeriodData.profit;
  const adjustedProfit = realProfit - periodExpenses;
  const isAdjustedLoss = adjustedProfit < 0;
  const isAdjustedProfit = adjustedProfit > 0;
  const realMarginPct = activePeriodData.profitMargin;
  // Qo'shimcha xarajatlar hisobga olingan rentabellik foizi
  const adjustedMarginPct = useMemo(() => {
    if (baseRevenue <= 0) return '—';
    const pct = (adjustedProfit / baseRevenue) * 100;
    if (pct === 0) return '0.0%';
    const sign = pct < 0 ? '-' : '+';
    const abs = Math.abs(pct);
    return abs >= 1000
      ? `${sign}${Math.round(abs).toLocaleString('uz-UZ')}%`
      : `${sign}${abs.toFixed(1)}%`;
  }, [adjustedProfit, baseRevenue]);
  const isOverallLoss = activePeriodData.isLoss;
  const isOverallZero = activePeriodData.isZero ?? (realProfit === 0);
  const isOverallProfit = activePeriodData.isProfit ?? (realProfit > 0);

  // Real product profitability breakdown for the selected period
  const periodProductBreakdown = useMemo(() => {
    const list = activePeriodData?.merchandiseSales || [];
    if (!Array.isArray(list) || list.length === 0) return [];

    const map = {};
    list.forEach(s => {
      const fin = getSaleFinancials(s, products);
      const name = s.product || s.productName || 'Noma\'lum';
      if (!map[name]) {
        const catalogItem = products.find(p => p.name === name || p.id === s.productId);
        map[name] = {
          name,
          category: s.category || catalogItem?.category || 'Asosiy',
          emoji: s.emoji || catalogItem?.emoji || '📦',
          unit: s.unit || catalogItem?.unit || 'dona',
          qty: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          hasExactCost: false,
          hasUnknownCost: false,
          unitPrices: [],
          unitCosts: []
        };
      }
      const item = map[name];
      item.qty += fin.qty;
      item.revenue += fin.revenue;

      if (fin.costStatus === 'exact') {
        item.hasExactCost = true;
        item.cost += (fin.cost || 0);
        item.profit += (fin.profit || 0);
        if (fin.unitCost !== null && !item.unitCosts.includes(fin.unitCost)) {
          item.unitCosts.push(fin.unitCost);
        }
      } else {
        item.hasUnknownCost = true;
      }

      const uPrice = Number(s.price) || (fin.qty > 0 ? Math.round(fin.revenue / fin.qty) : 0);
      if (!item.unitPrices.includes(uPrice)) {
        item.unitPrices.push(uPrice);
      }
    });

    return Object.values(map).map(item => {
      const isKnownCost = item.hasExactCost && !item.hasUnknownCost;
      const unitPrice = item.unitPrices.length === 1 ? item.unitPrices[0] : Math.round(item.revenue / item.qty);
      const unitCost = isKnownCost
        ? (item.unitCosts.length === 1 ? item.unitCosts[0] : Math.round(item.cost / item.qty))
        : null;
      const isLoss = isKnownCost && item.profit < 0;
      const isZero = isKnownCost && item.profit === 0;
      const margin = isKnownCost && item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : null;

      return {
        ...item,
        isKnownCost,
        unitPrice,
        unitCost,
        isLoss,
        isZero,
        margin
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [activePeriodData, products]);

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
      const isOverdue = c.status === 'overdue' || (c.schedule || []).some(sch => !sch.isPaid && sch.dueDate < todayStr && (sch.amount - (sch.paidAmount || 0)) > 0);
      if (isOverdue && c.status !== 'cancelled' && c.status !== 'completed') {
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
        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto xl:overflow-x-visible py-1.5 px-1 scrollbar-none">
          <button
            onClick={() => setActiveReportTab('sales')}
            className={`btn-pill-base px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm ${
              activeReportTab === 'sales'
                ? 'btn-pill-blue font-black'
                : 'btn-pill-inactive'
            }`}
          >
            {t('tabSalesReport', 'Savdo hisoboti')}
          </button>
          <button
            onClick={() => setActiveReportTab('profit')}
            className={`btn-pill-base px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm ${
              activeReportTab === 'profit'
                ? 'btn-pill-emerald font-black'
                : 'btn-pill-inactive'
            }`}
          >
            {t('tabProfitReport', 'Foyda va zarar')}
          </button>
          <button
            onClick={() => setActiveReportTab('inventory')}
            className={`btn-pill-base px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm ${
              activeReportTab === 'inventory'
                ? 'btn-pill-purple font-black'
                : 'btn-pill-inactive'
            }`}
          >
            {t('tabInventoryReport', 'Ombor hisoboti')}
          </button>
          {isDebtsAllowed && (
            <button
              onClick={() => setActiveReportTab('debt')}
              className={`btn-pill-base px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm ${
                activeReportTab === 'debt'
                  ? 'btn-pill-amber font-black'
                  : 'btn-pill-inactive'
              }`}
            >
              {t('tabDebtsReport', 'Qarzlar hisoboti')}
            </button>
          )}
          {isInstallmentAllowed && (
            <button
              onClick={() => setActiveReportTab('installments')}
              className={`btn-pill-base px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm ${
                activeReportTab === 'installments'
                  ? 'btn-pill-blue font-black'
                  : 'btn-pill-inactive'
              }`}
            >
              {t('navInstallments', 'Muddatli to‘lov hisoboti')}
            </button>
          )}
        </div>

        {/* Time Filter Pills (Active for Sales & Profit) */}
        {(activeReportTab === 'sales' || activeReportTab === 'profit') && (
          <div className="flex items-center space-x-1.5 p-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl">
            {['Bugun', 'Hafta', 'Oy', 'Yil'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                className={`btn-pill-base px-4 py-2 rounded-xl text-xs font-extrabold ${
                  timeFilter === tf
                    ? 'btn-segment-active font-black'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
                <div className={`text-[11px] font-bold flex items-center gap-1 mt-1 ${
                  activePeriodData.growthMetrics?.isNegative || activePeriodData.growthPct?.startsWith('↓')
                    ? 'text-rose-600'
                    : activePeriodData.growthMetrics?.isZero || activePeriodData.growthPct === '0%'
                    ? 'text-slate-400'
                    : 'text-emerald-600'
                }`}>
                  <span>{activePeriodData.growthPct}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{activePeriodData.comparisonText}</span>
                </div>
                {activePeriodData.cashReceipts !== activePeriodData.currentRevenue && (
                  <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                    Haqiqiy kassa kirimi: {activePeriodData.cashReceipts.toLocaleString()} so‘m
                  </div>
                )}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0 group-hover:scale-105 transition-transform">
                <Wallet className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            {/* Card 2: Yalpi foyda / Yalpi zarar */}
            <div className={`bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between group ${
              activePeriodData.isLoss ? 'hover:border-rose-200' : (activePeriodData.isProfit ?? (activePeriodData.profit > 0)) ? 'hover:border-emerald-200' : 'hover:border-slate-300'
            }`}>
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {activePeriodData.isLoss ? t('grossLossTitle', 'Yalpi zarar') : (activePeriodData.isProfit ?? (activePeriodData.profit > 0)) ? t('grossProfitTitle', 'Yalpi foyda') : 'Yalpi natija'}
                </span>
                <div className={`text-2xl sm:text-[26px] font-black tracking-tight ${
                  activePeriodData.isLoss ? 'text-rose-600' : (activePeriodData.isProfit ?? (activePeriodData.profit > 0)) ? 'text-emerald-600' : 'text-slate-700'
                }`}>
                  {activePeriodData.isLoss
                    ? `-${Math.abs(activePeriodData.profit).toLocaleString()}`
                    : (activePeriodData.isProfit ?? (activePeriodData.profit > 0))
                    ? `+${activePeriodData.profit.toLocaleString()}`
                    : '0'}{' '}
                  <span className={`text-sm font-bold ${activePeriodData.isLoss ? 'text-rose-500' : (activePeriodData.isProfit ?? (activePeriodData.profit > 0)) ? 'text-emerald-600/70' : 'text-slate-400'}`}>{t('sum', 'so‘m')}</span>
                </div>
                <div className={`text-[11px] font-bold flex items-center gap-1 mt-1 ${
                  activePeriodData.profitGrowthMetrics?.isNegative || activePeriodData.profitGrowthPct?.startsWith('↓')
                    ? 'text-rose-600'
                    : activePeriodData.profitGrowthMetrics?.isZero || activePeriodData.profitGrowthPct === '0%'
                    ? 'text-slate-400'
                    : 'text-emerald-600'
                }`}>
                  <span>{activePeriodData.profitGrowthPct}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{activePeriodData.comparisonText}</span>
                </div>
                {activePeriodData.hasUnverifiedCosts && (
                  <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60 inline-block mt-1">
                    * {activePeriodData.unverifiedCount} ta tovar tannarxisiz
                  </div>
                )}
              </div>
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${
                activePeriodData.isLoss
                  ? 'from-rose-500 to-red-600 shadow-rose-500/25'
                  : (activePeriodData.isProfit ?? (activePeriodData.profit > 0))
                  ? 'from-emerald-500 to-teal-600 shadow-emerald-500/25'
                  : 'from-slate-500 to-slate-600 shadow-slate-500/25'
              } text-white flex items-center justify-center shadow-lg shrink-0 group-hover:scale-105 transition-transform`}>
                <TrendingUp className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            {/* Card 3: Rentabellik */}
            {/* Qo'shimcha xarajatlar KPI card */}
            {periodExpenses > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-orange-200 transition-all flex items-center justify-between group">
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Qo'shimcha xarajatlar
                  </span>
                  <div className="text-2xl sm:text-[26px] font-black tracking-tight text-orange-600">
                    -{periodExpenses.toLocaleString()} <span className="text-sm font-bold text-orange-500">{t('sum', "so'm")}</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 mt-1">
                    {timeFilter} davridagi umumiy xarajatlar
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0 group-hover:scale-105 transition-transform">
                  <Layers className="w-6 h-6 stroke-[2.2]" />
                </div>
              </div>
            )}
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
                  {activePeriodData.cost.toLocaleString()} <span className="text-sm font-bold text-amber-500">{t('sum', 'so‘m')}</span>
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

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-bold">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                  <span className="text-slate-700">{t('revenueTitle', 'Tushum')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span className="text-slate-700">{t('totalExpensesTitle', 'Xarajat')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-700">{t('grossProfitTitle', 'Yalpi foyda')}</span>
                </div>
              </div>
            </div>

            <div className="h-[320px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activePeriodData.chartData}
                  margin={{ top: 20, right: 20, left: -10, bottom: 10 }}
                  barGap={4}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} fontWeight={700} axisLine={false} tickLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={10}
                    fontWeight={600}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={activePeriodData.formatY}
                    domain={[activePeriodData.yAxisMin, activePeriodData.yAxisMax]}
                  />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1.5} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        const isLoss = item.foyda < 0;
                        return (
                          <div className="bg-white p-3.5 rounded-2xl shadow-xl border border-slate-100 text-xs font-bold space-y-1.5 font-sans min-w-[190px]">
                            <div className="text-slate-400 text-[10px] uppercase font-black">{item.fullDate || item.label}</div>
                            <div className="text-blue-600 flex items-center justify-between gap-3">
                              <span>{t('revenueTitle', 'Tushum')}:</span>
                              <span>{Number(item.savdo || 0).toLocaleString('uz-UZ')} {t('sum', 'so‘m')}</span>
                            </div>
                            <div className="text-amber-600 flex items-center justify-between gap-3">
                              <span>{t('totalExpensesTitle', 'Xarajat / Tannarx')}:</span>
                              <span>{Number(item.xarajat || 0).toLocaleString('uz-UZ')} {t('sum', 'so‘m')}</span>
                            </div>
                            <div className={`${isLoss ? 'text-rose-600 font-black' : 'text-emerald-600 font-black'} flex items-center justify-between gap-3 pt-1 border-t border-slate-100`}>
                              <span>{isLoss ? t('grossLossTitle', 'Yalpi zarar') : t('grossProfitTitle', 'Yalpi foyda')}:</span>
                              <span>{isLoss ? `-${Math.abs(item.foyda).toLocaleString('uz-UZ')}` : Number(item.foyda || 0).toLocaleString('uz-UZ')} {t('sum', 'so‘m')}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="savdo" name={t('revenueTitle', 'Tushum')} fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={28} minPointSize={3} />
                  <Bar dataKey="xarajat" name={t('totalExpensesTitle', 'Xarajat / Tannarx')} fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={28} minPointSize={3} />
                  <Bar dataKey="foyda" name={t('grossProfitTitle', 'Yalpi foyda')} maxBarSize={28} minPointSize={3}>
                    {activePeriodData.chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.foyda < 0 ? '#EF4444' : '#10B981'}
                        radius={entry.foyda < 0 ? [0, 0, 6, 6] : [6, 6, 0, 0]}
                      />
                    ))}
                  </Bar>
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
                {activePeriodData.cashReceipts !== baseRevenue && (
                  <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                    Haqiqiy kassa kirimi: {activePeriodData.cashReceipts.toLocaleString()} so‘m
                  </div>
                )}
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
                  {activePeriodData.hasUnverifiedCosts ? (
                    <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60 inline-block">
                      * {activePeriodData.unverifiedCount} ta tovar tannarxisiz
                    </span>
                  ) : (
                    t('basedOnPurchasePrice', 'Xarid narxi asosida')
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            <div className={`bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between group ${
              isAdjustedLoss ? 'hover:border-rose-200' : isAdjustedProfit ? 'hover:border-emerald-200' : 'hover:border-slate-300'
            }`}>
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {isAdjustedLoss ? 'Yalpi zarar' : isAdjustedProfit ? 'Yalpi foyda' : 'Yalpi natija'}
                </span>
                <div className={`text-2xl sm:text-[26px] font-black tracking-tight ${
                  isAdjustedLoss ? 'text-rose-600' : isAdjustedProfit ? 'text-emerald-600' : 'text-slate-700'
                }`}>
                  {isAdjustedLoss
                    ? `-${Math.abs(adjustedProfit).toLocaleString()}`
                    : isAdjustedProfit
                    ? `+${adjustedProfit.toLocaleString()}`
                    : '0'}{' '}
                  <span className={`text-sm font-bold ${
                    isAdjustedLoss ? 'text-rose-500' : isAdjustedProfit ? 'text-emerald-600/70' : 'text-slate-400'
                  }`}>{t('sum', 'so‘m')}</span>
                </div>
                <div className={`text-[11px] font-bold flex items-center gap-1 mt-1 ${
                  isAdjustedLoss ? 'text-rose-600' : isAdjustedProfit ? 'text-emerald-600' : 'text-slate-500'
                }`}>
                  <span>
                    {periodExpenses > 0
                      ? `Qo'sh. xarajat (-${periodExpenses.toLocaleString()} so'm) ayirilgan`
                      : isAdjustedLoss ? 'Zararli davr natijasi'
                      : isAdjustedProfit ? 'Foydali davr natijasi'
                      : 'Nol natija (daromad va xarajat teng)'}
                  </span>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${
                isAdjustedLoss
                  ? 'from-rose-500 to-red-600 shadow-rose-500/25'
                  : isAdjustedProfit
                  ? 'from-emerald-500 to-teal-600 shadow-emerald-500/25'
                  : 'from-slate-500 to-slate-600 shadow-slate-500/25'
              } text-white flex items-center justify-center shadow-lg shrink-0 group-hover:scale-105 transition-transform`}>
                <TrendingUp className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-purple-200 transition-all flex items-center justify-between group">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t('profitabilityRate', 'Rentabellik Ko‘rsatkichi')}
                </span>
                <div className={`text-2xl sm:text-[26px] font-black tracking-tight ${
                  isAdjustedLoss ? 'text-rose-600' : isAdjustedProfit ? 'text-purple-600' : 'text-slate-700'
                }`}>
                  {adjustedMarginPct}
                </div>
                <div className="text-[11px] font-bold text-slate-400 mt-1">
                  {periodExpenses > 0 ? "Xarajatlar hisobga olingan rentabellik" : "Yalpi rentabellik foizi"}
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
                  Tanlangan davr ({timeFilter}) bo‘yicha sotilgan tovarlarning tushum, tannarx va foyda ko‘rsatkichlari
                </p>
              </div>
              <span className="text-xs font-black px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                {periodProductBreakdown.length} ta sotilgan tovar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm font-sans">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-400 font-extrabold uppercase text-[11px] tracking-wider border-b border-slate-200/80">
                    <th className="py-4 px-6">{t('colProduct', 'Mahsulot nomi')}</th>
                    <th className="py-4 px-6">Sotilgan miqdor</th>
                    <th className="py-4 px-6">Savdo summasi</th>
                    <th className="py-4 px-6">Tannarx</th>
                    <th className="py-4 px-6">Yalpi foyda / zarar</th>
                    <th className="py-4 px-6 text-right">{t('marginCol', 'Rentabellik (Marja)')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {periodProductBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                        <Package className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                        <span>Tanlangan davrda ({timeFilter}) tovar savdolari mavjud emas</span>
                      </td>
                    </tr>
                  ) : (
                    periodProductBreakdown.map(p => (
                      <tr key={p.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{p.emoji || '📦'}</span>
                            <span>{tProduct(p.name)}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5 ml-6">
                            {tCategory(p.category || 'Asosiy')}
                          </div>
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-800">
                          {p.qty} <span className="text-xs font-semibold text-slate-500">{tUnit(p.unit)}</span>
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-800">
                          <div>{p.revenue.toLocaleString()} {t('sum', 'so‘m')}</div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            {p.unitPrice.toLocaleString()} {t('sum', 'so‘m')}/{p.unit}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {p.isKnownCost ? (
                            <div>
                              <div className="font-semibold text-slate-700">{p.cost.toLocaleString()} {t('sum', 'so‘m')}</div>
                              <div className="text-[11px] text-slate-400 font-normal">
                                {p.unitCost.toLocaleString()} {t('sum', 'so‘m')}/{p.unit}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/80 text-[11px] font-bold">
                              Noma‘lum
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {p.isKnownCost ? (
                            <span className={`font-black ${p.isLoss ? 'text-rose-600' : p.isZero ? 'text-slate-700' : 'text-emerald-600'}`}>
                              {p.isLoss
                                ? `-${Math.abs(p.profit).toLocaleString()}`
                                : p.isZero
                                ? '0'
                                : `+${p.profit.toLocaleString()}`}{' '}
                              {t('sum', 'so‘m')}
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-bold">
                              Noma‘lum
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {p.isKnownCost ? (
                            <span className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black ${
                              p.isLoss
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                                : p.isZero
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            }`}>
                              {p.margin}%
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200">
                              —
                            </span>
                          )}
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

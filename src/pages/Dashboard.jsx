// src/pages/Dashboard.jsx
import React, { useState, useMemo } from 'react';
import { StatCard } from '../components/StatCard';
import {
  ShoppingCart,
  UserPlus,
  Package,
  ShoppingBag,
  ArrowRight,
  ChevronDown,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Wallet
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
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { QuickActionModal } from '../components/QuickActionModal';
import { StoreIcon } from '../components/StoreIcon';
import { getLocalDateString, getOffsetDateString, isToday } from '../utils/dateUtils';
import {
  isReturnedSale,
  isDebtCollectionSale,
  getSaleFinancials,
  aggregateSalesFinancials,
  formatChartAxisNumber,
  calculateGrowthMetrics
} from '../utils/financeUtils.js';

export const Dashboard = ({ setActiveTab }) => {
  const { user } = useAuth();
  const {
    storeConfig,
    products,
    debts,
    orders,
    activities,
    stats,
    currentStore,
    sales = [],
    isOwner,
    isEmployee,
    isDebtsAllowed,
    isInstallmentAllowed,
    installmentStats,
    currentUserName,
    currentUserId
  } = useStore();

  const { t } = useLanguage();

  const [selectedTimeRange, setSelectedTimeRange] = useState('Bugun');
  const [isTodaySalesExpanded, setIsTodaySalesExpanded] = useState(false);
  const [quickModalType, setQuickModalType] = useState(null); // 'sale' | 'debt' | 'product' | 'order'

  // Store-type revenue scale (kept for fallback when no real data)
  const storeRevenueScale = useMemo(() => {
    const avgPrice = storeConfig.sampleProducts?.length
      ? storeConfig.sampleProducts.reduce((sum, p) => sum + (p.price || 0), 0) / storeConfig.sampleProducts.length
      : 25000;
    const foodBaseline = 20000;
    const ratio = avgPrice / foodBaseline;
    return Math.min(15, Math.max(0.8, ratio));
  }, [storeConfig]);

  // Real today's sales from shared state (filtering returns and debt collections)
  const today = useMemo(() => getLocalDateString(), []);
  const todaySalesList = useMemo(() => {
    return sales.filter(s => {
      if (!s || !isToday(s.date) || isReturnedSale(s) || isDebtCollectionSale(s)) return false;
      return true;
    });
  }, [sales, today]);
  
  // Bugungi tovar savdolari soni
  const todaySalesCount = todaySalesList.length;

  // Bugungi to'lov turlari (Kassa kirimi: Haqiqatda qabul qilingan Naqd va Karta to'lovlari)
  const todayFinSummary = useMemo(() => {
    const todayAllSales = sales.filter(s => {
      if (!s || !isToday(s.date) || isReturnedSale(s)) return false;
      return true;
    });
    return aggregateSalesFinancials(todayAllSales, products, today);
  }, [sales, products, today]);

  const todayCashSales = todayFinSummary.cashSales;
  const todayCardSales = todayFinSummary.cardSales;

  // MUHIM: Bugungi haqiqiy pul tushumi (kassa kirimi)
  // Muddatli shartnomaning to'liq narxi (6M) emas, faqat haqiqatda qabul qilingan summalar
  const todaySalesAmount = todayFinSummary.cashReceipts;

  // Bugungi pul tushumi yozuvlari (grafik uchun — faqat haqiqiy kassa kirimi > 0 bo'lgan tranzaksiyalar)
  const todayCashFlowEntries = useMemo(() => {
    return sales.filter(s => {
      if (!s || !isToday(s.date) || isReturnedSale(s)) return false;
      return true;
    }).map(s => {
      const fin = getSaleFinancials(s, products);
      return { ...s, cashAmount: fin.cashReceipt };
    }).filter(s => s.cashAmount > 0);
  }, [sales, today, products]);

  // Bugun sotilgan mahsulotlar bo'yicha ma'lumotlar
  const todayProductsBreakdown = useMemo(() => {
    const map = {};
    todaySalesList.forEach(s => {
      const name = s.product || 'Noma\'lum mahsulot';
      if (!map[name]) {
        map[name] = {
          name,
          qty: 0,
          unit: s.unit || 'dona',
          total: 0,
          emoji: s.emoji || '📦'
        };
      }
      map[name].qty += Number(s.qty) || 1;
      map[name].total += Number(s.total) || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [todaySalesList]);

  // All-time merchandise sales stats (filtered up to today, excluding future, returns, and debt collections)
  const validAllSales = useMemo(() => {
    return sales.filter(s => {
      if (!s || isReturnedSale(s) || isDebtCollectionSale(s)) return false;
      const sDate = s.date || today;
      if (sDate > today) return false;
      return true;
    });
  }, [sales, today]);
  const allSalesAmount = useMemo(() => validAllSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0), [validAllSales]);
  const allSalesCount = validAllSales.length;

  // Barcha kunlar uchun haqiqiy pul tushumi yozuvlari (grafik uchun)
  const allCashFlowEntries = useMemo(() => {
    return sales.filter(s => {
      if (!s || isReturnedSale(s)) return false;
      const sDate = s.date || today;
      if (sDate > today) return false;
      return true;
    }).map(s => {
      const fin = getSaleFinancials(s, products);
      return { ...s, cashAmount: fin.cashReceipt };
    }).filter(s => s.cashAmount > 0);
  }, [sales, today, products]);
  const allCashTotal = useMemo(() => allCashFlowEntries.reduce((sum, s) => sum + s.cashAmount, 0), [allCashFlowEntries]);
  const allCashCount = allCashFlowEntries.length;

  // Display stats based on selected time range
  const displaySalesAmount = selectedTimeRange === 'Barchasi' ? allCashTotal : todaySalesAmount;
  const displaySalesCount = selectedTimeRange === 'Barchasi' ? allSalesCount : todaySalesCount;

  // Kechagi kassa kirimi bilan solishtirish (haqiqiy pul tushumi asosida)
  const salesGrowthMetrics = useMemo(() => {
    const yesterdayStr = getOffsetDateString(-1);
    const yesterdayAllSales = sales.filter(s => s && s.date === yesterdayStr && !isReturnedSale(s));
    const yesterdayFin = aggregateSalesFinancials(yesterdayAllSales, products, yesterdayStr);
    const yesterdayCash = yesterdayFin.cashReceipts;
    return calculateGrowthMetrics(todaySalesAmount, yesterdayCash);
  }, [todaySalesAmount, sales, products]);

  // Dynamic Sales timeline chart data — real data from sales shared state
  const salesChartData = useMemo(() => {
    if (selectedTimeRange === 'Barchasi') {
      const allSales = [...allCashFlowEntries].sort((a, b) => {
        const dComp = (a.date || '').localeCompare(b.date || '');
        if (dComp !== 0) return dComp;
        return (a.time || '').localeCompare(b.time || '');
      });

      if (allSales.length === 0) {
        return [
          { time: '08:00', fullDate: today, clockTime: '08:00', product: '', amount: 0 },
          { time: '12:00', fullDate: today, clockTime: '12:00', product: '', amount: 0 },
        ];
      }

      if (allSales.length === 1) {
        const s = allSales[0];
        return [
          { time: 'Boshlanish', fullDate: s.date || today, clockTime: '00:00', product: '', amount: 0 },
          {
            time: s.time || '12:00',
            fullDate: s.date || today,
            clockTime: s.time || '',
            product: s.product || '',
            qty: s.qty,
            seller: s.seller,
            paymentType: s.paymentType,
            amount: s.cashAmount
          }
        ];
      }

      return allSales.map((s, idx) => {
        const dateStr = s.date || 'Bugun';
        const timeStr = s.time || '';
        let label = timeStr;
        if (s.date) {
          const parts = s.date.split('-');
          if (parts.length === 3) {
            label = `${parts[2]}.${parts[1]} ${timeStr}`.trim();
          } else {
            label = `${s.date} ${timeStr}`.trim();
          }
        }
        return {
          time: label || `S-${idx + 1}`,
          fullDate: dateStr,
          clockTime: timeStr,
          product: s.product || '',
          qty: s.qty,
          seller: s.seller,
          paymentType: s.paymentType,
          amount: s.cashAmount
        };
      });
    }

    // Default 'Bugun' view:
    const sortedToday = [...todayCashFlowEntries].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    if (sortedToday.length === 0) {
      return [
        { time: '08:00', fullDate: today, clockTime: '08:00', product: '', amount: 0 },
        { time: '12:00', fullDate: today, clockTime: '12:00', product: '', amount: 0 },
        { time: '16:00', fullDate: today, clockTime: '16:00', product: '', amount: 0 },
        { time: '20:00', fullDate: today, clockTime: '20:00', product: '', amount: 0 },
      ];
    }

    if (sortedToday.length === 1) {
      const s = sortedToday[0];
      return [
        { time: '08:00', fullDate: today, clockTime: '08:00', product: 'Boshlanish', amount: 0 },
        {
          time: s.time || '12:00',
          fullDate: s.date || today,
          clockTime: s.time || '',
          product: s.product || '',
          qty: s.qty,
          seller: s.seller,
          paymentType: s.paymentType,
          amount: s.cashAmount
        }
      ];
    }

    return sortedToday.map((s, idx) => ({
      time: s.time || `T-${idx + 1}`,
      fullDate: s.date || today,
      clockTime: s.time || '',
      product: s.product || '',
      qty: s.qty,
      seller: s.seller,
      paymentType: s.paymentType,
      amount: s.cashAmount
    }));
  }, [selectedTimeRange, allCashFlowEntries, todayCashFlowEntries, today]);

  // Top products pie/donut data — from real sales aggregation
  const pieData = useMemo(() => {
    const COLORS = ['#10B981', '#3B82F6', '#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899'];
    const activeValidSales = sales.filter(s => s && !isReturnedSale(s) && (s.date || today) <= today);
    if (activeValidSales.length === 0) {
      return [
        { name: "Ma'lumot yo'q", value: 1, percentage: '100%', color: '#CBD5E1' },
      ];
    }
    // Aggregate sales by product name
    const productMap = {};
    activeValidSales.forEach(s => {
      const name = s.product || 'Noma\'lum';
      if (!productMap[name]) productMap[name] = 0;
      productMap[name] += Number(s.qty) || 1;
    });
    const sorted = Object.entries(productMap).sort((a, b) => b[1] - a[1]);
    const topItems = sorted.slice(0, 5);
    const othersQty = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    const totalQty = sorted.reduce((s, [, v]) => s + v, 0);
    const result = topItems.map(([name, value], i) => ({
      name,
      value,
      percentage: totalQty > 0 ? `${Math.round((value / totalQty) * 100)}%` : '0%',
      color: COLORS[i % COLORS.length]
    }));
    if (othersQty > 0) {
      result.push({
        name: 'Boshqalar',
        value: othersQty,
        percentage: `${Math.round((othersQty / totalQty) * 100)}%`,
        color: '#CBD5E1'
      });
    }
    return result;
  }, [sales, storeConfig]);

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-100 text-center font-sans space-y-0.5">
          <div className="text-[10px] text-slate-400 font-extrabold uppercase">
            {data.fullDate ? `${data.fullDate} ${data.clockTime || ''}`.trim() : data.time}
          </div>
          {data.product && data.product !== 'Boshlanish' && (
            <div className="text-[11px] font-bold text-slate-800 truncate max-w-[180px] mx-auto">
              {data.product} {data.qty ? `(${data.qty} dona)` : ''}
            </div>
          )}
          {data.paymentType && (
            <div className="text-[10px] font-semibold text-slate-500">
              To‘lov: <span className="font-bold text-slate-700">{data.paymentType}</span>
            </div>
          )}
          <div className="text-xs sm:text-sm font-black text-emerald-600">
            {payload[0].value.toLocaleString()} {t('sum', 'so‘m')}
          </div>
        </div>
      );
    }
    return null;
  };

  const getStatusBadge = (status) => {
    if (status === 'Yetarli') {
      return 'bg-emerald-50 text-emerald-600 border border-emerald-100/80';
    }
    if (status === 'Kam') {
      return 'bg-amber-50 text-amber-600 border border-amber-100/80';
    }
    return 'bg-rose-50 text-rose-600 border border-rose-100/80';
  };

  const getStatusLabel = (status) => {
    if (status === 'Yetarli') return t('statusInStock', 'Yetarli');
    if (status === 'Kam') return t('statusLow', 'Kam');
    return t('statusOut', 'Tugagan');
  };

  const userName = user?.displayName ? user.displayName.split(' ')[0] : (currentUserName || 'Foydalanuvchi');
  const storeType = currentStore?.type || storeConfig.id || 'food';

  const visibleActivities = useMemo(() => {
    if (isOwner) return activities;
    return activities.filter(act =>
      (currentUserName && act.user === currentUserName) ||
      (currentUserId && act.userId === currentUserId)
    );
  }, [activities, isOwner, currentUserName, currentUserId]);

  // Real alerts calculated dynamically from actual products, debts, and orders
  const realAlerts = useMemo(() => {
    const list = [];
    (products || []).forEach(p => {
      if (p.stock === 0 || p.status === 'Tugagan') {
        list.push({
          id: `alert-stock-out-${p.id}`,
          dotColor: 'bg-rose-500',
          dotText: '!',
          title: `${p.name} — omborda tugagan`,
          subtitle: 'Zaxira 0 dona',
          subtitleColor: 'text-rose-500'
        });
      } else if (p.stock <= 5 || p.status === 'Kam') {
        list.push({
          id: `alert-stock-low-${p.id}`,
          dotColor: 'bg-amber-500',
          dotText: '!',
          title: `${p.name} — ${p.stock} ${p.unit || 'dona'} qoldi`,
          subtitle: 'Kam miqdorda',
          subtitleColor: 'text-amber-500'
        });
      }
    });

    (debts || []).forEach(d => {
      if (!d.isPaid && (Number(d.amount) || 0) > 0) {
        if (d.status === 'Kechikkan' || (d.dueDate && d.dueDate < today)) {
          list.push({
            id: `alert-debt-overdue-${d.id}`,
            dotColor: 'bg-rose-500',
            dotText: 'Q',
            title: `${d.name} — ${(Number(d.amount) || 0).toLocaleString()} so‘m qarz`,
            subtitle: 'Muddati kechikkan',
            subtitleColor: 'text-rose-500'
          });
        } else if (d.status === 'Bugun to‘lanishi kerak' || d.dueDate === today) {
          list.push({
            id: `alert-debt-today-${d.id}`,
            dotColor: 'bg-amber-500',
            dotText: 'Q',
            title: `${d.name} — ${(Number(d.amount) || 0).toLocaleString()} so‘m qarz`,
            subtitle: 'Bugun to‘lanishi kerak',
            subtitleColor: 'text-amber-600'
          });
        }
      }
    });

    (orders || []).forEach(o => {
      if (o.status === "Hali yo‘lda" || o.status === "Hali yo'lda") {
        list.push({
          id: `alert-order-${o.id}`,
          dotColor: 'bg-blue-500',
          dotText: 'B',
          title: `${o.product || 'Buyurtma'} — yo‘lda`,
          subtitle: `Yetkazuvchi: ${o.supplier || o.customerName || 'Ta’minotchi'}`,
          subtitleColor: 'text-blue-500'
        });
      }
    });

    return list.slice(0, 4);
  }, [products, debts, orders, today]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 font-sans select-none max-w-[1600px] mx-auto">
      {/* Welcome Greeting Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center space-x-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0 p-2.5">
            <StoreIcon type={storeType} className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{t('greetingMorning', 'Xayrli kun')}, {userName}!</span>
            </h1>
            <p className="text-xs font-medium text-slate-400 mt-1">
              Do‘koningizning asosiy ko‘rsatkichlarini bir joyda kuzating.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-semibold text-slate-500">
              <span className="text-slate-800 font-bold">{currentStore?.name || storeConfig.name}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {t('activeStatus', 'Faol')}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="text-slate-400 font-medium">
                {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
            {t('appName', 'Savatchi')} 2.0 SaaS
          </span>
        </div>
      </div>

      {/* Row 1: 4 Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title={selectedTimeRange === 'Barchasi' ? t('allSales', 'BARCHA SAVDO') : t('todaySales', 'BUGUNGI SAVDO')}
          value={`${displaySalesAmount.toLocaleString()} ${t('sum', 'so\u2018m')}`}
          badgeText={
            selectedTimeRange === 'Barchasi'
              ? `${allCashCount} ta savdo`
              : salesGrowthMetrics.isNew
              ? 'Yangi'
              : salesGrowthMetrics.formattedPercent
          }
          trend={
            selectedTimeRange === 'Barchasi'
              ? 'neutral'
              : salesGrowthMetrics.isPositive
              ? 'up'
              : salesGrowthMetrics.isNegative
              ? 'down'
              : 'neutral'
          }
          type="sales"
          sparklineColor="#10B981"
          sparklineData={salesChartData.length > 0 && displaySalesAmount > 0 ? salesChartData.map(d => ({ v: d.amount })) : [{ v: 0 }, { v: 0 }]}
        />
        <StatCard
          title={t('inventoryStatus', 'OMBOR HOLATI')}
          value={`${stats.totalInventoryCount || products.length} ${t('itemsUnit', 'ta')}`}
          subtext={t('productsWord', 'mahsulot')}
          linkText={t('viewInventory', 'Omborni ko‘rish →')}
          type="inventory"
          showChart={false}
          onAction={() => setActiveTab && setActiveTab('inventory')}
        />
        {isDebtsAllowed ? (
          <StatCard
            title={t('totalDebts', 'JAMI QARZ')}
            value={`${(stats.totalDebtsAmount ?? 0).toLocaleString()} ${t('sum', 'so‘m')}`}
            subtext={`${stats.activeDebtsCount ?? 0} ${t('activeClients', 'faol mijoz')}`}
            linkText={t('viewDebts', 'Qarzlarni ko‘rish →')}
            type="debt"
            showChart={false}
            onAction={() => setActiveTab && setActiveTab('debtors')}
          />
        ) : isInstallmentAllowed ? (
          <StatCard
            title={t('navInstallments', 'MUDDATLI TO‘LOV QOLDIQ')}
            value={`${((installmentStats?.remainingTotalSum) ?? 0).toLocaleString()} ${t('sum', 'so‘m')}`}
            subtext={`${installmentStats?.activeContracts ?? 0} faol shartnoma`}
            linkText={t('viewInstallments', 'Muddatli to‘lovni ko‘rish →')}
            type="debt"
            showChart={false}
            onAction={() => setActiveTab && setActiveTab('installments')}
          />
        ) : (
          <StatCard
            title={t('totalDebts', 'JAMI QARZ')}
            value={`0 ${t('sum', 'so‘m')}`}
            subtext="Mavjud emas"
            type="debt"
            showChart={false}
          />
        )}
        <StatCard
          title={t('ordersTitle', 'BUYURTMALAR')}
          value={`${stats.pendingOrdersCount || orders.length} ${t('itemsUnit', 'ta')}`}
          subtext={t('waitingOrders', 'kutilmoqda')}
          linkText={t('viewOrders', 'Buyurtmalarni ko‘rish →')}
          type="orders"
          showChart={false}
          onAction={() => setActiveTab && setActiveTab('orders')}
        />
      </div>

      {/* Row 2: Middle 3 Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: MUHIM MAHSULOTLAR */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <span>{t('importantProducts', 'MUHIM MAHSULOTLAR')}</span>
              </h3>
              <button
                onClick={() => setActiveTab && setActiveTab('inventory')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>{t('all', 'Barchasi')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {products.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6">
                  {t('noProductsYet', 'Hozircha mahsulotlar mavjud emas')}
                </div>
              ) : (
                products.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-extrabold text-slate-900 truncate max-w-[140px]">{p.name}</div>
                        <div className="text-[11px] text-slate-400 font-semibold">
                          {p.stock} {p.unit || t('unitPiece', 'dona')}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-extrabold px-3 py-1 rounded-xl shrink-0 ${getStatusBadge(p.status)}`}>
                      {getStatusLabel(p.status)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 2: E'TIBOR BERISH KERAK */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>{t('needsAttention', 'E’TIBOR BERISH KERAK')}</span>
              </h3>
            </div>

            <div className="mt-3.5 space-y-3.5">
              {realAlerts.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6">
                  {t('noAlerts', 'Hozircha e’tibor talab qiladigan holatlar yo‘q')}
                </div>
              ) : (
                realAlerts.map((a) => (
                  <div key={a.id} className="flex items-start space-x-3 p-1">
                    <div
                      className={`w-4 h-4 rounded-full ${a.dotColor} mt-0.5 shrink-0 flex items-center justify-center text-[9px] text-white font-black`}
                    >
                      {a.dotText || '!'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 leading-snug">{a.title}</div>
                      <div className={`text-[11px] font-semibold mt-0.5 ${a.subtitleColor}`}>{a.subtitle}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 3: BUGUNGI SAVDO GRAFIKASI */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>{selectedTimeRange === 'Barchasi' ? 'BARCHA SAVDOLAR GRAFIKASI' : t('todaySalesChart', 'BUGUNGI SAVDO GRAFIKASI')}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  const next = !isTodaySalesExpanded;
                  setIsTodaySalesExpanded(next);
                  setSelectedTimeRange(next ? 'Barchasi' : 'Bugun');
                }}
                className={`btn-pill-base text-xs font-bold px-3 py-1 rounded-xl ${
                  isTodaySalesExpanded
                    ? 'btn-pill-emerald font-black'
                    : 'btn-pill-inactive text-emerald-700 dark:text-emerald-300'
                }`}
              >
                <span>{isTodaySalesExpanded ? "Qisqartirish" : t('all', 'Barchasi')}</span>
                {isTodaySalesExpanded && <span className="text-[10px]">✕</span>}
              </button>
            </div>

            <div className="h-48 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesChartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatChartAxisNumber}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                    dot={{ r: 4, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Kengaytirilgan Bugungi Savdo Bo'limi (Barchasi bosilganda) */}
      {isTodaySalesExpanded && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-200/90 shadow-md space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                <TrendingUp className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>BUGUNGI SAVDONING TO‘LIQ MA’LUMOTLARI</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Bugun
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Bugungi kunda amalga oshirilgan barcha savdolar, to‘lov turlari va mahsulotlar tafsiloti
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setIsTodaySalesExpanded(false); setSelectedTimeRange('Bugun'); }}
              className="btn-pill-base btn-pill-inactive self-end sm:self-center px-3.5 py-1.5 rounded-xl text-xs font-bold"
            >
              <span>Yopish</span>
              <span className="text-sm leading-none">✕</span>
            </button>
          </div>

          {/* 4 Summary Mini Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Jami summa */}
            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100/80">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Bugungi Pul Tushumi</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                {todaySalesAmount.toLocaleString()} <span className="text-xs font-bold">so‘m</span>
              </div>
              <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                {salesGrowthMetrics.formattedPercent} kechagiga nisbatan
              </div>
            </div>

            {/* 2. Savdolar soni */}
            <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100/80">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">Savdolar Soni</span>
              <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
                {todaySalesCount} <span className="text-xs font-bold">ta chek</span>
              </div>
              <div className="text-[11px] font-semibold text-blue-600 mt-0.5">
                O‘rtacha: {todaySalesCount > 0 ? Math.round(todaySalesAmount / todaySalesCount).toLocaleString() : 0} so‘m
              </div>
            </div>

            {/* 3. Naqd savdo */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Naqd Savdo</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {todayCashSales.toLocaleString()} <span className="text-xs font-bold text-slate-500">so‘m</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                {todaySalesAmount > 0 ? Math.round((todayCashSales / todaySalesAmount) * 100) : 0}% ulush
              </div>
            </div>

            {/* 4. Karta orqali */}
            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100/80">
              <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">Karta Savdosi</span>
              <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1">
                {todayCardSales.toLocaleString()} <span className="text-xs font-bold text-purple-600">so‘m</span>
              </div>
              <div className="text-[11px] font-semibold text-purple-600 mt-0.5">
                {todaySalesAmount > 0 ? Math.round((todayCardSales / todaySalesAmount) * 100) : 0}% ulush
              </div>
            </div>
          </div>

          {/* Kengaytirilgan Grafik */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Bugungi Savdo Dinamikasi Grafigi
              </h4>
              <span className="text-[11px] font-semibold text-slate-400">
                Savdo vaqti va summasi
              </span>
            </div>
            <div className="h-64 w-full bg-slate-50/50 rounded-2xl p-3 border border-slate-100">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesChartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expandedSalesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={10}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatChartAxisNumber}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#10B981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#expandedSalesGrad)"
                    dot={{ r: 4, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#10B981', stroke: '#fff', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bugun Sotilgan Mahsulotlar & Savdo Tafsilotlari */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* 1. Bugun Sotilgan Mahsulotlar */}
            <div className="border border-slate-200/80 rounded-2xl p-4 bg-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Bugun Sotilgan Mahsulotlar ({todayProductsBreakdown.length})
                </h4>
                <span className="text-[11px] font-bold text-emerald-600">
                  {todayProductsBreakdown.reduce((s, p) => s + p.qty, 0)} dona sotildi
                </span>
              </div>
              <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                {todayProductsBreakdown.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-6">
                    Bugun hali mahsulot sotilmagan
                  </div>
                ) : (
                  todayProductsBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-xs">
                      <div className="flex items-center space-x-2.5 truncate">
                        <span className="text-base">{item.emoji}</span>
                        <div className="truncate">
                          <span className="font-bold text-slate-900 truncate block">{item.name}</span>
                          <span className="text-[11px] text-slate-400">{item.qty} {item.unit}</span>
                        </div>
                      </div>
                      <div className="font-extrabold text-emerald-600 shrink-0">
                        {item.total.toLocaleString()} so‘m
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Bugungi Barcha Savdolar Tafsiloti */}
            <div className="border border-slate-200/80 rounded-2xl p-4 bg-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Savdolar Ro‘yxati ({todaySalesList.length})
                </h4>
                <span className="text-[11px] font-bold text-slate-400">
                  {today}
                </span>
              </div>
              <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                {todaySalesList.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-6">
                    Bugungi savdolar mavjud emas
                  </div>
                ) : (
                  todaySalesList.map((sale, idx) => (
                    <div key={sale.id || idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-xs border border-slate-100">
                      <div className="flex items-center space-x-2.5 truncate">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 font-extrabold text-[10px] rounded-lg shrink-0">
                          {sale.time || 'Bugun'}
                        </span>
                        <div className="truncate">
                          <span className="font-bold text-slate-900 block truncate">{sale.product}</span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {sale.qty} {sale.unit || 'dona'} • {sale.seller || 'Sotuvchi'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-slate-900 block">
                          {Number(sale.total).toLocaleString()} so‘m
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          sale.paymentType === 'Karta' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {sale.paymentType || 'Naqd'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row 3: Bottom Cards Grid (Employee does not see Recent Actions panel) */}
      <div className={`grid grid-cols-1 ${isEmployee ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-5`}>
        {/* Column 1: TEZKOR AMALLAR */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 pb-3.5 border-b border-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>{t('quickActions', 'TEZKOR AMALLAR')}</span>
            </h3>

            <div className="grid grid-cols-2 gap-3.5 mt-4">
              {/* Tile 1: Yangi savdo */}
              <button
                onClick={() => setQuickModalType('sale')}
                className="bg-emerald-50/80 hover:bg-emerald-100 p-4 rounded-2xl text-center border border-emerald-100 transition-all group flex flex-col items-center justify-center space-y-2 cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">{t('newSaleAction', 'Yangi savdo')}</div>
                  <div className="text-[10px] font-semibold text-emerald-600">{t('newSaleSubtitle', 'Savdo qilish')}</div>
                </div>
              </button>

              {/* Tile 2: Qarz qo'shish / Muddatli to'lov */}
              {isDebtsAllowed ? (
                <button
                  onClick={() => setQuickModalType('debt')}
                  className="bg-blue-50/80 hover:bg-blue-100 p-4 rounded-2xl text-center border border-blue-100 transition-all group flex flex-col items-center justify-center space-y-2 cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                    <UserPlus className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900">{t('addDebtAction', 'Qarz qo‘shish')}</div>
                    <div className="text-[10px] font-semibold text-blue-600">{t('addDebtSubtitle', 'Qarz kiritish')}</div>
                  </div>
                </button>
              ) : isInstallmentAllowed ? (
                <button
                  onClick={() => setActiveTab && setActiveTab('installments')}
                  className="bg-blue-50/80 hover:bg-blue-100 p-4 rounded-2xl text-center border border-blue-100 transition-all group flex flex-col items-center justify-center space-y-2 cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                    <Wallet className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900">{t('navInstallments', 'Muddatli to‘lov')}</div>
                    <div className="text-[10px] font-semibold text-blue-600">Bo‘lib to‘lash</div>
                  </div>
                </button>
              ) : null}

              {/* Tile 3: Mahsulot qo'shish */}
              <button
                onClick={() => setQuickModalType('product')}
                className="bg-amber-50/80 hover:bg-amber-100 p-4 rounded-2xl text-center border border-amber-100 transition-all group flex flex-col items-center justify-center space-y-2 cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                  <Package className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">{t('addProductAction', 'Mahsulot qo‘shish')}</div>
                  <div className="text-[10px] font-semibold text-amber-600">{t('addProductSubtitle', 'Yangi mahsulot')}</div>
                </div>
              </button>

              {/* Tile 4: Buyurtma qo'shish */}
              <button
                onClick={() => setQuickModalType('order')}
                className="bg-purple-50/80 hover:bg-purple-100 p-4 rounded-2xl text-center border border-purple-100 transition-all group flex flex-col items-center justify-center space-y-2 cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">{t('addOrderAction', 'Buyurtma qo‘shish')}</div>
                  <div className="text-[10px] font-semibold text-purple-600">{t('addOrderSubtitle', 'Yangi buyurtma')}</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Column 2: SO'NGGI HARAKATLAR (Faqat egasi uchun, xodimga ko'rsatilmaydi) */}
        {!isEmployee && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {t('recentActions', 'SO‘NGGI HARAKATLAR')}
                </h3>
                {isOwner && (
                  <button
                    onClick={() => setActiveTab && setActiveTab('history')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>{t('all', 'Barchasi')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="mt-3.5 space-y-3">
                {visibleActivities.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-6">
                    {t('noRecentActivities', 'Harakatlar tarixi bo‘sh')}
                  </div>
                ) : (
                  visibleActivities.slice(0, 5).map((act) => (
                    <div key={act.id} className="flex items-center justify-between text-xs p-1">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full ${act.bg || 'bg-blue-500'} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs`}
                        >
                          {act.initial || act.user?.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 mr-2">{act.user}</span>
                          <span className="text-[11px] font-medium text-slate-500">{act.detail}</span>
                        </div>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-400 shrink-0">{act.time}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Column 3: TOP MAHSULOTLAR */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 pb-3.5 border-b border-slate-100">
              {t('topProducts', 'TOP MAHSULOTLAR')}
            </h3>

            <div className="flex items-center justify-between mt-4">
              {/* Donut Chart */}
              <div className="w-36 h-36 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip formatter={(val, name) => [`${val} dona`, name]} />
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={62}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="space-y-2 text-xs font-medium pl-3 w-full">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      ></span>
                      <span className="text-slate-700 font-semibold truncate max-w-[100px]">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500">
                      {item.value} <span className="text-slate-400 font-normal">({item.percentage})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Modal */}
      <QuickActionModal
        type={quickModalType}
        isOpen={!!quickModalType}
        onClose={() => setQuickModalType(null)}
      />
    </div>
  );
};

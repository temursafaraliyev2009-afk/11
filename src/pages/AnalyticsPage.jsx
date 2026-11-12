import React, { useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalDateString } from '../utils/dateUtils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, DollarSign, ArrowLeft, Sparkles, Zap, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatChartAxisNumber, computeChartDomain } from '../utils/financeUtils.js';

export const AnalyticsPage = () => {
  const { formatPrice, orders = [] } = useCart();
  const { t, tCategory } = useLanguage();

  const now = new Date();
  const todayStr = getLocalDateString(now);

  // Haqiqiy buyurtmalar asosida so'nggi 6 oy statistikasini dinamik hisoblash
  const monthlySpending = useMemo(() => {
    const monthNames = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    const currentYear = parseInt(todayStr.substring(0, 4), 10);
    const currentMonth = parseInt(todayStr.substring(5, 7), 10); // 1-12

    const months = [];
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      const mStr = String(m).padStart(2, '0');
      const prefix = `${y}-${mStr}`;
      const monthOrders = (orders || []).filter(ord => {
        const oDate = ord.date || ord.createdAt || '';
        return oDate.startsWith(prefix);
      });
      const amount = monthOrders.reduce((sum, ord) => sum + (Number(ord.total) || 0), 0);
      months.push({
        month: monthNames[m - 1],
        yearMonth: prefix,
        amount
      });
    }
    return months;
  }, [orders, todayStr]);

  const spendingDomain = useMemo(() => {
    return computeChartDomain(monthlySpending, ['amount'], 500000);
  }, [monthlySpending]);

  // Haqiqiy buyurtmalar asosida kategoriyalar ulushini hisoblash
  const categoryBreakdown = useMemo(() => {
    const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
    const map = {};

    (orders || []).forEach(ord => {
      if (Array.isArray(ord.items) && ord.items.length > 0) {
        ord.items.forEach(item => {
          const cat = item.category || 'Boshqa';
          map[cat] = (map[cat] || 0) + (Number(item.quantity || item.qty) || 1);
        });
      } else if (ord.category) {
        map[ord.category] = (map[ord.category] || 0) + (Number(ord.itemsCount) || 1);
      }
    });

    const entries = Object.entries(map);
    if (entries.length === 0) {
      return [
        { name: t('noData', 'Ma\'lumot yo\'q'), value: 1, color: '#CBD5E1', isPlaceholder: true }
      ];
    }

    const totalQty = entries.reduce((s, [, v]) => s + v, 0);
    return entries.map(([name, val], idx) => ({
      name: tCategory(name, name),
      value: totalQty > 0 ? Math.round((val / totalQty) * 100) : 0,
      color: COLORS[idx % COLORS.length]
    }));
  }, [orders, t, tCategory]);

  const totalSpent = useMemo(() => {
    return (orders || []).reduce((sum, ord) => sum + (Number(ord.total) || 0), 0);
  }, [orders]);

  const totalSaved = useMemo(() => {
    return (orders || []).reduce((sum, ord) => sum + (Number(ord.discount) || 0), 0);
  }, [orders]);

  const activeMonthsWithOrders = useMemo(() => {
    return monthlySpending.filter(m => m.amount > 0).length || 1;
  }, [monthlySpending]);

  const avgMonthlyExpense = totalSpent > 0 ? Math.round(totalSpent / activeMonthsWithOrders) : 0;

  return (
    <div className="min-h-screen py-8 max-w-6xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="pb-6 border-b border-gray-200 dark:border-gray-800">
        <Link to="/store/" className="inline-flex items-center space-x-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-2 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('backToCatalog', 'Katalogga qaytish')}</span>
        </Link>
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center space-x-3">
          <TrendingUp className="w-7 h-7 text-emerald-500" />
          <span>{t('analyticsTitle', 'Xarajatlar & Shaxsiy Tahlillar')}</span>
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t('analyticsSubtitle', "Savatchi platformasidagi barcha xaridlaringiz va tejab qolgan mablag'laringiz tahlili")}
        </p>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <DollarSign className="w-24 h-24" />
          </div>
          <div className="text-xs uppercase tracking-wider font-bold opacity-80">{t('totalExpenses', 'Jami Xarajatlar')}</div>
          <div className="text-3xl font-black mt-2">{formatPrice(totalSpent)}</div>
          <div className="text-xs mt-4 opacity-90 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {totalSpent > 0
                ? `${t('avgMonthlyExpense', "O'rtacha oylik")} ${formatPrice(avgMonthlyExpense)}`
                : t('noOrdersYet', "Xaridlar mavjud emas")}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Award className="w-24 h-24" />
          </div>
          <div className="text-xs uppercase tracking-wider font-bold opacity-80">{t('totalSavedAmount', 'Tejab Qolindi')}</div>
          <div className="text-3xl font-black mt-2">{formatPrice(totalSaved)}</div>
          <div className="text-xs mt-4 opacity-90 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            <span>{t('savedByPromo', 'Promo-kodlar & Chegirmalar hisobiga')}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-gray-400">{t('statusLevel', 'Status darajasi')}</div>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {totalSpent > 10000000 ? t('goldClient', 'GOLD Mijoz 👑') : totalSpent > 0 ? t('silverClient', 'SILVER Mijoz 🥈') : t('newClient', 'Yangi Mijoz ✨')}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {t('nextLevelPrompt', "Keyingi darajaga o'tish uchun buyurtma bering va Bepul Yetkazish VIP ga ega bo'ling.")}
            </p>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, (totalSpent / 10000000) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        {/* Monthly Spending Bar Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>{t('monthlyTrend', "Oylar bo'yicha dinamika (So'm)")}</span>
            </h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlySpending}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                barCategoryGap="25%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={spendingDomain}
                  tickFormatter={formatChartAxisNumber}
                />
                <Tooltip
                  formatter={(val) => [`${Number(val).toLocaleString('uz-UZ')} ${t('sum', "so'm")}`, t('totalExpensesTitle', 'Xarajat')]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} minPointSize={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <PieIcon className="w-4 h-4 text-emerald-500" />
            <span>{t('categoryShare', 'Kategoriyalar Ulushi (%)')}</span>
          </h3>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={categoryBreakdown[0]?.isPlaceholder ? 0 : 5}
                  dataKey="value"
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name, props) => [props.payload?.isPlaceholder ? t('noData', 'Ma\'lumot yo\'q') : `${val}%`, t('categoryShare', 'Ulush')]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

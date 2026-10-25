import React from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
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
  Legend
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, DollarSign, ArrowLeft, Sparkles, Zap, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

const MONTHLY_SPENDING = [
  { month: 'Apr', amount: 850000 },
  { month: 'May', amount: 1200000 },
  { month: 'Iyun', amount: 950000 },
  { month: 'Iyul', amount: 1400000 },
  { month: 'Avg', amount: 2100000 },
  { month: 'Sen', amount: 1563000 }
];

export const AnalyticsPage = () => {
  const { formatPrice, orders } = useCart();
  const { t, tCategory } = useLanguage();

  const CATEGORY_BREAKDOWN = [
    { name: tCategory("Oziq-ovqat & Go'sht", "Oziq-ovqat & Go'sht"), value: 45, color: '#10b981' },
    { name: tCategory('Sarxil Mevalar', 'Sarxil Mevalar'), value: 25, color: '#f59e0b' },
    { name: tCategory('Elektronika', 'Elektronika'), value: 20, color: '#3b82f6' },
    { name: tCategory('Maishiy Texnika', 'Maishiy Texnika'), value: 10, color: '#8b5cf6' }
  ];

  const totalSpent = orders.reduce((sum, ord) => sum + ord.total, 1563000);
  const totalSaved = Math.round(totalSpent * 0.15);

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
            <span>{t('avgMonthlyExpense', "O'rtacha oylik 1.2 mln so'm")}</span>
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
              {t('goldClient', 'GOLD Mijoz 👑')}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {t('nextLevelPrompt', "Keyingi darajaga o'tish uchun yana 2 ta buyurtma bering va Bepul Yetkazish VIP ga ega bo'ling.")}
            </p>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-emerald-500 h-full w-3/4 rounded-full" />
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
              <BarChart data={MONTHLY_SPENDING}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip
                  formatter={(val) => [`${val.toLocaleString()} ${t('sum', "so'm")}`, t('totalExpensesTitle', 'Xarajat')]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[8, 8, 0, 0]} />
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
                  data={CATEGORY_BREAKDOWN}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {CATEGORY_BREAKDOWN.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [`${val}%`, t('categoryShare', 'Ulush')]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

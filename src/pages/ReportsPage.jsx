import React, { useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { BarChart3, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine
} from 'recharts';
import { useStore } from '../context/StoreContext';
import { getLocalDateString } from '../utils/dateUtils';
import {
  aggregateSalesFinancials,
  isReturnedSale,
  isDebtCollectionSale,
  formatChartAxisNumber,
  computeChartDomain
} from '../utils/financeUtils.js';

export const ReportsPage = () => {
  const { sales = [], products = [], currentStore, isEmployee } = useStore();
  const { t } = useLanguage();

  const now = new Date();
  const todayStr = getLocalDateString(now);
  const currentYear = todayStr.substring(0, 4);
  const currentMonthNum = parseInt(todayStr.substring(5, 7), 10); // 1-12 Asia/Tashkent

  // Valid non-future merchandise sales excluding returns and debt collections
  const validSales = useMemo(() => {
    return sales.filter(s => {
      if (!s) return false;
      const sDate = s.date || todayStr;
      if (sDate > todayStr) return false;
      return !isReturnedSale(s) && !isDebtCollectionSale(s);
    });
  }, [sales, todayStr]);

  // Year sales
  const yearSales = useMemo(() => {
    return validSales.filter(s => (s.date || todayStr).startsWith(currentYear));
  }, [validSales, currentYear, todayStr]);

  const monthLabels = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

  const monthlyData = useMemo(() => {
    return monthLabels.map((month, i) => {
      const mIdx = i + 1;
      let monthRev = 0;
      let monthCost = 0;
      let monthProfit = 0;
      let isLoss = false;

      if (mIdx <= currentMonthNum) {
        const mStr = String(mIdx).padStart(2, '0');
        const mSales = yearSales.filter(s => (s.date || todayStr).substring(5, 7) === mStr);
        const mFin = aggregateSalesFinancials(mSales, products, todayStr);
        monthRev = mFin.revenue;
        monthCost = mFin.cost;
        monthProfit = mFin.profit;
        isLoss = mFin.isLoss;
      }
      return {
        month,
        sales: monthRev,
        cost: monthCost,
        profit: monthProfit,
        isLoss
      };
    });
  }, [yearSales, currentMonthNum, todayStr, products]);

  const chartDomain = useMemo(() => {
    return computeChartDomain(monthlyData, ['sales', 'cost', 'profit'], 100000);
  }, [monthlyData]);

  // Current month stats
  const curMonthStr = String(currentMonthNum).padStart(2, '0');
  const currentMonthSales = useMemo(() => {
    return yearSales.filter(s => (s.date || todayStr).substring(5, 7) === curMonthStr);
  }, [yearSales, curMonthStr, todayStr]);

  const currentMonthFin = useMemo(() => {
    return aggregateSalesFinancials(currentMonthSales, products, todayStr);
  }, [currentMonthSales, products, todayStr]);

  const currentMonthRev = currentMonthFin.revenue;
  const currentMonthProfit = currentMonthFin.profit;
  const currentMonthCount = currentMonthFin.count;
  const currentMonthAvgCheck = currentMonthFin.avgCheck;
  const isCurrentMonthLoss = currentMonthFin.isLoss;

  if (isEmployee) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto mt-12 font-sans select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-800">Ruxsat cheklangan</h3>
        <p className="text-xs text-slate-500 mt-2 font-medium">
          Do‘kon hisobotlari va moliyaviy ma’lumotlar faqat do‘kon egasi yoki administrator uchun mo‘ljallangan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans select-none">
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <span>{t('reportsFinancialAnalytics', 'Moliya va analitika hisobotlari')}</span>
          </h2>
          <p className="text-xs text-slate-400">{t('reportsFinancialSubtitle', 'Savdo va do‘kon faoliyati bo‘yicha hisobotlarni ko‘ring.')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-xs font-bold text-slate-400">{t('monthlyTotalRevenue', 'Oylik Umumiy Tushum')}</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{currentMonthRev.toLocaleString()} {t('sum', "so'm")}</div>
          <div className="flex items-center text-xs text-emerald-500 font-bold mt-2">
            <ArrowUpRight className="w-4 h-4" />
            <span>{t('currentMonthMetric', 'Joriy oy ko‘rsatkichi')}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-xs font-bold text-slate-400">
            {isCurrentMonthLoss ? t('grossLossTitle', 'Yalpi Zarar') : t('grossProfitTitle', 'Yalpi Foyda')}
          </div>
          <div className={`text-2xl font-black mt-1 ${isCurrentMonthLoss ? 'text-rose-600' : 'text-purple-600'}`}>
            {isCurrentMonthLoss ? `-${Math.abs(currentMonthProfit).toLocaleString()}` : currentMonthProfit.toLocaleString()} {t('sum', "so'm")}
          </div>
          <div className={`flex items-center text-xs font-bold mt-2 ${isCurrentMonthLoss ? 'text-rose-500' : 'text-emerald-500'}`}>
            {isCurrentMonthLoss ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
            <span>{currentMonthFin.marginStr} {t('marginRate', 'marja darajasi')}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-xs font-bold text-slate-400">{t('avgCheckAmount', "O'rtacha Chek Summasi")}</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{currentMonthAvgCheck.toLocaleString()} {t('sum', "so'm")}</div>
          <div className="flex items-center text-xs text-slate-400 font-medium mt-2">
            <span>{currentMonthCount} {t('transactionsExecuted', "ta tranzaksiya o'tkazildi")}</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            {currentYear} {t('yearDynamics', 'YIL DINAMIKASI')}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="text-slate-600">{t('revenueTitle', 'Tushum')}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-600">{t('totalExpensesTitle', 'Xarajat')}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600">{t('grossProfitTitle', 'Yalpi Foyda')}</span>
            </div>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              barGap={4}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis
                stroke="#94A3B8"
                fontSize={10}
                axisLine={false}
                tickLine={false}
                domain={chartDomain}
                tickFormatter={formatChartAxisNumber}
              />
              <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1.5} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    const isLoss = item.profit < 0;
                    return (
                      <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-100 text-xs font-bold space-y-1 font-sans min-w-[170px]">
                        <div className="text-slate-400 text-[10px] uppercase font-black">{item.month} {currentYear}</div>
                        <div className="text-blue-600 flex items-center justify-between gap-3">
                          <span>{t('revenueTitle', 'Tushum')}:</span>
                          <span>{Number(item.sales || 0).toLocaleString('uz-UZ')} {t('sum', "so'm")}</span>
                        </div>
                        <div className="text-amber-600 flex items-center justify-between gap-3">
                          <span>{t('totalExpensesTitle', 'Xarajat')}:</span>
                          <span>{Number(item.cost || 0).toLocaleString('uz-UZ')} {t('sum', "so'm")}</span>
                        </div>
                        <div className={`${isLoss ? 'text-rose-600 font-black' : 'text-emerald-600 font-black'} flex items-center justify-between gap-3 pt-1 border-t border-slate-100`}>
                          <span>{isLoss ? t('grossLossTitle', 'Yalpi Zarar') : t('grossProfitTitle', 'Yalpi Foyda')}:</span>
                          <span>{isLoss ? `-${Math.abs(item.profit).toLocaleString('uz-UZ')}` : Number(item.profit || 0).toLocaleString('uz-UZ')} {t('sum', "so'm")}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="sales" name={t('revenueTitle', 'Tushum')} fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={28} minPointSize={3} />
              <Bar dataKey="cost" name={t('totalExpensesTitle', 'Xarajat')} fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={28} minPointSize={3} />
              <Bar dataKey="profit" name={t('grossProfitTitle', 'Yalpi Foyda')} maxBarSize={28} minPointSize={3}>
                {monthlyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isLoss ? '#EF4444' : '#10B981'}
                    radius={entry.isLoss ? [0, 0, 6, 6] : [6, 6, 0, 0]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

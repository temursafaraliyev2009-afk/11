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
  CartesianGrid
} from 'recharts';
import { useStore } from '../context/StoreContext';
import { getLocalDateString } from '../utils/dateUtils';

export const ReportsPage = () => {
  const { sales = [], products = [], currentStore, isEmployee } = useStore();
  const { t } = useLanguage();

  const now = new Date();
  const todayStr = getLocalDateString(now);
  const currentYear = todayStr.substring(0, 4);
  const currentMonthNum = now.getMonth() + 1; // 1-12

  // Average profit margin
  const avgMargin = useMemo(() => {
    if (products.length > 0) {
      const sumMargin = products.reduce((acc, p) => {
        const pr = Number(p.price) || 0;
        const cp = Number(p.costPrice) || (pr * 0.72);
        return acc + (pr > 0 ? (pr - cp) / pr : 0.3);
      }, 0);
      return Math.min(0.6, Math.max(0.15, sumMargin / products.length));
    }
    return 0.33;
  }, [products]);

  // Valid non-future sales
  const validSales = useMemo(() => {
    return sales.filter(s => (s.date || todayStr) <= todayStr);
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
      if (mIdx <= currentMonthNum) {
        const mStr = String(mIdx).padStart(2, '0');
        const mSales = yearSales.filter(s => (s.date || todayStr).substring(5, 7) === mStr);
        monthRev = mSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      }
      return {
        month,
        sales: monthRev,
        profit: Math.round(monthRev * avgMargin)
      };
    });
  }, [yearSales, currentMonthNum, todayStr, avgMargin]);

  // Current month stats
  const curMonthStr = String(currentMonthNum).padStart(2, '0');
  const currentMonthSales = useMemo(() => {
    return yearSales.filter(s => (s.date || todayStr).substring(5, 7) === curMonthStr);
  }, [yearSales, curMonthStr, todayStr]);

  const currentMonthRev = currentMonthSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const currentMonthProfit = Math.round(currentMonthRev * avgMargin);
  const currentMonthCount = currentMonthSales.length;
  const currentMonthAvgCheck = currentMonthCount > 0 ? Math.round(currentMonthRev / currentMonthCount) : 0;

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
          <div className="text-xs font-bold text-slate-400">{t('netProfit', 'Sof Foyda')}</div>
          <div className="text-2xl font-black text-purple-600 mt-1">{currentMonthProfit.toLocaleString()} {t('sum', "so'm")}</div>
          <div className="flex items-center text-xs text-emerald-500 font-bold mt-2">
            <ArrowUpRight className="w-4 h-4" />
            <span>{(avgMargin * 100).toFixed(1)}% {t('marginRate', 'marja darajasi')}</span>
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
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
          {currentYear} {t('yearDynamics', 'YIL DINAMIKASI')}
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000000}M`} />
              <Tooltip formatter={(val) => `${val.toLocaleString()} ${t('sum', "so'm")}`} />
              <Bar dataKey="sales" name={t('revenueTitle', 'Tushum')} fill="#3B82F6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="profit" name={t('netProfit', 'Sof Foyda')} fill="#10B981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

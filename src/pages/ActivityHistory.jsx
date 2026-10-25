// src/pages/ActivityHistory.jsx
import React, { useState } from 'react';
import {
  Clock,
  Filter,
  User,
  Search,
  ShoppingCart,
  Package,
  Receipt,
  ShoppingBag,
  Users,
  Settings,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';

export const ActivityHistory = () => {
  const { activities, employees, storeConfig, currentStore, isOwner, isEmployee, currentUserName, currentUserId } = useStore();
  const { t } = useLanguage();

  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const baseActivities = isOwner ? activities : activities.filter(act =>
    (currentUserName && act.user === currentUserName) ||
    (currentUserId && act.userId === currentUserId)
  );

  const filteredActivities = baseActivities.filter(act => {
    const matchesUser = selectedUser === 'all' || act.user === selectedUser || act.user.startsWith(selectedUser);
    const matchesCategory = selectedCategory === 'all' || act.category === selectedCategory;
    const matchesSearch = act.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          act.detail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          act.user.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesUser && matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'Savdo':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'Ombor':
        return 'bg-blue-50 text-blue-700 border-blue-200/80';
      case 'Qarz':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'Buyurtma':
        return 'bg-purple-50 text-purple-700 border-purple-200/80';
      case 'Xodimlar':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'Savdo': return t('catSales', 'Savdo');
      case 'Ombor': return t('catInventory', 'Ombor');
      case 'Qarz': return t('catDebt', 'Qarz');
      case 'Buyurtma': return t('catOrder', 'Buyurtma');
      case 'Xodimlar': return t('catStaff', 'Xodimlar');
      default: return cat;
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Savdo':
        return <ShoppingCart className="w-4 h-4 text-emerald-600" />;
      case 'Ombor':
        return <Package className="w-4 h-4 text-blue-600" />;
      case 'Qarz':
        return <Receipt className="w-4 h-4 text-amber-600" />;
      case 'Buyurtma':
        return <ShoppingBag className="w-4 h-4 text-purple-600" />;
      case 'Xodimlar':
        return <Users className="w-4 h-4 text-indigo-600" />;
      default:
        return <Settings className="w-4 h-4 text-slate-600" />;
    }
  };

  if (isEmployee) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto mt-12 font-sans select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Clock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-800">Ruxsat cheklangan</h3>
        <p className="text-xs text-slate-500 mt-2 font-medium">
          Faoliyat tarixi faqat do‘kon egasi yoki ruxsat berilgan foydalanuvchilar uchun mo‘ljallangan.
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
            <span>{t('historyTitle', 'FAOLIYAT TARIXI')}</span>
            <span className="text-xs font-black px-3 py-1 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 shadow-xs">
              {currentStore?.name || storeConfig.name}
            </span>
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Do‘konda bajarilgan amallar tarixini ko‘ring.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs text-xs sm:text-sm font-bold text-slate-700">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>{t('totalAuditLogs', 'Jami qaydlar')}: {baseActivities.length} {t('itemsUnit', 'ta')}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Amal, xodim yoki tovar qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* User Filter (Faqat egasi uchun) */}
          {isOwner && (
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">{t('filterByUser', 'Xodim bo‘yicha')} ({t('all', 'Barchasi')})</option>
              {employees.map(e => (
                <option key={e.id} value={e.name}>{e.name}</option>
              ))}
            </select>
          )}

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">{t('filterByCategory', 'Bo‘lim bo‘yicha')} ({t('all', 'Barchasi')})</option>
            <option value="Savdo">{t('catSales', 'Savdo')}</option>
            <option value="Ombor">{t('catInventory', 'Ombor')}</option>
            <option value="Qarz">{t('catDebt', 'Qarz')}</option>
            <option value="Buyurtma">{t('catOrder', 'Buyurtma')}</option>
            <option value="Xodimlar">{t('catStaff', 'Xodimlar')}</option>
          </select>
        </div>
      </div>

      {/* Main Activity Log Feed / Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-semibold text-sm">
              Hech qanday faoliyat yozuvi topilmadi
            </div>
          ) : (
            filteredActivities.map((act) => (
              <div
                key={act.id}
                className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-4">
                  <div
                    className={`w-11 h-11 rounded-2xl ${act.bg || 'bg-blue-600'} text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 mt-0.5`}
                  >
                    {act.initial || act.user?.charAt(0)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm">{act.user}</span>
                      <span className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 ${getCategoryBadge(act.category)}`}>
                        {getCategoryIcon(act.category)}
                        <span>{getCategoryLabel(act.category)}</span>
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-bold text-slate-800">
                      {act.action}
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                      {act.detail}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-xs text-slate-400 font-semibold pl-15 sm:pl-0">
                  <div className="text-slate-700 font-bold">{act.time}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{act.date}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

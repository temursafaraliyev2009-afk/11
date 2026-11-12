// src/components/Sidebar.jsx
import React, { useState } from 'react';
import {
  ShoppingBag,
  Home,
  ShoppingCart,
  Package,
  Receipt,
  BarChart3,
  CalendarClock,
  Grid,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  Wallet,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore, isRentalSupportedStoreType, isDebtsSupportedStoreType, isInstallmentSupportedStoreType } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { StoreIcon } from './StoreIcon';
import { SavatchiLogo } from './SavatchiLogo';

export const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  const [isOthersOpen, setIsOthersOpen] = useState(true);
  const { user } = useAuth();
  const { storeConfig, currentStore, isOwner, isEmployee, isDebtsAllowed: contextDebtsAllowed } = useStore();
  const { t } = useLanguage();

  const storeType = currentStore?.type || storeConfig?.id || 'food';
  const isRentalAllowed = isRentalSupportedStoreType(storeType);
  const isDebtsAllowed = typeof contextDebtsAllowed === 'boolean' ? contextDebtsAllowed : isDebtsSupportedStoreType(storeType);
  const isInstallmentAllowed = isInstallmentSupportedStoreType(storeType);

  const mainMenuItems = [
    { id: 'dashboard', labelKey: 'navDashboard', fallback: 'Bosh sahifa', icon: Home },
    { id: 'sales', labelKey: 'navSales', fallback: 'Savdo', icon: ShoppingCart },
    { id: 'inventory', labelKey: 'navInventory', fallback: 'Ombor', icon: Package },
    { id: 'debtors', labelKey: 'navDebts', fallback: 'Qarzlar', icon: Receipt },
    { id: 'rentals', labelKey: 'navRentals', fallback: 'Ijara', icon: CalendarClock, isRental: true },
    { id: 'installments', labelKey: 'navInstallments', fallback: 'Muddatli to\'lov', icon: Wallet, isInstallment: true },
    { id: 'reports', labelKey: 'navReports', fallback: 'Hisobotlar', icon: BarChart3 },
    { id: 'orders', labelKey: 'navOrders', fallback: 'Buyurtmalar', icon: ShoppingBag },
  ];

  const visibleMainMenuItems = mainMenuItems.filter(item => {
    if (item.id === 'debtors' && !isDebtsAllowed) return false;
    if (item.id === 'rentals' && !isRentalAllowed) return false;
    if (item.id === 'installments' && !isInstallmentAllowed) return false;
    if (isEmployee && item.id === 'reports') return false;
    return true;
  });

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (setIsOpen) setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar: Strictly fixed/sticky, full viewport height, independent internal scroll */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 lg:w-72 shrink-0 bg-[#0B132B] text-slate-300 flex flex-col justify-between p-5 select-none z-50 border-r border-slate-800/80 font-sans transition-transform duration-300 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Section: Logo & Main Navigation */}
        <div className="space-y-5 pr-0.5">
          {/* Brand Logo Header: Icon-only logo + SAVATCHI text below */}
          <div className="relative flex flex-col items-center justify-center py-2 gap-1.5">
            {/* Icon-only logo, ~10-15% smaller than 120px */}
            <div className="w-full max-w-[104px] flex items-center justify-center">
              <SavatchiLogo theme="dark" showText={false} className="w-full h-auto object-contain" />
            </div>

            {/* SAVATCHI matn pastda, qalin va ravshan */}
            <span className="text-white font-black text-sm tracking-[0.25em] uppercase select-none leading-none">
              SAVATCHI
            </span>

            {/* Mobile Close Button */}
            {setIsOpen && (
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Menyuni yopish"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Store Type Badge with Professional SVG Icon */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2.5 truncate">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <StoreIcon type={storeType} className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-200 truncate">
                {currentStore?.name || storeConfig.name}
              </span>
            </div>
            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              {t('activeStatus', 'Faol')}
            </span>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5 pt-1">
            {visibleMainMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="text-sm font-semibold">{t(item.labelKey, item.fallback)}</span>
                </button>
              );
            })}

            {/* Expandable "Boshqalar" Menu (Do'kon egasi va yangi taklif yuboruvchi foydalanuvchilar uchun) */}
            {!isEmployee && (
              <div className="pt-1.5">
                <button
                  onClick={() => setIsOthersOpen(!isOthersOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    activeTab === 'staff' || activeTab === 'history'
                      ? 'bg-slate-800/80 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <Grid className="w-5 h-5 text-slate-400 shrink-0" />
                    <span className="text-sm font-semibold">{t('navOthers', 'Boshqalar')}</span>
                  </div>
                  {isOthersOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isOthersOpen && (
                  <div className="pl-6 pt-2 space-y-1.5">
                    <button
                      onClick={() => handleNavClick('staff')}
                      className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                        activeTab === 'staff'
                          ? 'bg-blue-600/20 text-blue-400 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>{t('navStaff', 'Xodimlar')}</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('history')}
                      className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                        activeTab === 'history'
                          ? 'bg-blue-600/20 text-blue-400 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>{t('navHistory', 'Faoliyat tarixi')}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
};

// src/components/DashboardHeader.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ModalPortal } from './ModalPortal';
import {
  Search,
  ChevronDown,
  User,
  UserPlus,
  HelpCircle,
  LogOut,
  Menu,
  Check,
  Plus,
  X,
  Sun,
  Sunset,
  Moon,
  Mail,
  Package,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Users,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { SettingsModal } from './SettingsModal';
import { MailboxModal } from './MailboxModal';
import { HelpModal } from './HelpModal';
import { CreateStoreModal } from './CreateStoreModal';
import { StoreIcon } from './StoreIcon';
import { getPendingInvitationsCount } from '../services/mailService';

export const DashboardHeader = ({
  searchQuery,
  setSearchQuery,
  onOpenMobileMenu,
  onSelectStoreTypeClick,
  activeTab,
  setActiveTab
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isStoreSwitcherOpen, setIsStoreSwitcherOpen] = useState(false);
  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Search state
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const searchContainerRef = useRef(null);

  const menuRef = useRef(null);
  const storeMenuRef = useRef(null);

  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    storeConfig,
    userStores,
    currentStore,
    switchStore,
    products = [],
    debts = [],
    orders = [],
    sales = [],
    employees = [],
    rentals = [],
    installments = [],
    isRentalAllowed,
    isDebtsAllowed,
    isInstallmentAllowed,
    setSearchTargetItem,
    isOwner,
    isEmployee,
    userRole,
    currentUserName
  } = useStore();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { notifyLogout, notifyInfo } = useToast();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (storeMenuRef.current && !storeMenuRef.current.contains(event.target)) {
        setIsStoreSwitcherOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const updateCount = () => {
      setPendingCount(getPendingInvitationsCount(user));
    };
    updateCount();
    window.addEventListener('savatchi_mail_updated', updateCount);
    window.addEventListener('savatchi_invitation_accepted', updateCount);
    window.addEventListener('savatchi_invitation_rejected', updateCount);
    return () => {
      window.removeEventListener('savatchi_mail_updated', updateCount);
      window.removeEventListener('savatchi_invitation_accepted', updateCount);
      window.removeEventListener('savatchi_invitation_rejected', updateCount);
    };
  }, [user]);

  const getInitials = (name) => {
    if (!name) return 'AZ';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleOpenSettings = () => {
    setIsProfileOpen(false);
    setIsSettingsOpen(true);
  };

  const handleConfirmLogout = async () => {
    setIsLogoutConfirmOpen(false);
    notifyLogout(t('loggedOut', 'Tizimdan chiqildi'), t('loggedOutDesc', 'Xayr! Do‘kon boshqaruv panelidan xavfsiz chiqdingiz.'));
    setTimeout(async () => {
      await logout();
      navigate('/login', { replace: true });
    }, 600);
  };



  const currentStoreType = currentStore?.type || storeConfig?.id || 'food';

  // Real-time multi-entity search results (ONLY actual data: products, debts, orders, employees, sales)
  const searchResults = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return [];

    const results = [];

    // 1. Products
    products.forEach(p => {
      const name = String(p.name || '');
      const cat = String(p.category || '');
      const brand = String(p.brand || '');
      const barcode = String(p.barcode || '');
      const imei = String(p.imei || '');

      if (
        name.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q) ||
        brand.toLowerCase().includes(q) ||
        barcode.toLowerCase().includes(q) ||
        imei.toLowerCase().includes(q)
      ) {
        const priceStr = Number(p.price || 0).toLocaleString() + ' so‘m';
        const stockStr = `Qoldiq: ${p.stock ?? 0} ${p.unit || 'dona'}`;
        results.push({
          type: 'product',
          id: p.id,
          title: p.name,
          category: t('searchCategoryProduct', 'Mahsulot'),
          tab: 'inventory',
          description: `${priceStr} • ${stockStr} • ${p.category || ''}`,
          item: p
        });
      }
    });

    // 3. Debtors & Customers
    if (isDebtsAllowed) {
      debts.forEach(d => {
        const name = String(d.name || '');
        const phone = String(d.phone || '');
        const note = String(d.note || '');

        if (
          name.toLowerCase().includes(q) ||
          phone.toLowerCase().includes(q) ||
          note.toLowerCase().includes(q)
        ) {
          const amountStr = Number(d.amount || 0).toLocaleString() + ' so‘m';
          const statusStr = d.isPaid ? 'To‘langan' : (d.status || 'Faol qarz');
          results.push({
            type: 'debt',
            id: d.id,
            title: d.name,
            category: t('searchCategoryDebt', 'Qarzdor'),
            tab: 'debtors',
            description: `${amountStr} • ${statusStr}${d.phone ? ` • ${d.phone}` : ''}`,
            item: d
          });
        }
      });
    }

    // 4. Orders
    orders.forEach(o => {
      const idStr = String(o.id || '');
      const prodStr = String(o.product || (Array.isArray(o.items) ? o.items.map(i => i.name).join(', ') : '') || '');
      const supplierStr = String(o.supplier || o.customerName || '');

      if (
        idStr.toLowerCase().includes(q) ||
        prodStr.toLowerCase().includes(q) ||
        supplierStr.toLowerCase().includes(q)
      ) {
        const totalStr = Number(o.total || 0).toLocaleString() + ' so‘m';
        results.push({
          type: 'order',
          id: o.id,
          title: `${o.id}: ${prodStr || supplierStr || 'Buyurtma'}`,
          category: t('searchCategoryOrder', 'Buyurtma'),
          tab: 'orders',
          description: `${totalStr} • ${o.status || 'Hali yo‘lda'}${supplierStr ? ` • ${supplierStr}` : ''}`,
          item: o
        });
      }
    });

    // 5. Staff
    employees.forEach(e => {
      const name = String(e.name || '');
      const email = String(e.email || '');
      const role = String(e.role || '');
      const phone = String(e.phone || '');

      if (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        role.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'employee',
          id: e.id,
          title: e.name,
          category: t('searchCategoryStaff', 'Xodim'),
          tab: 'staff',
          description: `${e.role || 'Xodim'} • ${e.email || e.phone || 'Faol'}`,
          item: e
        });
      }
    });

    // 6. Sales
    sales.forEach(s => {
      const idStr = String(s.id || '');
      const prod = String(s.product || '');
      const seller = String(s.seller || '');

      if (
        idStr.toLowerCase().includes(q) ||
        prod.toLowerCase().includes(q) ||
        seller.toLowerCase().includes(q)
      ) {
        const totalStr = Number(s.total || s.price || 0).toLocaleString() + ' so‘m';
        results.push({
          type: 'sale',
          id: s.id,
          title: `${prod} (${s.qty || 1} ${s.unit || 'dona'})`,
          category: t('searchCategorySale', 'Savdo'),
          tab: 'sales',
          description: `${totalStr} • Sotuvchi: ${seller || 'Noma’lum'} • ${s.paymentType || 'Naqd'}`,
          item: s
        });
      }
    });

    // 7. Rentals (Faqat ruxsat berilgan do'konlarda)
    if (isRentalAllowed && Array.isArray(rentals)) {
      rentals.forEach(r => {
        const cust = String(r.customerName || '');
        const prod = String(r.productName || '');
        const phone = String(r.customerPhone || '');
        if (
          cust.toLowerCase().includes(q) ||
          prod.toLowerCase().includes(q) ||
          phone.toLowerCase().includes(q)
        ) {
          results.push({
            type: 'rental',
            id: r.id,
            title: `${r.productName} — ${r.customerName}`,
            category: 'Ijara',
            tab: 'rentals',
            description: `${Number(r.rentalFee || 0).toLocaleString()} so‘m • ${r.status || 'Faol'} • Qaytarish: ${r.endDate || '—'}`,
            item: r
          });
        }
      });
    }

    // 8. Installments (Faqat ruxsat berilgan 4 ta do'konda)
    if (isInstallmentAllowed && Array.isArray(installments)) {
      installments.forEach(c => {
        const num = String(c.contractNumber || c.id || '');
        const cust = String(c.customerName || '');
        const phone = String(c.customerPhone || '');
        const prod = String(c.productsSummary || '');
        if (
          num.toLowerCase().includes(q) ||
          cust.toLowerCase().includes(q) ||
          phone.toLowerCase().includes(q) ||
          prod.toLowerCase().includes(q)
        ) {
          results.push({
            type: 'installment',
            id: c.id,
            title: `${c.contractNumber || c.id}: ${c.customerName}`,
            category: 'Muddatli to‘lov',
            tab: 'installments',
            description: `${Number(c.totalAmount || 0).toLocaleString()} so‘m • Qoldiq: ${Number(c.remainingAmount || 0).toLocaleString()} so‘m • ${c.productsSummary || ''}`,
            item: c
          });
        }
      });
    }

    return results;
  }, [searchQuery, products, debts, orders, employees, sales, rentals, installments, isRentalAllowed, isDebtsAllowed, isInstallmentAllowed, t]);

  const handleSelectResult = (result) => {
    if (!result) return;
    setIsSearchDropdownOpen(false);

    if (setSearchTargetItem) {
      setSearchTargetItem({
        type: result.type,
        id: result.id,
        name: result.title,
        item: result.item
      });
    }

    if (setActiveTab && result.tab) {
      if (result.tab === 'debtors' && !isDebtsAllowed) {
        return;
      }
      setActiveTab(result.tab);
    }
    navigate('/dashboard');
  };

  const handleSearchKeyDown = (e) => {
    if (!isSearchDropdownOpen || searchResults.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        setIsSearchDropdownOpen(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchSelectedIndex(prev => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = searchResults[searchSelectedIndex] || searchResults[0];
      if (target) {
        handleSelectResult(target);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsSearchDropdownOpen(false);
    }
  };

  const renderResultIcon = (type) => {
    switch (type) {
      case 'product':
        return <Package className="w-4 h-4" />;
      case 'debt':
        return <Receipt className="w-4 h-4" />;
      case 'order':
        return <ShoppingBag className="w-4 h-4" />;
      case 'sale':
        return <TrendingUp className="w-4 h-4" />;
      case 'employee':
        return <Users className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  const getResultIconStyle = (type) => {
    switch (type) {
      case 'product':
        return 'bg-blue-100 text-blue-600';
      case 'debt':
        return 'bg-amber-100 text-amber-600';
      case 'order':
        return 'bg-indigo-100 text-indigo-600';
      case 'sale':
        return 'bg-emerald-100 text-emerald-600';
      case 'employee':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getResultBadgeStyle = (type) => {
    switch (type) {
      case 'product':
        return 'bg-blue-50 text-blue-700 border border-blue-200/60';
      case 'debt':
        return 'bg-amber-50 text-amber-700 border border-amber-200/60';
      case 'order':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200/60';
      case 'sale':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
      case 'employee':
        return 'bg-purple-50 text-purple-700 border border-purple-200/60';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <header className="flex items-center justify-between px-6 lg:px-8 py-3.5 bg-transparent relative z-30 font-sans select-none">
      {/* Left Search Bar & Mobile Hamburger */}
      <div className="flex items-center space-x-3 w-full max-w-md">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2.5 rounded-2xl bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 shadow-xs cursor-pointer"
          aria-label="Menyuni ochish"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative flex-1" ref={searchContainerRef}>
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('quickSearchPlaceholder', 'Tizim bo‘ylab qidirish...')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchDropdownOpen(true);
              setSearchSelectedIndex(0);
            }}
            onFocus={() => {
              if (searchQuery && searchQuery.trim().length > 0) {
                setIsSearchDropdownOpen(true);
              }
            }}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-11 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />

          {/* Quick Search Results Dropdown */}
          {isSearchDropdownOpen && searchQuery && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden max-h-[420px] flex flex-col animate-in fade-in zoom-in-95 duration-150">
              {searchResults.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                    <Search className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="font-extrabold text-slate-800 text-xs">
                    {t('noResultsFound', 'Hech narsa topilmadi')}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-1 truncate px-2">
                    «{searchQuery}» {t('noResultsSubtext', 'bo‘yicha mos ma’lumot topilmadi')}
                  </p>
                </div>
              ) : (
                <>
                  <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>{searchResults.length} {t('resultsCount', 'ta natija')}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Enter ↵ ochish • Esc yopish
                    </span>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {searchResults.map((result, idx) => {
                      const isSelected = searchSelectedIndex === idx;
                      return (
                        <button
                          key={`${result.type}-${result.id}-${idx}`}
                          type="button"
                          onClick={() => handleSelectResult(result)}
                          onMouseEnter={() => setSearchSelectedIndex(idx)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-50/80 border border-blue-200/70 shadow-2xs' : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${getResultIconStyle(result.type)}`}>
                              {renderResultIcon(result.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-xs text-slate-800 truncate">
                                  {result.title}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${getResultBadgeStyle(result.type)}`}>
                                  {result.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                                {result.description}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Area: Mailbox, Language Switcher, Store Switcher, Account Dropdown */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* 0. Pochta va Xabarlar Tugmasi */}
        <button
          onClick={() => setIsMailboxOpen(true)}
          className="relative flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs transition-colors text-xs font-bold text-slate-700 cursor-pointer"
          title={t('mailboxTitle', 'Pochta va Xabarlar')}
        >
          <Mail className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="hidden sm:inline">{t('mailbox', 'Pochta')}</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>



        {/* 2. Interactive Store Switcher Pill & Dropdown */}
        {/* Store Type Pill / Switcher */}
        <div className="relative" ref={storeMenuRef}>
          {!isEmployee ? (
            <button
              onClick={() => setIsStoreSwitcherOpen(!isStoreSwitcherOpen)}
              className="flex items-center space-x-2.5 px-3 py-2 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200/80 shadow-xs transition-colors text-xs font-semibold text-slate-700 cursor-pointer"
              title={t('switchStore', 'Do‘konni almashtirish')}
            >
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
                <StoreIcon type={currentStoreType} className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">
                  {t('store', 'Do‘kon')}
                </div>
                <div className="text-slate-900 font-black leading-tight truncate max-w-[130px]">
                  {currentStore?.name || storeConfig.name}
                </div>
              </div>
              <ChevronDown
                className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200"
                style={{ transform: isStoreSwitcherOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
          ) : (
            <div
              className="flex items-center space-x-2.5 px-3 py-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-xs font-semibold text-slate-700 select-none"
              title="Biriktirilgan do‘kon"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
                <StoreIcon type={currentStoreType} className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">
                  {t('store', 'Do‘kon')}
                </div>
                <div className="text-slate-900 font-black leading-tight truncate max-w-[130px]">
                  {currentStore?.name || storeConfig.name}
                </div>
              </div>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                Xodim
              </span>
            </div>
          )}

          {/* Store Switcher Dropdown Menu (Faqat do'kon egasi uchun) */}
          {!isEmployee && isStoreSwitcherOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 font-sans">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">{t('myStores', 'Mavjud do‘konlar')}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                  {userStores.length} {t('itemsUnit', 'ta')}
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto px-1.5 py-1 space-y-1">
                {userStores.map((st) => {
                  const isSelected = st.id === currentStore?.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => {
                        const isActuallySwitching = Boolean(currentStore?.id && currentStore.id !== st.id);
                        switchStore(st.id);
                        setIsStoreSwitcherOpen(false);
                        if (isActuallySwitching) {
                          notifyInfo(t('storeSwitched', 'Do‘kon almashtirildi'), `"${st.name}" do‘koniga muvaffaqiyatli o‘tildi.`, { position: 'center' });
                        }
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-black border border-blue-100 shadow-xs'
                          : 'hover:bg-slate-50 text-slate-700 font-semibold'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
                          <StoreIcon type={st.type} className="w-4 h-4" />
                        </div>
                        <div className="text-left truncate">
                          <div className="truncate text-xs leading-tight font-extrabold">{st.name}</div>
                          <div className="text-[10px] text-slate-400 font-medium capitalize">{st.type}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Pastki qism: Yangi do'kon qo'shish tugmasi */}
              <div className="p-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsStoreSwitcherOpen(false);
                    setIsCreateStoreOpen(true);
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-600 font-extrabold text-xs transition-colors cursor-pointer border border-blue-200/60 shadow-xs"
                >
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>{t('openNewStore', 'Yangi do‘kon')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. User Profile Container & Account Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center space-x-3 p-1.5 pr-3 rounded-2xl hover:bg-white transition-all focus:outline-none bg-white/70 border border-slate-200/60 shadow-xs cursor-pointer"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-9 h-9 rounded-full object-cover shadow-xs ring-2 ring-blue-500/20"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-blue-500/20">
                {getInitials(currentUserName || user?.displayName || 'Foydalanuvchi')}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <div className="text-xs font-extrabold text-slate-900 leading-tight">
                {(currentUserName || user?.displayName || 'Foydalanuvchi').split(' ')[0]}
              </div>
              <div className="text-[10px] font-semibold text-slate-400">
                {userRole || user?.role || 'Foydalanuvchi'}
              </div>
            </div>
            <ChevronDown
              className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200"
              style={{ transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {/* Account Dropdown Popup Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200 font-sans">
              {/* User Header in Dropdown */}
              <div className="px-5 py-2.5 border-b border-slate-100 mb-2">
                <div className="font-black text-xs text-slate-900">
                  {currentUserName || user?.displayName || 'Foydalanuvchi'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {user?.email || 'foydalanuvchi@savatchi.uz'}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      {t('activeAccount', 'Faol akkaunt')}
                    </span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${
                    userRole || user?.role
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {userRole || user?.role || 'Foydalanuvchi'}
                  </span>
                </div>
              </div>

              {/* Menu Items List */}
              <div className="space-y-0.5 px-1.5">
                {/* 1. Profil ma’lumotlari */}
                <button
                  onClick={handleOpenSettings}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{t('profileDetails', 'Profil ma’lumotlari')}</span>
                </button>
              </div>

              <div className="my-2 border-t border-slate-100 mx-2"></div>

              <div className="space-y-0.5 px-1.5">
                {/* Theme Selector: Day, Twilight, Night */}
                <div className="px-3.5 pt-1.5 pb-1 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {t('theme', 'Mavzu')}
                  </span>
                  <span className="text-[10px] font-extrabold text-blue-600">
                    {theme === 'day'
                      ? t('dayMode', 'Kunduzgi rejim')
                      : theme === 'twilight'
                      ? t('twilightMode', 'Shom rejimi')
                      : t('nightMode', 'Tungi rejim')}
                  </span>
                </div>
                <div className="space-y-1">
                  {[
                    {
                      id: 'day',
                      labelKey: 'dayMode',
                      fallback: 'Kunduzgi rejim',
                      icon: Sun,
                      activeColor: 'text-amber-500'
                    },
                    {
                      id: 'twilight',
                      labelKey: 'twilightMode',
                      fallback: 'Shom rejimi',
                      icon: Sunset,
                      activeColor: 'text-indigo-500'
                    },
                    {
                      id: 'night',
                      labelKey: 'nightMode',
                      fallback: 'Tungi rejim',
                      icon: Moon,
                      activeColor: 'text-blue-500'
                    }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = theme === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTheme(item.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100/60 shadow-xs'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-4 h-4 shrink-0 ${isSelected ? item.activeColor : 'text-slate-400'}`} />
                          <span>{t(item.labelKey, item.fallback)}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Yordam va qo‘llab-quvvatlash */}
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    setIsHelpOpen(true);
                  }}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{t('help', 'Yordam va qo‘llab-quvvatlash')}</span>
                </button>
              </div>

              <div className="my-2 border-t border-slate-100 mx-2"></div>

              {/* Chiqish */}
              <div className="px-1.5">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    setIsLogoutConfirmOpen(true);
                  }}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{t('logout', 'Chiqish')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Profile Details Modal Panel */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Mailbox & Invitations Modal */}
      <MailboxModal
        isOpen={isMailboxOpen}
        onClose={() => setIsMailboxOpen(false)}
      />

      {/* Logout Confirmation Modal — rendered via portal to document.body */}
      {isLogoutConfirmOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                <LogOut className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-black text-slate-900 text-base leading-snug">
                  {t('logoutConfirmTitle', 'Haqiqatan ham akkauntdan chiqmoqchimisiz?')}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {t('logoutConfirmDesc', 'Tizimdan chiqsangiz, qayta kirish uchun Google yoki telefon raqamingizdan foydalanishingiz kerak bo\'ladi.')}
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {t('cancel', 'Bekor qilish')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogout}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
                >
                  {t('logout', 'Chiqish')}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Help & Support Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Create New Store Modal */}
      <CreateStoreModal
        isOpen={isCreateStoreOpen}
        onClose={() => setIsCreateStoreOpen(false)}
      />
    </header>
  );
};

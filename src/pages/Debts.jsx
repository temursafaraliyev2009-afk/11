// src/pages/Debts.jsx
import React, { useState, useEffect } from 'react';
import { ModalPortal } from '../components/ModalPortal';
import {
  Receipt,
  Plus,
  Search,
  Users,
  AlertCircle,
  Clock,
  Trash2,
  Phone,
  ArrowDownCircle,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Check,
  TrendingDown,
  TrendingUp,
  Wallet,
  Calendar,
  X,
  Pencil
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { QuickActionModal } from '../components/QuickActionModal';

export const Debts = ({ setActiveTab }) => {
  const {
    debts,
    payDebt,
    updateDebt,
    deleteDebt,
    storeConfig,
    searchTargetItem,
    setSearchTargetItem,
    isDebtsAllowed,
    isItemPendingDelete,
    setItemPendingDelete
  } = useStore();

  const { t } = useLanguage();
  const { notifySuccess, notifyDelete, showUndoDelete } = useToast();

  if (!isDebtsAllowed) {
    return (
      <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto mt-12 font-sans select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-xs">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-800">Qarzlar xizmati mavjud emas</h3>
        <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
          Ushbu do‘kon turida qarzlar hisobi yuritilmaydi.
        </p>
        <button
          onClick={() => setActiveTab && setActiveTab('dashboard')}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs shadow-lg shadow-blue-600/20 hover:opacity-95 cursor-pointer transition-all active:scale-[0.98]"
        >
          <span>Bosh sahifaga qaytish</span>
        </button>
      </div>
    );
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [activeDebtTab, setActiveDebtTab] = useState('active'); // 'active' | 'paid' | 'all'
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [payingDebt, setPayingDebt] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payError, setPayError] = useState('');
  const [deletingDebt, setDeletingDebt] = useState(null);
  const [editingDebt, setEditingDebt] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', amount: '', dueDate: '', note: '' });
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (searchTargetItem && searchTargetItem.type === 'debt') {
      const debtItem = debts.find(d => d.id === searchTargetItem.id) || searchTargetItem.item;
      const debtorName = debtItem?.name || searchTargetItem.name || '';
      setSearchQuery(debtorName);
      if (debtItem?.isPaid || Number(debtItem?.amount) === 0) {
        setActiveDebtTab('paid');
      } else {
        setActiveDebtTab('active');
      }
      if (debtItem) {
        openEditModal(debtItem);
      }
      setSearchTargetItem(null);
    }
  }, [searchTargetItem, debts, setSearchTargetItem]);

  // Categorize Debts (O'chirish jarayonida bo'lmagan faol qarzlar)
  const visibleDebts = debts.filter(d => !isItemPendingDelete(d.id));
  const activeDebts = visibleDebts.filter(d => !d.isPaid && Number(d.amount) > 0);
  const paidDebts = visibleDebts.filter(d => d.isPaid || Number(d.amount) === 0);

  // Accurate Statistics
  const totalActiveDebtSum = activeDebts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalOriginalDebtSum = visibleDebts.reduce((sum, d) => sum + (Number(d.originalAmount || d.amount) || 0), 0);
  const totalPaidSum = visibleDebts.reduce((sum, d) => sum + (Number(d.paidAmount) || 0), 0);
  const activeDebtsCount = activeDebts.length;
  const paidDebtsCount = paidDebts.length;
  const dueTodayCount = activeDebts.filter(d => d.status === 'Bugun to‘lanishi kerak').length;
  const overdueDebts = activeDebts.filter(d => d.status === 'Kechikkan');
  const overdueDebtSum = overdueDebts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  // Dynamic possessive suffix generator for names
  const getPossessiveName = (fullName) => {
    if (!fullName) return t('tableDebtorName', 'Mijoz');
    const firstName = fullName.trim().split(' ')[0];
    return `${firstName}`;
  };

  // Name suggestions logic
  const allNames = Array.from(new Set(visibleDebts.map(d => d.name).filter(Boolean)));
  const suggestions = searchQuery.trim().length > 0
    ? allNames.filter(n => n.toLowerCase().includes(searchQuery.toLowerCase()) && n.toLowerCase() !== searchQuery.toLowerCase())
    : [];

  // Filtered List based on tab and search
  const displayedDebts = (activeDebtTab === 'active'
    ? activeDebts
    : activeDebtTab === 'paid'
      ? paidDebts
      : visibleDebts
  ).filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.note?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openPayModal = (debtItem) => {
    setPayingDebt(debtItem);
    setPayAmount('');
    setPayError('');
  };

  const handlePayAmountChange = (e) => {
    const val = e.target.value;
    setPayAmount(val);
    setPayError('');

    if (payingDebt && Number(val) > Number(payingDebt.amount)) {
      setPayError(t('error', 'To‘lov summasi qarz miqdoridan katta bo‘lishi mumkin emas.'));
    }
  };

  const handlePaySubmit = (e) => {
    e.preventDefault();
    if (!payingDebt || !payAmount) return;
    const numPay = Number(payAmount);

    if (numPay <= 0) {
      setPayError(t('error', 'To‘lov summasi 0 dan katta bo‘lishi kerak.'));
      return;
    }

    if (numPay > Number(payingDebt.amount)) {
      setPayError(t('error', 'To‘lov summasi qarz miqdoridan katta bo‘lishi mumkin emas.'));
      return;
    }

    try {
      payDebt(payingDebt.id, numPay);
      notifySuccess(t('debtPaidTitle', 'To‘lov qabul qilindi!'), `${numPay.toLocaleString()} so‘m qarz to‘lovi muvaffaqiyatli qabul qilindi.`);
      setPayingDebt(null);
      setPayAmount('');
      setPayError('');
    } catch (err) {
      setPayError(err.message || t('error', 'Xatolik yuz berdi'));
    }
  };

  const handleConfirmDelete = () => {
    const targetDebt = deletingDebt;
    setDeletingDebt(null);
    if (!targetDebt || isItemPendingDelete(targetDebt.id)) return;

    // 1. Vaqtincha interfeysdan yashirish (bazaga tegilmaydi)
    setItemPendingDelete(targetDebt.id, true);

    // 2. 5 soniyalik bekor qilish bildirishnomasini ko'rsatish
    showUndoDelete({
      title: 'Qarz o‘chirilmoqda...',
      seconds: 5,
      successMessage: 'Qarz muvaffaqiyatli o‘chirildi.',
      onUndo: () => {
        setItemPendingDelete(targetDebt.id, false);
      },
      onCommit: async () => {
        try {
          deleteDebt(targetDebt.id);
          setItemPendingDelete(targetDebt.id, false);
        } catch (err) {
          setItemPendingDelete(targetDebt.id, false);
          throw err;
        }
      }
    });
  };

  const openEditModal = (debtItem) => {
    setEditingDebt(debtItem);
    setEditForm({
      name: debtItem.name || '',
      phone: debtItem.phone || '',
      amount: debtItem.amount !== undefined ? debtItem.amount : '',
      dueDate: debtItem.dueDate || '',
      note: debtItem.note || ''
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingDebt || !editForm.name) return;
    const numAmount = Number(editForm.amount) || 0;
    updateDebt(editingDebt.id, {
      name: editForm.name,
      phone: editForm.phone,
      amount: numAmount,
      dueDate: editForm.dueDate,
      note: editForm.note
    });
    notifySuccess(t('debtEditedTitle', 'Qarz tahrirlandi!'), t('debtEditedDesc', 'Qarz ma’lumotlari muvaffaqiyatli saqlandi.'));
    setEditingDebt(null);
  };

  const getStatusBadge = (debt) => {
    if (debt.isPaid || Number(debt.amount) === 0 || debt.status === 'Qarz to‘landi') {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
    }
    if (debt.status === 'Qisman to‘langan') {
      return 'bg-blue-50 text-blue-700 border border-blue-200/80';
    }
    if (debt.status === 'Kechikkan') {
      return 'bg-rose-50 text-rose-700 border border-rose-200/80';
    }
    if (debt.status === 'Bugun to‘lanishi kerak') {
      return 'bg-amber-50 text-amber-700 border border-amber-200/80';
    }
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  };

  const getStatusText = (debt) => {
    if (debt.isPaid || Number(debt.amount) === 0 || debt.status === 'Qarz to‘landi') {
      return t('statusPaid', 'Qarz to‘landi');
    }
    if (debt.status === 'Qisman to‘langan') {
      return t('statusPartial', 'Qisman to‘langan');
    }
    if (debt.status === 'Kechikkan') {
      return t('statusOverdue', 'Kechikkan');
    }
    if (debt.status === 'Bugun to‘lanishi kerak') {
      return t('statusDueToday', 'Bugun to‘lanishi kerak');
    }
    return t('statusPending', 'Kutilmoqda');
  };

  // Calculation for Payment Modal Preview
  const currentDebtAmount = payingDebt ? Number(payingDebt.amount) : 0;
  const currentPayValue = Number(payAmount) || 0;
  const calculatedRemaining = Math.max(0, currentDebtAmount - currentPayValue);
  const willBeFullyPaid = currentPayValue === currentDebtAmount && currentDebtAmount > 0;

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 font-sans select-none w-full max-w-[1600px] min-w-0 mx-auto">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>{t('debtsTitle', 'QARZLAR')}</span>
            <span className="text-xs font-black px-3 py-1 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 shadow-xs">
              {activeDebtsCount} {t('activeClients', 'faol mijoz')}
            </span>
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Mijozlar qarzi va to‘lovlarini boshqaring.
          </p>
        </div>

        <button
          onClick={() => setIsAddDebtOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          <span>{t('btnAddDebt', 'Qarz qo‘shish')}</span>
        </button>
      </div>

      {/* 4 REDESIGNED PREMIUM STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Jami faol qarz */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-200 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 rounded-full blur-2xl group-hover:bg-amber-100/70 transition-colors pointer-events-none"></div>

          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                {t('statTotalActiveDebt', 'Jami faol qarz')}
              </span>
              <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-tight">
                {totalActiveDebtSum.toLocaleString()} <span className="text-sm font-bold text-slate-400">{t('sum', 'so‘m')}</span>
              </div>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 group-hover:scale-105 transition-transform duration-200">
              <Wallet className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs relative z-10">
            <div className="flex items-center space-x-1.5 font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
              <span>{t('statTotalActiveDebtSub', 'qaytarilishi kutilmoqda')}</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              {activeDebtsCount} {t('itemsUnit', 'ta')}
            </span>
          </div>
        </div>

        {/* Card 2: Faol qarzdorlar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100/70 transition-colors pointer-events-none"></div>

          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                {t('statActiveDebtors', 'Faol qarzdorlar')}
              </span>
              <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-tight">
                {activeDebtsCount} <span className="text-sm font-bold text-slate-400">{t('activeClients', 'mijoz')}</span>
              </div>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0 group-hover:scale-105 transition-transform duration-200">
              <Users className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs relative z-10">
            <div className="flex items-center space-x-1.5 font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{debts.length > 0 ? Math.round((activeDebtsCount / debts.length) * 100) : 0}% ulush</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              {debts.length} {t('all', 'jami')}
            </span>
          </div>
        </div>

        {/* Card 3: To‘langan qarzlar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100/70 transition-colors pointer-events-none"></div>

          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                {t('statPaidDebts', 'To‘langan qarzlar')}
              </span>
              <div className="text-2xl sm:text-[26px] font-black text-emerald-600 tracking-tight leading-tight">
                {paidDebtsCount} <span className="text-sm font-bold text-emerald-600/70">{t('itemsUnit', 'ta')}</span>
              </div>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform duration-200">
              <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs relative z-10">
            <div className="flex items-center space-x-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>{totalPaidSum.toLocaleString()} {t('sum', 'so‘m')}</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600">
              {t('statPaidDebtsSub', 'yopilgan')}
            </span>
          </div>
        </div>

        {/* Card 4: Kechikkan qarz */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-rose-200 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 rounded-full blur-2xl group-hover:bg-rose-100/70 transition-colors pointer-events-none"></div>

          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                {t('statOverdueDebts', 'Kechikkan qarz')}
              </span>
              <div className="text-2xl sm:text-[26px] font-black text-rose-600 tracking-tight leading-tight">
                {overdueDebtSum.toLocaleString()} <span className="text-sm font-bold text-rose-500">{t('sum', 'so‘m')}</span>
              </div>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 shrink-0 group-hover:scale-105 transition-transform duration-200">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs relative z-10">
            <div className="flex items-center space-x-1.5 font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{overdueDebts.length} {t('statOverdueDebtsSub', 'kechikkan')}</span>
            </div>
            <span className="text-[11px] font-semibold text-rose-500">
              {dueTodayCount > 0 ? `${dueTodayCount} ta bugun` : t('statusOverdue', 'Kechikkan')}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Bar with Autocomplete Suggestions */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('searchDebtorPlaceholder', 'Ism, telefon yoki mahsulot bo‘yicha qidirish...')}
            value={searchQuery}
            onFocus={() => setShowSuggestions(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Live Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-40">
              <div className="px-3.5 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                {t('suggestionsLabel', 'Tavsiyalar:')}
              </div>
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSearchQuery(sug);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3 Main Views: Faol qarzlar, To'langan qarzlar, Barchasi */}
        <div className="flex items-center space-x-2.5 w-full sm:w-auto overflow-x-auto sm:overflow-x-visible py-1.5 px-1 scrollbar-none">
          <button
            onClick={() => setActiveDebtTab('active')}
            className={`btn-pill-base px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm ${
              activeDebtTab === 'active'
                ? 'btn-pill-blue font-black'
                : 'btn-pill-inactive'
            }`}
          >
            <span>{t('tabActiveDebts', 'Faol qarzlar')}</span>
            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-colors ${
              activeDebtTab === 'active' ? 'btn-pill-badge-active' : 'btn-pill-badge-inactive'
            }`}>
              {activeDebtsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveDebtTab('paid')}
            className={`btn-pill-base px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm ${
              activeDebtTab === 'paid'
                ? 'btn-pill-emerald font-black'
                : 'btn-pill-inactive'
            }`}
          >
            <span>{t('tabPaidDebts', 'To‘langan qarzlar')}</span>
            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-colors ${
              activeDebtTab === 'paid' ? 'btn-pill-badge-active' : 'btn-pill-badge-inactive'
            }`}>
              {paidDebtsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveDebtTab('all')}
            className={`btn-pill-base px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm ${
              activeDebtTab === 'all'
                ? 'btn-pill-slate font-black'
                : 'btn-pill-inactive'
            }`}
          >
            <span>{t('tabAllDebts', 'Barcha qarzlar')}</span>
            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-colors ${
              activeDebtTab === 'all' ? 'btn-pill-badge-active' : 'btn-pill-badge-inactive'
            }`}>
              {debts.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Debt Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden w-full">
        <div className="w-full overflow-hidden">
          <table className="w-full text-left text-xs font-sans table-fixed border-collapse">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50/90 text-slate-400 font-extrabold uppercase text-[10px] sm:text-[11px] tracking-wider border-b border-slate-200/80">
                <th className="py-3.5 px-2 sm:px-3 truncate">{t('tableDebtorName', 'Qarzdor shaxs')}</th>
                <th className="py-3.5 px-2 sm:px-3 truncate">{t('phoneLabel', 'Telefon')}</th>
                <th className="py-3.5 px-2 sm:px-3 truncate">{t('tableDebtAmount', 'Qarz miqdori')}</th>
                <th className="py-3.5 px-2 sm:px-3 truncate">{t('tableGivenDate', 'Berilgan sana')}</th>
                <th className="py-3.5 px-2 sm:px-3 truncate">{t('tableDueDate', 'To‘lov muddati')}</th>
                <th className="py-3.5 px-2 sm:px-3 truncate text-center">{t('status', 'Holat')}</th>
                <th className="py-3.5 px-2 sm:px-3 truncate">{t('tableDebtNote', 'Izoh / Tovar')}</th>
                <th className="py-3.5 px-2 sm:px-3 text-right truncate">{t('actions', 'Amallar')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {displayedDebts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-16 text-slate-400 font-semibold text-sm">
                    {activeDebtTab === 'active'
                      ? 'Faol qarzlar mavjud emas'
                      : activeDebtTab === 'paid'
                        ? 'To‘langan qarzlar mavjud emas'
                        : 'Hech qanday qarz topilmadi'}
                  </td>
                </tr>
              ) : (
                displayedDebts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* 1. Qarzdor shaxs */}
                    <td className="py-3 px-2 sm:px-3 overflow-hidden">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {d.name?.charAt(0) || 'M'}
                        </div>
                        <div className="font-extrabold text-slate-900 text-xs truncate min-w-0" title={d.name}>
                          {d.name}
                        </div>
                      </div>
                    </td>

                    {/* 2. Telefon */}
                    <td className="py-3 px-2 sm:px-3 overflow-hidden text-slate-600 font-semibold">
                      <div className="flex items-center gap-1 min-w-0">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px] truncate" title={d.phone || '+998 90 000 00 00'}>
                          {d.phone || '—'}
                        </span>
                      </div>
                    </td>

                    {/* 3. Qarz miqdori */}
                    <td className="py-3 px-2 sm:px-3 overflow-hidden">
                      <div className={`font-black text-xs sm:text-[13px] truncate ${
                        d.isPaid || Number(d.amount) === 0 ? 'text-emerald-600' : 'text-amber-600'
                      }`} title={`${Number(d.amount).toLocaleString()} so‘m`}>
                        {Number(d.amount).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">so‘m</span>
                      </div>
                      {Number(d.paidAmount) > 0 && (
                        <div className="text-[10px] text-slate-400 font-bold truncate mt-0.5" title={`To‘langan: ${Number(d.paidAmount).toLocaleString()} so‘m`}>
                          {t('statusPaid', 'To‘langan')}: {Number(d.paidAmount).toLocaleString()}
                        </div>
                      )}
                    </td>

                    {/* 4. Berilgan sana */}
                    <td className="py-3 px-2 sm:px-3 overflow-hidden text-slate-500 font-medium text-xs">
                      <span className="truncate block" title={d.givenDate}>{d.givenDate}</span>
                    </td>

                    {/* 5. To‘lov muddati */}
                    <td className="py-3 px-2 sm:px-3 overflow-hidden text-slate-800 font-bold text-xs">
                      <span className="truncate block" title={d.dueDate}>{d.dueDate}</span>
                    </td>

                    {/* 6. Holat */}
                    <td className="py-3 px-2 sm:px-3 overflow-hidden text-center">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg inline-block truncate max-w-full ${getStatusBadge(d)}`} title={getStatusText(d)}>
                        {getStatusText(d)}
                      </span>
                    </td>

                    {/* 7. Izoh / Tovar */}
                    <td className="py-3 px-2 sm:px-3 overflow-hidden text-slate-500 text-xs">
                      <span className="truncate block" title={d.note || '—'}>
                        {d.note || '—'}
                      </span>
                    </td>

                    {/* 8. Amallar */}
                    <td className="py-3 px-2 sm:px-3 text-right overflow-hidden">
                      <div className="flex items-center justify-end space-x-1 shrink-0">
                        {!d.isPaid && Number(d.amount) > 0 && (
                          <button
                            onClick={() => openPayModal(d)}
                            className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-[11px] flex items-center space-x-1 transition-colors border border-emerald-200/80 cursor-pointer shadow-xs shrink-0"
                            title={t('btnPay', 'To‘lash')}
                          >
                            <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="hidden xl:inline">{t('btnPay', 'To‘lash')}</span>
                          </button>
                        )}

                        <button
                          onClick={() => openEditModal(d)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer shrink-0"
                          title={t('edit', 'Tahrirlash')}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingDebt(d)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title={t('delete', 'O‘chirish')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Debt Modal */}
      {payingDebt && (
        <ModalPortal>
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h3 className="font-black text-slate-900 text-base sm:text-lg">
                  {t('payModalTitle', 'Qarz to‘lovini qabul qilish')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('debtsSubtitle', 'To‘lov summasini kiriting va tasdiqlang')}
                </p>
              </div>
              <button
                onClick={() => setPayingDebt(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Debt Overview Info Box */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {t('tableDebtorName', 'Mijoz')}:
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900">{payingDebt.name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {t('statTotalActiveDebt', 'Jami qarz')}:
                </span>
                <span className="text-sm sm:text-base font-black text-amber-600">
                  {Number(payingDebt.amount).toLocaleString()} {t('sum', 'so‘m')}
                </span>
              </div>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">
                    {t('payAmountLabel', 'To‘lov summasi (so‘m)')} *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPayAmount(String(payingDebt.amount));
                      setPayError('');
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    {t('paySuccessFull', 'To‘liq to‘lash')} ({Number(payingDebt.amount).toLocaleString()} {t('sum', 'so‘m')})
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder={t('payAmountPlaceholder', 'Masalan: 50 000')}
                  value={payAmount}
                  onChange={handlePayAmountChange}
                  className={`w-full p-3.5 bg-slate-50 border rounded-2xl font-black text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    payError
                      ? 'border-rose-300 ring-2 ring-rose-500/20 text-rose-700'
                      : 'border-slate-200 focus:ring-blue-500/20'
                  }`}
                />
              </div>

              {payError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              {currentPayValue > 0 && !payError && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  willBeFullyPaid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-blue-50/70 border-blue-200 text-blue-900'
                }`}>
                  <div className="flex items-center justify-between font-bold text-xs mb-1">
                    <span>{t('remainingDebtLabel', 'To‘lovdan keyin qoladigan qarz:')}</span>
                    <span className="font-black text-sm sm:text-base">{calculatedRemaining.toLocaleString()} {t('sum', 'so‘m')}</span>
                  </div>
                  <div className="text-[11px] font-semibold opacity-90">
                    {willBeFullyPaid ? (
                      <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                        <Check className="w-4 h-4 stroke-[3]" />
                        {t('paySuccessFull', 'Qarz to‘liq yopiladi va "Qarz to‘landi" holatiga o‘tadi')}
                      </span>
                    ) : (
                      <span>{t('paySuccessPartial', 'Qisman to‘lanadi va faol qoladi')}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {t('cancel', 'Bekor qilish')}
                </button>
                <button
                  type="submit"
                  disabled={Boolean(payError) || !payAmount || Number(payAmount) <= 0}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  {t('btnConfirmPayment', 'To‘lovni tasdiqlash')}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDebt && (
        <ModalPortal>
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                {t('deleteDebtConfirmTitle', 'Qarzni o‘chirmoqchimisiz?')}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {getPossessiveName(deletingDebt.name)}: <span className="font-black text-slate-900">{Number(deletingDebt.amount).toLocaleString()} {t('sum', 'so‘m')}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                {t('deleteDebtConfirmDesc', 'Ushbu amal qarzdorlik yozuvini doimiy o‘chiradi.')}
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDebt(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                {t('cancel', 'Bekor qilish')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
              >
                {t('delete', 'O‘chirish')}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Edit Debt Modal */}
      {editingDebt && (
        <ModalPortal>
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h3 className="font-black text-slate-900 text-base sm:text-lg">
                  {t('editDebtModalTitle', 'Qarz ma’lumotlarini tahrirlash')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingDebt.name}
                </p>
              </div>
              <button
                onClick={() => setEditingDebt(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  {t('debtorNameLabel', 'Qarzdorning to‘liq ismi')} *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  {t('debtorPhoneLabel', 'Telefon raqami')}
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="+998 90 123 45 67"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    {t('debtAmountInputLabel', 'Qarz miqdori (so‘m)')} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    {t('dueDateLabel', 'Qaytarish muddati')}
                  </label>
                  <input
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  {t('debtNoteLabel', 'Qarz sababi / Mahsulot')}
                </label>
                <input
                  type="text"
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="Izoh yoki tovar nomi..."
                />
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingDebt(null)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {t('cancel', 'Bekor qilish')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
                >
                  {t('btnSaveDebt', 'O‘zgarishlarni saqlash')}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Add Debt Modal */}
      <QuickActionModal
        type="debt"
        isOpen={isAddDebtOpen}
        onClose={() => setIsAddDebtOpen(false)}
      />
    </div>
  );
};

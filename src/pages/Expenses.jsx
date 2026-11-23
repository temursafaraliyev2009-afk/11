// src/pages/Expenses.jsx
// SAVATCHI — Qo'shimcha Xarajatlar sahifasi
import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Edit2,
  Trash2,
  X,
  Check,
  Wallet,
  TrendingDown,
  Hash,
  Percent,
  ChevronLeft,
  ChevronRight,
  Zap,
  Home,
  Wrench,
  Users,
  Wifi,
  Droplets,
  ShoppingBag,
  BarChart3
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalDateString } from '../utils/dateUtils';

// Xarajat turlari uchun emoji mapperlar
const EXPENSE_EMOJI_MAP = {
  'Elektr toki': '⚡',
  'Xodim maoshi': '👥',
  'Internet': '🌐',
  'Suv': '💧',
  'Ijara': '🏠',
  "Ta'mirlash": '🔧',
  'Dekoratsiya': '🎨',
  'Jihozlar': '🛠️',
  'Transport': '🚗',
  'Reklama': '📢',
  'Soliq': '📋',
  'Tozalash': '🧹',
  'Xavfsizlik': '🔒',
  'Sug\'urta': '🛡️',
  'Qog\'oz va kanstovar': '📝'
};

const getExpenseEmoji = (name) => {
  if (!name) return '💰';
  for (const [key, emoji] of Object.entries(EXPENSE_EMOJI_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '💰';
};

// To'lov usuli ikonkalari
const PAYMENT_ICONS = {
  'Naqd': '💵',
  'Karta': '💳',
  'Bank o\'tkazmasi': '🏦'
};

const ITEMS_PER_PAGE = 10;

export const Expenses = () => {
  const {
    expenses = [],
    addExpense,
    updateExpense,
    deleteExpense,
    sales = [],
    products = [],
    currentStore,
    isEmployee
  } = useStore();
  const { t } = useLanguage();

  // State
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Barchasi');
  const [currentPage, setCurrentPage] = useState(1);

  // Date range (default: current month)
  const today = getLocalDateString();
  const currentYearMonth = today.substring(0, 7);
  const [dateFrom, setDateFrom] = useState(`${currentYearMonth}-01`);
  const [dateTo, setDateTo] = useState(today);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    date: today,
    paymentType: 'Naqd',
    note: ''
  });

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({ name: '', amount: '', date: today, paymentType: 'Naqd', note: '' });
    setEditingExpense(null);
    setShowForm(false);
  }, [today]);

  // Open edit form
  const openEditForm = useCallback((expense) => {
    setFormData({
      name: expense.name || '',
      amount: String(expense.amount || ''),
      date: expense.date || today,
      paymentType: expense.paymentType || 'Naqd',
      note: expense.note || ''
    });
    setEditingExpense(expense);
    setShowForm(true);
  }, [today]);

  // Handle form submit
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const name = formData.name.trim();
    const amount = Number(formData.amount);
    if (!name || !amount || amount <= 0) return;

    const expenseData = {
      name,
      amount: Math.round(amount),
      date: formData.date || today,
      paymentType: formData.paymentType || 'Naqd',
      note: formData.note.trim()
    };

    if (editingExpense) {
      updateExpense(editingExpense.id, expenseData);
    } else {
      addExpense(expenseData);
    }
    resetForm();
  }, [formData, editingExpense, today, addExpense, updateExpense, resetForm]);

  // Handle delete
  const handleDelete = useCallback((id) => {
    if (window.confirm("Ushbu xarajatni o'chirmoqchimisiz?")) {
      deleteExpense(id);
    }
  }, [deleteExpense]);

  // ═══════ FILTRLANGAN VA SARALANGAN XARAJATLAR ═══════
  const filteredExpenses = useMemo(() => {
    let list = [...expenses];

    // Date range filter
    if (dateFrom) list = list.filter(e => (e.date || '') >= dateFrom);
    if (dateTo) list = list.filter(e => (e.date || '') <= dateTo);

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(e =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.note || '').toLowerCase().includes(q)
      );
    }

    // Category filter
    if (filterCategory && filterCategory !== 'Barchasi') {
      list = list.filter(e => (e.paymentType || 'Naqd') === filterCategory);
    }

    // Sort by date descending
    list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id || '').localeCompare(a.id || ''));
    return list;
  }, [expenses, dateFrom, dateTo, searchQuery, filterCategory]);

  // ═══════ STATISTIKALAR ═══════
  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const count = filteredExpenses.length;
    const avg = count > 0 ? Math.round(total / count) : 0;

    // Savdoga nisbati: Tanlangan davrdagi jami savdo tushumiga nisbatan
    let salesTotal = 0;
    const relevantSales = (sales || []).filter(s => {
      if (!s || !s.date) return false;
      if (s.isReturned || s.status === 'Qaytarilgan' || s.status === 'Bekor qilingan') return false;
      if (s.isDebtCollection || s.saleType === 'debt_collection' || s.saleType === 'installment_payment') return false;
      if (dateFrom && s.date < dateFrom) return false;
      if (dateTo && s.date > dateTo) return false;
      return true;
    });
    salesTotal = relevantSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const salesRatio = salesTotal > 0 ? ((total / salesTotal) * 100).toFixed(1) : '0.0';

    // Previous period comparison (simple month-over-month)
    const totalAllExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const prevMonthTotal = totalAllExpenses - total; // simplified
    const changePercent = prevMonthTotal > 0
      ? (((total - prevMonthTotal) / prevMonthTotal) * 100).toFixed(1)
      : total > 0 ? '100' : '0';
    const isIncrease = Number(changePercent) > 0;

    return { total, count, avg, salesRatio, changePercent, isIncrease };
  }, [filteredExpenses, sales, dateFrom, dateTo, expenses]);

  // ═══════ SAHIFALASH ═══════
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE));
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredExpenses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredExpenses, currentPage]);

  // Page reset on filter change
  useMemo(() => { setCurrentPage(1); }, [searchQuery, filterCategory, dateFrom, dateTo]);

  // Unique expense names for suggestions
  const uniqueNames = useMemo(() => {
    const names = new Set(expenses.map(e => e.name).filter(Boolean));
    return [...names].sort();
  }, [expenses]);

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  };

  return (
    <div className="space-y-6 pb-12 font-sans select-none max-w-[1600px] mx-auto">
      {/* ═══════ HEADER ═══════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Wallet className="w-7 h-7 text-orange-500" />
            <span>Qo'shimcha xarajatlar</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Do'koningiz uchun qo'shimcha xarajatlarni qo'shing va ularni boshqaring
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range picker */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-slate-200 shadow-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent outline-none w-28"
            />
            <span className="text-slate-300">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent outline-none w-28"
            />
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingExpense(null); setFormData({ name: '', amount: '', date: today, paymentType: 'Naqd', note: '' }); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-600/25 hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            <Plus className="w-4 h-4" />
            Yangi xarajat qo'shish
          </button>
        </div>
      </div>

      {/* ═══════ STATISTIK KARTALAR ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Jami xarajatlar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-orange-200 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Jami xarajatlar
            </span>
            <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight">
              {stats.total.toLocaleString()} <span className="text-sm font-bold text-slate-400">so'm</span>
            </div>
            <div className={`text-[11px] font-bold flex items-center gap-1 mt-1 ${stats.isIncrease ? 'text-rose-600' : 'text-emerald-600'}`}>
              <TrendingDown className="w-3.5 h-3.5" />
              <span>{stats.isIncrease ? '↑' : '↓'} {Math.abs(Number(stats.changePercent))}%</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0 group-hover:scale-105 transition-transform">
            <Wallet className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* O'rtacha xarajat */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              O'rtacha xarajat
            </span>
            <div className="text-2xl sm:text-[26px] font-black text-blue-600 tracking-tight">
              {stats.avg.toLocaleString()} <span className="text-sm font-bold text-blue-400">so'm</span>
            </div>
            <div className="text-[11px] font-bold text-slate-400 mt-1">
              Har bir yozuv uchun
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0 group-hover:scale-105 transition-transform">
            <BarChart3 className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* Jami yozuvlar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Jami yozuvlar
            </span>
            <div className="text-2xl sm:text-[26px] font-black text-emerald-600 tracking-tight">
              {stats.count} <span className="text-sm font-bold text-emerald-400">ta</span>
            </div>
            <div className="text-[11px] font-bold text-slate-400 mt-1">
              Oylik
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform">
            <Hash className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* Savdoga nisbati */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-purple-200 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Savdaga nisbati
            </span>
            <div className="text-2xl sm:text-[26px] font-black text-purple-600 tracking-tight">
              {stats.salesRatio}%
            </div>
            <div className="text-[11px] font-bold text-slate-400 mt-1">
              <Percent className="w-3 h-3 inline" /> Xarajat / Tushum
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 shrink-0 group-hover:scale-105 transition-transform">
            <Percent className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* ═══════ JADVAL VA FORMA ═══════ */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* LEFT: Table */}
        <div className="flex-1 space-y-4">
          {/* Search and filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Xarajat nomi bo'yicha qidirish..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="Barchasi">Barchasi</option>
                <option value="Naqd">💵 Naqd</option>
                <option value="Karta">💳 Karta</option>
                <option value="Bank o'tkazmasi">🏦 Bank o'tkazmasi</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm font-sans">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-400 font-extrabold uppercase text-[11px] tracking-wider border-b border-slate-200/80">
                    <th className="py-4 px-5">Sana</th>
                    <th className="py-4 px-5">Xarajat turi</th>
                    <th className="py-4 px-5">Summa</th>
                    <th className="py-4 px-5">To'lov usuli</th>
                    <th className="py-4 px-5">Izoh</th>
                    <th className="py-4 px-5 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        <Wallet className="w-12 h-12 mx-auto text-slate-300 mb-3 stroke-[1.5]" />
                        <div className="font-bold text-sm">Xarajatlar topilmadi</div>
                        <div className="text-xs mt-1">Yangi xarajat qo'shish uchun yuqoridagi tugmani bosing</div>
                      </td>
                    </tr>
                  ) : (
                    paginatedExpenses.map(expense => (
                      <tr key={expense.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-5 text-slate-600 font-semibold text-xs whitespace-nowrap">
                          {formatDate(expense.date)}
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{getExpenseEmoji(expense.name)}</span>
                            <span className="font-bold text-slate-900">{expense.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5 font-black text-slate-900 whitespace-nowrap">
                          {Number(expense.amount || 0).toLocaleString()} so'm
                        </td>
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                            {PAYMENT_ICONS[expense.paymentType] || '💰'} {expense.paymentType || 'Naqd'}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-slate-500 text-xs max-w-[200px] truncate">
                          {expense.note || '—'}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditForm(expense)}
                              className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                              title="Tahrirlash"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                              title="O'chirish"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer: Total + Pagination */}
            <div className="px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-sm font-black text-slate-900">
                Jami: {stats.total.toLocaleString()} so'm
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black min-w-[36px] text-center">
                    {currentPage}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Expense Form */}
        {showForm && (
          <div className="w-full xl:w-[340px] shrink-0">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5 sticky top-28">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" />
                  {editingExpense ? 'Xarajatni tahrirlash' : "Yangi xarajat qo'shish"}
                </h3>
                <button onClick={resetForm} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Xarajat turi */}
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                    Xarajat turi <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">{getExpenseEmoji(formData.name)}</span>
                    <input
                      type="text"
                      list="expense-names-list"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Elektr toki"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                      required
                    />
                    <datalist id="expense-names-list">
                      {uniqueNames.map(n => <option key={n} value={n} />)}
                      {!uniqueNames.includes('Elektr toki') && <option value="Elektr toki" />}
                      {!uniqueNames.includes('Xodim maoshi') && <option value="Xodim maoshi" />}
                      {!uniqueNames.includes("Ta'mirlash") && <option value="Ta'mirlash" />}
                      {!uniqueNames.includes('Internet') && <option value="Internet" />}
                      {!uniqueNames.includes('Suv') && <option value="Suv" />}
                      {!uniqueNames.includes('Ijara') && <option value="Ijara" />}
                      {!uniqueNames.includes('Jihozlar') && <option value="Jihozlar" />}
                      {!uniqueNames.includes('Dekoratsiya') && <option value="Dekoratsiya" />}
                    </datalist>
                  </div>
                </div>

                {/* Summa va Sana */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                      Summa <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={formData.amount}
                        onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0"
                        className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">so'm</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                      Sana <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* To'lov usuli */}
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                    To'lov usuli
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">{PAYMENT_ICONS[formData.paymentType] || '💰'}</span>
                    <select
                      value={formData.paymentType}
                      onChange={e => setFormData(prev => ({ ...prev, paymentType: e.target.value }))}
                      className="w-full pl-9 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    >
                      <option value="Naqd">Naqd</option>
                      <option value="Karta">Karta</option>
                      <option value="Bank o'tkazmasi">Bank o'tkazmasi</option>
                    </select>
                  </div>
                </div>

                {/* Izoh */}
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                    Izoh (ixtiyoriy)
                  </label>
                  <div className="relative">
                    <textarea
                      value={formData.note}
                      onChange={e => setFormData(prev => ({ ...prev, note: e.target.value.slice(0, 200) }))}
                      placeholder="Qo'shimcha izoh..."
                      rows={3}
                      maxLength={200}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
                    />
                    <span className="absolute right-3 bottom-2 text-[10px] text-slate-400 font-bold">
                      {(formData.note || '').length} / 200
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:scale-[1.02] transition-all"
                  >
                    <Check className="w-4 h-4" />
                    Saqlash
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

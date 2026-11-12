// src/pages/Rentals.jsx
import React, { useState, useMemo } from 'react';
import { ModalPortal } from '../components/ModalPortal';
import {
  CalendarClock,
  Plus,
  Search,
  Users,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Phone,
  Layers,
  RotateCcw,
  Wallet,
  Calendar,
  Check,
  CreditCard,
  Banknote,
  ShieldAlert,
  ArrowRight,
  Filter,
  FileText,
  Trash2
} from 'lucide-react';
import { useStore, isRentalSupportedStoreType } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getLocalDateString } from '../utils/dateUtils';

export const Rentals = ({ setActiveTab }) => {
  const {
    rentals = [],
    addRental,
    updateRentalStatus,
    addRentalPayment,
    deleteRental,
    products = [],
    debts = [],
    currentStore,
    storeConfig,
    isItemPendingDelete,
    setItemPendingDelete
  } = useStore();

  const { t } = useLanguage();
  const { notifySuccess, notifyError, notifyInfo, showUndoDelete } = useToast();

  const storeType = currentStore?.type || storeConfig?.id || 'food';
  const isRentalAllowed = isRentalSupportedStoreType(storeType);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setLocalActiveTab] = useState('all'); // 'all' | 'active' | 'returned' | 'overdue'
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'paid' | 'partial' | 'unpaid'
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Deleting Rental State (5 soniyalik bekor qilish uchun)
  const [deletingRental, setDeletingRental] = useState(null);

  // New Rental Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState('');
  const [rentalFee, setRentalFee] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentType, setPaymentType] = useState('Naqd');
  const [notes, setNotes] = useState('');

  // Row Details & Payment Modal State
  const [selectedRentalForDetails, setSelectedRentalForDetails] = useState(null);
  const [paymentInputAmount, setPaymentInputAmount] = useState('');
  const [paymentInputType, setPaymentInputType] = useState('Naqd');
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Status Change Confirmation Modal State
  const [confirmStatusModal, setConfirmStatusModal] = useState(null); // { rental, targetStatus }

  const todayStr = getLocalDateString();

  // Existing customer list from previous rentals and debts
  const existingCustomers = useMemo(() => {
    const map = new Map();
    // From debts
    debts.forEach((d) => {
      if (d.name) {
        map.set(d.name.trim().toLowerCase(), {
          id: d.id,
          name: d.name,
          phone: d.phone || '+998 90 000 00 00'
        });
      }
    });
    // From rentals
    rentals.forEach((r) => {
      if (r.customerName) {
        map.set(r.customerName.trim().toLowerCase(), {
          id: r.customerId || r.id,
          name: r.customerName,
          phone: r.customerPhone || '+998 90 000 00 00'
        });
      }
    });
    return Array.from(map.values());
  }, [debts, rentals]);

  // Available products for rental (must have stock > 0)
  const availableProducts = useMemo(() => {
    return products.filter((p) => (Number(p.stock) || 0) > 0);
  }, [products]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // ----------------------------------------------------
  // STATISTIKALAR (4 TA KARTA)
  // Faol (o'chirish jarayonida bo'lmagan) ijara yozuvlari ro'yxati
  // ----------------------------------------------------
  const activeRentals = useMemo(() => {
    return rentals.filter(r => !isItemPendingDelete(r.id));
  }, [rentals, isItemPendingDelete]);

  const stats = useMemo(() => {
    const total = activeRentals.length;
    let active = 0;
    let returned = 0;
    let overdue = 0;

    activeRentals.forEach((r) => {
      if (r.status === 'Qaytarilgan') {
        returned++;
      } else if (r.status === 'Muddati o‘tgan' || (r.status === 'Faol' && r.endDate && r.endDate < todayStr)) {
        overdue++;
      } else {
        active++;
      }
    });

    return { total, active, returned, overdue };
  }, [activeRentals, todayStr]);

  // Helper to determine real-time status of a rental
  const getComputedStatus = (r) => {
    if (r.status === 'Qaytarilgan') return 'Qaytarilgan';
    if (r.status === 'Muddati o‘tgan' || (r.status === 'Faol' && r.endDate && r.endDate < todayStr)) {
      return 'Muddati o‘tgan';
    }
    return 'Faol';
  };

  // ----------------------------------------------------
  // FILTERED RENTALS LIST
  // ----------------------------------------------------
  const filteredRentals = useMemo(() => {
    return activeRentals.filter((r) => {
      const computedStatus = getComputedStatus(r);

      // 1. Tab filter
      if (activeTab === 'active' && computedStatus !== 'Faol') return false;
      if (activeTab === 'returned' && computedStatus !== 'Qaytarilgan') return false;
      if (activeTab === 'overdue' && computedStatus !== 'Muddati o‘tgan') return false;

      // 2. Payment filter
      if (paymentFilter === 'paid' && r.remainingAmount > 0) return false;
      if (paymentFilter === 'partial' && (r.paidAmount <= 0 || r.remainingAmount <= 0)) return false;
      if (paymentFilter === 'unpaid' && r.paidAmount > 0) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCustomer = (r.customerName || '').toLowerCase().includes(q);
        const matchesPhone = (r.customerPhone || '').toLowerCase().includes(q);
        const matchesProduct = (r.productName || '').toLowerCase().includes(q);
        const matchesNotes = (r.notes || '').toLowerCase().includes(q);
        if (!matchesCustomer && !matchesPhone && !matchesProduct && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [activeRentals, activeTab, paymentFilter, searchQuery, todayStr]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRentals.length / pageSize));
  const paginatedRentals = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRentals.slice(start, start + pageSize);
  }, [filteredRentals, currentPage, pageSize]);

  // Reset pagination on filter or tab change
  const handleTabChange = (tab) => {
    setLocalActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  // ----------------------------------------------------
  // FORM HANDLERS
  // ----------------------------------------------------
  const handleOpenAddModal = () => {
    setFormError('');
    setIsNewCustomer(false);
    setSelectedCustomerId(existingCustomers[0]?.id || '');
    setCustomerName(existingCustomers[0]?.name || '');
    setCustomerPhone(existingCustomers[0]?.phone || '');
    setSelectedProductId(availableProducts[0]?.id || '');
    setQty('1');
    setStartDate(getLocalDateString());
    setEndDate('');
    setRentalFee('');
    setPaidAmount('0');
    setPaymentType('Naqd');
    setNotes('');
    setIsAddModalOpen(true);
  };

  const handleSelectExistingCustomer = (id) => {
    setSelectedCustomerId(id);
    const cust = existingCustomers.find((c) => c.id === id);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone);
    }
  };

  const calculatedRemaining = useMemo(() => {
    const fee = Number(rentalFee) || 0;
    const paid = Number(paidAmount) || 0;
    return Math.max(0, fee - paid);
  }, [rentalFee, paidAmount]);

  const handleSubmitRental = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validation
    const name = customerName.trim();
    if (!name) {
      setFormError("Iltimos, mijoz ismini kiriting yoki ro‘yxatdan tanlang.");
      return;
    }

    if (!selectedProductId) {
      setFormError("Iltimos, ijaraga beriladigan mahsulotni tanlang.");
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) {
      setFormError("Tanlangan mahsulot omborda topilmadi.");
      return;
    }

    const numQty = Number(qty) || 0;
    if (numQty <= 0) {
      setFormError("Ijara miqdori kamida 1 dona bo‘lishi kerak.");
      return;
    }

    if (numQty > (Number(prod.stock) || 0)) {
      setFormError(`Omborda yetarli mahsulot mavjud emas! Hozirda mavjud: ${prod.stock} ${prod.unit || 'dona'}`);
      return;
    }

    if (!startDate) {
      setFormError("Ijara boshlanish sanasini belgilang.");
      return;
    }

    if (!endDate) {
      setFormError("Qaytarish muddatini belgilang.");
      return;
    }

    if (endDate < startDate) {
      setFormError("Qaytarish muddati boshlanish sanasidan keyin yoki teng bo‘lishi kerak.");
      return;
    }

    const feeNum = Number(rentalFee) || 0;
    if (feeNum <= 0) {
      setFormError("Ijara haqi 0 dan katta bo‘lishi kerak.");
      return;
    }

    const paidNum = Number(paidAmount) || 0;
    if (paidNum < 0) {
      setFormError("Dastlab to‘langan summa manfiy bo‘lishi mumkin emas.");
      return;
    }

    if (paidNum > feeNum) {
      setFormError("To‘langan summa ijara haqidan oshib ketishi mumkin emas.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addRental({
        customerId: isNewCustomer ? null : selectedCustomerId,
        customerName: name,
        customerPhone: customerPhone.trim() || '+998 90 000 00 00',
        productId: prod.id,
        productName: prod.name,
        qty: numQty,
        startDate,
        endDate,
        rentalFee: feeNum,
        paidAmount: paidNum,
        paymentType,
        notes: notes.trim()
      });

      notifySuccess("Yangi ijara muvaffaqiyatli rasmiylashtirildi!");
      setIsAddModalOpen(false);
    } catch (err) {
      setFormError(err.message || "Ijarani saqlashda xatolik yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // STATUS CHANGE & CONFIRMATION HANDLERS
  // ----------------------------------------------------
  const handleStatusSelectChange = (rental, targetStatus) => {
    if (rental.status === targetStatus) return;

    // Agar Qaytarilgan holati tanlansa, tasdiqlash oynasini chiqaramiz
    if (targetStatus === 'Qaytarilgan') {
      setConfirmStatusModal({ rental, targetStatus });
      return;
    }

    // Boshqa holatlar uchun to'g'ridan-to'g'ri yangilaymiz
    executeStatusChange(rental, targetStatus);
  };

  const executeStatusChange = async (rental, targetStatus) => {
    try {
      await updateRentalStatus(rental.id, targetStatus);
      notifySuccess(`Ijara holati "${targetStatus}" ga o‘zgartirildi.`);
      if (selectedRentalForDetails && selectedRentalForDetails.id === rental.id) {
        setSelectedRentalForDetails((prev) => ({ ...prev, status: targetStatus }));
      }
    } catch (err) {
      notifyError(err.message || "Holatni o‘zgartirishda xatolik yuz berdi.");
    } finally {
      setConfirmStatusModal(null);
    }
  };

  // ----------------------------------------------------
  // DETAILS & PAYMENT MODAL HANDLERS
  // ----------------------------------------------------
  const handleOpenDetails = (rental) => {
    setSelectedRentalForDetails(rental);
    setPaymentInputAmount('');
    setPaymentInputType('Naqd');
    setPaymentError('');
  };

  const handleAddPaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentError('');

    if (!selectedRentalForDetails) return;

    const amountNum = Number(paymentInputAmount) || 0;
    if (amountNum <= 0) {
      setPaymentError("To‘lov summasi 0 dan katta bo‘lishi kerak.");
      return;
    }

    if (amountNum > selectedRentalForDetails.remainingAmount) {
      setPaymentError(`Kiritilgan summa qolgan qarzdorlikdan (${selectedRentalForDetails.remainingAmount.toLocaleString()} so‘m) oshmasligi kerak.`);
      return;
    }

    setIsAddingPayment(true);
    try {
      const updated = await addRentalPayment(
        selectedRentalForDetails.id,
        amountNum,
        paymentInputType
      );

      notifySuccess(`${amountNum.toLocaleString()} so‘m to‘lov qabul qilindi!`);
      setSelectedRentalForDetails(updated);
      setPaymentInputAmount('');
    } catch (err) {
      setPaymentError(err.message || "To‘lovni qabul qilishda xatolik yuz berdi.");
    } finally {
      setIsAddingPayment(false);
    }
  };

  // ----------------------------------------------------
  // STORE TYPE RESTRICTION NOTICE
  // Faqat 4 ta do'kon turida ochiladi: Uy-ro'zg'or, Sport, Aksessuarlar, Telefon
  // ----------------------------------------------------
  if (!isRentalAllowed) {
    return (
      <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto mt-12 font-sans select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-800">Ijara xizmati mavjud emas</h3>
        <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
          Ijara (Arenda) funksiyasi faqat <strong>Uy-ro‘zg‘or buyumlari</strong>, <strong>Sport jihozlari</strong>, <strong>Aksessuarlar</strong> va <strong>Telefon</strong> do‘konlari uchun mo‘ljallangan. Hozirgi do‘koningiz turi ushbu xizmatni qo‘llab-quvvatlamaydi.
        </p>
        <button
          onClick={() => setActiveTab && setActiveTab('dashboard')}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs shadow-lg shadow-blue-600/20 hover:opacity-95 cursor-pointer transition-all active:scale-[0.98]"
        >
          <span>Bosh sahifaga qaytish</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 font-sans select-none max-w-[1600px] mx-auto">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>{t('navRentals', 'IJARA VA ARENDA')}</span>
            <span className="text-xs font-black px-3 py-1 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 shadow-xs">
              {currentStore?.name || storeConfig.name}
            </span>
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Buyumlarni ijaraga berish, qaytarilish muddatlari va to‘lovlarni nazorat qiling.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          <span>Yangi ijara berish</span>
        </button>
      </div>

      {/* 4 STAT CARDS (Talab 2: Qavslarsiz, faqat sarlavha, ikonka va haqiqiy son) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Jami ijara */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100/70 transition-colors pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Jami ijara
              </span>
              <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-tight">
                {stats.total}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0 group-hover:scale-105 transition-transform duration-200">
              <Layers className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>
        </div>

        {/* Card 2: Faol ijara */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100/70 transition-colors pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Faol ijara
              </span>
              <div className="text-2xl sm:text-[26px] font-black text-emerald-600 tracking-tight leading-tight">
                {stats.active}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform duration-200">
              <Clock className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>
        </div>

        {/* Card 3: Tugatilgan ijara */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100/70 transition-colors pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Tugatilgan ijara
              </span>
              <div className="text-2xl sm:text-[26px] font-black text-indigo-600 tracking-tight leading-tight">
                {stats.returned}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0 group-hover:scale-105 transition-transform duration-200">
              <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>
        </div>

        {/* Card 4: Muddati o‘tgan */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-rose-200 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 rounded-full blur-2xl group-hover:bg-rose-100/70 transition-colors pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Muddati o‘tgan
              </span>
              <div className="text-2xl sm:text-[26px] font-black text-rose-600 tracking-tight leading-tight">
                {stats.overdue}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 shrink-0 group-hover:scale-105 transition-transform duration-200">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Tabs & Payment Filter */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Mijoz, telefon yoki mahsulot bo‘yicha qidirish..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs & Filter */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Tabs: Barchasi, Faol ijara, Qaytarilgan, Muddati o‘tgan */}
          <div className="flex items-center space-x-2 overflow-x-auto md:overflow-x-visible py-1.5 px-1 scrollbar-none">
            <button
              onClick={() => handleTabChange('all')}
              className={`btn-pill-base px-4 py-2.5 rounded-2xl text-xs sm:text-sm ${
                activeTab === 'all'
                  ? 'btn-pill-blue font-black'
                  : 'btn-pill-inactive'
              }`}
            >
              <span>Barchasi</span>
              <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-colors ${
                activeTab === 'all' ? 'btn-pill-badge-active' : 'btn-pill-badge-inactive'
              }`}>
                {stats.total}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('active')}
              className={`btn-pill-base px-4 py-2.5 rounded-2xl text-xs sm:text-sm ${
                activeTab === 'active'
                  ? 'btn-pill-emerald font-black'
                  : 'btn-pill-inactive'
              }`}
            >
              <span>Faol ijara</span>
              <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-colors ${
                activeTab === 'active' ? 'btn-pill-badge-active' : 'btn-pill-badge-inactive'
              }`}>
                {stats.active}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('returned')}
              className={`btn-pill-base px-4 py-2.5 rounded-2xl text-xs sm:text-sm ${
                activeTab === 'returned'
                  ? 'btn-pill-purple font-black'
                  : 'btn-pill-inactive'
              }`}
            >
              <span>Qaytarilgan</span>
              <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-colors ${
                activeTab === 'returned' ? 'btn-pill-badge-active' : 'btn-pill-badge-inactive'
              }`}>
                {stats.returned}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('overdue')}
              className={`btn-pill-base px-4 py-2.5 rounded-2xl text-xs sm:text-sm ${
                activeTab === 'overdue'
                  ? 'btn-pill-rose font-black'
                  : 'btn-pill-inactive'
              }`}
            >
              <span>Muddati o‘tgan</span>
              <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-colors ${
                activeTab === 'overdue' ? 'btn-pill-badge-active' : 'btn-pill-badge-inactive'
              }`}>
                {stats.overdue}
              </span>
            </button>
          </div>

          {/* Payment Status Filter Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`btn-pill-base px-3.5 py-2.5 rounded-2xl text-xs font-bold ${
                paymentFilter !== 'all'
                  ? 'btn-pill-blue font-extrabold'
                  : 'btn-pill-inactive'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>To‘lov holati</span>
              {paymentFilter !== 'all' && (
                <span className="w-2 h-2 rounded-full bg-white ml-0.5" />
              )}
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-30 animate-in fade-in duration-150">
                <div className="px-3.5 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  To‘lov bo‘yicha saralash
                </div>
                <button
                  onClick={() => { setPaymentFilter('all'); setIsFilterOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                    paymentFilter === 'all' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Barcha to‘lovlar
                </button>
                <button
                  onClick={() => { setPaymentFilter('unpaid'); setIsFilterOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                    paymentFilter === 'unpaid' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  To‘lanmagan (0 so‘m)
                </button>
                <button
                  onClick={() => { setPaymentFilter('partial'); setIsFilterOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                    paymentFilter === 'partial' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Qisman to‘langan
                </button>
                <button
                  onClick={() => { setPaymentFilter('paid'); setIsFilterOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                    paymentFilter === 'paid' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  To‘liq to‘langan
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RENTALS TABLE (Talab 6: "Amallar" ustuni BO'LMASIN, holat to'g'ridan-to'g'ri maydonda o'zgartiriladi) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredRentals.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100">
              <CalendarClock className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-800">Ijara yozuvlari topilmadi</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {searchQuery
                ? "Qidiruv so‘rovingiz bo‘yicha hech qanday ijara topilmadi. Qidiruvni tozalab ko‘ring."
                : "Ushbu do‘konda hali ijara shartnomalari rasmiylashtirilmagan. Yangi ijara qo‘shish uchun yuqoridagi tugmani bosing."}
            </p>
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Qidiruvni tozalash
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-5">Mijoz</th>
                  <th className="py-4 px-5">Mahsulot</th>
                  <th className="py-4 px-5">Boshlanish sanasi</th>
                  <th className="py-4 px-5">Qaytarish muddati</th>
                  <th className="py-4 px-5">Ijara haqi</th>
                  <th className="py-4 px-5">To‘langan / Qolgan</th>
                  <th className="py-4 px-5">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {paginatedRentals.map((r) => {
                  const computedStatus = getComputedStatus(r);
                  const isFullyPaid = r.remainingAmount <= 0;

                  return (
                    <tr
                      key={r.id}
                      onClick={() => handleOpenDetails(r)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      title="Batafsil ko‘rish yoki to‘lov kiritish uchun bosing"
                    >
                      {/* 1. Mijoz */}
                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black text-xs shrink-0 border border-blue-200/50">
                            {r.customerName?.charAt(0).toUpperCase() || 'M'}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {r.customerName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{r.customerPhone || 'Telefon yo‘q'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Mahsulot */}
                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-base">{r.productEmoji || '📦'}</span>
                          <div>
                            <span className="font-bold text-slate-800 block truncate max-w-[180px]">
                              {r.productName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {r.qty} {r.unit || 'dona'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Boshlanish sanasi */}
                      <td className="py-4 px-5 text-slate-600">
                        {r.startDate || '—'}
                      </td>

                      {/* 4. Qaytarish muddati */}
                      <td className="py-4 px-5">
                        <div className="space-y-0.5">
                          <span className={`font-bold ${
                            computedStatus === 'Muddati o‘tgan' ? 'text-rose-600 font-extrabold' : 'text-slate-800'
                          }`}>
                            {r.endDate || '—'}
                          </span>
                          {computedStatus === 'Muddati o‘tgan' && (
                            <span className="block text-[10px] text-rose-500 font-black">
                              Muddat o‘tgan!
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Ijara haqi */}
                      <td className="py-4 px-5 font-extrabold text-slate-900">
                        {Number(r.rentalFee).toLocaleString()} so‘m
                      </td>

                      {/* 6. To'langan / Qolgan */}
                      <td className="py-4 px-5">
                        <div className="space-y-0.5">
                          <div className="text-emerald-600 font-bold">
                            {Number(r.paidAmount).toLocaleString()} so‘m
                          </div>
                          <div className={`text-[11px] font-semibold ${
                            isFullyPaid ? 'text-slate-400' : 'text-rose-600'
                          }`}>
                            Qarz: {Number(r.remainingAmount).toLocaleString()} so‘m
                          </div>
                        </div>
                      </td>

                      {/* 7. Holat (Talab 5: Dropdown orqali bevosita o'zgartiriladi) */}
                      <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={computedStatus}
                          onChange={(e) => handleStatusSelectChange(r, e.target.value)}
                          className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border outline-none cursor-pointer transition-all ${
                            computedStatus === 'Faol'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-2 focus:ring-emerald-400/20'
                              : computedStatus === 'Qaytarilgan'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-2 focus:ring-blue-400/20'
                                : 'bg-rose-50 text-rose-700 border-rose-200 focus:ring-2 focus:ring-rose-400/20'
                          }`}
                        >
                          <option value="Faol">Faol</option>
                          <option value="Qaytarilgan">Qaytarilgan</option>
                          <option value="Muddati o‘tgan">Muddati o‘tgan</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredRentals.length > pageSize && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium bg-slate-50/50">
            <span>
              Jami {filteredRentals.length} ta ijaradan {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredRentals.length)} ko‘rsatilmoqda
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Oldingi
              </button>
              <span className="px-2 font-bold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Keyingi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: YANGI IJARA BERISH MODALI (Talab 3)                              */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150 overflow-y-auto">
            <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4 my-8">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg">
                      Yangi ijara rasmiylashtirish
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Ombordagi buyumni mijozga ijaraga berish
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Error banner */}
              {formError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitRental} className="space-y-4">
                {/* 1. Mijoz tanlash / Yangi mijoz qo'shish */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Mijoz ma’lumotlari <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewCustomer(!isNewCustomer);
                        if (!isNewCustomer) {
                          setCustomerName('');
                          setCustomerPhone('');
                        } else if (existingCustomers.length > 0) {
                          handleSelectExistingCustomer(existingCustomers[0].id);
                        }
                      }}
                      className="text-[11px] font-extrabold text-blue-600 hover:underline cursor-pointer"
                    >
                      {isNewCustomer ? "Mavjud mijozlardan tanlash" : "+ Yangi mijoz kiritish"}
                    </button>
                  </div>

                  {!isNewCustomer && existingCustomers.length > 0 ? (
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      {existingCustomers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Mijoz to‘liq ismi..."
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        required
                      />
                      <input
                        type="tel"
                        placeholder="+998 90 123 45 67"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* 2. Mahsulot va Miqdor */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Ijaraga beriladigan buyum <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                      required
                    >
                      {availableProducts.length === 0 ? (
                        <option value="">Omborda mavjud mahsulot yo‘q</option>
                      ) : (
                        availableProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.emoji || '📦'} {p.name} (Zaxirada: {p.stock} {p.unit || 'dona'})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Miqdor ({selectedProduct?.unit || 'dona'}) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedProduct ? selectedProduct.stock : 1}
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* 3. Boshlanish va Qaytarish sanasi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Boshlanish sanasi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Qaytarish muddati <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      min={startDate}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* 4. Moliyaviy ko'rsatkichlar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      Ijara haqi (so‘m) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="100000"
                      value={rentalFee}
                      onChange={(e) => setRentalFee(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      Dastlab to‘langan
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={rentalFee || 0}
                      placeholder="0"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-extrabold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">
                      Qolgan summa
                    </label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-black text-rose-600 flex items-center justify-between">
                      <span>{calculatedRemaining.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400">so‘m</span>
                    </div>
                  </div>
                </div>

                {/* 5. To'lov turi & Izoh */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      To‘lov turi
                    </label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="Naqd">Naqd</option>
                      <option value="Karta">Karta</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Izoh (ixtiyoriy)
                    </label>
                    <input
                      type="text"
                      placeholder="Masalan: Pasport nusxasi olindi..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Submit buttons */}
                <div className="pt-2 flex items-center justify-end space-x-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || availableProducts.length === 0}
                    className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/25 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <span>Saqlanmoqda...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Ijaraga berish</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BATAFSIL MA'LUMOT VA TO'LOV KIRITISH MODALI (Talab 6 & 9)        */}
      {/* ========================================================================= */}
      {selectedRentalForDetails && (
        <ModalPortal>
          <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150 overflow-y-auto">
            <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl border border-slate-100 space-y-5 my-8">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-xl shrink-0">
                    {selectedRentalForDetails.productEmoji || '📦'}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg">
                      {selectedRentalForDetails.productName}
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold">
                      Mijoz: {selectedRentalForDetails.customerName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRentalForDetails(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Info Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Telefon
                  </span>
                  <a
                    href={`tel:${selectedRentalForDetails.customerPhone}`}
                    className="font-extrabold text-blue-600 hover:underline mt-0.5 block truncate"
                  >
                    {selectedRentalForDetails.customerPhone || '—'}
                  </a>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Miqdori
                  </span>
                  <span className="font-extrabold text-slate-800 mt-0.5 block">
                    {selectedRentalForDetails.qty} {selectedRentalForDetails.unit || 'dona'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Holati
                  </span>
                  <span className={`inline-block font-black px-2 py-0.5 rounded-md text-[11px] mt-0.5 ${
                    getComputedStatus(selectedRentalForDetails) === 'Faol'
                      ? 'bg-emerald-50 text-emerald-700'
                      : getComputedStatus(selectedRentalForDetails) === 'Qaytarilgan'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-rose-50 text-rose-700'
                  }`}>
                    {getComputedStatus(selectedRentalForDetails)}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Boshlanish
                  </span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {selectedRentalForDetails.startDate || '—'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Qaytarish muddati
                  </span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {selectedRentalForDetails.endDate || '—'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Qaytarilgan sana
                  </span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {selectedRentalForDetails.returnedDate || 'Hali olinmagan'}
                  </span>
                </div>
              </div>

              {/* Financial Summary Card */}
              <div className="bg-gradient-to-br from-slate-900 to-[#0B132B] text-white p-5 rounded-3xl space-y-3 shadow-lg">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 border-b border-slate-800 pb-2.5">
                  <span>Umumiy ijara haqi:</span>
                  <span className="text-base font-black text-white">
                    {Number(selectedRentalForDetails.rentalFee).toLocaleString()} so‘m
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      To‘langan summa
                    </span>
                    <div className="text-lg font-black text-emerald-400">
                      {Number(selectedRentalForDetails.paidAmount).toLocaleString()} <span className="text-xs">so‘m</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
                      Qolgan summa
                    </span>
                    <div className="text-lg font-black text-rose-400">
                      {Number(selectedRentalForDetails.remainingAmount).toLocaleString()} <span className="text-xs">so‘m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Input Section (Agar qarz qolgan bo'lsa) */}
              {selectedRentalForDetails.remainingAmount > 0 ? (
                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-blue-600" />
                      <span>Ijara to‘lovini qabul qilish</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setPaymentInputAmount(String(selectedRentalForDetails.remainingAmount))}
                      className="text-[10px] font-extrabold text-blue-600 hover:underline cursor-pointer"
                    >
                      Barchasini to‘lash ({selectedRentalForDetails.remainingAmount.toLocaleString()} so‘m)
                    </button>
                  </div>

                  {paymentError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                      {paymentError}
                    </div>
                  )}

                  <form onSubmit={handleAddPaymentSubmit} className="space-y-2.5">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          max={selectedRentalForDetails.remainingAmount}
                          placeholder="Summani kiriting..."
                          value={paymentInputAmount}
                          onChange={(e) => setPaymentInputAmount(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <select
                          value={paymentInputType}
                          onChange={(e) => setPaymentInputType(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                        >
                          <option value="Naqd">Naqd</option>
                          <option value="Karta">Karta</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isAddingPayment}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 hover:opacity-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>{isAddingPayment ? "Saqlanmoqda..." : "To‘lovni tasdiqlash"}</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-extrabold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ushbu ijara bo‘yicha to‘lov to‘liq yopilgan.</span>
                </div>
              )}

              {/* Payment History List (To'lovlar tarixi) */}
              {selectedRentalForDetails.payments && selectedRentalForDetails.payments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    To‘lovlar tarixi ({selectedRentalForDetails.payments.length})
                  </h4>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {selectedRentalForDetails.payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800">
                            {Number(p.amount).toLocaleString()} so‘m
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                            {p.type}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {p.date} {p.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRentalForDetails.notes && (
                <div className="text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100 text-slate-600">
                  <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider mb-1">
                    Izoh:
                  </span>
                  {selectedRentalForDetails.notes}
                </div>
              )}

              {/* O'chirish tugmasi */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingRental(selectedRentalForDetails)}
                  className="w-full py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs border border-rose-200/80 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Ijara yozuvini o‘chirish</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: QAYTARILISHNI TASDIQLASH MODALI                                  */}
      {/* ========================================================================= */}
      {confirmStatusModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                <RotateCcw className="w-6 h-6 stroke-[2.2]" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="font-black text-slate-900 text-base">
                  Buyumni qabul qilib oldingizmi?
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Ushbu amal orqali ijara <strong>Qaytarilgan</strong> deb belgilanadi va <strong>{confirmStatusModal.rental.qty} {confirmStatusModal.rental.unit || 'dona'} {confirmStatusModal.rental.productName}</strong> ombordagi mavjud zaxiraga qaytariladi.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmStatusModal(null)}
                  className="w-1/2 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={() => executeStatusChange(confirmStatusModal.rental, confirmStatusModal.targetStatus)}
                  className="w-1/2 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs shadow-md shadow-blue-600/25 hover:opacity-95 cursor-pointer transition-all active:scale-[0.98]"
                >
                  Ha, qaytarildi
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: IJARANI O'CHIRISHNI TASDIQLASH VA 5 SONIYALIK BEKOR QILISH       */}
      {/* ========================================================================= */}
      {deletingRental && (
        <ModalPortal>
          <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                <Trash2 className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                  Ijara yozuvini o‘chirishni tasdiqlaysizmi?
                </h3>
                <p className="text-xs text-slate-600 font-semibold">
                  {deletingRental.productName} — {deletingRental.customerName}
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingRental(null)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetRental = deletingRental;
                    setDeletingRental(null);
                    setSelectedRentalForDetails(null);
                    if (!targetRental || isItemPendingDelete(targetRental.id)) return;

                    // 1. Vaqtincha interfeysdan yashirish (bazaga tegilmaydi)
                    setItemPendingDelete(targetRental.id, true);

                    // 2. 5 soniyalik bekor qilish bildirishnomasini ko'rsatish
                    showUndoDelete({
                      title: 'Ijara yozuvi o‘chirilmoqda...',
                      seconds: 5,
                      successMessage: 'Ijara yozuvi muvaffaqiyatli o‘chirildi.',
                      onUndo: () => {
                        setItemPendingDelete(targetRental.id, false);
                      },
                      onCommit: async () => {
                        try {
                          deleteRental(targetRental.id);
                          setItemPendingDelete(targetRental.id, false);
                        } catch (err) {
                          setItemPendingDelete(targetRental.id, false);
                          throw err;
                        }
                      }
                    });
                  }}
                  className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
                >
                  O‘chirish
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default Rentals;

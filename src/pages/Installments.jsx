// src/pages/Installments.jsx
import React, { useState, useMemo } from 'react';
import { ModalPortal } from '../components/ModalPortal';
import {
  CalendarClock,
  Plus,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Phone,
  Layers,
  Wallet,
  Calendar,
  CreditCard,
  Banknote,
  ShieldAlert,
  ArrowRight,
  Filter,
  FileText,
  ChevronDown,
  ChevronUp,
  Hash,
  User,
  Package,
  Percent,
  DollarSign,
  Minus,
  Ban,
  Eye,
  XCircle,
  Check,
  RotateCcw
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import {
  calculateInstallmentSummary,
  generateInstallmentSchedule,
  computeContractStatus,
  getNextPaymentDate,
  getTashkentDateString,
  addMonthsSafe,
  addYearsSafe
} from '../utils/installmentUtils';

// ─── Status badge helper ────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active: { label: 'Faol', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  due: { label: 'Bugun to\'lov', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  overdue: { label: 'Muddati o\'tgan', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  completed: { label: 'Yakunlangan', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  cancelled: { label: 'Bekor qilingan', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  return (
    <span className={`inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-black ${cfg.bg} ${cfg.text} border ${cfg.border} shadow-xs truncate max-w-full`} title={cfg.label}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
      <span className="truncate">{cfg.label}</span>
    </span>
  );
};

// ─── Main Installments Component ─────────────────────────────────────────────
export const Installments = ({ setActiveTab: setParentActiveTab }) => {
  const {
    installments = [],
    installmentStats,
    addInstallmentContract,
    addInstallmentPayment,
    cancelInstallmentContract,
    restoreInstallmentContract,
    isInstallmentAllowed,
    products = [],
    debts = [],
    rentals = [],
    currentStore,
    storeConfig
  } = useStore();

  const { t } = useLanguage();
  const { notifySuccess, notifyError } = useToast();

  const todayStr = getTashkentDateString();

  // ─── Search & Filtering State ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setLocalActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // ─── New Contract Modal State ──────────────────────────────────────────────
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // ─── New Contract Form State ───────────────────────────────────────────────
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [discount, setDiscount] = useState('0');
  const [downPayment, setDownPayment] = useState('0');
  const [paymentCount, setPaymentCount] = useState('3');
  const [frequency, setFrequency] = useState('monthly');
  const [firstPaymentDate, setFirstPaymentDate] = useState(() => addMonthsSafe(todayStr, 1));
  const [paymentMethod, setPaymentMethod] = useState('Naqd');
  const [contractNotes, setContractNotes] = useState('');

  // ─── Product selection state for form ──────────────────────────────────────
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // ─── Details Modal State ───────────────────────────────────────────────────
  const [selectedContract, setSelectedContract] = useState(null);
  const [paymentInputAmount, setPaymentInputAmount] = useState('');
  const [paymentInputDate, setPaymentInputDate] = useState(todayStr);
  const [paymentInputMethod, setPaymentInputMethod] = useState('Naqd');
  const [paymentInputNote, setPaymentInputNote] = useState('');
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // ─── Cancel Modal State ────────────────────────────────────────────────────
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [returnToStock, setReturnToStock] = useState(false);

  // ─── Restore Modal State ───────────────────────────────────────────────────
  const [restoreModal, setRestoreModal] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    return installmentStats || {
      totalContracts: 0,
      activeContracts: 0,
      overduePaymentsCount: 0,
      remainingTotalSum: 0
    };
  }, [installmentStats]);

  // ─── Existing customers collected across CRM ───────────────────────────────
  const existingCustomers = useMemo(() => {
    const map = new Map();
    (debts || []).forEach((d) => {
      if (d.name) {
        map.set(d.name.trim().toLowerCase(), {
          id: d.id, name: d.name, phone: d.phone || ''
        });
      }
    });
    (rentals || []).forEach((r) => {
      if (r.customerName) {
        map.set(r.customerName.trim().toLowerCase(), {
          id: r.customerId || r.id, name: r.customerName, phone: r.customerPhone || ''
        });
      }
    });
    (installments || []).forEach((c) => {
      if (c.customerName) {
        map.set(c.customerName.trim().toLowerCase(), {
          id: c.customerId || c.id, name: c.customerName, phone: c.customerPhone || ''
        });
      }
    });
    return Array.from(map.values());
  }, [debts, rentals, installments]);

  // ─── Available products in active store ────────────────────────────────────
  const availableProducts = useMemo(() => {
    return (products || []).filter((p) => (Number(p.stock) || 0) > 0);
  }, [products]);

  const filteredAvailableProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return availableProducts;
    const q = productSearchQuery.trim().toLowerCase();
    return availableProducts.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }, [availableProducts, productSearchQuery]);

  // ─── Live calculation for form ─────────────────────────────────────────────
  const formSummary = useMemo(() => {
    return calculateInstallmentSummary({
      items: selectedItems.map(it => ({
        price: it.price,
        qty: it.qty
      })),
      discount: Number(discount) || 0,
      downPayment: Number(downPayment) || 0
    });
  }, [selectedItems, discount, downPayment]);

  const perInstallment = useMemo(() => {
    const count = Math.max(1, Number(paymentCount) || 1);
    if (formSummary.remainingPrincipal <= 0) return 0;
    return Math.floor(formSummary.remainingPrincipal / count);
  }, [formSummary.remainingPrincipal, paymentCount]);

  // Live schedule preview for form modal
  const previewSchedule = useMemo(() => {
    if (formSummary.remainingPrincipal <= 0) return [];
    return generateInstallmentSchedule({
      remainingPrincipal: formSummary.remainingPrincipal,
      paymentCount: Number(paymentCount) || 3,
      frequency,
      firstPaymentDate: firstPaymentDate || todayStr
    });
  }, [formSummary.remainingPrincipal, paymentCount, frequency, firstPaymentDate, todayStr]);

  // ─── Computed status for each contract ─────────────────────────────────────
  const getStatus = (c) => computeContractStatus(c, todayStr);

  // ─── Tab counts ────────────────────────────────────────────────────────────
  const tabCounts = useMemo(() => {
    let all = installments.length;
    let active = 0, due = 0, overdue = 0, completed = 0, cancelled = 0;
    installments.forEach(c => {
      const s = getStatus(c);
      if (s === 'cancelled') {
        cancelled++;
      } else if (s === 'completed') {
        completed++;
      } else {
        // Faol: bekor qilinmagan va to'liq to'lanmagan faol shartnomalar
        active++;
        if (s === 'due') due++;
        if (s === 'overdue') overdue++;
      }
    });
    return { all, active, due, overdue, completed, cancelled };
  }, [installments, todayStr]);

  // ─── Filtered list ─────────────────────────────────────────────────────────
  const filteredContracts = useMemo(() => {
    return installments.filter((c) => {
      const status = getStatus(c);

      // Tab filter
      // "Faol" bekor qilinmagan va to'liq to'lanmagan faol shartnomalarni ko'rsatsin
      if (activeTab === 'active' && (status === 'cancelled' || status === 'completed')) return false;
      // "Bugungi to'lov" bugun to'lanishi kerak bo'lgan to'lovlari mavjud shartnomalarni ko'rsatsin
      if (activeTab === 'due' && status !== 'due') return false;
      // "Muddati o'tgan" muddati o'tgan va to'lanmagan to'lovlari bor shartnomalarni ko'rsatsin
      if (activeTab === 'overdue' && status !== 'overdue') return false;
      // "To'liq to'langan" barcha majburiyatlari to'langan shartnomalarni ko'rsatsin
      if (activeTab === 'completed' && status !== 'completed') return false;
      // "Bekor qilingan" faqat bekor qilingan shartnomalarni ko'rsatsin
      if (activeTab === 'cancelled' && status !== 'cancelled') return false;

      // Search across contract #, customer name, phone, product summary
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (c.customerName || '').toLowerCase().includes(q);
        const matchesPhone = (c.customerPhone || '').toLowerCase().includes(q);
        const matchesNumber = (c.contractNumber || c.id || '').toLowerCase().includes(q);
        const matchesProduct = (c.productsSummary || '').toLowerCase().includes(q);
        const matchesItems = Array.isArray(c.items) && c.items.some(it => (it.name || '').toLowerCase().includes(q));
        if (!matchesName && !matchesPhone && !matchesNumber && !matchesProduct && !matchesItems) return false;
      }

      return true;
    });
  }, [installments, activeTab, searchQuery, todayStr]);

  // ─── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / pageSize));
  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContracts.slice(start, start + pageSize);
  }, [filteredContracts, currentPage]);

  const handleTabChange = (tab) => {
    setLocalActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  // ─── Form Handlers ─────────────────────────────────────────────────────────
  const handleOpenAddModal = () => {
    setFormError('');
    if (existingCustomers.length > 0) {
      setIsNewCustomer(false);
      setSelectedCustomerId(existingCustomers[0].id);
      setCustomerName(existingCustomers[0].name);
      setCustomerPhone(existingCustomers[0].phone);
    } else {
      setIsNewCustomer(true);
      setSelectedCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
    }
    setSelectedItems([]);
    setDiscount('0');
    setDownPayment('0');
    setPaymentCount('3');
    setFrequency('monthly');
    setFirstPaymentDate(addMonthsSafe(todayStr, 1));
    setPaymentMethod('Naqd');
    setContractNotes('');
    setProductSearchQuery('');
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

  const handleAddProduct = (product) => {
    const existing = selectedItems.find(it => it.productId === product.id);
    if (existing) {
      // Increment qty if already selected
      setSelectedItems(prev => prev.map(it =>
        it.productId === product.id
          ? { ...it, qty: Math.min(it.qty + 1, Number(product.stock) || 999) }
          : it
      ));
    } else {
      setSelectedItems(prev => [...prev, {
        productId: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        qty: 1,
        unit: product.unit || 'dona',
        emoji: product.emoji || '📦',
        maxStock: Number(product.stock) || 0
      }]);
    }
  };

  const handleRemoveProduct = (productId) => {
    setSelectedItems(prev => prev.filter(it => it.productId !== productId));
  };

  const handleItemQtyChange = (productId, newQty) => {
    const item = selectedItems.find(it => it.productId === productId);
    const max = item?.maxStock || 999;
    const qty = Math.max(1, Math.min(Number(newQty) || 1, max));
    setSelectedItems(prev => prev.map(it =>
      it.productId === productId ? { ...it, qty } : it
    ));
  };

  const handleFrequencyChange = (newFreq) => {
    setFrequency(newFreq);
    const num = parseInt(paymentCount, 10);
    if (newFreq === 'yearly') {
      if (!num || isNaN(num) || num < 1) {
        setPaymentCount('1');
      } else if (num > 15) {
        setPaymentCount('15');
      }
      setFirstPaymentDate(addYearsSafe(todayStr, 1));
    } else {
      if (!num || isNaN(num) || num < 1) {
        setPaymentCount('1');
      } else if (num > 48) {
        setPaymentCount('48');
      }
      setFirstPaymentDate(addMonthsSafe(todayStr, 1));
    }
  };

  const handlePaymentCountChange = (val) => {
    if (val === '') {
      setPaymentCount('');
      return;
    }
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      setPaymentCount('');
      return;
    }
    const num = parseInt(cleaned, 10);
    const max = frequency === 'yearly' ? 15 : 48;
    if (num < 1) {
      setPaymentCount('1');
    } else if (num > max) {
      setPaymentCount(String(max));
    } else {
      setPaymentCount(String(num));
    }
  };

  const handlePaymentCountBlur = () => {
    const num = parseInt(paymentCount, 10);
    const max = frequency === 'yearly' ? 15 : 48;
    if (!num || isNaN(num) || num < 1) {
      setPaymentCount('1');
    } else if (num > max) {
      setPaymentCount(String(max));
    }
  };

  const handleSubmitContract = async (e) => {
    e.preventDefault();
    setFormError('');

    const name = customerName.trim();
    if (!name) {
      setFormError("Iltimos, mijoz ismini kiriting yoki ro'yxatdan tanlang.");
      return;
    }

    if (selectedItems.length === 0) {
      setFormError("Kamida bitta mahsulot tanlang.");
      return;
    }

    const numPaymentCount = Number(paymentCount) || 0;
    const maxCount = frequency === 'yearly' ? 15 : 48;
    const freqLabel = frequency === 'yearly' ? 'Yillik' : 'Oylik';
    if (numPaymentCount < 1 || numPaymentCount > maxCount) {
      setFormError(`${freqLabel} to'lov soni 1 dan ${maxCount} gacha bo'lishi kerak.`);
      return;
    }

    if (!firstPaymentDate) {
      setFormError("Birinchi to'lov sanasini belgilang.");
      return;
    }

    if (formSummary.totalAmount <= 0) {
      setFormError("Umumiy summa 0 dan katta bo'lishi kerak.");
      return;
    }

    const numDown = Number(downPayment) || 0;
    if (numDown < 0) {
      setFormError("Boshlang'ich to'lov manfiy bo'lishi mumkin emas.");
      return;
    }

    if (numDown > formSummary.totalAmount) {
      setFormError("Boshlang'ich to'lov umumiy summadan oshib ketishi mumkin emas.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addInstallmentContract({
        customerId: isNewCustomer ? null : selectedCustomerId,
        customerName: name,
        customerPhone: customerPhone.trim() || '+998 90 000 00 00',
        items: selectedItems,
        discount: Number(discount) || 0,
        downPayment: numDown,
        paymentCount: numPaymentCount,
        frequency,
        firstPaymentDate,
        paymentMethod,
        notes: contractNotes.trim()
      });

      notifySuccess("Yangi muddatli savdo muvaffaqiyatli rasmiylashtirildi!");
      setIsAddModalOpen(false);
    } catch (err) {
      setFormError(err.message || "Shartnomani saqlashda xatolik yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Details Modal Handlers ────────────────────────────────────────────────
  const handleOpenDetails = (contract) => {
    const latest = installments.find(c => c.id === contract.id) || contract;
    setSelectedContract(latest);
    setPaymentInputAmount('');
    setPaymentInputDate(todayStr);
    setPaymentInputMethod('Naqd');
    setPaymentInputNote('');
    setPaymentError('');
    setShowPaymentForm(false);
  };

  const handleAddPaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentError('');

    if (!selectedContract) return;

    const amountNum = Number(paymentInputAmount) || 0;
    if (amountNum <= 0) {
      setPaymentError("To'lov summasi 0 dan katta bo'lishi kerak.");
      return;
    }

    if (amountNum > (selectedContract.remainingAmount || 0)) {
      setPaymentError(`Kiritilgan summa qolgan qarzdorlikdan (${(selectedContract.remainingAmount || 0).toLocaleString()} so'm) oshmasligi kerak.`);
      return;
    }

    setIsAddingPayment(true);
    try {
      const updated = await addInstallmentPayment(selectedContract.id, {
        amount: amountNum,
        date: paymentInputDate || todayStr,
        paymentMethod: paymentInputMethod,
        note: paymentInputNote.trim()
      });

      notifySuccess(`${amountNum.toLocaleString()} so'm to'lov muvaffaqiyatli qabul qilindi!`);
      setSelectedContract(updated);
      setPaymentInputAmount('');
      setPaymentInputNote('');
      setShowPaymentForm(false);
    } catch (err) {
      setPaymentError(err.message || "To'lovni qabul qilishda xatolik yuz berdi.");
    } finally {
      setIsAddingPayment(false);
    }
  };

  // ─── Cancel Handler ────────────────────────────────────────────────────────
  const handleCancelConfirm = async () => {
    if (!cancelModal) return;
    try {
      const updated = await cancelInstallmentContract(cancelModal.id, cancelReason.trim(), returnToStock);
      notifySuccess("Shartnoma muvaffaqiyatli bekor qilindi.");
      if (selectedContract?.id === cancelModal.id) {
        setSelectedContract(updated);
      }
    } catch (err) {
      notifyError(err.message || "Shartnomani bekor qilishda xatolik yuz berdi.");
    } finally {
      setCancelModal(null);
      setCancelReason('');
      setReturnToStock(false);
    }
  };

  // ─── Restore modal stock calculation ───────────────────────────────────────
  const restoreStockCheck = useMemo(() => {
    if (!restoreModal) return { canRestore: true, wasReturned: false, itemsStatus: [] };
    const wasReturned = !!restoreModal.returnedToStock;
    if (!wasReturned) return { canRestore: true, wasReturned: false, itemsStatus: [] };

    let canRestore = true;
    const itemsStatus = (restoreModal.items || []).map(item => {
      const prod = products.find(p => p.id === item.productId);
      const available = prod ? (Number(prod.stock) || 0) : 0;
      const req = Number(item.qty) || 1;
      const hasEnough = available >= req;
      if (!hasEnough) canRestore = false;
      return {
        ...item,
        availableStock: available,
        hasEnough
      };
    });

    return { canRestore, wasReturned: true, itemsStatus };
  }, [restoreModal, products]);

  // ─── Restore Handler ───────────────────────────────────────────────────────
  const handleRestoreConfirm = async () => {
    if (!restoreModal || isRestoring) return;
    setRestoreError('');
    setIsRestoring(true);
    try {
      const updated = await restoreInstallmentContract(restoreModal.id);
      notifySuccess("Shartnoma muvaffaqiyatli qayta tiklandi!");
      if (selectedContract?.id === restoreModal.id) {
        setSelectedContract(updated);
      }
      setRestoreModal(null);
    } catch (err) {
      setRestoreError(err.message || "Shartnomani tiklashda xatolik yuz berdi.");
      notifyError(err.message || "Shartnomani tiklashda xatolik yuz berdi.");
    } finally {
      setIsRestoring(false);
    }
  };

  // ─── Store type restriction notice ─────────────────────────────────────────
  if (!isInstallmentAllowed) {
    return (
      <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto mt-12 font-sans select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-800">Muddatli to'lov xizmati mavjud emas</h3>
        <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
          Muddatli to'lov (bo'lib to'lash) funksiyasi faqat <strong>Telefon do'koni</strong>, <strong>Qurilish mollari</strong>, <strong>Uy-ro'zg'or buyumlari</strong> va <strong>Sport jihozlari</strong> do'konlari uchun mo'ljallangan. Hozirgi do'koningiz turi ushbu xizmatni qo'llab-quvvatlamaydi.
        </p>
        <button
          onClick={() => setParentActiveTab && setParentActiveTab('dashboard')}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs shadow-lg shadow-blue-600/20 hover:opacity-95 cursor-pointer transition-all active:scale-[0.98]"
        >
          <span>Bosh sahifaga qaytish</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 font-sans select-none w-full max-w-[1600px] min-w-0 mx-auto">
      {/* ─── Top Header Row ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>{t('navInstallments', 'MUDDATLI TO\'LOV')}</span>
            <span className="text-xs font-black px-3 py-1 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 shadow-xs">
              {currentStore?.name || storeConfig.name}
            </span>
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Mahsulotlarni bo'lib to'lash asosida sotish, to'lov jadvallarini nazorat qilish va pul tushumini hisoblash.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          <span>Yangi muddatli savdo</span>
        </button>
      </div>

      {/* ─── 4 STAT CARDS ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Jami shartnomalar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100/70 transition-colors pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Jami shartnomalar
              </span>
              <div className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-tight">
                {stats.totalContracts} <span className="text-sm font-bold text-slate-400">ta</span>
              </div>
              <span className="text-[10px] text-blue-600 font-bold block">Barcha vaqtlar bo‘yicha</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0 group-hover:scale-105 transition-transform duration-200">
              <FileText className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>
        </div>

        {/* Card 2: Faol shartnomalar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100/70 transition-colors pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Faol shartnomalar
              </span>
              <div className="text-2xl sm:text-[26px] font-black text-emerald-600 tracking-tight leading-tight">
                {stats.activeContracts} <span className="text-sm font-bold text-emerald-600/70">ta</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-bold block">Amaldagi shartnomalar</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform duration-200">
              <Clock className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>
        </div>

        {/* Card 3: Muddati o'tgan to'lovlar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-rose-200 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 rounded-full blur-2xl group-hover:bg-rose-100/70 transition-colors pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Muddati o'tgan to'lovlar
              </span>
              <div className="text-2xl sm:text-[26px] font-black text-rose-600 tracking-tight leading-tight">
                {stats.overduePaymentsCount} <span className="text-sm font-bold text-rose-600/70">ta to‘lov</span>
              </div>
              <span className="text-[10px] text-rose-600 font-bold block">Kechikkan to‘lov bosqichlari</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 shrink-0 group-hover:scale-105 transition-transform duration-200">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>
        </div>

        {/* Card 4: Qolgan umumiy summa */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-200 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 rounded-full blur-2xl group-hover:bg-amber-100/70 transition-colors pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Jami qolgan summa
              </span>
              <div className="text-2xl sm:text-[26px] font-black text-amber-600 tracking-tight leading-tight">
                {stats.remainingTotalSum.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 font-bold">so'm (Kutilayotgan tushum)</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 group-hover:scale-105 transition-transform duration-200">
              <Wallet className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Toolbar: Search & 6 Filter Tabs ─────────────────────────────────── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Top: Search bar & Counter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Shartnoma #, mijoz ismi, telefon, mahsulot..."
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
          <div className="text-xs font-bold text-slate-400 px-1 shrink-0 self-center sm:self-auto">
            Ko'rsatilmoqda: <span className="font-black text-slate-700">{filteredContracts.length}</span> ta shartnoma
          </div>
        </div>

        {/* 6 Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1 border-t border-slate-100">
          {[
            { key: 'all', label: 'Barchasi', count: tabCounts.all, gradient: 'from-blue-600 to-indigo-600', shadow: 'shadow-blue-600/25' },
            { key: 'active', label: 'Faol', count: tabCounts.active, gradient: 'from-emerald-600 to-teal-600', shadow: 'shadow-emerald-600/25' },
            { key: 'due', label: 'Bugungi to‘lov', count: tabCounts.due, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/25' },
            { key: 'overdue', label: 'Muddati o\'tgan', count: tabCounts.overdue, gradient: 'from-rose-600 to-red-600', shadow: 'shadow-rose-600/25' },
            { key: 'completed', label: 'To‘liq to‘langan', count: tabCounts.completed, gradient: 'from-indigo-600 to-purple-600', shadow: 'shadow-indigo-600/25' },
            { key: 'cancelled', label: 'Bekor qilingan', count: tabCounts.cancelled, gradient: 'from-slate-600 to-slate-700', shadow: 'shadow-slate-600/25' },
          ].map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer select-none active:scale-[0.98] ${
                  isSelected
                    ? `bg-gradient-to-r ${tab.gradient} text-white shadow-md ${tab.shadow} font-black ring-2 ring-offset-1 ring-blue-400/30`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800 border border-slate-200/40'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-colors ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── CONTRACTS TABLE ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden w-full">
        {filteredContracts.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-800">Shartnomalar topilmadi</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {searchQuery
                ? "Qidiruv so'rovingiz bo'yicha hech qanday shartnoma topilmadi. Qidiruvni tozalab ko'ring."
                : "Ushbu do'konda hali muddatli savdo shartnomalari rasmiylashtirilmagan. Yangi shartnoma qo'shish uchun yuqoridagi tugmani bosing."}
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
          <div className="w-full overflow-hidden">
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[11%]" />
                <col className="w-[14%]" />
                <col className="w-[13.5%]" />
                <col className="w-[11%]" />
                <col className="w-[10.5%]" />
                <col className="w-[12.5%]" />
                <col className="w-[8.5%]" />
                <col className="w-[8.5%]" />
                <col className="w-[10.5%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-2 sm:px-2.5 truncate">Shartnoma & Sana</th>
                  <th className="py-3 px-2 sm:px-2.5 truncate">Mijoz & Telefon</th>
                  <th className="py-3 px-2 sm:px-2.5 truncate">Mahsulotlar</th>
                  <th className="py-3 px-2 sm:px-2.5 truncate">Umumiy summa</th>
                  <th className="py-3 px-2 sm:px-2.5 truncate">Boshlang‘ich to‘lov</th>
                  <th className="py-3 px-2 sm:px-2.5 truncate">To'langan / Qolgan</th>
                  <th className="py-3 px-2 sm:px-2.5 truncate">Keyingi to'lov</th>
                  <th className="py-3 px-2 sm:px-2.5 truncate text-center">Holat</th>
                  <th className="py-3 px-2 sm:px-2.5 text-right truncate">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {paginatedContracts.map((c) => {
                  const status = getStatus(c);
                  const nextDate = getNextPaymentDate(c);

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleOpenDetails(c)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      title="Batafsil ko'rish yoki to'lov kiritish uchun bosing"
                    >
                      {/* 1. Shartnoma raqami & sana */}
                      <td className="py-3 px-2 sm:px-2.5 overflow-hidden">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 border border-indigo-200/50">
                            <Hash className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors truncate text-xs" title={c.contractNumber || c.id}>
                              {c.contractNumber || c.id}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium truncate">
                              {c.createdAt || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Mijoz */}
                      <td className="py-3 px-2 sm:px-2.5 overflow-hidden">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-black text-xs shrink-0 border border-blue-200/50">
                            {c.customerName?.charAt(0).toUpperCase() || 'M'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 truncate text-xs" title={c.customerName}>
                              {c.customerName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-0.5 font-mono">
                              <Phone className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{c.customerPhone || 'Telefon yo\'q'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Mahsulotlar */}
                      <td className="py-3 px-2 sm:px-2.5 overflow-hidden">
                        <span className="font-bold text-slate-800 block truncate text-xs" title={c.productsSummary || '—'}>
                          {c.productsSummary || '—'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium truncate block">
                          {c.paymentCount || 0} bo'lib • {c.frequency === 'yearly' ? 'yillik' : 'oylik'}
                        </span>
                      </td>

                      {/* 4. Umumiy summa */}
                      <td className="py-3 px-2 sm:px-2.5 overflow-hidden font-extrabold text-slate-900 text-xs">
                        <span className="truncate block" title={`${Number(c.totalAmount || 0).toLocaleString()} so'm`}>
                          {Number(c.totalAmount || 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">so'm</span>
                        </span>
                      </td>

                      {/* 5. Boshlang'ich to'lov */}
                      <td className="py-3 px-2 sm:px-2.5 overflow-hidden font-bold text-emerald-600 text-xs">
                        <span className="truncate block" title={`${Number(c.downPayment || 0).toLocaleString()} so'm`}>
                          {Number(c.downPayment || 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">so'm</span>
                        </span>
                      </td>

                      {/* 6. To'langan / Qolgan */}
                      <td className="py-3 px-2 sm:px-2.5 overflow-hidden text-xs">
                        <div className="text-emerald-600 font-bold truncate" title={`To'langan: ${Number(c.totalPaid || 0).toLocaleString()} so'm`}>
                          {Number(c.totalPaid || 0).toLocaleString()} so'm
                        </div>
                        <div className={`text-[10px] font-semibold truncate ${
                          (c.remainingAmount || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'
                        }`} title={`Qoldiq: ${Number(c.remainingAmount || 0).toLocaleString()} so'm`}>
                          Qoldiq: {Number(c.remainingAmount || 0).toLocaleString()} so'm
                        </div>
                      </td>

                      {/* 7. Keyingi to'lov */}
                      <td className="py-3 px-2 sm:px-2.5 overflow-hidden text-xs">
                        <span className={`font-bold truncate block ${
                          status === 'overdue' ? 'text-rose-600' : status === 'due' ? 'text-amber-600' : 'text-slate-700'
                        }`} title={nextDate}>
                          {nextDate}
                        </span>
                      </td>

                      {/* 8. Holat */}
                      <td className="py-3 px-2 sm:px-2.5 overflow-hidden text-center">
                        <StatusBadge status={status} />
                      </td>

                      {/* 9. Amal */}
                      <td className="py-3 px-2 sm:px-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenDetails(c); }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-[11px] inline-flex items-center justify-center gap-1 border border-blue-200/60 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                          title="Batafsil ko'rish"
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0" />
                          <span>Batafsil</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
            <span className="text-xs font-bold text-slate-400">
              {filteredContracts.length} ta shartnomadan {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredContracts.length)} ko'rsatilmoqda
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                ← Oldingi
              </button>
              <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-blue-600 text-white">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Keyingi →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         YANGI MUDDATLI SAVDO MODAL
         ═══════════════════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-slate-200/60 z-10">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-md px-7 py-5 border-b border-slate-100 flex items-center justify-between z-20 rounded-t-3xl">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Yangi muddatli savdo</h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Mahsulotni bo'lib to'lash shartnomasi asosida sotish</p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitContract} className="px-7 py-5 space-y-6">
                {/* Error */}
                {formError && (
                  <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-rose-700">{formError}</p>
                  </div>
                )}

                {/* ── 1. Mijoz tanlash ──────────────────────────────────────────── */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    Mijoz ma'lumotlari
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewCustomer(false);
                        if (existingCustomers[0]) handleSelectExistingCustomer(existingCustomers[0].id);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        !isNewCustomer ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Mavjud mijoz ({existingCustomers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsNewCustomer(true); setCustomerName(''); setCustomerPhone(''); }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isNewCustomer ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Yangi mijoz kiritish
                    </button>
                  </div>

                  {!isNewCustomer && existingCustomers.length > 0 && (
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {existingCustomers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                      ))}
                    </select>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">Mijoz to‘liq ismi</label>
                      <input
                        type="text"
                        placeholder="Masalan: Sardor Rahimov"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">Telefon raqami</label>
                      <input
                        type="text"
                        placeholder="+998 90 123 45 67"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* ── 2. Mahsulot tanlash ───────────────────────────────────────── */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-500" />
                    Ombordagi mahsulotlar
                  </label>

                  {/* Product search */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Mahsulot nomi yoki toifasi bo'yicha qidirish..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Product list to select from */}
                  <div className="max-h-44 overflow-y-auto space-y-1.5 border border-slate-100 rounded-2xl p-2.5 bg-slate-50/50">
                    {filteredAvailableProducts.length === 0 ? (
                      <p className="text-xs text-slate-400 font-medium text-center py-3">
                        {productSearchQuery ? 'Qidiruv bo‘yicha mahsulot topilmadi' : 'Faol do‘kon omborida sotish uchun mahsulot yo‘q'}
                      </p>
                    ) : (
                      filteredAvailableProducts.map(prod => {
                        const isSelected = selectedItems.some(it => it.productId === prod.id);
                        return (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => handleAddProduct(prod)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border border-blue-200 text-blue-700'
                                : 'bg-white border border-slate-100 text-slate-700 hover:bg-blue-50/50 hover:border-blue-100'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className="text-base shrink-0">{prod.emoji || '📦'}</span>
                              <span className="truncate">{prod.name}</span>
                              <span className="text-[10px] font-medium text-slate-400 shrink-0">
                                (Omborda: {prod.stock} {prod.unit || 'dona'})
                              </span>
                            </div>
                            <span className="font-extrabold shrink-0 ml-2">
                              {Number(prod.price || 0).toLocaleString()} so'm
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Selected items with qty controls */}
                  {selectedItems.length > 0 && (
                    <div className="space-y-2 border border-blue-100 rounded-2xl p-3 bg-blue-50/30">
                      <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 block">
                        Tanlangan tovarlar ({selectedItems.length} ta)
                      </span>
                      {selectedItems.map(it => (
                        <div key={it.productId} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span>{it.emoji}</span>
                            <span className="text-xs font-bold text-slate-800 truncate">{it.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              ({Number(it.price).toLocaleString()} so'm)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleItemQtyChange(it.productId, it.qty - 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              value={it.qty}
                              onChange={(e) => handleItemQtyChange(it.productId, e.target.value)}
                              className="w-12 text-center p-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:outline-none"
                              min="1"
                              max={it.maxStock}
                            />
                            <button
                              type="button"
                              onClick={() => handleItemQtyChange(it.productId, it.qty + 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-medium text-slate-400 w-7">{it.unit}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(it.productId)}
                              className="ml-1 p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── 3. Chegirma va Boshlang'ich to'lov ───────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Chegirma (so'm)</label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      min="0"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Boshlang'ich to'lov (so'm)</label>
                    <input
                      type="number"
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      min="0"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* ── 4. To'lov jadvali sozlamalari ─────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Davriyligi</label>
                    <select
                      value={frequency}
                      onChange={(e) => handleFrequencyChange(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="monthly">Oylik</option>
                      <option value="yearly">Yillik</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">
                      To‘lov soni ({frequency === 'yearly' ? '1–15 yil' : '1–48 oy'})
                    </label>
                    <input
                      type="number"
                      value={paymentCount}
                      onChange={(e) => handlePaymentCountChange(e.target.value)}
                      onBlur={handlePaymentCountBlur}
                      min="1"
                      max={frequency === 'yearly' ? 15 : 48}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder={frequency === 'yearly' ? '1–15' : '1–48'}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Birinchi to'lov sanasi</label>
                    <input
                      type="date"
                      value={firstPaymentDate}
                      onChange={(e) => setFirstPaymentDate(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Boshlang'ich to'lov usuli */}
                {Number(downPayment) > 0 && (
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">Boshlang'ich to'lov usuli</label>
                    <div className="flex items-center gap-2.5">
                      {['Naqd', 'Karta', 'O\'tkazma'].map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                            paymentMethod === method
                              ? 'bg-blue-50 border-blue-300 text-blue-700 font-extrabold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {method === 'Naqd' && <Banknote className="w-4 h-4" />}
                          {method === 'Karta' && <CreditCard className="w-4 h-4" />}
                          {method === 'O\'tkazma' && <Wallet className="w-4 h-4" />}
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Izoh */}
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Izoh (ixtiyoriy)</label>
                  <textarea
                    value={contractNotes}
                    onChange={(e) => setContractNotes(e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    placeholder="Qo'shimcha shartlar yoki kafolat ma'lumotlari..."
                  />
                </div>

                {/* ── LIVE SUMMARY ──────────────────────────────────────────── */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 block">
                    Hisob-kitob va to‘lovlar rejasi
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">Tovarlar summasi</span>
                      <span className="font-black text-slate-900">{formSummary.subtotal.toLocaleString()} so'm</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Chegirma</span>
                      <span className="font-black text-rose-600">−{formSummary.discount.toLocaleString()} so'm</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Yakuniy savdo summasi</span>
                      <span className="font-black text-blue-700">{formSummary.totalAmount.toLocaleString()} so'm</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Boshlang'ich to'lov</span>
                      <span className="font-black text-emerald-600">{formSummary.downPayment.toLocaleString()} so'm</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Bo‘lib to‘lanadigan qoldiq</span>
                      <span className="font-black text-amber-600">{formSummary.remainingPrincipal.toLocaleString()} so'm</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Har bir to'lov (~)</span>
                      <span className="font-black text-indigo-600">{perInstallment.toLocaleString()} so'm</span>
                    </div>
                  </div>

                  {/* Schedule Preview */}
                  {previewSchedule.length > 0 && (
                    <div className="pt-2 border-t border-blue-200/60">
                      <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider block mb-1.5">
                        Avtomatik hisoblangan to‘lov jadvali ({previewSchedule.length} ta bosqich):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                        {previewSchedule.map(sch => (
                          <div key={sch.installmentIndex} className="flex items-center justify-between p-2 bg-white/80 rounded-xl text-[11px] font-semibold border border-blue-100/60">
                            <span className="text-slate-600">{sch.installmentIndex}-to‘lov ({sch.dueDate})</span>
                            <span className="font-extrabold text-slate-900">{Number(sch.amount).toLocaleString()} so‘m</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Submit ────────────────────────────────────────────────── */}
                <button
                  type="submit"
                  disabled={isSubmitting || selectedItems.length === 0}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">Shartnoma rasmiylashtirilmoqda...</span>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Shartnomani rasmiylashtirish</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
         SHARTNOMA TAFSILOTLARI MODAL
         ═══════════════════════════════════════════════════════════════════════ */}
      {selectedContract && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSelectedContract(null)} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-slate-200/60 z-10">
              {/* Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-md px-7 py-5 border-b border-slate-100 flex items-center justify-between z-20 rounded-t-3xl">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                    <span>Shartnoma: {selectedContract.contractNumber || selectedContract.id}</span>
                    <StatusBadge status={getStatus(selectedContract)} />
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {selectedContract.customerName} • {selectedContract.customerPhone}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedContract(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-7 py-5 space-y-6">
                {/* ── Contract Info Cards ──────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-medium block">Mijoz</span>
                    <span className="font-black text-slate-900">{selectedContract.customerName}</span>
                    <span className="text-[10px] text-slate-400 block">{selectedContract.customerPhone}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-medium block">Umumiy summa</span>
                    <span className="font-black text-blue-700">{Number(selectedContract.totalAmount || 0).toLocaleString()} so'm</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-medium block">Boshlang'ich to'lov</span>
                    <span className="font-black text-emerald-600">{Number(selectedContract.downPayment || 0).toLocaleString()} so'm</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-medium block">Jami to'langan</span>
                    <span className="font-black text-emerald-600">{Number(selectedContract.totalPaid || 0).toLocaleString()} so'm</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-medium block">Qolgan qarz</span>
                    <span className="font-black text-rose-600">{Number(selectedContract.remainingAmount || 0).toLocaleString()} so'm</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-medium block">Keyingi to'lov sanasi</span>
                    <span className="font-black text-slate-800">{getNextPaymentDate(selectedContract)}</span>
                  </div>
                </div>

                {/* ── Mahsulotlar ro'yxati ─────────────────────────────────── */}
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Sotilgan mahsulotlar ({selectedContract.items?.length || 0} xil)
                  </span>
                  <div className="space-y-1.5">
                    {(selectedContract.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <span className="font-bold text-slate-800">{item.name} ({item.qty} {item.unit || 'dona'})</span>
                        <span className="font-extrabold text-slate-900">{Number(item.total || 0).toLocaleString()} so'm</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── To'lov jadvali ───────────────────────────────────────── */}
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    To'lovlar jadvali
                  </span>
                  <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50/50">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Sana</th>
                          <th className="py-2.5 px-3">Summa</th>
                          <th className="py-2.5 px-3">To'langan</th>
                          <th className="py-2.5 px-3">Holat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold">
                        {(selectedContract.schedule || []).map((sch) => {
                          const remaining = Math.max(0, sch.amount - (sch.paidAmount || 0));
                          const isPaid = sch.isPaid;
                          const isOverdue = !isPaid && sch.dueDate < todayStr && remaining > 0;
                          const isDueToday = !isPaid && sch.dueDate === todayStr && remaining > 0;

                          return (
                            <tr key={sch.id} className={`${isOverdue ? 'bg-rose-50/50' : isDueToday ? 'bg-amber-50/50' : isPaid ? 'bg-emerald-50/30' : ''}`}>
                              <td className="py-2.5 px-3 font-bold text-slate-500">{sch.installmentIndex}</td>
                              <td className={`py-2.5 px-3 font-bold ${isOverdue ? 'text-rose-600' : isDueToday ? 'text-amber-600' : 'text-slate-700'}`}>
                                {sch.dueDate}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-800">{Number(sch.amount).toLocaleString()} so'm</td>
                              <td className="py-2.5 px-3 font-bold text-emerald-600">{Number(sch.paidAmount || 0).toLocaleString()} so'm</td>
                              <td className="py-2.5 px-3">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" /> To'langan
                                  </span>
                                ) : isOverdue ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                    <AlertTriangle className="w-3 h-3" /> Muddati o'tgan
                                  </span>
                                ) : isDueToday ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock className="w-3 h-3" /> Bugun to‘lov
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200">
                                    <Calendar className="w-3 h-3" /> Kutilmoqda
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── To'lov tarixi ────────────────────────────────────────── */}
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    To'lovlar tarixi
                  </span>
                  {(selectedContract.payments || []).length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium py-3 text-center bg-slate-50 rounded-xl">
                      Hali to'lov amalga oshirilmagan.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {(selectedContract.payments || []).map((pay, idx) => (
                        <div key={pay.id || idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0">
                              <Banknote className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 block">{Number(pay.amount || 0).toLocaleString()} so'm</span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {pay.paymentMethod || pay.type || 'Naqd'} • Qabul qildi: {pay.collectedBy || pay.recordedBy || '—'}
                                {pay.note ? ` • ${pay.note}` : ''}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold shrink-0">{pay.date || '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── To'lov qabul qilish tugmasi va forma ─────────────────── */}
                {getStatus(selectedContract) !== 'completed' && getStatus(selectedContract) !== 'cancelled' && (selectedContract.remainingAmount || 0) > 0 && (
                  <div className="space-y-3">
                    {!showPaymentForm ? (
                      <button
                        onClick={() => {
                          setShowPaymentForm(true);
                          setPaymentInputDate(todayStr);
                          // Auto fill next pending installment amount if available
                          const nextSch = (selectedContract.schedule || []).find(it => !it.isPaid && (it.amount - (it.paidAmount || 0)) > 0);
                          if (nextSch) {
                            setPaymentInputAmount(String(nextSch.amount - (nextSch.paidAmount || 0)));
                          }
                        }}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 hover:from-emerald-500 hover:to-teal-500 transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Plus className="w-5 h-5" />
                        <span>To'lov qabul qilish</span>
                      </button>
                    ) : (
                      <form onSubmit={handleAddPaymentSubmit} className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-700 block">Yangi to'lov kiritish</span>
                          <span className="text-[11px] font-bold text-slate-500">
                            Qoldiq qarz: {(selectedContract.remainingAmount || 0).toLocaleString()} so'm
                          </span>
                        </div>

                        {paymentError && (
                          <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-rose-700">{paymentError}</p>
                          </div>
                        )}

                        {/* Quick fill chips */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(() => {
                            const nextSch = (selectedContract.schedule || []).find(it => !it.isPaid && (it.amount - (it.paidAmount || 0)) > 0);
                            const nextAmount = nextSch ? (nextSch.amount - (nextSch.paidAmount || 0)) : 0;
                            return (
                              <>
                                {nextAmount > 0 && nextAmount !== selectedContract.remainingAmount && (
                                  <button
                                    type="button"
                                    onClick={() => setPaymentInputAmount(String(nextAmount))}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                                  >
                                    Keyingi to‘lov ({nextAmount.toLocaleString()} so‘m)
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setPaymentInputAmount(String(selectedContract.remainingAmount || 0))}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 cursor-pointer"
                                >
                                  To‘liq qoldiq ({(selectedContract.remainingAmount || 0).toLocaleString()} so‘m)
                                </button>
                              </>
                            );
                          })()}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">To‘lov summasi (so'm)</label>
                            <input
                              type="number"
                              value={paymentInputAmount}
                              onChange={(e) => setPaymentInputAmount(e.target.value)}
                              placeholder={`Maks: ${(selectedContract.remainingAmount || 0).toLocaleString()}`}
                              min="1"
                              max={selectedContract.remainingAmount || 0}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">To‘lov sanasi</label>
                            <input
                              type="date"
                              value={paymentInputDate}
                              onChange={(e) => setPaymentInputDate(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">To'lov usuli</label>
                            <select
                              value={paymentInputMethod}
                              onChange={(e) => setPaymentInputMethod(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            >
                              <option value="Naqd">Naqd pul</option>
                              <option value="Karta">Bank kartasi</option>
                              <option value="O'tkazma">O'tkazma / Ilova</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 mb-1 block">Izoh (ixtiyoriy)</label>
                          <input
                            type="text"
                            value={paymentInputNote}
                            onChange={(e) => setPaymentInputNote(e.target.value)}
                            placeholder="To'lov haqida qo'shimcha ma'lumot..."
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>

                        <div className="flex items-center gap-2.5 pt-1">
                          <button
                            type="submit"
                            disabled={isAddingPayment}
                            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                          >
                            {isAddingPayment ? 'Saqlanmoqda...' : 'To\'lovni tasdiqlash'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowPaymentForm(false); setPaymentError(''); }}
                            className="px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            Bekor qilish
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* ── Shartnomani bekor qilish ─────────────────────────────── */}
                {getStatus(selectedContract) !== 'completed' && getStatus(selectedContract) !== 'cancelled' && (
                  <button
                    onClick={() => { setCancelModal(selectedContract); setReturnToStock(false); }}
                    className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs border border-rose-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Shartnomani bekor qilish</span>
                  </button>
                )}

                {/* ── Bekor qilingan shartnoma holati va Qayta tiklash ─────────── */}
                {getStatus(selectedContract) === 'cancelled' && (
                  <div className="space-y-3 pt-2">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-slate-700">
                        <Ban className="w-4 h-4 text-slate-400" />
                        <span>Ushbu shartnoma bekor qilingan</span>
                      </div>
                      {selectedContract.cancelReason && (
                        <p className="text-slate-500">
                          <span className="font-semibold text-slate-600">Bekor qilish sababi:</span> {selectedContract.cancelReason}
                        </p>
                      )}
                      <p className={`text-[11px] font-bold ${selectedContract.returnedToStock ? 'text-blue-600' : 'text-slate-500'}`}>
                        {selectedContract.returnedToStock
                          ? '✓ Bekor qilishda mahsulotlar omborga qaytarilgan edi'
                          : '— Bekor qilishda mahsulotlar omborga qaytarilmagan'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setRestoreError('');
                        setRestoreModal(selectedContract);
                      }}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Shartnomani qayta tiklash</span>
                    </button>
                  </div>
                )}

                {/* ── Izoh ─────────────────────────────────────────────────── */}
                {selectedContract.notes && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Izoh</span>
                    <p className="text-xs font-medium text-slate-600">{selectedContract.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
         BEKOR QILISH TASDIQ MODALI
         ═══════════════════════════════════════════════════════════════════════ */}
      {cancelModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setCancelModal(null)} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-7 z-10 space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3 border border-rose-200">
                  <XCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Shartnomani bekor qilish</h3>
                <p className="text-xs text-slate-500 font-medium mt-1.5">
                  {cancelModal.contractNumber} — {cancelModal.customerName}. Ushbu amal bekor qilingan shartnomaga keyingi to‘lovlarni qabul qilishni to‘xtatadi.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Bekor qilish sababi (ixtiyoriy)</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                  placeholder="Sababni kiriting..."
                />
              </div>

              {/* Checkbox: Return products to warehouse */}
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={returnToStock}
                  onChange={(e) => setReturnToStock(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/20"
                />
                <span className="text-xs font-bold text-slate-700">
                  Mahsulotlarni omborga qaytarish (qoldiqni tiklash)
                </span>
              </label>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancelConfirm}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 transition-all active:scale-[0.98] cursor-pointer"
                >
                  Bekor qilishni tasdiqlash
                </button>
                <button
                  onClick={() => { setCancelModal(null); setCancelReason(''); setReturnToStock(false); }}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Orqaga
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      {/* ═══════════════════════════════════════════════════════════════════════
         QAYTA TIKLASH TASDIQ MODALI
         ═══════════════════════════════════════════════════════════════════════ */}
      {restoreModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => !isRestoring && setRestoreModal(null)} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 z-10 space-y-5 border border-slate-200/80">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-200 shadow-xs">
                  <RotateCcw className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Shartnomani qayta tiklash</h3>
                <p className="text-xs text-slate-500 font-medium mt-1.5">
                  <span className="font-extrabold text-slate-800">{restoreModal.contractNumber}</span> — {restoreModal.customerName}
                </p>
              </div>

              {restoreError && (
                <div className="flex items-start gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{restoreError}</span>
                </div>
              )}

              {/* Ombor holati haqida aniq ma'lumot */}
              {restoreStockCheck.wasReturned ? (
                <div className="space-y-2.5">
                  <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-xs">
                    <div className="flex items-center gap-1.5 font-black text-amber-800 mb-1">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Ombor harakati haqida ogohlantirish</span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                      Bekor qilishda mahsulotlar omborga qaytarilgan edi. Shartnoma qayta tiklanganda quyidagi mahsulotlar ombordan <strong>aynan shu miqdorda</strong> ayriladi:
                    </p>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {restoreStockCheck.itemsStatus.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                          item.hasEnough
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-rose-50/70 border-rose-200 text-rose-700'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-400">
                            Zarur: {item.qty} {item.unit || 'dona'} • Omborda: {item.availableStock} {item.unit || 'dona'}
                          </span>
                        </div>
                        <span className={`text-[11px] font-black shrink-0 ${item.hasEnough ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {item.hasEnough ? '✓ Yetarli' : '✗ Yetarli emas'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {!restoreStockCheck.canRestore && (
                    <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Omborda mahsulot yetarli bo'lmagani sababli qayta tiklab bo'lmaydi.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs">
                  <div className="flex items-center gap-2 font-black text-emerald-800 mb-0.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Omborga ta’sir qilmaydi</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                    Ushbu shartnoma bekor qilinganida mahsulotlar omborga qaytarilmagan. Qayta tiklashda ombor qoldig‘i o‘zgarmaydi.
                  </p>
                </div>
              )}

              <p className="text-[11px] text-slate-400 text-center leading-relaxed font-medium">
                Shartnomaning barcha to‘lovlar tarixi, qoldiq summasi va to‘lov jadvali to‘liq saqlanadi.
              </p>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={!restoreStockCheck.canRestore || isRestoring}
                  onClick={handleRestoreConfirm}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isRestoring ? (
                    <span>Tiklanmoqda...</span>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Ha, qayta tiklash</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={() => setRestoreModal(null)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

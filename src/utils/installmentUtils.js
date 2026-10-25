// src/utils/installmentUtils.js
import { getLocalDateString } from './dateUtils.js';

/**
 * Asia/Tashkent vaqt mintaqasi bo'yicha joriy sanani YYYY-MM-DD formatida olish
 */
export const getTashkentDateString = (d = new Date()) => {
  try {
    const dateObj = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    if (!dateObj || isNaN(dateObj.getTime())) return getLocalDateString();
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(dateObj);
  } catch (e) {
    return getLocalDateString(d);
  }
};

/**
 * Oy oxiri va kabisa yillarini to'g'ri hisobga oluvchi xavfsiz oy qo'shish funksiyasi.
 * Masalan: 31-yanvar + 1 oy -> 28-fevral (kabisa yilida 29-fevral), 31-mart + 1 oy -> 30-aprel.
 */
export const addMonthsSafe = (startDateStr, monthsToAdd = 0) => {
  if (!startDateStr) return getTashkentDateString();
  const parts = String(startDateStr).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return startDateStr;
  const [y, m, d] = parts;

  const totalMonths = (m - 1) + monthsToAdd;
  const targetYear = y + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12; // 0-indexed month

  // Target oyidagi maksimal kunlar soni (keyingi oyning 0-kuni o'tgan oy oxirini beradi)
  const maxDaysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(d, maxDaysInTargetMonth);

  const yStr = String(targetYear).padStart(4, '0');
  const mStr = String(targetMonth + 1).padStart(2, '0');
  const dStr = String(targetDay).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
};

/**
 * Xavfsiz yil qo'shish funksiyasi (kabisa yili 29-fevralni ham to'g'ri hisobga oladi)
 * Masalan: 2028-02-29 + 1 yil -> 2029-02-28
 */
export const addYearsSafe = (startDateStr, yearsToAdd = 0) => {
  if (!startDateStr) return getTashkentDateString();
  const parts = String(startDateStr).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return startDateStr;
  const [y, m, d] = parts;

  const targetYear = y + yearsToAdd;
  const targetMonth = m - 1;

  const maxDaysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(d, maxDaysInTargetMonth);

  const yStr = String(targetYear).padStart(4, '0');
  const mStr = String(targetMonth + 1).padStart(2, '0');
  const dStr = String(targetDay).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
};

/**
 * Xavfsiz hafta qo'shish funksiyasi
 */
export const addWeeksSafe = (startDateStr, weeksToAdd = 0) => {
  if (!startDateStr) return getTashkentDateString();
  const parts = String(startDateStr).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return startDateStr;
  const [y, m, d] = parts;

  const curDate = new Date(y, m - 1, d + (weeksToAdd * 7));
  const yStr = String(curDate.getFullYear()).padStart(4, '0');
  const mStr = String(curDate.getMonth() + 1).padStart(2, '0');
  const dStr = String(curDate.getDate()).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
};

/**
 * 1. Muddatli to'lov hisob-kitoblarini umumiy va yagona formula bo'yicha hisoblash
 * - Yakuniy savdo summasi = mahsulotlar summasi - ruxsat etilgan chegirma
 * - Boshlang'ich to'lovdan keyingi qoldiq = yakuniy savdo summasi - boshlang'ich to'lov
 * - Qoldiq manfiy bo'lmaydi
 * - Butun so'm birliklarida hisoblanadi
 */
export const calculateInstallmentSummary = ({
  items = [],
  discount = 0,
  downPayment = 0
}) => {
  const subtotal = items.reduce((sum, item) => {
    const p = Math.max(0, Math.round(Number(item.price) || 0));
    const q = Math.max(0, Number(item.qty) || 0);
    return sum + (p * q);
  }, 0);

  const cleanDiscount = Math.max(0, Math.min(subtotal, Math.round(Number(discount) || 0)));
  const totalAmount = Math.max(0, subtotal - cleanDiscount);

  const cleanDownPayment = Math.max(0, Math.min(totalAmount, Math.round(Number(downPayment) || 0)));
  const remainingPrincipal = Math.max(0, totalAmount - cleanDownPayment);

  return {
    subtotal,
    discount: cleanDiscount,
    totalAmount,
    downPayment: cleanDownPayment,
    remainingPrincipal
  };
};

/**
 * 2. To'lovlar jadvalini (Schedule) shakllantirish
 * Davriylik: 'monthly' (1–48) yoki 'yearly' (1–15).
 * Bo'linishdan qoladigan qoldiq/farq oxirgi to'lovga to'liq qo'shiladi.
 * Jadval summalari yig'indisi har doim aynan remainingPrincipal ga teng bo'ladi!
 * Sana hisob-kitoblarida oy oxirlari va kabisa yillari to'liq hisobga olingan.
 */
export const generateInstallmentSchedule = ({
  remainingPrincipal,
  paymentCount = 3,
  frequency = 'monthly', // 'monthly' | 'yearly'
  firstPaymentDate = getTashkentDateString()
}) => {
  const maxAllowed = frequency === 'yearly' ? 15 : 48;
  const parsedCount = parseInt(paymentCount, 10) || 1;
  const count = Math.max(1, Math.min(parsedCount, maxAllowed));
  const total = Math.max(0, Math.round(Number(remainingPrincipal) || 0));

  if (total === 0) return [];

  const baseAmount = Math.floor(total / count);
  const remainder = total - (baseAmount * count);

  const schedule = [];
  const baseDateStr = firstPaymentDate || getTashkentDateString();

  for (let i = 0; i < count; i++) {
    let dueDateStr;
    if (frequency === 'yearly') {
      dueDateStr = addYearsSafe(baseDateStr, i);
    } else if (frequency === 'weekly') {
      dueDateStr = addWeeksSafe(baseDateStr, i);
    } else {
      dueDateStr = addMonthsSafe(baseDateStr, i);
    }

    // Oxirgi to'lovga yaxlitlashdan qolgan farq qo'shiladi
    const installmentAmount = (i === count - 1) ? (baseAmount + remainder) : baseAmount;

    schedule.push({
      id: `sch-${i + 1}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      installmentIndex: i + 1,
      dueDate: dueDateStr,
      amount: installmentAmount,
      paidAmount: 0,
      isPaid: false,
      status: 'pending' // 'pending' | 'due' | 'overdue' | 'paid'
    });
  }

  return schedule;
};

/**
 * 3. Shartnoma holatini (Status) haqiqiy hisoblash (Asia/Tashkent)
 * - 'completed': Qolgan qarz 0
 * - 'cancelled': Bekor qilingan
 * - 'overdue': To'lov sanasi o'tgan va to'lanmagan qism mavjud
 * - 'due': To'lov sanasi bugun va to'lanmagan qism mavjud
 * - 'active': Qolgan summa bor, lekin muddati o'tgan to'lov yo'q va bugun muddati kelmagan
 */
export const computeContractStatus = (contract, todayStr = getTashkentDateString()) => {
  if (!contract) return 'active';
  if (contract.status === 'cancelled') return 'cancelled';
  if ((Number(contract.remainingAmount) || 0) <= 0) return 'completed';

  let hasOverdue = false;
  let hasDueToday = false;

  const schedule = contract.schedule || [];
  for (const item of schedule) {
    const itemRemaining = (Number(item.amount) || 0) - (Number(item.paidAmount) || 0);
    if (!item.isPaid && itemRemaining > 0) {
      if (item.dueDate < todayStr) {
        hasOverdue = true;
      } else if (item.dueDate === todayStr) {
        hasDueToday = true;
      }
    }
  }

  if (hasOverdue) return 'overdue';
  if (hasDueToday) return 'due';
  return 'active';
};

/**
 * 4. To'lov qabul qilish va shartnomaga taqsimlash
 * Qisman to'lovlarni to'liq qo'llab-quvvatlaydi.
 */
export const applyPaymentToContract = (contract, paymentData, todayStr = getTashkentDateString()) => {
  const payAmount = Math.max(0, Math.round(Number(paymentData.amount) || 0));
  if (payAmount <= 0) {
    return { updatedContract: contract, newPayment: null };
  }

  const currentRemaining = Math.max(0, Number(contract.remainingAmount) || 0);
  const actualPay = Math.min(payAmount, currentRemaining);

  const paymentDate = paymentData.date || todayStr;

  const newPayment = {
    id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    contractId: contract.id,
    amount: actualPay,
    date: paymentDate,
    paymentMethod: paymentData.paymentMethod || 'Naqd',
    note: paymentData.note || '',
    collectedBy: paymentData.collectedBy || 'Foydalanuvchi',
    collectedById: paymentData.collectedById || '',
    createdAt: new Date().toISOString()
  };

  const newTotalPaid = (Number(contract.totalPaid) || 0) + actualPay;
  const newRemaining = Math.max(0, (Number(contract.totalAmount) || 0) - newTotalPaid);

  let unapplied = actualPay;
  const updatedSchedule = (contract.schedule || []).map((item) => {
    if (unapplied <= 0 || item.isPaid) {
      return item;
    }
    const itemLeft = Math.max(0, item.amount - (Number(item.paidAmount) || 0));
    const toCover = Math.min(unapplied, itemLeft);
    const newPaidAmount = (Number(item.paidAmount) || 0) + toCover;
    unapplied -= toCover;
    const isNowPaid = newPaidAmount >= item.amount;

    return {
      ...item,
      paidAmount: newPaidAmount,
      isPaid: isNowPaid,
      paidDate: isNowPaid ? paymentDate : item.paidDate,
      status: isNowPaid ? 'paid' : (item.dueDate < todayStr ? 'overdue' : (item.dueDate === todayStr ? 'due' : 'pending'))
    };
  });

  const updatedContract = {
    ...contract,
    totalPaid: newTotalPaid,
    remainingAmount: newRemaining,
    payments: [...(contract.payments || []), newPayment],
    schedule: updatedSchedule,
    updatedAt: new Date().toISOString()
  };

  updatedContract.status = computeContractStatus(updatedContract, todayStr);
  return { updatedContract, newPayment };
};

/**
 * 5. Statistik kartalar hisob-kitobi
 */
export const calculateInstallmentStats = (contracts = [], todayStr = getTashkentDateString()) => {
  const list = Array.isArray(contracts) ? contracts : [];

  let totalContracts = list.length;
  let activeContracts = 0;
  let overduePaymentsCount = 0;
  let remainingTotalSum = 0;

  list.forEach((c) => {
    const status = computeContractStatus(c, todayStr);
    const remaining = Math.max(0, Number(c.remainingAmount) || 0);

    if (status !== 'cancelled' && status !== 'completed') {
      activeContracts += 1;
      remainingTotalSum += remaining;

      // Muddati o'tgan to'lovlar soni (jadval ichidagi muddati o'tgan har bir to'lov)
      const schedule = c.schedule || [];
      schedule.forEach((sch) => {
        if (!sch.isPaid && sch.dueDate < todayStr && (sch.amount - (sch.paidAmount || 0)) > 0) {
          overduePaymentsCount += 1;
        }
      });
    }
  });

  return {
    totalContracts,
    activeContracts,
    overduePaymentsCount,
    remainingTotalSum
  };
};

/**
 * 6. Shartnomaning keyingi to'lov sanasini topish
 */
export const getNextPaymentDate = (contract) => {
  if (!contract || contract.status === 'completed' || contract.status === 'cancelled') {
    return '—';
  }
  const schedule = contract.schedule || [];
  const nextPending = schedule.find(item => !item.isPaid && (item.amount - (item.paidAmount || 0)) > 0);
  return nextPending ? nextPending.dueDate : '—';
};

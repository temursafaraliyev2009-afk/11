// src/context/StoreContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  STORE_TYPES,
  getStoreTypeById,
  RENTAL_ALLOWED_STORE_TYPES,
  isRentalSupportedStoreType,
  DEBTS_RESTRICTED_STORE_TYPES,
  isDebtsSupportedStoreType,
  INSTALLMENT_ALLOWED_STORE_TYPES,
  isInstallmentSupportedStoreType
} from '../config/storeTypes';
import {
  calculateInstallmentSummary,
  generateInstallmentSchedule,
  computeContractStatus,
  applyPaymentToContract,
  calculateInstallmentStats
} from '../utils/installmentUtils';
import {
  STORE_TYPE_IDS,
  STORE_TYPE_METADATA,
  getStoreTypeAdapter,
  getStoreProductFields,
  getStoreCategories,
  getStoreUnits,
  getStoreNavMenus,
  getStoreStatsConfig,
  getStoreInventoryConfig,
  getStoreSalesConfig,
  getStoreOrdersConfig
} from '../config/storeTypeAdapter';
import { fixAllOrders } from '../utils/fixOrders';
import { getLocalDateString, getOffsetDateString, isToday } from '../utils/dateUtils';
import { isReturnedSale, isDebtCollectionSale } from '../utils/financeUtils.js';
import { isAccountStoreOwner, updateUserRoleInSystem } from '../services/accountService';
import {
  syncStoreEmployeesWithAcceptedInvitations,
  getOwnerEmployeesAsync,
  deactivateStoreEmployeeInvitations,
  saveStoreEmployeesToStorage,
  removeStoreEmployeeCloud
} from '../services/mailService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import svcDB, { isUUID as isValidUUID, subscribeToStoreData, loadStoreData, notifySyncEvent } from '../services/supabaseDataService';
import { isMigrationDone, markMigrationDone, migrateStoreDataToCloud } from '../utils/localToCloudMigration';

export {
  RENTAL_ALLOWED_STORE_TYPES,
  isRentalSupportedStoreType,
  DEBTS_RESTRICTED_STORE_TYPES,
  isDebtsSupportedStoreType,
  INSTALLMENT_ALLOWED_STORE_TYPES,
  isInstallmentSupportedStoreType
};

const StoreContext = createContext();

// ═══════════════════════════════════════════════════════════════════════
// XAVFSIZLIK YORDAMCHI FUNKTSIYALARI (Security Helpers)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Matnli kiritma uchun sanitizatsiya — XSS va script injection oldini olish.
 * React JSX oddiy matn sifatida render qiladi (dangerouslySetInnerHTML ishlatilmaydi),
 * lekin localStorage orqali boshqa sahifalarga o'tishi mumkin bo'lgan qiymatlarni tozalash muhim.
 */
const sanitizeTextInput = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  // Script teglarini va on* event handler atributlarini olib tashlash
  return str
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*(['"])[^'"]*\1/gi, '')
    .replace(/<[^>]*>/g, '') // Barcha HTML teglarini olib tashlash
    .trim();
};

/**
 * Moliyaviy raqam kiritmasini xavfsiz tozalash.
 * NaN, Infinity, manfiy qiymatlar va juda katta raqamlardan himoya.
 */
const sanitizeFinancialAmount = (value, { allowZero = true, maxAmount = 999_999_999_999 } = {}) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const clamped = Math.max(0, Math.min(num, maxAmount));
  if (!allowZero && clamped === 0) return 0;
  return Math.round(clamped); // Butun so'mlarda ishlash
};

/**
 * Takroriy to'lov yuborishdan himoya (double-click / debounce)
 * Har bir tranzaksiya turi uchun oxirgi yuborish vaqtini saqlaydi.
 */
const _paymentSubmitTracker = new Map();
const PAYMENT_DEBOUNCE_MS = 1500; // 1.5 soniya oraliq

const checkPaymentDebounce = (transactionKey) => {
  const now = Date.now();
  const lastSubmit = _paymentSubmitTracker.get(transactionKey);
  if (lastSubmit && (now - lastSubmit) < PAYMENT_DEBOUNCE_MS) {
    return false; // Juda tez — rad etiladi
  }
  _paymentSubmitTracker.set(transactionKey, now);
  // Eski kalitlarni tozalash (5 daqiqadan eski)
  for (const [key, time] of _paymentSubmitTracker) {
    if (now - time > 300000) _paymentSubmitTracker.delete(key);
  }
  return true; // Ruxsat beriladi
};

const USER_STORES_KEY = 'savatchi_user_stores';
const ACTIVE_STORE_KEY = 'savatchi_selected_store';
const PRODUCTS_KEY = 'savatchi_products_';
const SALES_KEY = 'savatchi_sales_';
const DEBTS_KEY = 'savatchi_debts_';
const ORDERS_KEY = 'savatchi_orders_';
const EMPLOYEES_KEY = 'savatchi_employees_';
const ACTIVITIES_KEY = 'savatchi_activities_';
const RENTALS_KEY = 'savatchi_rentals_';
const INSTALLMENTS_KEY = 'savatchi_installments_';
const EXPENSES_KEY = 'savatchi_expenses_';

// User-scoped storage key generators for complete account data isolation
export const getUserStoresKey = (userId) => userId ? `savatchi_${userId}_user_stores` : USER_STORES_KEY;
export const getActiveStoreKey = (userId) => userId ? `savatchi_${userId}_selected_store` : ACTIVE_STORE_KEY;
export const getProductsKey = (userId, storeId) => userId ? `savatchi_${userId}_products_${storeId}` : `${PRODUCTS_KEY}${storeId}`;
export const getSalesKey = (userId, storeId) => userId ? `savatchi_${userId}_sales_${storeId}` : `${SALES_KEY}${storeId}`;
export const getDebtsKey = (userId, storeId) => userId ? `savatchi_${userId}_debts_${storeId}` : `${DEBTS_KEY}${storeId}`;
export const getOrdersKey = (userId, storeId) => userId ? `savatchi_${userId}_orders_${storeId}` : `${ORDERS_KEY}${storeId}`;
export const getEmployeesKey = (userId, storeId) => userId ? `savatchi_${userId}_employees_${storeId}` : `${EMPLOYEES_KEY}${storeId}`;
export const getActivitiesKey = (userId, storeId) => userId ? `savatchi_${userId}_activities_${storeId}` : `${ACTIVITIES_KEY}${storeId}`;
export const getRentalsKey = (userId, storeId) => userId ? `savatchi_${userId}_rentals_${storeId}` : `${RENTALS_KEY}${storeId}`;
export const getInstallmentsKey = (userId, storeId) => userId ? `savatchi_${userId}_installments_${storeId}` : `${INSTALLMENTS_KEY}${storeId}`;
export const getExpensesKey = (userId, storeId) => userId ? `savatchi_${userId}_expenses_${storeId}` : `${EXPENSES_KEY}${storeId}`;

// Storage helpers
export const loadUserStoresFromStorage = (userId, userEmail = null) => {
  if (!userId && !userEmail) return [];
  const normEmail = userEmail ? String(userEmail).trim().toLowerCase() : '';
  const strUserId = userId ? String(userId).trim() : '';

  try {
    let stores = [];
    if (strUserId) {
      const userScoped = localStorage.getItem(getUserStoresKey(strUserId));
      if (userScoped) {
        const parsed = JSON.parse(userScoped);
        if (Array.isArray(parsed)) stores = [...parsed];
      }
    }
    // Backward compatibility: only migrate legacy stores if they belong to this user
    const legacy = localStorage.getItem(USER_STORES_KEY);
    if (legacy && strUserId) {
      const parsedLegacy = JSON.parse(legacy);
      if (Array.isArray(parsedLegacy)) {
        const owned = parsedLegacy.filter(s => s.ownerId && s.ownerId === strUserId);
        owned.forEach(s => {
          if (!stores.some(existing => existing.id === s.id)) {
            stores.push(s);
          }
        });
      }
    }

    // O'chirilgan xodimlik do'konlarini xavfsiz tozalash (Talab 2, 9)
    stores = stores.filter(s => {
      if (!s.isEmployeeStore && s.role !== 'Xodim') return true;
      try {
        const rawDel = localStorage.getItem(`savatchi_deleted_employees_${s.id}`);
        if (rawDel) {
          const delList = JSON.parse(rawDel);
          if (Array.isArray(delList)) {
            const isDel = delList.some(d =>
              (strUserId && (d.accountId === strUserId || d.id === strUserId)) ||
              (normEmail && d.email && d.email.trim().toLowerCase() === normEmail)
            );
            if (isDel) return false;
          }
        }
      } catch (e) {}
      return true;
    });

    // 1. Xodim sifatida qabul qilingan takliflar orqali do'konlarni qo'shish (ID va EMAIL bo'yicha)
    try {
      const rawMsgs = localStorage.getItem('savatchi_mail_messages');
      if (rawMsgs) {
        const msgs = JSON.parse(rawMsgs);
        if (Array.isArray(msgs)) {
          const acceptedInvites = msgs.filter(m => {
            if (m.type !== 'staff_invitation' || m.status !== 'Qabul qilindi') return false;
            const toEmail = (m.toUser?.email || '').trim().toLowerCase();
            const toId = String(m.toUser?.id || m.toUser?.uid || '').trim();
            const matchId = strUserId && toId && (toId === strUserId);
            const matchEmail = normEmail && toEmail && (toEmail === normEmail);
            return matchId || matchEmail;
          });

          acceptedInvites.forEach(inv => {
            // O'chirilgan xodimlar ro'yxatini tekshirish
            let isDeleted = false;
            try {
              const rawDel = localStorage.getItem(`savatchi_deleted_employees_${inv.storeId}`);
              if (rawDel) {
                const delList = JSON.parse(rawDel);
                if (Array.isArray(delList)) {
                  isDeleted = delList.some(d =>
                    (strUserId && (d.accountId === strUserId || d.id === strUserId)) ||
                    (normEmail && d.email && d.email.trim().toLowerCase() === normEmail)
                  );
                }
              }
            } catch (e) {}

            if (!isDeleted && !stores.some(s => s.id === inv.storeId)) {
              stores.push({
                id: inv.storeId,
                name: inv.storeName || 'Savatchi Do‘koni',
                type: inv.storeType || 'food',
                ownerId: inv.fromUser?.id,
                ownerEmail: inv.fromUser?.email,
                role: 'Xodim',
                isEmployeeStore: true
              });
            }
          });
        }
      }
    } catch (e) {}

    // 2. Shuningdek barcha do'konlarning xodimlar ro'yxatidan qidirish (membership tekshiruvi)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('savatchi_employees_')) {
          const sId = key.replace('savatchi_employees_', '');

          // O'chirilgan xodimlar ro'yxatini tekshirish
          let isDel = false;
          try {
            const rawDel = localStorage.getItem(`savatchi_deleted_employees_${sId}`);
            if (rawDel) {
              const delList = JSON.parse(rawDel);
              if (Array.isArray(delList)) {
                isDel = delList.some(d =>
                  (strUserId && (d.accountId === strUserId || d.id === strUserId)) ||
                  (normEmail && d.email && d.email.trim().toLowerCase() === normEmail)
                );
              }
            }
          } catch (e) {}
          if (isDel) continue;

          const rawEmps = localStorage.getItem(key);
          if (rawEmps) {
            const empList = JSON.parse(rawEmps);
            if (Array.isArray(empList)) {
              const foundEmp = empList.find(e =>
                e.status === 'Faol' && (
                  (strUserId && (e.accountId === strUserId || e.userId === strUserId || e.id === strUserId)) ||
                  (normEmail && e.email && e.email.trim().toLowerCase() === normEmail)
                )
              );
              if (foundEmp && !stores.some(s => s.id === sId)) {
                let storeMeta = null;
                try {
                  const rawAllMsgs = localStorage.getItem('savatchi_mail_messages');
                  if (rawAllMsgs) {
                    const allM = JSON.parse(rawAllMsgs);
                    const inv = allM.find(m => m.storeId === sId);
                    if (inv) {
                      storeMeta = {
                        id: sId,
                        name: inv.storeName || 'Savatchi Do‘koni',
                        type: inv.storeType || 'food',
                        ownerId: inv.fromUser?.id,
                        ownerEmail: inv.fromUser?.email,
                        role: foundEmp.role || 'Xodim',
                        isEmployeeStore: true
                      };
                    }
                  }
                } catch (e) {}

                if (!storeMeta) {
                  storeMeta = {
                    id: sId,
                    name: 'Savatchi Do‘koni',
                    type: 'food',
                    role: foundEmp.role || 'Xodim',
                    isEmployeeStore: true
                  };
                }
                stores.push(storeMeta);
              }
            }
          }
        }
      }
    } catch (e) {}

    // 3. Xodim uchun: agar Do'kon egasi yangi yoki boshqa do'konni tanlagan bo'lsa,
    // o'sha egasining do'koni xodimning ruxsat etilgan do'konlariga xavfsiz qo'shiladi (Talab 1, 6)
    try {
      const employeeOwners = new Set();
      stores.forEach(s => {
        if ((s.isEmployeeStore || s.role === 'Xodim') && s.ownerId) {
          employeeOwners.add(String(s.ownerId).trim());
        }
      });

      employeeOwners.forEach(ownId => {
        const ownerActiveId = localStorage.getItem(getActiveStoreKey(ownId)) ||
                              localStorage.getItem(`savatchi_owner_${ownId}_active_store`);
        if (ownerActiveId && !stores.some(s => s.id === ownerActiveId)) {
          let ownerStoreObj = null;
          const rawOwnerStores = localStorage.getItem(getUserStoresKey(ownId));
          if (rawOwnerStores) {
            const parsed = JSON.parse(rawOwnerStores);
            if (Array.isArray(parsed)) {
              ownerStoreObj = parsed.find(s => s.id === ownerActiveId);
            }
          }
          if (ownerStoreObj) {
            // Begona owner do'koni bo'lmasligi qat'iy tekshiriladi (Talab 6)
            if (!ownerStoreObj.ownerId || String(ownerStoreObj.ownerId).trim() === ownId) {
              stores.push({
                id: ownerStoreObj.id,
                name: ownerStoreObj.name || 'Savatchi Do‘koni',
                type: ownerStoreObj.type || 'food',
                emoji: ownerStoreObj.emoji || '🏪',
                ownerId: ownId,
                ownerEmail: ownerStoreObj.ownerEmail,
                role: 'Xodim',
                isEmployeeStore: true
              });
            }
          }
        }
      });
    } catch (e) {}

    if (stores.length > 0 && strUserId) {
      localStorage.setItem(getUserStoresKey(strUserId), JSON.stringify(stores));
    }
    return stores;
  } catch (e) {
    console.error('Error reading user stores:', e);
  }
  return [];
};

export const loadActiveStoreIdFromStorage = (userId, stores, userEmail = null) => {
  if (!stores || stores.length === 0) return null;
  const strUserId = userId ? String(userId).trim() : '';

  try {
    // 1. Agar foydalanuvchi Xodim bo'lsa: uning faol do'koni FAQAT va FAQAT Do'kon egasining faol tanlovi bilan belgilanadi (Talab 1, 4, 8)
    const employeeStore = stores.find(s => s.isEmployeeStore || s.role === 'Xodim');
    if (employeeStore && employeeStore.ownerId) {
      const ownerId = String(employeeStore.ownerId).trim();
      const ownerActive = localStorage.getItem(getActiveStoreKey(ownerId)) ||
                          localStorage.getItem(`savatchi_owner_${ownerId}_active_store`);
      if (ownerActive && stores.some(s => s.id === ownerActive)) {
        return ownerActive;
      }
    }

    // 2. Do'kon egasi yoki oddiy foydalanuvchi uchun o'zining saqlangan do'koni
    if (strUserId) {
      const saved = localStorage.getItem(getActiveStoreKey(strUserId));
      if (saved && stores.some(s => s.id === saved)) {
        return saved;
      }
    }

    // 3. Xodim do'koni fallback
    if (employeeStore?.id) {
      return employeeStore.id;
    }

    // 4. Default fallback: user's first available store
    if (stores[0]?.id) {
      return stores[0].id;
    }
  } catch (e) {}
  return null;
};

// Default initial stores for each of the 9 store types
const DEFAULT_USER_STORES = [
  { id: 'store_food', name: 'Savatchi Oziq-ovqat', type: 'food' },
  { id: 'store_phone', name: 'Savatchi Telefon & Gadjet', type: 'phone' },
  { id: 'store_clothing', name: 'Savatchi Kiyim-kechak', type: 'clothing' },
  { id: 'store_cosmetics', name: 'Savatchi Kosmetika & Parfyum', type: 'cosmetics' },
  { id: 'store_construction', name: 'Savatchi Qurilish Mollari', type: 'construction' },
  { id: 'store_household', name: 'Savatchi Uy-ro‘zg‘or', type: 'household' },
  { id: 'store_sport', name: 'Savatchi Sport Jihozlari', type: 'sport' },
  { id: 'store_accessories', name: 'Savatchi Aksessuarlar', type: 'accessories' },
  { id: 'store_flower', name: 'Savatchi Gul Do‘koni', type: 'flower' },
];

// Helper to generate realistic initial sales for a store type
const generateSalesForStore = (cfg) => {
  const now = new Date();
  const today = getLocalDateString(now);
  const curH = now.getHours();

  // Create times that are in the past relative to current local time
  const t1 = curH > 9 ? `${String(Math.max(8, curH - 1)).padStart(2, '0')}:42` : '08:42';
  const t2 = curH > 10 ? `${String(Math.max(8, curH - 2)).padStart(2, '0')}:10` : '08:25';
  const t3 = curH > 11 ? `${String(Math.max(8, curH - 3)).padStart(2, '0')}:30` : '08:10';

  const p1 = cfg.sampleProducts?.[0] || { id: 'p1', name: 'Mahsulot 1', price: 25000, costPrice: 18000, unit: 'dona' };
  const p2 = cfg.sampleProducts?.[1] || { id: 'p2', name: 'Mahsulot 2', price: 45000, costPrice: 32000, unit: 'dona' };
  const p3 = cfg.sampleProducts?.[2] || { id: 'p3', name: 'Mahsulot 3', price: 12000, costPrice: 9000, unit: 'dona' };
  return [
    { id: 's1', productId: p1.id, time: t1, date: today, product: p1.name, qty: 2, unit: p1.unit || 'dona', price: p1.price, costPrice: p1.costPrice, total: p1.price * 2, seller: 'Ali Valiyev', paymentType: 'Naqd' },
    { id: 's2', productId: p2.id, time: t2, date: today, product: p2.name, qty: 1, unit: p2.unit || 'dona', price: p2.price, costPrice: p2.costPrice, total: p2.price, seller: 'Sardor Rahimov', paymentType: 'Karta' },
    { id: 's3', productId: p3.id, time: t3, date: today, product: p3.name, qty: 3, unit: p3.unit || 'dona', price: p3.price, costPrice: p3.costPrice, total: p3.price * 3, seller: 'Azizbek', paymentType: 'Naqd' },
  ];
};

// Helper to generate realistic initial debts for a store type
const generateDebtsForStore = (cfg) => {
  const p1 = cfg.sampleProducts?.[0]?.name || cfg.name;
  return [
    { id: 'd1', name: 'Azizbek Rahimov', phone: '+998 90 123 45 67', amount: 80000, originalAmount: 80000, paidAmount: 0, givenDate: '2024-08-21', dueDate: '2024-08-31', status: 'Kechikkan', isPaid: false, note: `${p1} xaridi uchun`, daysOverdue: 10 },
    { id: 'd2', name: 'Jasur Mirzayev', phone: '+998 93 987 65 43', amount: 150000, originalAmount: 150000, paidAmount: 0, givenDate: '2024-08-28', dueDate: '2024-09-05', status: 'Kutilmoqda', isPaid: false, note: `${cfg.name} tovarlari`, daysOverdue: 0 },
    { id: 'd3', name: 'Rustam Usta', phone: '+998 97 555 44 33', amount: 220000, originalAmount: 300000, paidAmount: 80000, givenDate: '2024-08-15', dueDate: '2024-08-31', status: 'Bugun to‘lanishi kerak', isPaid: false, note: `Do‘kon xarajatlari`, daysOverdue: 0 },
    { id: 'd4', name: 'Bobur Salimov', phone: '+998 90 456 78 90', amount: 0, originalAmount: 200000, paidAmount: 200000, givenDate: '2024-08-10', dueDate: '2024-08-20', status: 'Qarz to‘landi', isPaid: true, note: 'To‘liq yopilgan qarz', daysOverdue: 0, closedDate: '2024-08-20' }
  ];
};

// Helper to generate realistic initial orders for a store type
const generateOrdersForStore = (cfg) => {
  const today = getLocalDateString();
  const yesterday = getOffsetDateString(-1);
  const p1 = cfg.sampleProducts?.[0]?.name || 'Mahsulot';
  const p2 = cfg.sampleProducts?.[1]?.name || 'Mahsulot 2';
  return [
    { id: 'ORD-1048', product: p1, supplier: cfg.name + " Ta'minot MCHJ", customerName: cfg.name + " Ta'minot MCHJ", date: today, qty: '50 dona', total: 750000, status: "Hali yo'lda" },
    { id: 'ORD-1047', product: p2, supplier: 'Distribyutor Servis', customerName: 'Distribyutor Servis', date: yesterday, qty: '20 dona', total: 420000, status: 'Yetkazildi' },
  ];
};

// Helper to generate realistic initial activities for a store type
const generateActivitiesForStore = (cfg) => {
  const p1 = cfg.sampleProducts?.[0]?.name || 'Mahsulot';
  return [
    { id: 'act-1', user: 'Ali', initial: 'A', bg: 'bg-blue-500', action: `${p1} yangilandi`, detail: `Ombor miqdori yangilandi`, category: 'Ombor', time: '16:42', date: '31-avgust 2024', timestamp: Date.now() - 1000 * 60 * 18 },
    { id: 'act-2', user: 'Anvar', initial: 'A', bg: 'bg-emerald-500', action: 'Qarzdorlik miqdorini kiritdi', detail: 'Aziz qarzi: 80 000 so‘m', category: 'Qarz', time: '16:38', date: '31-avgust 2024', timestamp: Date.now() - 1000 * 60 * 22 },
    { id: 'act-3', user: 'Sardor', initial: 'S', bg: 'bg-amber-500', action: 'Yangi savdo amalga oshirdi', detail: `${p1} sotildi`, category: 'Savdo', time: '16:10', date: '31-avgust 2024', timestamp: Date.now() - 1000 * 60 * 50 },
  ];
};

// Helper to generate realistic initial installment contracts for clothing and other supported stores
const generateInstallmentsForStore = (storeOrCfg) => {
  const sType = storeOrCfg?.type || storeOrCfg?.id || 'clothing';
  const today = getLocalDateString();
  const nextMonth = getOffsetDateString(30);
  const twoMonthsAgo = getOffsetDateString(-60);
  const oneMonthAgo = getOffsetDateString(-30);

  if (sType === 'clothing') {
    return [
      {
        id: 'inst-cl-1001',
        contractNumber: 'MT-1001',
        storeId: storeOrCfg.id || 'store_clothing',
        storeType: 'clothing',
        customerId: 'cust-cl-1',
        customerName: 'Dilshod Karimov',
        customerPhone: '+998 90 123 45 67',
        items: [
          { productId: 'p1', name: 'Erkaklar polo futbolkasi', price: 180000, qty: 1, unit: 'dona', size: 'L', color: 'Ko‘k', gender: 'Erkaklar', total: 180000 },
          { productId: 'p2', name: 'Erkaklar jinsi shimi', price: 320000, qty: 1, unit: 'dona', size: '32', color: 'To‘q ko‘k', gender: 'Erkaklar', total: 320000 },
          { productId: 'p4', name: 'Nike Air Force 1', price: 650000, qty: 1, unit: 'juft', size: '42', color: 'Oq', gender: 'Uniseks', total: 650000 },
          { productId: 'p5', name: 'Ayollar kechki ko‘ylagi', price: 450000, qty: 1, unit: 'dona', size: 'M', color: 'Qizil', gender: 'Ayollar', total: 450000 }
        ],
        productsSummary: 'Erkaklar polo futbolkasi [L, Ko‘k] (1 dona), Erkaklar jinsi shimi [32, To‘q ko‘k] (1 dona), Nike Air Force 1 [42, Oq] (1 juft)',
        subtotal: 1200000,
        discount: 0,
        totalAmount: 1200000,
        downPayment: 300000,
        totalPaid: 300000,
        remainingAmount: 900000,
        paymentCount: 3,
        frequency: 'monthly',
        firstPaymentDate: nextMonth,
        schedule: [
          { id: 'sch-cl-1', installmentIndex: 1, dueDate: nextMonth, amount: 300000, paidAmount: 0, isPaid: false, status: 'pending' },
          { id: 'sch-cl-2', installmentIndex: 2, dueDate: getOffsetDateString(60), amount: 300000, paidAmount: 0, isPaid: false, status: 'pending' },
          { id: 'sch-cl-3', installmentIndex: 3, dueDate: getOffsetDateString(90), amount: 300000, paidAmount: 0, isPaid: false, status: 'pending' }
        ],
        payments: [
          { id: 'pay-cl-1', contractId: 'inst-cl-1001', amount: 300000, date: today, paymentMethod: 'Naqd', note: 'Boshlang‘ich to‘lov', collectedBy: 'Ali Valiyev', createdAt: new Date().toISOString() }
        ],
        notes: 'Kiyimlar to‘plami bo‘yicha 3 oylik muddatli to‘lov shartnomasi',
        status: 'active',
        createdByName: 'Ali Valiyev',
        createdAt: today,
        updatedAt: new Date().toISOString()
      },
      {
        id: 'inst-cl-1002',
        contractNumber: 'MT-1002',
        storeId: storeOrCfg.id || 'store_clothing',
        storeType: 'clothing',
        customerId: 'cust-cl-2',
        customerName: 'Malika Umarova',
        customerPhone: '+998 93 456 78 90',
        items: [
          { productId: 'p5', name: 'Ayollar kechki ko‘ylagi', price: 450000, qty: 1, unit: 'dona', size: 'M', color: 'Qizil', gender: 'Ayollar', total: 450000 }
        ],
        productsSummary: 'Ayollar kechki ko‘ylagi [M, Qizil] (1 dona)',
        subtotal: 450000,
        discount: 0,
        totalAmount: 450000,
        downPayment: 150000,
        totalPaid: 450000,
        remainingAmount: 0,
        paymentCount: 2,
        frequency: 'monthly',
        firstPaymentDate: oneMonthAgo,
        schedule: [
          { id: 'sch-cl-2-1', installmentIndex: 1, dueDate: oneMonthAgo, amount: 150000, paidAmount: 150000, isPaid: true, paidDate: oneMonthAgo, status: 'paid' },
          { id: 'sch-cl-2-2', installmentIndex: 2, dueDate: today, amount: 150000, paidAmount: 150000, isPaid: true, paidDate: today, status: 'paid' }
        ],
        payments: [
          { id: 'pay-cl-2-1', contractId: 'inst-cl-1002', amount: 150000, date: twoMonthsAgo, paymentMethod: 'Naqd', note: 'Boshlang‘ich to‘lov', collectedBy: 'Ali Valiyev', createdAt: new Date().toISOString() },
          { id: 'pay-cl-2-2', contractId: 'inst-cl-1002', amount: 150000, date: oneMonthAgo, paymentMethod: 'Karta', note: '1-oy to‘lovi', collectedBy: 'Ali Valiyev', createdAt: new Date().toISOString() },
          { id: 'pay-cl-2-3', contractId: 'inst-cl-1002', amount: 150000, date: today, paymentMethod: 'Naqd', note: 'Yakuniy to‘lov', collectedBy: 'Ali Valiyev', createdAt: new Date().toISOString() }
        ],
        notes: 'To‘liq to‘langan shartnoma',
        status: 'completed',
        createdByName: 'Ali Valiyev',
        createdAt: twoMonthsAgo,
        updatedAt: new Date().toISOString()
      },
      {
        id: 'inst-cl-1003',
        contractNumber: 'MT-1003',
        storeId: storeOrCfg.id || 'store_clothing',
        storeType: 'clothing',
        customerId: 'cust-cl-3',
        customerName: 'Jasur Mirzayev',
        customerPhone: '+998 97 765 43 21',
        items: [
          { productId: 'p3', name: 'Qishki kurtka Zara', price: 850000, qty: 1, unit: 'dona', size: 'XL', color: 'Qora', gender: 'Erkaklar', total: 850000 }
        ],
        productsSummary: 'Qishki kurtka Zara [XL, Qora] (1 dona)',
        subtotal: 850000,
        discount: 0,
        totalAmount: 850000,
        downPayment: 250000,
        totalPaid: 250000,
        remainingAmount: 600000,
        paymentCount: 3,
        frequency: 'monthly',
        firstPaymentDate: getOffsetDateString(-5),
        schedule: [
          { id: 'sch-cl-3-1', installmentIndex: 1, dueDate: getOffsetDateString(-5), amount: 200000, paidAmount: 0, isPaid: false, status: 'overdue' },
          { id: 'sch-cl-3-2', installmentIndex: 2, dueDate: getOffsetDateString(25), amount: 200000, paidAmount: 0, isPaid: false, status: 'pending' },
          { id: 'sch-cl-3-3', installmentIndex: 3, dueDate: getOffsetDateString(55), amount: 200000, paidAmount: 0, isPaid: false, status: 'pending' }
        ],
        payments: [
          { id: 'pay-cl-3-1', contractId: 'inst-cl-1003', amount: 250000, date: getOffsetDateString(-35), paymentMethod: 'Naqd', note: 'Boshlang‘ich to‘lov', collectedBy: 'Ali Valiyev', createdAt: new Date().toISOString() }
        ],
        notes: 'Kurtka shartnomasi (to‘lov kechikmoqda)',
        status: 'overdue',
        createdByName: 'Ali Valiyev',
        createdAt: getOffsetDateString(-35),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  return [];
};

export const StoreProvider = ({ children }) => {
  // === LOGGED-IN USER INFO (from AuthContext) ===
  const { user: authUser, updateUserProfile } = useAuth();

  // Haqiqiy tizimga kirgan foydalanuvchi ID va ismi
  const currentUserId = authUser?.id || authUser?.uid || null;
  const currentUserEmail = authUser?.email || null;
  const currentUserName = authUser?.displayName || authUser?.firstName || authUser?.email?.split('@')[0] || 'Foydalanuvchi';

  // 1. User's stores list (Multi-Store Architecture - Scoped strictly to authenticated user)
  const [userStores, setUserStores] = useState(() => {
    return loadUserStoresFromStorage(currentUserId, currentUserEmail);
  });

  // 2. Currently selected store ID (Scoped strictly to authenticated user)
  const [selectedStoreId, setSelectedStoreId] = useState(() => {
    const stores = loadUserStoresFromStorage(currentUserId, currentUserEmail);
    return loadActiveStoreIdFromStorage(currentUserId, stores, currentUserEmail);
  });

  // Current store object: null/empty fallback if new account has not chosen a store yet
  const currentStore = useMemo(() => {
    if (selectedStoreId && userStores.length > 0) {
      const found = userStores.find(s => s.id === selectedStoreId || s.type === selectedStoreId);
      if (found) return found;
    }
    if (userStores && userStores.length > 0) {
      return userStores[0];
    }
    return {
      id: null,
      name: '',
      type: 'food',
      emoji: '🛒',
      ownerId: currentUserId,
      ownerEmail: authUser?.email || '',
      isInitialEmpty: true
    };
  }, [userStores, selectedStoreId, currentUserId, authUser?.email]);

  const storeType = currentStore?.type || 'food';
  const storeConfig = getStoreTypeById(storeType);
  const activeStoreId = currentStore?.id || null;
  const loadedStoreIdRef = useRef(activeStoreId);
  // Dedicated hydration handshake refs for userStores, store data, and sales persistence protection
  const userStoresHydratedUserRef = useRef(null);
  const userStoresPendingLoadRef = useRef(null);
  const hydratedScopeRef = useRef(null);
  const pendingHydrationRef = useRef(null);
  const salesHydratedScopeRef = useRef(null);
  const salesPendingLoadRef = useRef(null);
  const ensuredStoreIdsRef = useRef(new Set());
  const ensureStoreFnRef = useRef(null);

  // Sync state when currentUserId or currentUserEmail changes (account switch, new login, logout)
  useEffect(() => {
    if (!currentUserId && !currentUserEmail) {
      setUserStores([]);
      setSelectedStoreId(null);
      loadedStoreIdRef.current = null;
      hydratedScopeRef.current = null;
      pendingHydrationRef.current = null;
      userStoresHydratedUserRef.current = null;
      userStoresPendingLoadRef.current = null;
      salesHydratedScopeRef.current = null;
      salesPendingLoadRef.current = null;
      ensuredStoreIdsRef.current.clear();
      ensuredStoreIdsRef.current.clear();
      return;
    }
    const stores = loadUserStoresFromStorage(currentUserId, currentUserEmail);
    userStoresPendingLoadRef.current = { userId: currentUserId, data: stores };
    userStoresHydratedUserRef.current = null;
    setUserStores(stores);
    const activeId = loadActiveStoreIdFromStorage(currentUserId, stores, currentUserEmail);
    setSelectedStoreId(activeId);
    loadedStoreIdRef.current = null;
    hydratedScopeRef.current = null;
    pendingHydrationRef.current = null;
    salesHydratedScopeRef.current = null;
    salesPendingLoadRef.current = null;
  }, [currentUserId, currentUserEmail]);

  // Handle explicit logout event from AuthContext
  useEffect(() => {
    const handleLogout = () => {
      setUserStores([]);
      setSelectedStoreId(null);
      setProducts([]);
      setSales([]);
      setDebts([]);
      setOrders([]);
      setEmployees([]);
      setActivities([]);
      setRentals([]);
      setInstallments([]);
      setExpenses([]);
      loadedStoreIdRef.current = null;
      hydratedScopeRef.current = null;
      pendingHydrationRef.current = null;
      userStoresHydratedUserRef.current = null;
      userStoresPendingLoadRef.current = null;
      salesHydratedScopeRef.current = null;
      salesPendingLoadRef.current = null;
      ensuredStoreIdsRef.current.clear();
    };
    window.addEventListener('savatchi_user_logged_out', handleLogout);
    return () => window.removeEventListener('savatchi_user_logged_out', handleLogout);
  }, []);

  // Xodimlar ro'yxatini tozalash: do'kon egasi o'zi xodim kartasi bo'lib qolmasligi va
  // xodim kartasiga adashib "Do'kon egasi" roli berilgan bo'lsa uni xodim roliga to'g'rilash
  const sanitizeStoreEmployees = (list, sOwnerId, sOwnerEmail) => {
    if (!Array.isArray(list)) return [];
    const myId = String(authUser?.id || authUser?.uid || '').trim();
    const myEmail = (authUser?.email || '').trim().toLowerCase();
    const storeOwnId = String(sOwnerId || currentStore?.ownerId || myId || '').trim();
    const storeOwnEmail = (sOwnerEmail || currentStore?.ownerEmail || myEmail || '').trim().toLowerCase();

    return list
      .filter(emp => {
        if (!emp) return false;
        const eId = String(emp.accountId || emp.userId || emp.id || '').trim();
        const eEmail = (emp.email || '').trim().toLowerCase();

        // 1. Haqiqiy do'kon egasi xodimlar ro'yxatida oddiy xodim kartasi sifatida saqlanmaydi
        if (storeOwnId && eId && storeOwnId === eId) return false;
        if (storeOwnEmail && eEmail && storeOwnEmail === eEmail) return false;
        if (myId && eId && myId === eId) return false;
        if (myEmail && eEmail && myEmail === eEmail) return false;

        return true;
      })
      .map(emp => {
        // 2. Birinchi xodim yoki boshqa xodimga adashib "Do'kon egasi" roli berilgan bo'lsa, xodim roliga to'g'rilash
        if (emp.role === "Do'kon egasi" || emp.role === "Do‘kon egasi" || emp.role === "Magazin egasi") {
          return { ...emp, role: "Xodim" };
        }
        return emp;
      });
  };

  // 5 soniyalik o'chirishni bekor qilish uchun vaqtincha yashirilgan elementlar ID lari (Memory-only, uncommitted)
  const [pendingDeleteIds, setPendingDeleteIds] = useState(() => new Set());

  const isItemPendingDelete = useCallback((id) => {
    return pendingDeleteIds.has(id);
  }, [pendingDeleteIds]);

  const setItemPendingDelete = useCallback((id, isPending) => {
    setPendingDeleteIds(prev => {
      const next = new Set(prev);
      if (isPending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  // Helper to load data scoped to store owner (shared between owner and employees)
  const getScopedStoreData = (getterFn, legacyPrefix, sId, storeObj) => {
    if (!sId) return null;
    try {
      const effOwnerId = storeObj?.ownerId || currentUserId;
      if (effOwnerId) {
        const saved = localStorage.getItem(getterFn(effOwnerId, sId));
        if (saved) return JSON.parse(saved);
      }
      if (currentUserId && effOwnerId !== currentUserId) {
        const savedCur = localStorage.getItem(getterFn(currentUserId, sId));
        if (savedCur) return JSON.parse(savedCur);
      }
      const legacy = localStorage.getItem(legacyPrefix + sId);
      if (legacy) return JSON.parse(legacy);
    } catch (e) {}
    return null;
  };

  // 3. Isolated State per storeId and authenticated user (Shared between Owner and Store Staff)
  const [products, setProducts] = useState(() => {
    if (!currentUserId || !activeStoreId) return [];
    return getScopedStoreData(getProductsKey, PRODUCTS_KEY, activeStoreId, currentStore) || [];
  });

  const [sales, setSales] = useState(() => {
    if (!currentUserId || !activeStoreId) return [];
    return getScopedStoreData(getSalesKey, SALES_KEY, activeStoreId, currentStore) || [];
  });

  const [debts, setDebts] = useState(() => {
    if (!currentUserId || !activeStoreId) return [];
    return getScopedStoreData(getDebtsKey, DEBTS_KEY, activeStoreId, currentStore) || [];
  });

  const [orders, setOrders] = useState(() => {
    if (!currentUserId || !activeStoreId) return [];
    return getScopedStoreData(getOrdersKey, ORDERS_KEY, activeStoreId, currentStore) || [];
  });

  const [employees, setEmployees] = useState(() => {
    if (!currentUserId || !activeStoreId) return [];
    try {
      // Owner-Wide (2.0): ownerIdHint ni uzatish
      const ownerIdHint = currentStore?.ownerId || null;
      const syncd = syncStoreEmployeesWithAcceptedInvitations(activeStoreId, ownerIdHint);
      if (syncd && syncd.length > 0) return sanitizeStoreEmployees(syncd, currentStore?.ownerId, currentStore?.ownerEmail);
      const data = getScopedStoreData(getEmployeesKey, EMPLOYEES_KEY, activeStoreId, currentStore);
      if (Array.isArray(data)) return sanitizeStoreEmployees(data, currentStore?.ownerId, currentStore?.ownerEmail);
    } catch (e) {}
    return [];
  });

  const [activities, setActivities] = useState(() => {
    if (!currentUserId || !activeStoreId) return [];
    return getScopedStoreData(getActivitiesKey, ACTIVITIES_KEY, activeStoreId, currentStore) || [];
  });

  const [rentals, setRentals] = useState(() => {
    if (!currentUserId || !activeStoreId) return [];
    return getScopedStoreData(getRentalsKey, RENTALS_KEY, activeStoreId, currentStore) || [];
  });

  const [installments, setInstallments] = useState(() => {
    if (!currentUserId || !activeStoreId) return [];
    return getScopedStoreData(getInstallmentsKey, INSTALLMENTS_KEY, activeStoreId, currentStore) || [];
  });

  const [expenses, setExpenses] = useState(() => {
    if (!currentUserId || !activeStoreId) return [];
    return getScopedStoreData(getExpensesKey, EXPENSES_KEY, activeStoreId, currentStore) || [];
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('31-avgust 16:42');
  const [searchTargetItem, setSearchTargetItem] = useState(null);

  // DATA ISOLATION EFFECT: Whenever activeStoreId or currentUserId changes, load ONLY that user & store's data
  useEffect(() => {
    const sId = currentStore?.id;
    if (!currentUserId || !sId) {
      setProducts([]);
      setSales([]);
      setDebts([]);
      setOrders([]);
      setEmployees([]);
      setActivities([]);
      setRentals([]);
      setInstallments([]);
      setExpenses([]);
      loadedStoreIdRef.current = null;
      hydratedScopeRef.current = null;
      pendingHydrationRef.current = null;
      salesHydratedScopeRef.current = null;
      salesPendingLoadRef.current = null;
      ensuredStoreIdsRef.current.clear();
      return;
    }

    const scope = `${currentUserId}::${sId}`;
    pendingHydrationRef.current = { scope };
    hydratedScopeRef.current = null;
    loadedStoreIdRef.current = null;

    // 1. Products
    const initialProducts = getScopedStoreData(getProductsKey, PRODUCTS_KEY, sId, currentStore) || [];
    setProducts(initialProducts);

    // 2. Sales
    const initialSales = getScopedStoreData(getSalesKey, SALES_KEY, sId, currentStore) || [];
    salesPendingLoadRef.current = {
      scope: `${currentUserId}::${sId}`,
      data: initialSales
    };
    salesHydratedScopeRef.current = null;
    setSales(initialSales);

    // 3. Debts
    const initialDebts = getScopedStoreData(getDebtsKey, DEBTS_KEY, sId, currentStore) || [];
    setDebts(initialDebts);

    // 4. Orders
    const initialOrders = getScopedStoreData(getOrdersKey, ORDERS_KEY, sId, currentStore) || [];
    setOrders(initialOrders);

    // 5. Employees — Owner-Wide Staffing (2.0)
    //    ownerIdHint ni uzatish: Owner'ning barcha do'konlaridagi xodimlar ham yuklanadi
    try {
      const ownerIdHint = currentStore?.ownerId || null;
      const syncd = syncStoreEmployeesWithAcceptedInvitations(sId, ownerIdHint);
      if (syncd && syncd.length > 0) {
        setEmployees(sanitizeStoreEmployees(syncd, currentStore?.ownerId, currentStore?.ownerEmail));
      } else {
        const initialEmployees = getScopedStoreData(getEmployeesKey, EMPLOYEES_KEY, sId, currentStore);
        if (Array.isArray(initialEmployees)) {
          setEmployees(sanitizeStoreEmployees(initialEmployees, currentStore?.ownerId, currentStore?.ownerEmail));
        } else {
          setEmployees([]);
        }
      }
    } catch (e) {
      setEmployees([]);
    }

    // 6. Activities
    const initialActivities = getScopedStoreData(getActivitiesKey, ACTIVITIES_KEY, sId, currentStore) || [];
    setActivities(initialActivities);

    // 7. Rentals (Faqat tegishli do'kon uchun alohida saqlash va yuklash)
    const initialRentals = getScopedStoreData(getRentalsKey, RENTALS_KEY, sId, currentStore) || [];
    setRentals(initialRentals);

    // 8. Installments (Muddatli to'lov - faqat ruxsat etilgan do'konlar uchun izolyatsiya)
    const initialInstallments = getScopedStoreData(getInstallmentsKey, INSTALLMENTS_KEY, sId, currentStore) || [];
    setInstallments(initialInstallments);

    // 9. Expenses (Qo'shimcha xarajatlar)
    const initialExpenses = getScopedStoreData(getExpensesKey, EXPENSES_KEY, sId, currentStore) || [];
    setExpenses(initialExpenses);

    // ── SUPABASE CLOUD LOAD (async, localStorage ustidan merge) ──────────────
    // localStorage — tez UI uchun darhol yuklanadi (yuqorida).
    // Supabase — fon rejimida yuklanib, yangi/umumiy ma'lumotlarni qo'shadi.
    // "Supabase ustunlik qiladi" qoidasi: cloud'da yangi yozuv bo'lsa qo'shiladi.
    if (isSupabaseConfigured && sId) {
      loadStoreData(sId).then((cloud) => {
        // Faqat hozirgi store hali aktiv bo'lsa natijani qo'llash
        if (currentStore?.id !== sId) return;

        const mergeCloud = (prevList, cloudList) => {
          if (!cloudList || !cloudList.length) return prevList;
          const map = new Map((prevList || []).map(item => [item.id, item]));
          for (const cItem of cloudList) {
            if (!map.has(cItem.id)) {
              map.set(cItem.id, cItem);
            } else {
              const lItem = map.get(cItem.id);
              const cTime = new Date(cItem.updatedAt || cItem.created_at || cItem.createdAt || 0).getTime();
              const lTime = new Date(lItem.updatedAt || lItem.created_at || lItem.createdAt || lItem.timestamp || 0).getTime();
              if (cTime >= lTime) {
                map.set(cItem.id, { ...lItem, ...cItem });
              }
            }
          }
          return Array.from(map.values());
        };

        if (Array.isArray(cloud.products) && cloud.products.length > 0) setProducts(prev => mergeCloud(prev, cloud.products));
        if (Array.isArray(cloud.sales) && cloud.sales.length > 0) setSales(prev => mergeCloud(prev, cloud.sales));
        if (Array.isArray(cloud.debts) && cloud.debts.length > 0) setDebts(prev => mergeCloud(prev, cloud.debts));
        if (Array.isArray(cloud.orders) && cloud.orders.length > 0) setOrders(prev => mergeCloud(prev, cloud.orders));
        if (Array.isArray(cloud.rentals) && cloud.rentals.length > 0) setRentals(prev => mergeCloud(prev, cloud.rentals));
        if (Array.isArray(cloud.installments) && cloud.installments.length > 0) setInstallments(prev => mergeCloud(prev, cloud.installments));
        if (Array.isArray(cloud.expenses) && cloud.expenses.length > 0) setExpenses(prev => mergeCloud(prev, cloud.expenses));
      }).catch(err => {
        console.warn('[StoreContext] Cloud ma\'lumotlarini yuklashda xato:', err?.message || err);
      });

      // ── OWNER-WIDE STAFFING (2.0): Cloud xodimlarini Owner UUID bo'yicha yuklash ──
      // loadStoreData'dan farqli ravishda, bu owner_id bo'yicha filtr qilib
      // Owner'ning BARCHA do'konlaridagi xodimlarni olib keladi.
      const ownerForEmployees = currentStore?.ownerId || (isOwner ? currentUserId : null);
      if (ownerForEmployees) {
        getOwnerEmployeesAsync(ownerForEmployees).then((cloudEmployees) => {
          if (currentStore?.id !== sId) return;
          if (!cloudEmployees || cloudEmployees.length === 0) return;

          setEmployees(prev => {
            const merged = Array.isArray(prev) ? [...prev] : [];
            cloudEmployees.forEach(ce => {
              const exists = merged.some(e =>
                (e.email && ce.email && e.email.toLowerCase() === ce.email.toLowerCase()) ||
                (e.accountId && ce.accountId && e.accountId === ce.accountId) ||
                (e.id && ce.id && e.id === ce.id)
              );
              if (!exists) {
                merged.push(ce);
              }
            });
            return sanitizeStoreEmployees(merged, currentStore?.ownerId, currentStore?.ownerEmail);
          });
        }).catch(() => {
          // Cloud xatolik bo'lsa jim o'tkazamiz
        });
      }
    }
  }, [currentStore?.id, currentStore?.ownerId, currentStore?.type, currentUserId]);

  // HYDRATION CONFIRMATION EFFECT: Completes hydration handshake once initial store data is loaded
  useEffect(() => {
    const sId = currentStore?.id;
    if (!currentUserId || !sId) {
      hydratedScopeRef.current = null;
      loadedStoreIdRef.current = null;
      return;
    }
    const scope = `${currentUserId}::${sId}`;
    if (pendingHydrationRef.current?.scope === scope) {
      hydratedScopeRef.current = scope;
      loadedStoreIdRef.current = sId;
      pendingHydrationRef.current = null;
    }
  }, [currentStore?.id, currentUserId]);

  // ── SUPABASE REALTIME: Store ma'lumotlariga obuna bo'lish ───────────────────
  useEffect(() => {
    const sId = currentStore?.id;
    if (!isSupabaseConfigured || !sId) return;

    const cleanup = subscribeToStoreData(sId, (entity, eventType, row) => {
      if (loadedStoreIdRef.current !== sId) return;
      if (!row) return;

      if (entity === 'products') {
        if (eventType === 'DELETE') {
          setProducts(prev => prev.filter(p => p.id !== row.id));
        } else {
          setProducts(prev => {
            const idx = prev.findIndex(p => p.id === row.id);
            return idx >= 0 ? prev.map(p => p.id === row.id ? { ...p, ...row } : p) : [row, ...prev];
          });
        }
      } else if (entity === 'sales') {
        if (eventType === 'DELETE') {
          setSales(prev => prev.filter(s => s.id !== row.id));
        } else {
          setSales(prev => {
            const idx = prev.findIndex(s => s.id === row.id);
            return idx >= 0 ? prev.map(s => s.id === row.id ? { ...s, ...row } : s) : [row, ...prev];
          });
        }
      } else if (entity === 'debts') {
        if (eventType === 'DELETE') {
          setDebts(prev => prev.filter(d => d.id !== row.id));
        } else {
          setDebts(prev => {
            const idx = prev.findIndex(d => d.id === row.id);
            return idx >= 0 ? prev.map(d => d.id === row.id ? { ...d, ...row } : d) : [row, ...prev];
          });
        }
      } else if (entity === 'orders') {
        if (eventType === 'DELETE') {
          setOrders(prev => prev.filter(o => o.id !== row.id));
        } else {
          setOrders(prev => {
            const idx = prev.findIndex(o => o.id === row.id);
            return idx >= 0 ? prev.map(o => o.id === row.id ? { ...o, ...row } : o) : [row, ...prev];
          });
        }
      } else if (entity === 'rentals') {
        if (eventType === 'DELETE') {
          setRentals(prev => prev.filter(r => r.id !== row.id));
        } else {
          setRentals(prev => {
            const idx = prev.findIndex(r => r.id === row.id);
            return idx >= 0 ? prev.map(r => r.id === row.id ? { ...r, ...row } : r) : [row, ...prev];
          });
        }
      } else if (entity === 'installments') {
        if (eventType === 'DELETE') {
          setInstallments(prev => prev.filter(c => c.id !== row.id));
        } else {
          setInstallments(prev => {
            const idx = prev.findIndex(c => c.id === row.id);
            return idx >= 0 ? prev.map(c => c.id === row.id ? { ...c, ...row } : c) : [row, ...prev];
          });
        }
      } else if (entity === 'expenses') {
        if (eventType === 'DELETE') {
          setExpenses(prev => prev.filter(e => e.id !== row.id));
        } else {
          setExpenses(prev => {
            const idx = prev.findIndex(e => e.id === row.id);
            return idx >= 0 ? prev.map(e => e.id === row.id ? { ...e, ...row } : e) : [row, ...prev];
          });
        }
      }
    });

    return cleanup;
  }, [currentStore?.id]);

  // Listen for employee updates, invitations accepted, or role edits
  useEffect(() => {
    const handleEmployeesSync = (e) => {
      // 1. Agar qabul qilingan taklif joriy foydalanuvchiga tegishli bo'lsa, uning do'konlarini yangilash
      if (currentUserId && e.detail?.invitation) {
        const toId = e.detail.invitation.toUser?.id || e.detail.invitation.toUser?.uid;
        const toEmail = (e.detail.invitation.toUser?.email || '').toLowerCase();
        const myEmail = (authUser?.email || '').toLowerCase();
        if ((toId && toId === currentUserId) || (toEmail && myEmail && toEmail === myEmail)) {
          const reloadedStores = loadUserStoresFromStorage(currentUserId);
          userStoresHydratedUserRef.current = currentUserId;
          setUserStores(reloadedStores);
          if (e.detail.storeId) {
            setSelectedStoreId(e.detail.storeId);
          }
        }
      }

      // 2. Agar joriy do'kon ochiq bo'lsa, uning xodimlarini yangilash
      //    Owner-Wide (2.0): ownerIdHint ni uzatish — Owner'ning boshqa do'konidagi
      //    xodimlar ham ko'rinsin
      if (currentStore?.id) {
        try {
          const ownerIdHint = currentStore?.ownerId || null;
          const syncd = syncStoreEmployeesWithAcceptedInvitations(currentStore.id, ownerIdHint);
          setEmployees(sanitizeStoreEmployees(syncd, currentStore.ownerId, currentStore.ownerEmail));
        } catch (err) {}
      }
    };

    window.addEventListener('savatchi_employees_storage_updated', handleEmployeesSync);
    window.addEventListener('savatchi_invitation_accepted', handleEmployeesSync);
    window.addEventListener('savatchi_employee_role_updated', handleEmployeesSync);

    return () => {
      window.removeEventListener('savatchi_employees_storage_updated', handleEmployeesSync);
      window.removeEventListener('savatchi_invitation_accepted', handleEmployeesSync);
      window.removeEventListener('savatchi_employee_role_updated', handleEmployeesSync);
    };
  }, [currentStore?.id, currentUserId, authUser?.email]);

  // Listen for orders dispatched from the storefront / CartContext
  useEffect(() => {
    const handleNewOrder = (e) => {
      if (!currentStore?.id) return;
      const newOrder = e.detail;
      if (newOrder && (newOrder.storeId === currentStore.id || !newOrder.storeId)) {
        setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
        logActivity('Onlayn Xaridor', `Yangi buyurtma qabul qilindi: ${newOrder.id}`, `${newOrder.product || 'Mahsulotlar'}: ${Number(newOrder.total || 0).toLocaleString()} so‘m`, 'Buyurtma');
      }
    };
    window.addEventListener('savatchi_order_created', handleNewOrder);
    return () => window.removeEventListener('savatchi_order_created', handleNewOrder);
  }, [currentStore?.id]);

  // On initial app mount, automatically normalize and repair any corrupt orders in localStorage
  useEffect(() => {
    fixAllOrders(localStorage);
  }, []);

  // Persist current isolated store data safely (only when state matches currentStore)
  useEffect(() => {
    if (!currentUserId) return;

    // Guard: Never overwrite userStores in localStorage before hydration finishes
    if (userStoresHydratedUserRef.current !== currentUserId) {
      if (
        userStoresPendingLoadRef.current &&
        userStoresPendingLoadRef.current.userId === currentUserId &&
        userStores === userStoresPendingLoadRef.current.data
      ) {
        userStoresHydratedUserRef.current = currentUserId;
        userStoresPendingLoadRef.current = null;
      }
      return;
    }

    try {
      localStorage.setItem(getUserStoresKey(currentUserId), JSON.stringify(userStores));
    } catch (e) {
      console.error('Error saving user stores to localStorage:', e);
    }
  }, [userStores, currentUserId]);

  useEffect(() => {
    if (!currentUserId || !currentStore?.id) return;
    localStorage.setItem(getActiveStoreKey(currentUserId), currentStore.id);
  }, [currentStore?.id, currentUserId]);

  // Cross-tab / cross-window synchronization via BroadcastChannel
  const broadcastStoreUpdate = (entityName, sId) => {
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        const ch = new BroadcastChannel('savatchi_store_sync');
        ch.postMessage({ type: 'STORE_SYNC', entity: entityName, storeId: sId, senderId: currentUserId });
        ch.close();
      } catch (e) {}
    }
  };

  // Listen to remote changes from other windows/tabs in real-time
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    try {
      const ch = new BroadcastChannel('savatchi_store_sync');
      ch.onmessage = (e) => {
        const { entity, storeId, senderId } = e.data || {};
        if (storeId && currentStore?.id && storeId === currentStore.id && senderId !== currentUserId) {
          const sId = currentStore.id;
          if (entity === 'products') {
            const reloaded = getScopedStoreData(getProductsKey, PRODUCTS_KEY, sId, currentStore);
            if (reloaded) setProducts(reloaded);
          } else if (entity === 'sales') {
            const reloaded = getScopedStoreData(getSalesKey, SALES_KEY, sId, currentStore);
            if (reloaded) setSales(reloaded);
          } else if (entity === 'debts') {
            const reloaded = getScopedStoreData(getDebtsKey, DEBTS_KEY, sId, currentStore);
            if (reloaded) setDebts(reloaded);
          } else if (entity === 'orders') {
            const reloaded = getScopedStoreData(getOrdersKey, ORDERS_KEY, sId, currentStore);
            if (reloaded) setOrders(reloaded);
          } else if (entity === 'rentals') {
            const reloaded = getScopedStoreData(getRentalsKey, RENTALS_KEY, sId, currentStore);
            if (reloaded) setRentals(reloaded);
          } else if (entity === 'installments') {
            const reloaded = getScopedStoreData(getInstallmentsKey, INSTALLMENTS_KEY, sId, currentStore);
            if (reloaded) setInstallments(reloaded);
          } else if (entity === 'expenses') {
            const reloaded = getScopedStoreData(getExpensesKey, EXPENSES_KEY, sId, currentStore);
            if (reloaded) setExpenses(reloaded);
          }
        }
      };
      return () => {
        ch.close();
      };
    } catch (err) {}
  }, [currentStore?.id, currentStore?.ownerId, currentUserId]);

  useEffect(() => {
    const sId = currentStore?.id;
    const scope = currentUserId && sId ? `${currentUserId}::${sId}` : null;
    if (!scope || hydratedScopeRef.current !== scope || loadedStoreIdRef.current !== sId) return;

    const ownerId = currentStore?.ownerId || currentUserId;
    const payload = JSON.stringify(products);
    localStorage.setItem(getProductsKey(ownerId, sId), payload);
    if (ownerId !== currentUserId) {
      localStorage.setItem(getProductsKey(currentUserId, sId), payload);
    }
    localStorage.setItem(PRODUCTS_KEY + sId, payload);
    broadcastStoreUpdate('products', sId);
  }, [products, currentStore?.id, currentStore?.ownerId, currentUserId]);

  useEffect(() => {
    const scope = currentUserId && currentStore?.id ? `${currentUserId}::${currentStore.id}` : null;
    if (!scope) return;

    // Protection against overwriting localStorage with initial/stale empty state
    if (salesHydratedScopeRef.current !== scope) {
      const pending = salesPendingLoadRef.current;
      if (pending && pending.scope === scope) {
        if (sales === pending.data) {
          // Exactly the data we just loaded from LS — mark hydrated, do NOT write (no new sales)
          salesHydratedScopeRef.current = scope;
          salesPendingLoadRef.current = null;
          return;
        } else {
          // sales reference changed (addSale called before hydration was marked)
          // Data isolation effect already ran — safe to mark hydrated AND save
          salesHydratedScopeRef.current = scope;
          salesPendingLoadRef.current = null;
          // Fall through to save below
        }
      } else {
        // Genuinely unhydrated for this scope — never persist
        return;
      }
    }

    // Persist sales safely only when fully hydrated for current user and current store
    try {
      const ownerId = currentStore?.ownerId || currentUserId;
      const payload = JSON.stringify(sales);
      localStorage.setItem(getSalesKey(ownerId, currentStore.id), payload);
      if (ownerId !== currentUserId) {
        localStorage.setItem(getSalesKey(currentUserId, currentStore.id), payload);
      }
      localStorage.setItem(SALES_KEY + currentStore.id, payload);
      broadcastStoreUpdate('sales', currentStore.id);
    } catch (e) {
      console.error('Error saving sales to localStorage:', e);
    }
  }, [sales, currentStore?.id, currentStore?.ownerId, currentUserId]);

  useEffect(() => {
    const sId = currentStore?.id;
    const scope = currentUserId && sId ? `${currentUserId}::${sId}` : null;
    if (!scope || hydratedScopeRef.current !== scope || loadedStoreIdRef.current !== sId) return;

    const ownerId = currentStore?.ownerId || currentUserId;
    const payload = JSON.stringify(debts);
    localStorage.setItem(getDebtsKey(ownerId, sId), payload);
    if (ownerId !== currentUserId) {
      localStorage.setItem(getDebtsKey(currentUserId, sId), payload);
    }
    localStorage.setItem(DEBTS_KEY + sId, payload);
    broadcastStoreUpdate('debts', sId);
  }, [debts, currentStore?.id, currentStore?.ownerId, currentUserId]);

  useEffect(() => {
    const sId = currentStore?.id;
    const scope = currentUserId && sId ? `${currentUserId}::${sId}` : null;
    if (!scope || hydratedScopeRef.current !== scope || loadedStoreIdRef.current !== sId) return;

    const ownerId = currentStore?.ownerId || currentUserId;
    const payload = JSON.stringify(orders);
    localStorage.setItem(getOrdersKey(ownerId, sId), payload);
    if (ownerId !== currentUserId) {
      localStorage.setItem(getOrdersKey(currentUserId, sId), payload);
    }
    localStorage.setItem(ORDERS_KEY + sId, payload);
    broadcastStoreUpdate('orders', sId);
  }, [orders, currentStore?.id, currentStore?.ownerId, currentUserId]);

  useEffect(() => {
    const sId = currentStore?.id;
    const scope = currentUserId && sId ? `${currentUserId}::${sId}` : null;
    if (!scope || hydratedScopeRef.current !== scope || loadedStoreIdRef.current !== sId) return;

    const ownerId = currentStore?.ownerId || currentUserId;
    const payload = JSON.stringify(employees);
    localStorage.setItem(getEmployeesKey(ownerId, sId), payload);
    if (ownerId !== currentUserId) {
      localStorage.setItem(getEmployeesKey(currentUserId, sId), payload);
    }
    localStorage.setItem(EMPLOYEES_KEY + sId, payload);
  }, [employees, currentStore?.id, currentStore?.ownerId, currentUserId]);

  useEffect(() => {
    const sId = currentStore?.id;
    const scope = currentUserId && sId ? `${currentUserId}::${sId}` : null;
    if (!scope || hydratedScopeRef.current !== scope || loadedStoreIdRef.current !== sId) return;

    const ownerId = currentStore?.ownerId || currentUserId;
    const payload = JSON.stringify(activities);
    localStorage.setItem(getActivitiesKey(ownerId, sId), payload);
    if (ownerId !== currentUserId) {
      localStorage.setItem(getActivitiesKey(currentUserId, sId), payload);
    }
    localStorage.setItem(ACTIVITIES_KEY + sId, payload);
  }, [activities, currentStore?.id, currentStore?.ownerId, currentUserId]);

  useEffect(() => {
    const sId = currentStore?.id;
    const scope = currentUserId && sId ? `${currentUserId}::${sId}` : null;
    if (!scope || hydratedScopeRef.current !== scope || loadedStoreIdRef.current !== sId) return;

    const ownerId = currentStore?.ownerId || currentUserId;
    const payload = JSON.stringify(rentals);
    localStorage.setItem(getRentalsKey(ownerId, sId), payload);
    if (ownerId !== currentUserId) {
      localStorage.setItem(getRentalsKey(currentUserId, sId), payload);
    }
    localStorage.setItem(RENTALS_KEY + sId, payload);
    broadcastStoreUpdate('rentals', sId);
  }, [rentals, currentStore?.id, currentStore?.ownerId, currentUserId]);

  useEffect(() => {
    const sId = currentStore?.id;
    const scope = currentUserId && sId ? `${currentUserId}::${sId}` : null;
    if (!scope || hydratedScopeRef.current !== scope || loadedStoreIdRef.current !== sId) return;

    const ownerId = currentStore?.ownerId || currentUserId;
    const payload = JSON.stringify(installments);
    localStorage.setItem(getInstallmentsKey(ownerId, sId), payload);
    if (ownerId !== currentUserId) {
      localStorage.setItem(getInstallmentsKey(currentUserId, sId), payload);
    }
    localStorage.setItem(INSTALLMENTS_KEY + sId, payload);
    broadcastStoreUpdate('installments', sId);
  }, [installments, currentStore?.id, currentStore?.ownerId, currentUserId]);

  useEffect(() => {
    const sId = currentStore?.id;
    const scope = currentUserId && sId ? `${currentUserId}::${sId}` : null;
    if (!scope || hydratedScopeRef.current !== scope || loadedStoreIdRef.current !== sId) return;

    const ownerId = currentStore?.ownerId || currentUserId;
    const payload = JSON.stringify(expenses);
    localStorage.setItem(getExpensesKey(ownerId, sId), payload);
    if (ownerId !== currentUserId) {
      localStorage.setItem(getExpensesKey(currentUserId, sId), payload);
    }
    localStorage.setItem(EXPENSES_KEY + sId, payload);
    broadcastStoreUpdate('expenses', sId);
  }, [expenses, currentStore?.id, currentStore?.ownerId, currentUserId]);

  // Switch Active Store
  const switchStore = (storeIdOrType) => {
    if (!currentUserId) {
      console.warn('switchStore called without authenticated user');
      return null;
    }
    // Xodim uchun do'kon almashtirish qat'iyan taqiqlanadi (Talab 9)
    if (isEmployee) {
      console.warn('Xodim do‘konni almashtira olmaydi!');
      return currentStore;
    }
    let target = userStores.find(s => s.id === storeIdOrType);
    if (!target) {
      target = userStores.find(s => s.type === storeIdOrType);
    }
    if (!target) {
      const cfg = getStoreTypeById(storeIdOrType);
      target = {
        id: `store_${storeIdOrType}_${Date.now()}`,
        name: `Savatchi ${cfg.name}`,
        type: storeIdOrType,
        emoji: cfg.emoji,
        ownerId: currentUserId,
        ownerEmail: authUser?.email || '',
        createdAt: new Date().toISOString()
      };
      const updated = [...userStores, target];
      userStoresHydratedUserRef.current = currentUserId;
      setUserStores(updated);
      if (currentUserId) {
        localStorage.setItem(getUserStoresKey(currentUserId), JSON.stringify(updated));
      }
    }
    loadedStoreIdRef.current = null;
    hydratedScopeRef.current = null;
    pendingHydrationRef.current = null;
    salesHydratedScopeRef.current = null;
    salesPendingLoadRef.current = null;
    setSelectedStoreId(target.id);
    if (currentUserId) {
      localStorage.setItem(getActiveStoreKey(currentUserId), target.id);
      localStorage.setItem(`savatchi_owner_${currentUserId}_active_store`, target.id);
    }

    // CLOUD PERSISTENCE: Target store public.stores da mavjudligini ta'minlash
    if (isSupabaseConfigured && currentUserId && isValidUUID(currentUserId) && target) {
      svcDB.stores.upsert(target, currentUserId).catch(err => {
        console.warn('[switchStore] stores.upsert xatosi:', err?.message);
      });
    }

    // Server va Realtime sinxronlash (Owner -> Employee) (Talab 1, 2, 3, 4)
    if (isSupabaseConfigured && supabase && currentUserId) {
      supabase
        .from('profiles')
        .update({ active_store_id: target.id, updated_at: new Date().toISOString() })
        .eq('id', currentUserId)
        .then(({ error }) => {
          if (error) console.warn('[Supabase Sync] active_store_id update failed:', error.message);
        });

      try {
        const rtChannel = supabase.channel(`savatchi_owner_${currentUserId}`);
        rtChannel.send({
          type: 'broadcast',
          event: 'ACTIVE_STORE_CHANGED',
          payload: {
            ownerId: currentUserId,
            storeId: target.id,
            store: target
          }
        });
      } catch (err) {}
    }

    // Mahalliy brauzer oynalari va tablari uchun BroadcastChannel
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        const ch = new BroadcastChannel('savatchi_store_sync');
        ch.postMessage({
          type: 'OWNER_ACTIVE_STORE_CHANGED',
          ownerId: currentUserId,
          storeId: target.id,
          store: target
        });
        ch.close();
      } catch (e) {}
    }

    // DOM CustomEvent (bitta oyna va test muhitlari uchun)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('savatchi_owner_active_store_changed', {
        detail: {
          ownerId: currentUserId,
          storeId: target.id,
          store: target
        }
      }));
    }
    return target;
  };

  // setStoreType alias for switchStore
  const setStoreType = (storeTypeId) => {
    return switchStore(storeTypeId);
  };

  // Create a brand new store
  const createNewStore = async ({ name, type }) => {
    if (!currentUserId) {
      console.warn('createNewStore called without authenticated user');
      return null;
    }
    // Xodim yangi do'kon ocha olmaydi (Talab 9)
    if (isEmployee) {
      throw new Error('Xodimlar yangi do‘kon yarata olmaydi!');
    }
    const cfg = getStoreTypeById(type);
    const newStore = {
      id: `store_${type}_${Date.now()}`,
      name: name?.trim() || `Savatchi ${cfg.name} Do‘koni`,
      type: type,
      emoji: cfg.emoji,
      ownerId: currentUserId,
      ownerEmail: authUser?.email || '',
      createdAt: new Date().toISOString()
    };

    // CLOUD PERSISTENCE: Avval public.stores jadvaliga saqlash
    if (isSupabaseConfigured && currentUserId && isValidUUID(currentUserId)) {
      try {
        await svcDB.stores.upsert(newStore, currentUserId);
      } catch (err) {
        console.error('[createNewStore] Supabase stores.upsert xatosi:', err);
        throw new Error(`Do‘konni serverda yaratib bo‘lmadi: ${err.message || 'Baza xatosi'}`);
      }
    }

    loadedStoreIdRef.current = null;
    hydratedScopeRef.current = null;
    pendingHydrationRef.current = null;
    salesHydratedScopeRef.current = null;
    salesPendingLoadRef.current = null;
    const updated = [...userStores, newStore];
    userStoresHydratedUserRef.current = currentUserId;
    setUserStores(updated);
    if (currentUserId) {
      localStorage.setItem(getUserStoresKey(currentUserId), JSON.stringify(updated));
      localStorage.setItem(getActiveStoreKey(currentUserId), newStore.id);
      localStorage.setItem(`savatchi_owner_${currentUserId}_active_store`, newStore.id);
    }
    setSelectedStoreId(newStore.id);

    // Sync active_store_id on profiles
    if (isSupabaseConfigured && supabase && currentUserId && isValidUUID(currentUserId)) {
      supabase
        .from('profiles')
        .update({ active_store_id: newStore.id, updated_at: new Date().toISOString() })
        .eq('id', currentUserId)
        .then(({ error }) => {
          if (error) console.warn('[Supabase Sync] active_store_id update failed:', error.message);
        });
    }

    return newStore;
  };

  // Activity Logger — har doim tizimga kirgan foydalanuvchi nomidan yoziladi
  const logActivity = (userNameOverride, actionName, changeDetail, categoryName = 'Umumiy') => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${mins}`;
    const MONTHS_UZ = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
    const dateStr = `${now.getDate()}-${MONTHS_UZ[now.getMonth()]} ${now.getFullYear()}`;

    // Har doim haqiqiy tizimga kirgan foydalanuvchi ismini ishlatamiz
    const resolvedUser = currentUserName || userNameOverride || 'Foydalanuvchi';

    const newAct = {
      id: 'act-' + Date.now(),
      userId: currentUserId,
      user: resolvedUser,
      initial: resolvedUser.charAt(0).toUpperCase(),
      bg: 'bg-blue-500',
      action: actionName,
      detail: changeDetail,
      category: categoryName,
      time: timeStr,
      date: dateStr,
      timestamp: Date.now()
    };

    setActivities(prev => [newAct, ...prev]);
    if (isSupabaseConfigured && currentStore?.id) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.activities.insert(currentStore.id, newAct);
        } catch (err) {
          console.warn('[Supabase logActivity]', err?.message || err);
        }
      })();
    }
  };

  // Product Actions
  const addProduct = (productData, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const newProduct = {
      id: 'prod-' + Date.now(),
      emoji: productData.emoji || storeConfig.stickers?.[0] || '📦',
      name: productData.name,
      category: productData.category || storeConfig.categories?.[0] || 'Umumiy',
      unit: productData.unit || storeConfig.units?.[0] || 'dona',
      stock: Number(productData.stock) || 0,
      price: Number(productData.price) || 0,
      costPrice: Number(productData.costPrice) || Math.round((Number(productData.price) || 0) * 0.75),
      status: Number(productData.stock) > 10 ? 'Yetarli' : Number(productData.stock) > 0 ? 'Kam' : 'Tugagan',
      storeId: currentStore?.id || activeStoreId || '',
      storeType: currentStore?.type || storeType,
      ...productData
    };

    setProducts(prev => [newProduct, ...prev]);
    logActivity(userName, `Mahsulot qo‘shdi: ${newProduct.name}`, `${newProduct.name}: ${newProduct.stock} ${newProduct.unit}`, 'Ombor');
    // Dual-write: Supabase async (non-blocking)
    if (isSupabaseConfigured && newProduct.storeId) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.products.upsert(newProduct.storeId, newProduct);
        } catch (err) {
          console.error('[Supabase products.upsert]', err?.message || err);
          notifySyncEvent('error', { entity: 'products', action: 'insert', id: newProduct.id, message: err?.message });
        }
      })();
    }
    return newProduct;
  };

  const updateProduct = (id, updates, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    let updatedTarget = null;
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, ...updates, updatedAt: new Date().toISOString() };
        if ('stock' in updates) {
          const numStock = Number(updates.stock);
          updated.status = numStock > 10 ? 'Yetarli' : numStock > 0 ? 'Kam' : 'Tugagan';
          logActivity(userName, `${p.name} miqdorini o‘zgartirdi`, `${p.name}: ${p.stock} → ${numStock} ${p.unit || ''}`, 'Ombor');
        } else {
          logActivity(userName, `${p.name} tahrirlandi`, `Ma'lumotlar yangilandi`, 'Ombor');
        }
        updatedTarget = updated;
        return updated;
      }
      return p;
    }));

    if (isSupabaseConfigured && currentStore?.id && updatedTarget) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.products.upsert(currentStore.id, updatedTarget);
        } catch (err) {
          console.error('[Supabase updateProduct]', err?.message || err);
          notifySyncEvent('error', { entity: 'products', action: 'update', id, message: err?.message });
        }
      })();
    }
  };

  const adjustStock = (id, delta, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    let updatedTarget = null;
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const oldStock = p.stock;
        const newStock = Math.max(0, oldStock + delta);
        const status = newStock > 10 ? 'Yetarli' : newStock > 0 ? 'Kam' : 'Tugagan';
        logActivity(userName, `${p.name} zaxirasini o‘zgartirdi`, `${p.name}: ${oldStock} → ${newStock} ${p.unit}`, 'Ombor');
        const updated = { ...p, stock: newStock, status, updatedAt: new Date().toISOString() };
        updatedTarget = updated;
        return updated;
      }
      return p;
    }));

    if (isSupabaseConfigured && currentStore?.id && updatedTarget) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.products.updateStock(currentStore.id, id, updatedTarget.stock);
        } catch (err) {
          console.error('[Supabase adjustStock]', err?.message || err);
          notifySyncEvent('error', { entity: 'products', action: 'updateStock', id, message: err?.message });
        }
      })();
    }
  };
  const deleteProduct = (id, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const p = products.find(prod => prod.id === id);
    if (p) {
      logActivity(userName, `Mahsulot o‘chirildi: ${p.name}`, `Ombordan olib tashlandi`, 'Ombor');
      setProducts(prev => prev.filter(prod => prod.id !== id));
      if (isSupabaseConfigured && p.storeId) {
        (async () => {
          try {
            if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
            await svcDB.products.delete(p.storeId, id);
          } catch (err) {
            console.error('[Supabase products.delete]', err?.message || err);
            notifySyncEvent('error', { entity: 'products', action: 'delete', id, message: err?.message });
          }
        })();
      }
    }
  };

  // Sales Actions
  const addSale = (saleData, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${mins}`;

    // Snapshot exact cost price at the moment of sale
    let costPrice = null;
    let costStatus = 'unknown';

    if (saleData.costPrice !== undefined && saleData.costPrice !== null && !isNaN(Number(saleData.costPrice)) && Number(saleData.costPrice) >= 0) {
      costPrice = Number(saleData.costPrice);
      costStatus = 'exact';
    } else if (saleData.productId) {
      const matchedProd = products.find(p => p.id === saleData.productId);
      if (matchedProd && matchedProd.costPrice !== undefined && matchedProd.costPrice !== null && !isNaN(Number(matchedProd.costPrice)) && Number(matchedProd.costPrice) >= 0) {
        costPrice = Number(matchedProd.costPrice);
        costStatus = 'exact';
      }
    } else if (saleData.isDebtCollection) {
      costPrice = 0;
      costStatus = 'not_applicable';
    }

    const newSale = {
      id: saleData.id || ('s-' + Date.now()),
      time: timeStr,
      date: getLocalDateString(now),
      productId: saleData.productId || null,
      product: saleData.productName || saleData.product,
      emoji: saleData.emoji || '📦',
      qty: Number(saleData.qty) !== undefined ? Number(saleData.qty) : 1,
      unit: saleData.unit || 'dona',
      price: Number(saleData.price) || 0,
      costPrice: costPrice,
      costStatus: costStatus,
      costSnapshotDate: now.toISOString(),
      total: saleData.total !== undefined ? Number(saleData.total) : (Number(saleData.qty) || 1) * (Number(saleData.price) || 0),
      seller: currentUserName || saleData.seller || userName || 'Foydalanuvchi',
      sellerId: currentUserId,
      paymentType: saleData.saleType === 'installment_contract' ? 'Nasiya' : (saleData.paymentType || 'Naqd'),
      saleType: saleData.saleType || (saleData.isDebtCollection ? 'installment_payment' : 'retail'),
      isDebtCollection: saleData.isDebtCollection === true,
      contractId: saleData.contractId || null,
      storeId: currentStore?.id || activeStoreId || ''
    };

    setSales(prev => [newSale, ...prev]);

    // Decrease stock if product exists and not a debt collection
    if (saleData.productId && !saleData.isDebtCollection) {
      adjustStock(saleData.productId, -(Number(saleData.qty) || 1), userName);
    }

    logActivity(userName, `Savdo amalga oshirildi`, `${newSale.product}: ${newSale.total.toLocaleString()} so‘m`, 'Savdo');
    // Dual-write: Supabase async
    if (isSupabaseConfigured && newSale.storeId) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.sales.upsert(newSale.storeId, newSale);
        } catch (err) {
          console.error('[Supabase sales.upsert]', err?.message || err);
          notifySyncEvent('error', { entity: 'sales', action: 'insert', id: newSale.id, message: err?.message });
        }
      })();
    }
    return newSale;
  };

  const cancelSale = (id, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const s = sales.find(item => item.id === id);
    if (s) {
      logActivity(userName, `Savdo bekor qilindi`, `${s.product}: ${s.total.toLocaleString()} so‘m`, 'Savdo');
      setSales(prev => prev.filter(item => item.id !== id));
      if (isSupabaseConfigured && s.storeId) {
        (async () => {
          try {
            if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
            await svcDB.sales.delete(s.storeId, id);
          } catch (err) {
            console.error('[Supabase sales.delete]', err?.message || err);
            notifySyncEvent('error', { entity: 'sales', action: 'delete', id, message: err?.message });
          }
        })();
      }
    }
  };

  // Debts Actions
  const addDebt = (debtData, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const newDebt = {
      id: 'd-' + Date.now(),
      name: debtData.name,
      phone: debtData.phone || '+998 90 000 00 00',
      amount: Number(debtData.amount) || 0,
      originalAmount: Number(debtData.amount) || 0,
      paidAmount: 0,
      givenDate: getLocalDateString(),
      dueDate: debtData.dueDate || getOffsetDateString(7),
      status: 'Kutilmoqda',
      isPaid: false,
      note: debtData.note || '',
      daysOverdue: 0,
      storeId: currentStore?.id || activeStoreId || ''
    };

    setDebts(prev => [newDebt, ...prev]);
    // Dual-write: Supabase async
    if (isSupabaseConfigured && newDebt.storeId) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.debts.upsert(newDebt.storeId, newDebt);
        } catch (err) {
          console.error('[Supabase debts.upsert]', err?.message || err);
          notifySyncEvent('error', { entity: 'debts', action: 'insert', id: newDebt.id, message: err?.message });
        }
      })();
    }
    logActivity(userName, `Yangi qarz kiritildi: ${newDebt.name}`, `${newDebt.amount.toLocaleString()} so‘m`, 'Qarz');
    return newDebt;
  };

  const payDebt = (id, amountToPay, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const numericPay = sanitizeFinancialAmount(amountToPay, { allowZero: false });
    if (numericPay <= 0) return;

    // Takroriy to'lovdan himoya
    if (!checkPaymentDebounce(`debt_pay_${id}`)) {
      console.warn('[Xavfsizlik] Takroriy qarz to\'lovi rad etildi:', id);
      return;
    }

    let updatedTarget = null;
    setDebts(prev => prev.map(d => {
      if (d.id === id) {
        const remainingAmount = Math.max(0, d.amount - numericPay);
        const newPaidAmount = (d.paidAmount || 0) + numericPay;
        const fullyPaid = remainingAmount === 0;

        const updatedDebt = {
          ...d,
          amount: remainingAmount,
          paidAmount: newPaidAmount,
          isPaid: fullyPaid,
          status: fullyPaid ? 'Qarz to‘landi' : 'Qisman to‘langan',
          closedDate: fullyPaid ? new Date().toISOString().split('T')[0] : d.closedDate,
          updatedAt: new Date().toISOString()
        };

        if (fullyPaid) {
          logActivity(userName, `Qarz to‘landi: ${d.name}`, `${numericPay.toLocaleString()} so‘m (To‘liq yopildi)`, 'Qarz');
        } else {
          logActivity(userName, `Qarz to‘lovi: ${d.name}`, `${numericPay.toLocaleString()} so‘m to‘landi, qolgan: ${remainingAmount.toLocaleString()} so‘m`, 'Qarz');
        }

        updatedTarget = updatedDebt;
        return updatedDebt;
      }
      return d;
    }));

    if (isSupabaseConfigured && currentStore?.id && updatedTarget) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.debts.addPayment(currentStore.id, id, {
            amount: numericPay,
            collectorName: userName,
            collectorId: currentUserId,
            updatedDebt: updatedTarget
          });
        } catch (err) {
          console.error('[Supabase payDebt]', err?.message || err);
          notifySyncEvent('error', { entity: 'debts', action: 'pay', id, message: err?.message });
        }
      })();
    }
  };

  const updateDebtAmount = (id, newTotalAmount, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const num = Number(newTotalAmount);
    let updatedTarget = null;
    setDebts(prev => prev.map(d => {
      if (d.id === id) {
        const fullyPaid = num === 0;
        const updated = {
          ...d,
          amount: Math.max(0, num),
          isPaid: fullyPaid,
          status: fullyPaid ? 'Qarz to‘landi' : (num < d.originalAmount ? 'Qisman to‘langan' : d.status),
          updatedAt: new Date().toISOString()
        };
        updatedTarget = updated;
        return updated;
      }
      return d;
    }));
    logActivity(userName, `Qarzdorlik summasi o‘zgartirildi`, `Yangi summa: ${num.toLocaleString()} so‘m`, 'Qarz');

    if (isSupabaseConfigured && currentStore?.id && updatedTarget) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.debts.upsert(currentStore.id, updatedTarget);
        } catch (err) {
          console.error('[Supabase updateDebtAmount]', err?.message || err);
          notifySyncEvent('error', { entity: 'debts', action: 'updateAmount', id, message: err?.message });
        }
      })();
    }
  };

  const updateDebt = (id, updates, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    let updatedTarget = null;
    setDebts(prev => prev.map(d => {
      if (d.id === id) {
        const updated = { ...d, ...updates, updatedAt: new Date().toISOString() };
        if ('amount' in updates) {
          const numAmount = Math.max(0, Number(updates.amount) || 0);
          updated.amount = numAmount;
          if (numAmount === 0) {
            updated.isPaid = true;
            updated.status = 'Qarz to‘landi';
            updated.closedDate = new Date().toISOString().split('T')[0];
          } else if (numAmount < (d.originalAmount || numAmount)) {
            updated.status = 'Qisman to‘langan';
            updated.isPaid = false;
          }
        }
        logActivity(userName, `Qarz ma'lumotlari tahrirlandi: ${updated.name}`, `Summa: ${Number(updated.amount).toLocaleString()} so‘m`, 'Qarz');
        updatedTarget = updated;
        return updated;
      }
      return d;
    }));

    if (isSupabaseConfigured && currentStore?.id && updatedTarget) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.debts.upsert(currentStore.id, updatedTarget);
        } catch (err) {
          console.error('[Supabase updateDebt]', err?.message || err);
          notifySyncEvent('error', { entity: 'debts', action: 'update', id, message: err?.message });
        }
      })();
    }
  };

  const deleteDebt = (id, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const d = debts.find(item => item.id === id);
    if (d) {
      logActivity(userName, `Qarz o‘chirildi: ${d.name}`, `${d.amount.toLocaleString()} so‘m`, 'Qarz');
      setDebts(prev => prev.filter(item => item.id !== id));
      if (isSupabaseConfigured && currentStore?.id) {
        (async () => {
          try {
            if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
            await svcDB.debts.delete(currentStore.id, id);
          } catch (err) {
            console.error('[Supabase debts.delete]', err?.message || err);
            notifySyncEvent('error', { entity: 'debts', action: 'delete', id, message: err?.message });
          }
        })();
      }
    }
  };
  // Expenses (Qo'shimcha xarajatlar) Actions
  const addExpense = (expenseData) => {
    const userName = currentUserName || 'Foydalanuvchi';
    const newExpense = {
      id: 'exp-' + Date.now(),
      name: expenseData.name || '',
      amount: Number(expenseData.amount) || 0,
      date: expenseData.date || getLocalDateString(),
      paymentType: expenseData.paymentType || 'Naqd',
      note: expenseData.note || '',
      createdById: currentUserId || '',
      createdByName: userName,
      storeId: currentStore?.id || activeStoreId || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setExpenses(prev => [newExpense, ...prev]);
    if (isSupabaseConfigured && newExpense.storeId) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.expenses.upsert(newExpense.storeId, newExpense);
        } catch (err) {
          console.error('[Supabase expenses.upsert]', err?.message || err);
          notifySyncEvent('error', { entity: 'expenses', action: 'insert', id: newExpense.id, message: err?.message });
        }
      })();
    }
    logActivity(userName, `Yangi xarajat kiritildi: ${newExpense.name}`, `${newExpense.amount.toLocaleString()} so'm`, 'Xarajat');
    return newExpense;
  };

  const updateExpense = (id, updates) => {
    const userName = currentUserName || 'Foydalanuvchi';
    let updatedTarget = null;
    setExpenses(prev => prev.map(e => {
      if (e.id === id) {
        const updated = { ...e, ...updates, updatedAt: new Date().toISOString() };
        updatedTarget = updated;
        return updated;
      }
      return e;
    }));
    if (isSupabaseConfigured && currentStore?.id && updatedTarget) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.expenses.upsert(currentStore.id, updatedTarget);
        } catch (err) {
          console.error('[Supabase expenses.upsert]', err?.message || err);
          notifySyncEvent('error', { entity: 'expenses', action: 'update', id, message: err?.message });
        }
      })();
    }
    logActivity(userName, `Xarajat tahrirlandi`, `${Number(updatedTarget?.amount || 0).toLocaleString()} so'm`, 'Xarajat');
  };

  const deleteExpense = (id) => {
    const userName = currentUserName || 'Foydalanuvchi';
    const e = expenses.find(item => item.id === id);
    if (e) {
      logActivity(userName, `Xarajat o'chirildi: ${e.name}`, `${e.amount.toLocaleString()} so'm`, 'Xarajat');
      setExpenses(prev => prev.filter(item => item.id !== id));
      if (isSupabaseConfigured && currentStore?.id) {
        (async () => {
          try {
            if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
            await svcDB.expenses.delete(currentStore.id, id);
          } catch (err) {
            console.error('[Supabase expenses.delete]', err?.message || err);
            notifySyncEvent('error', { entity: 'expenses', action: 'delete', id, message: err?.message });
          }
        })();
      }
    }
  };

  // Orders Actions
  const addOrder = (orderData, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const newOrder = {
      id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
      product: orderData.product,
      supplier: orderData.supplier,
      customerName: orderData.customerName || orderData.supplier,
      date: getLocalDateString(),
      qty: orderData.qty || '10 dona',
      total: Number(orderData.total) || 0,
      status: orderData.status || 'Hali yo‘lda',
      storeId: currentStore?.id || activeStoreId || ''
    };

    setOrders(prev => [newOrder, ...prev]);
    // Dual-write: Supabase async
    if (isSupabaseConfigured && newOrder.storeId) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.orders.upsert(newOrder.storeId, newOrder);
        } catch (err) {
          console.error('[Supabase orders.upsert]', err?.message || err);
          notifySyncEvent('error', { entity: 'orders', action: 'insert', id: newOrder.id, message: err?.message });
        }
      })();
    }
    logActivity(userName, `Yangi buyurtma yaratildi: ${newOrder.id}`, `${newOrder.product}: ${newOrder.total.toLocaleString()} so‘m`, 'Buyurtma');
    return newOrder;
  };

  const updateOrderStatus = (id, newStatus, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        const updated = { ...o, status: newStatus, updatedAt: new Date().toISOString() };
        logActivity(userName, `${o.id} buyurtma holati o‘zgartirildi`, `${o.status} → ${newStatus}`, 'Buyurtma');
        return updated;
      }
      return o;
    }));

    if (isSupabaseConfigured && currentStore?.id) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.orders.updateStatus(currentStore.id, id, newStatus);
        } catch (err) {
          console.error('[Supabase updateOrderStatus]', err?.message || err);
          notifySyncEvent('error', { entity: 'orders', action: 'updateStatus', id, message: err?.message });
        }
      })();
    }

    // Sync to storefront orders in localStorage if applicable
    try {
      const rawStoreOrders = localStorage.getItem('savatchi_orders');
      if (rawStoreOrders) {
        const parsed = JSON.parse(rawStoreOrders);
        const mapped = parsed.map(o => o.id === id ? { ...o, status: newStatus } : o);
        localStorage.setItem('savatchi_orders', JSON.stringify(mapped));
        window.dispatchEvent(new CustomEvent('savatchi_order_status_updated', { detail: { id, status: newStatus } }));
      }
    } catch (e) {}
  };

  const deleteOrder = (id, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const o = orders.find(item => item.id === id);
    if (o) {
      logActivity(userName, `Buyurtma o‘chirildi: ${o.id}`, `${o.product}`, 'Buyurtma');
      setOrders(prev => prev.filter(item => item.id !== id));

      if (isSupabaseConfigured && currentStore?.id) {
        (async () => {
          try {
            if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
            await svcDB.orders.delete(currentStore.id, id);
          } catch (err) {
            console.error('[Supabase deleteOrder]', err?.message || err);
            notifySyncEvent('error', { entity: 'orders', action: 'delete', id, message: err?.message });
          }
        })();
      }

      // Sync deletion to storefront orders in localStorage if applicable
      try {
        const rawStoreOrders = localStorage.getItem('savatchi_orders');
        if (rawStoreOrders) {
          const parsed = JSON.parse(rawStoreOrders);
          const filtered = parsed.filter(item => item.id !== id);
          localStorage.setItem('savatchi_orders', JSON.stringify(filtered));
          window.dispatchEvent(new CustomEvent('savatchi_order_deleted', { detail: { id } }));
        }
      } catch (e) {}
    }
  };
  const cleanAndFixOrders = (userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const report = fixAllOrders(localStorage);
    try {
      if (currentStore?.id) {
        const userOrdersKey = getOrdersKey(currentUserId, currentStore.id);
        const savedO = localStorage.getItem(userOrdersKey) || (currentStore?.ownerId === currentUserId ? localStorage.getItem(ORDERS_KEY + currentStore.id) : null);
        if (savedO) {
          const parsed = JSON.parse(savedO);
          if (Array.isArray(parsed)) {
            // Mavjud ma'lumotlarni o'chirmasdan, buyurtmaning joriy do'konga tegishliligini tekshirish va biriktirish
            const validStoreOrders = parsed.filter(o => !o.storeId || o.storeId === currentStore.id).map(o => ({
              ...o,
              storeId: currentStore.id
            }));
            setOrders(validStoreOrders);
            if (currentUserId) {
              localStorage.setItem(userOrdersKey, JSON.stringify(validStoreOrders));
            }
          }
        }
      }
    } catch (e) {}
    logActivity(userName, 'Buyurtmalar normallashtirildi', `Jami: ${report.totalInspected}, tuzatildi: ${report.totalFixed}`, 'Buyurtma');
    return report;
  };

  // Employees Actions (Max 7 slots rule)
  const addEmployee = (employeeData, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    if (employees.length >= 7) {
      throw new Error("Maksimal 7 ta xodim kiritish mumkin!");
    }

    // QOIDA 3: Do'kon egasini xodim sifatida qo'shib bo'lmaydi
    if (isAccountStoreOwner(employeeData)) {
      throw new Error("Ushbu foydalanuvchi allaqachon do‘kon egasi hisoblanadi va xodim sifatida qo‘shilishi mumkin emas!");
    }

    // Dublikat akkauntni oldini olish
    const isDuplicate = employees.some(e => {
      const eEmail = (e.email || '').trim().toLowerCase();
      const newEmail = (employeeData.email || '').trim().toLowerCase();
      if (eEmail && newEmail && eEmail === newEmail) return true;

      const ePhoneDigits = (e.phone || '').replace(/\D/g, '');
      const newPhoneDigits = (employeeData.phone || '').replace(/\D/g, '');
      if (ePhoneDigits && newPhoneDigits && ePhoneDigits.length >= 7 && (ePhoneDigits === newPhoneDigits || ePhoneDigits.endsWith(newPhoneDigits) || newPhoneDigits.endsWith(ePhoneDigits))) return true;

      if (e.accountId && employeeData.accountId && e.accountId === employeeData.accountId) return true;
      return false;
    });

    if (isDuplicate) {
      throw new Error("Bu akkaunt allaqachon xodimlar ro‘yxatida.");
    }

    const newEmp = {
      id: 'emp-' + Date.now(),
      accountId: employeeData.accountId || null,
      name: employeeData.name,
      email: employeeData.email,
      phone: employeeData.phone || '+998 90 000 00 00',
      role: employeeData.role || 'Sotuvchi',
      status: 'Faol',
      avatar: employeeData.avatar || (employeeData.name ? employeeData.name.charAt(0).toUpperCase() : 'X'),
      photoURL: employeeData.photoURL || null,
      bg: employeeData.bg || 'bg-blue-600',
      lastActivity: 'Hozir faol',
      storeId: currentStore?.id || activeStoreId || ''
    };

    setEmployees(prev => [...prev, newEmp]);
    logActivity(userName, `Yangi xodim qo‘shildi: ${newEmp.name}`, `Lavozim: ${newEmp.role}`, 'Xodimlar');

    // Faol xodim qo'shilgach, do'kon egasining roli "Do‘kon egasi" bo'ladi
    if (isOwner && authUser?.id) {
      updateUserRoleInSystem(authUser.id, "Do‘kon egasi");
      if (authUser.email) updateUserRoleInSystem(authUser.email, "Do‘kon egasi");
      if (updateUserProfile) {
        updateUserProfile({ role: "Do‘kon egasi" });
      }
    }

    return newEmp;
  };

  const deleteEmployee = (id, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    // Ruxsat tekshiruvi: faqat do'kon egasi xodimlarni o'chirish huquqiga ega
    if (!isOwner) {
      throw new Error("Xodimlarni o‘chirish faqat do‘kon egasi uchun ruxsat etilgan!");
    }

    // Do'kon egasini xodim sifatida o'chirib yuborishning qat'iy oldini olish
    const myId = String(authUser?.id || authUser?.uid || currentUserId || '').trim();
    const myEmail = (authUser?.email || '').trim().toLowerCase();
    const storeOwnId = String(currentStore?.ownerId || '').trim();
    const storeOwnEmail = (currentStore?.ownerEmail || '').trim().toLowerCase();

    const empId = String(emp.accountId || emp.userId || emp.id || '').trim();
    const empEmail = (emp.email || '').trim().toLowerCase();

    if (
      (myId && empId && myId === empId) ||
      (myEmail && empEmail && myEmail === empEmail) ||
      (storeOwnId && empId && storeOwnId === empId) ||
      (storeOwnEmail && empEmail && storeOwnEmail === empEmail)
    ) {
      throw new Error("Do‘kon egasini xodimlar ro‘yxatidan o‘chirib bo‘lmaydi!");
    }

    logActivity(userName, `Xodim o‘chirildi: ${emp.name}`, `Do‘kon xodimlari ro‘yxatidan olib tashlandi`, 'Xodimlar');

    const filtered = employees.filter(e => e.id !== id);
    setEmployees(filtered);

    // 1. Storage ga saqlash
    if (currentStore?.id) {
      saveStoreEmployeesToStorage(currentStore.id, filtered);
      try {
        if (currentUserId) {
          localStorage.setItem(getEmployeesKey(currentUserId, currentStore.id), JSON.stringify(filtered));
        }
      } catch (err) {}
    }

    // 2. Qayta tiklanishdan himoya qilish (O'chirilganlar ro'yxatiga qo'shish)
    // Owner-Wide (2.0): Owner'ga tegishli barcha do'konlardagi deleted listga yozish
    try {
      const delEntry = {
        id: emp.id,
        accountId: emp.accountId || null,
        email: emp.email || '',
        name: emp.name || '',
        deletedAt: new Date().toISOString()
      };
      // Hozirgi faol do'kon uchun
      if (currentStore?.id) {
        const delKey = `savatchi_deleted_employees_${currentStore.id}`;
        const rawDel = localStorage.getItem(delKey);
        let delList = rawDel ? JSON.parse(rawDel) : [];
        if (!Array.isArray(delList)) delList = [];
        if (!delList.some(d => d.email === delEntry.email)) {
          delList.push(delEntry);
          localStorage.setItem(delKey, JSON.stringify(delList));
        }
      }
      // Owner'ga tegishli boshqa do'konlarga ham o'chirilganlik belgisi qo'yish
      const ownedStoreIds = userStores
        .filter(s => !s.isEmployeeStore && s.role !== 'Xodim')
        .map(s => s.id)
        .filter(sid => sid && sid !== currentStore?.id);
      ownedStoreIds.forEach(sid => {
        try {
          const dk = `savatchi_deleted_employees_${sid}`;
          const rd = localStorage.getItem(dk);
          let dl = rd ? JSON.parse(rd) : [];
          if (!Array.isArray(dl)) dl = [];
          if (!dl.some(d => d.email === delEntry.email)) {
            dl.push(delEntry);
            localStorage.setItem(dk, JSON.stringify(dl));
          }
        } catch (e2) {}
      });
    } catch (err) {}

    // 3. Pochta takliflarini yangilash (Qabul qilindi -> O'chirilgan holatga o'tkazish)
    try {
      if (currentStore?.id) {
        deactivateStoreEmployeeInvitations(currentStore.id, emp);
      }
    } catch (err) {}

    // 3.1. Supabase Cloud RPC orqali xodimni o'chirish
    //      remove_store_employee_rpc Owner-Wide modelda barcha do'konlardan o'chiradi
    try {
      if (currentStore?.id) {
        removeStoreEmployeeCloud(currentStore.id, emp).catch(() => {});
      }
    } catch (err) {}

    // 4. O'chirilgan xodimning tizimdagi rolini "Foydalanuvchi"ga o'tkazish
    const empAccountIdentifier = emp.accountId || emp.email;
    if (empAccountIdentifier) {
      updateUserRoleInSystem(empAccountIdentifier, "Foydalanuvchi");
    }

    // 5. Agar barcha faol xodimlar o'chirilgan bo'lsa, do'kon egasining roli "Foydalanuvchi"ga o'zgartiriladi (Talab 2)
    const remainingActive = filtered.filter(e => e.status === 'Faol');
    if (remainingActive.length === 0 && authUser?.id) {
      updateUserRoleInSystem(authUser.id, "Foydalanuvchi");
      if (authUser.email) updateUserRoleInSystem(authUser.email, "Foydalanuvchi");
      if (updateUserProfile) {
        updateUserProfile({ role: "Foydalanuvchi" });
      }
    }
  };

  const updateEmployeeRole = (id, newRole, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const roleText = (newRole || '').trim();
    if (!roleText) {
      throw new Error("Rol nomi bo‘sh bo‘lishi mumkin emas!");
    }

    setEmployees(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, role: roleText } : e);
      try {
        if (currentStore?.id && currentUserId) {
          localStorage.setItem(getEmployeesKey(currentUserId, currentStore.id), JSON.stringify(updated));
        }
      } catch (err) {}
      return updated;
    });

    logActivity(userName, `Xodim roli yangilandi`, `Yangi rol: ${roleText}`, 'Xodimlar');
  };

  // Rentals Actions (Faqat ruxsat berilgan 4 ta do'kon turi uchun)
  const addRental = (rentalData, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const currentType = currentStore?.type || storeConfig.id;
    if (!isRentalSupportedStoreType(currentType)) {
      throw new Error("Ushbu do‘kon turida ijara (arenda) xizmati mavjud emas.");
    }

    const targetProduct = products.find(p => p.id === rentalData.productId);
    if (!targetProduct) {
      throw new Error("Ijaraga beriladigan mahsulot ombordan topilmadi.");
    }

    const requestedQty = Number(rentalData.qty) || 1;
    if (requestedQty <= 0) {
      throw new Error("Ijara miqdori 0 dan katta bo‘lishi kerak.");
    }

    if (requestedQty > (Number(targetProduct.stock) || 0)) {
      throw new Error(`Omborda yetarli mahsulot mavjud emas! Hozirda mavjud: ${targetProduct.stock} ${targetProduct.unit || 'dona'}`);
    }

    const feeNum = Number(rentalData.rentalFee) || 0;
    if (feeNum < 0) {
      throw new Error("Ijara haqi manfiy bo‘lishi mumkin emas.");
    }

    const paidNum = Math.min(feeNum, Math.max(0, Number(rentalData.paidAmount) || 0));
    const remainingNum = Math.max(0, feeNum - paidNum);

    const newRental = {
      id: 'rnt-' + Date.now(),
      storeId: currentStore.id,
      storeType: currentStore.type,
      customerId: rentalData.customerId || ('cust-' + Date.now()),
      customerName: (rentalData.customerName || '').trim() || 'Noma\'lum mijoz',
      customerPhone: (rentalData.customerPhone || '').trim() || '+998 90 000 00 00',
      productId: targetProduct.id,
      productName: targetProduct.name,
      productEmoji: targetProduct.emoji || '📦',
      qty: requestedQty,
      unit: targetProduct.unit || 'dona',
      startDate: rentalData.startDate || getLocalDateString(),
      endDate: rentalData.endDate,
      rentalFee: feeNum,
      paidAmount: paidNum,
      remainingAmount: remainingNum,
      status: 'Faol',
      notes: (rentalData.notes || '').trim(),
      createdAt: new Date().toISOString(),
      userId: currentUserId,
      creatorName: userName,
      payments: paidNum > 0 ? [
        {
          id: 'pay-' + Date.now(),
          amount: paidNum,
          date: getLocalDateString(),
          time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
          type: rentalData.paymentType || 'Naqd',
          recordedBy: userName
        }
      ] : []
    };

    // Ombordan band qilish (ijaraga ketgan miqdor zaxiradan kamaytiriladi)
    adjustStock(targetProduct.id, -requestedQty, userName);

    setRentals(prev => [newRental, ...prev]);
    // Dual-write: Supabase async
    if (isSupabaseConfigured && newRental.storeId) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.rentals.upsert(newRental.storeId, newRental);
        } catch (err) {
          console.error('[Supabase rentals.upsert]', err?.message || err);
          notifySyncEvent('error', { entity: 'rentals', action: 'insert', id: newRental.id, message: err?.message });
        }
      })();
    }

    logActivity(
      userName,
      `Yangi ijara berildi`,
      `${newRental.productName} (${newRental.qty} ${newRental.unit}) — ${newRental.customerName}`,
      'Ijara'
    );

    return newRental;
  };

  const updateRentalStatus = (id, newStatus, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const rental = rentals.find(r => r.id === id);
    if (!rental) {
      throw new Error("Ijara yozuvi topilmadi.");
    }

    if (rental.status === newStatus) return rental;

    const oldStatus = rental.status;
    const targetProduct = products.find(p => p.id === rental.productId);

    if (newStatus === 'Qaytarilgan' && oldStatus !== 'Qaytarilgan') {
      if (targetProduct) {
        adjustStock(targetProduct.id, rental.qty, userName);
      }
    } else if (oldStatus === 'Qaytarilgan' && (newStatus === 'Faol' || newStatus === 'Muddati o‘tgan')) {
      if (!targetProduct || (Number(targetProduct.stock) || 0) < rental.qty) {
        throw new Error(`Omborda yetarli mahsulot mavjud emas! (Mavjud: ${targetProduct?.stock || 0})`);
      }
      adjustStock(targetProduct.id, -rental.qty, userName);
    }

    const updatedRental = {
      ...rental,
      status: newStatus,
      returnedDate: newStatus === 'Qaytarilgan' ? getLocalDateString() : null,
      updatedAt: new Date().toISOString()
    };

    setRentals(prev => prev.map(r => r.id === id ? updatedRental : r));

    if (isSupabaseConfigured && currentStore?.id) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.rentals.updateStatus(currentStore.id, id, newStatus, updatedRental.returnedDate);
        } catch (err) {
          console.error('[Supabase updateRentalStatus]', err?.message || err);
          notifySyncEvent('error', { entity: 'rentals', action: 'updateStatus', id, message: err?.message });
        }
      })();
    }

    logActivity(
      userName,
      `Ijara holati o‘zgartirildi`,
      `${rental.productName} (${rental.customerName}): ${oldStatus} → ${newStatus}`,
      'Ijara'
    );

    return updatedRental;
  };

  const addRentalPayment = (id, amount, paymentType = 'Naqd', userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const payNum = Number(amount);
    if (isNaN(payNum) || payNum <= 0) {
      throw new Error("To‘lov summasi 0 dan katta bo‘lishi kerak.");
    }

    const rental = rentals.find(r => r.id === id);
    if (!rental) {
      throw new Error("Ijara topilmadi.");
    }

    if (rental.remainingAmount <= 0) {
      throw new Error("Ushbu ijara bo‘yicha to‘lov allaqachon to‘liq yopilgan.");
    }

    const actualPay = Math.min(payNum, rental.remainingAmount);
    const newPaidAmount = rental.paidAmount + actualPay;
    const newRemainingAmount = Math.max(0, rental.rentalFee - newPaidAmount);

    const newPaymentRecord = {
      id: 'pay-' + Date.now(),
      amount: actualPay,
      date: getLocalDateString(),
      time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      type: paymentType || 'Naqd',
      recordedBy: userName
    };

    const updatedRental = {
      ...rental,
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      payments: [newPaymentRecord, ...(rental.payments || [])],
      updatedAt: new Date().toISOString()
    };

    setRentals(prev => prev.map(r => r.id === id ? updatedRental : r));

    if (isSupabaseConfigured && currentStore?.id) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.rentals.upsert(currentStore.id, updatedRental);
        } catch (err) {
          console.error('[Supabase addRentalPayment]', err?.message || err);
          notifySyncEvent('error', { entity: 'rentals', action: 'addPayment', id, message: err?.message });
        }
      })();
    }

    logActivity(
      userName,
      `Ijara to‘lovi qabul qilindi`,
      `${rental.customerName}: ${actualPay.toLocaleString()} so‘m (${paymentType})`,
      'Ijara'
    );

    return updatedRental;
  };

  const deleteRental = (id, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const rental = rentals.find(r => r.id === id);
    if (rental) {
      if (rental.status !== 'Qaytarilgan') {
        const prod = products.find(p => p.id === rental.productId);
        if (prod) {
          adjustStock(prod.id, rental.qty, userName);
        }
      }
      setRentals(prev => prev.filter(r => r.id !== id));

      if (isSupabaseConfigured && currentStore?.id) {
        (async () => {
          try {
            if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
            await svcDB.rentals.delete(currentStore.id, id);
          } catch (err) {
            console.error('[Supabase deleteRental]', err?.message || err);
            notifySyncEvent('error', { entity: 'rentals', action: 'delete', id, message: err?.message });
          }
        })();
      }

      logActivity(userName, `Ijara yozuvi o‘chirildi`, `${rental.productName} — ${rental.customerName}`, 'Ijara');
    }
  };
  // ─── Installments Actions ──────────────────────────────────────────────────
  const addInstallmentContract = (contractData, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';

    const items = contractData.items || [];
    if (!items.length) {
      throw new Error("Kamida bitta mahsulot tanlanishi shart.");
    }

    // Omborda zaxirani tekshirish
    for (const item of items) {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) {
        throw new Error(`"${item.name || 'Mahsulot'}" omborda topilmadi.`);
      }
      const neededQty = Number(item.qty) || 1;
      const availableStock = Number(prod.stock) || 0;
      if (availableStock < neededQty) {
        throw new Error(`"${prod.name}" uchun omborda yetarli miqdor yo‘q (Mavjud: ${prod.stock} ${prod.unit || 'dona'}, so‘ralgan: ${neededQty}).`);
      }
    }

    const summary = calculateInstallmentSummary({
      items,
      discount: contractData.discount || 0,
      downPayment: contractData.downPayment || 0
    });

    const schedule = generateInstallmentSchedule({
      remainingPrincipal: summary.remainingPrincipal,
      paymentCount: contractData.paymentCount || 3,
      frequency: contractData.frequency || 'monthly',
      firstPaymentDate: contractData.firstPaymentDate || getLocalDateString()
    });

    const contractId = `INS-${Date.now().toString().slice(-6)}`;
    const contractNumber = `SH-${Date.now().toString().slice(-4)}`;

    const payments = [];
    if (summary.downPayment > 0) {
      payments.push({
        id: `pay-${Date.now()}-dp`,
        contractId,
        amount: summary.downPayment,
        date: getLocalDateString(),
        paymentMethod: contractData.paymentMethod || 'Naqd',
        note: 'Boshlang‘ich to‘lov',
        collectedBy: userName,
        collectedById: currentUserId,
        createdAt: new Date().toISOString()
      });
    }

    const newContract = {
      id: contractId,
      contractNumber: contractData.contractNumber || contractNumber,
      storeId: currentStore.id,
      storeType: currentStore.type,
      customerId: contractData.customerId || `cust-${Date.now()}`,
      customerName: (contractData.customerName || '').trim(),
      customerPhone: (contractData.customerPhone || '').trim(),
      items: items.map(it => ({
        productId: it.productId,
        name: it.name,
        price: Number(it.price) || 0,
        qty: Number(it.qty) || 1,
        unit: it.unit || 'dona',
        size: it.size || '',
        color: it.color || '',
        gender: it.gender || '',
        category: it.category || '',
        total: (Number(it.price) || 0) * (Number(it.qty) || 1)
      })),
      productsSummary: items.map(it => {
        const specs = [it.size, it.color].filter(Boolean).join(', ');
        const specStr = specs ? ` [${specs}]` : '';
        return `${it.name}${specStr} (${it.qty} ${it.unit || 'dona'})`;
      }).join(', '),
      subtotal: summary.subtotal,
      discount: summary.discount,
      totalAmount: summary.totalAmount,
      downPayment: summary.downPayment,
      totalPaid: summary.downPayment,
      remainingAmount: summary.remainingPrincipal,
      paymentCount: contractData.paymentCount || 3,
      frequency: contractData.frequency || 'monthly',
      firstPaymentDate: contractData.firstPaymentDate || getLocalDateString(),
      schedule,
      payments,
      notes: contractData.notes || '',
      status: 'active',
      createdByName: userName,
      createdById: currentUserId,
      createdAt: getLocalDateString(),
      updatedAt: new Date().toISOString()
    };

    newContract.status = computeContractStatus(newContract);

    // Ombordan mahsulot miqdorini bir marta kamaytirish va tannarxni hisoblash
    let contractCost = 0;
    let hasAllCosts = true;
    for (const item of items) {
      adjustStock(item.productId, -Number(item.qty), userName);
      const pr = products.find(p => p.id === item.productId);
      if (pr && pr.costPrice !== undefined && pr.costPrice !== null && !isNaN(Number(pr.costPrice))) {
        contractCost += Number(pr.costPrice) * (Number(item.qty) || 1);
      } else {
        hasAllCosts = false;
      }
    }

    // Tovar shartnomasi bo'yicha tovar realizatsiyasi tushumi, tovarlar soni va tannarx 1 marta hisobga olinadi
    addSale({
      productName: `Muddatli savdo: ${newContract.contractNumber} (${newContract.customerName})`,
      qty: 1,
      price: summary.totalAmount,
      total: summary.totalAmount,
      costPrice: hasAllCosts ? contractCost : null,
      paymentType: 'Nasiya',
      saleType: 'installment_contract',
      isDebtCollection: false,
      contractId: newContract.id,
      seller: userName
    }, userName);

    // Boshlang'ich to'lov bo'lsa KASSA KIRIMI (Debt Collection) sifatida yozish (tovar savdosi emas!)
    if (summary.downPayment > 0) {
      addSale({
        productName: `Muddatli to‘lov qabuli (Boshlang‘ich): ${newContract.contractNumber} (${newContract.customerName})`,
        qty: 0,
        price: summary.downPayment,
        total: summary.downPayment,
        costPrice: 0,
        paymentType: contractData.paymentMethod || 'Naqd',
        saleType: 'installment_payment',
        isDebtCollection: true,
        contractId: newContract.id,
        seller: userName
      }, userName);
    }

    setInstallments(prev => [newContract, ...prev]);
    // Dual-write: Supabase async
    if (isSupabaseConfigured && newContract.storeId) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.installmentContracts.upsert(newContract.storeId, newContract);
        } catch (err) {
          console.error('[Supabase installments.upsert]', err?.message || err);
          notifySyncEvent('error', { entity: 'installments', action: 'insert', id: newContract.id, message: err?.message });
        }
      })();
    }

    logActivity(
      userName,
      `Yangi muddatli savdo: ${newContract.contractNumber}`,
      `${newContract.customerName}: ${newContract.totalAmount.toLocaleString()} so‘m (Qoldiq: ${newContract.remainingAmount.toLocaleString()} so‘m)`,
      'Muddatli to‘lov'
    );

    return newContract;
  };

  const addInstallmentPayment = (contractId, paymentData, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const contract = installments.find(c => c.id === contractId);
    if (!contract) {
      throw new Error("Shartnoma topilmadi.");
    }
    if (contract.status === 'cancelled') {
      throw new Error("Bekor qilingan shartnomaga to‘lov qabul qilib bo‘lmaydi.");
    }
    if (contract.remainingAmount <= 0) {
      throw new Error("Shartnoma bo‘yicha to‘lov to‘liq yopilgan.");
    }

    const { updatedContract, newPayment } = applyPaymentToContract(contract, {
      ...paymentData,
      collectedBy: userName,
      collectedById: currentUserId
    });

    if (!newPayment) {
      throw new Error("Noto‘g‘ri to‘lov summasi.");
    }

    updatedContract.updatedAt = new Date().toISOString();
    setInstallments(prev => prev.map(c => c.id === contractId ? updatedContract : c));

    // Pul tushumi sifatida savdo tizimiga yozish
    addSale({
      productName: `Muddatli to‘lov qabuli: ${contract.contractNumber} (${contract.customerName})`,
      qty: 0,
      price: newPayment.amount,
      total: newPayment.amount,
      costPrice: 0,
      paymentType: newPayment.paymentMethod,
      saleType: 'installment_payment',
      isDebtCollection: true,
      contractId: contract.id,
      seller: userName
    }, userName);

    if (isSupabaseConfigured && currentStore?.id) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.installmentContracts.addPayment(currentStore.id, contractId, {
            amount: newPayment.amount,
            paymentMethod: newPayment.paymentMethod,
            date: newPayment.date,
            collectedBy: userName,
            collectedById: currentUserId,
            updatedContract
          });
        } catch (err) {
          console.error('[Supabase addInstallmentPayment]', err?.message || err);
          notifySyncEvent('error', { entity: 'installments', action: 'addPayment', id: contractId, message: err?.message });
        }
      })();
    }

    logActivity(
      userName,
      `Muddatli to‘lov qabul qilindi`,
      `${contract.customerName} (${contract.contractNumber}): ${newPayment.amount.toLocaleString()} so‘m (${newPayment.paymentMethod})`,
      'Muddatli to‘lov'
    );

    return updatedContract;
  };

  const cancelInstallmentContract = (contractId, reason, returnToStock = false, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const contract = installments.find(c => c.id === contractId);
    if (!contract) {
      throw new Error("Shartnoma topilmadi.");
    }

    if (returnToStock && Array.isArray(contract.items)) {
      for (const item of contract.items) {
        if (item.productId) {
          adjustStock(item.productId, Number(item.qty) || 1, userName);
        }
      }
    }

    const updatedContract = {
      ...contract,
      status: 'cancelled',
      cancelReason: reason || 'Sabab ko‘rsatilmadi',
      returnedToStock: !!returnToStock,
      cancelledAt: new Date().toISOString(),
      cancelledByName: userName,
      cancelledById: currentUserId,
      updatedAt: new Date().toISOString()
    };

    setInstallments(prev => prev.map(c => c.id === contractId ? updatedContract : c));

    setSales(prev => prev.map(s => {
      if (s.contractId === contractId) {
        return { ...s, isReturned: true, status: 'Bekor qilingan' };
      }
      return s;
    }));

    if (isSupabaseConfigured && currentStore?.id) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.installmentContracts.upsert(currentStore.id, updatedContract);
        } catch (err) {
          console.error('[Supabase cancelInstallmentContract]', err?.message || err);
          notifySyncEvent('error', { entity: 'installments', action: 'cancel', id: contractId, message: err?.message });
        }
      })();
    }

    logActivity(
      userName,
      `Shartnoma bekor qilindi`,
      `${contract.contractNumber} — ${contract.customerName} (Sabab: ${reason || 'Ko‘rsatilmadi'}${returnToStock ? ', Mahsulotlar omborga qaytarildi' : ''})`,
      'Muddatli to‘lov'
    );

    return updatedContract;
  };
  const restoreInstallmentContract = (contractId, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const contract = installments.find(c => c.id === contractId);
    if (!contract) {
      throw new Error("Shartnoma topilmadi.");
    }
    if (contract.status !== 'cancelled') {
      throw new Error("Faqat bekor qilingan shartnomani qayta tiklash mumkin.");
    }

    const wasReturnedToStock = !!contract.returnedToStock;

    // 1. Agar bekor qilishda mahsulotlar omborga qaytarilgan bo'lsa, omborda yetarli qoldiq borligini tekshirish
    if (wasReturnedToStock && Array.isArray(contract.items)) {
      for (const item of contract.items) {
        if (item.productId) {
          const prod = products.find(p => p.id === item.productId);
          const reqQty = Number(item.qty) || 1;
          const currentStock = prod ? (Number(prod.stock) || 0) : 0;
          if (!prod || currentStock < reqQty) {
            throw new Error(
              `Omborda mahsulot yetarli emas: "${item.name}" mahsulotidan omborda ${currentStock} ta qolgan, shartnomani tiklash uchun esa ${reqQty} ta zarur. Qayta tiklash bekor qilindi.`
            );
          }
        }
      }

      // Ombordagi qoldiq to'liq tekshirilgach, shartnomadagi mahsulotlarning aynan o'sha miqdori ombordan ayriladi
      for (const item of contract.items) {
        if (item.productId) {
          const reqQty = Number(item.qty) || 1;
          adjustStock(item.productId, -reqQty, userName);
        }
      }
    }

    // 2. Shartnomani tegishli holatga qaytarish (mahsulotlar, to'lovlar, qarz va jadval to'liq saqlanadi)
    const baseContract = {
      ...contract,
      status: 'active',
      returnedToStock: false,
      restoredAt: new Date().toISOString(),
      restoredByName: userName,
      restoredById: currentUserId,
      updatedAt: new Date().toISOString()
    };

    const properStatus = computeContractStatus(baseContract, getLocalDateString());
    const restoredContract = {
      ...baseContract,
      status: properStatus
    };

    setInstallments(prev => prev.map(c => c.id === contractId ? restoredContract : c));

    // Shartnomaga oid savdo va to'lovlarni qayta faollashtirish
    setSales(prev => prev.map(s => {
      if (s.contractId === contractId) {
        const copy = { ...s };
        delete copy.isReturned;
        delete copy.status;
        return copy;
      }
      return s;
    }));

    if (isSupabaseConfigured && currentStore?.id) {
      (async () => {
        try {
          if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
          await svcDB.installmentContracts.upsert(currentStore.id, restoredContract);
        } catch (err) {
          console.error('[Supabase restoreInstallmentContract]', err?.message || err);
          notifySyncEvent('error', { entity: 'installments', action: 'restore', id: contractId, message: err?.message });
        }
      })();
    }

    logActivity(
      userName,
      `Shartnoma qayta tiklandi`,
      `${contract.contractNumber} — ${contract.customerName} (${properStatus.toUpperCase()}${wasReturnedToStock ? ', Mahsulotlar ombordan ajratildi' : ''})`,
      'Muddatli to‘lov'
    );

    return restoredContract;
  };

  const deleteInstallmentContract = (contractId, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const contract = installments.find(c => c.id === contractId);
    if (contract) {
      setInstallments(prev => prev.filter(c => c.id !== contractId));
      if (isSupabaseConfigured && currentStore?.id) {
        (async () => {
          try {
            if (ensureStoreFnRef.current) await ensureStoreFnRef.current();
            await svcDB.installmentContracts.delete(currentStore.id, contractId);
          } catch (err) {
            console.error('[Supabase deleteInstallmentContract]', err?.message || err);
            notifySyncEvent('error', { entity: 'installments', action: 'delete', id: contractId, message: err?.message });
          }
        })();
      }
      logActivity(
        userName,
        `Muddatli to‘lov yozuvi o‘chirildi`,
        `${contract.contractNumber} — ${contract.customerName}`,
        'Muddatli to‘lov'
      );
    }
  };

  // Sync Action
  const syncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      const now = new Date();
      setLastSyncTime(`${now.getDate()}-avgust ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      logActivity(currentUserName, `Ma'lumotlar sinxronlandi`, `Bulut serveri bilan muvaffaqiyatli bog‘landi`, 'Sinxron');
    }, 1000);
  };

  // Stats calculation
  const activeDebtsList = debts.filter(d => !d.isPaid && (Number(d.amount) || 0) > 0);
  const paidDebtsList = debts.filter(d => d.isPaid || (Number(d.amount) || 0) === 0);
  const totalSalesAmount = sales
    .filter(s => s && !isReturnedSale(s) && !isDebtCollectionSale(s))
    .reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalDebtsAmount = activeDebtsList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalDebts = totalDebtsAmount;
  // Mahsulotlar soni: mahsulot pozitsiyalari/turlari soni (har bir mahsulot nomi/pozitsiyasi = 1 ta mahsulot)
  const totalInventoryCount = products.length;
  const totalInventoryValue = products.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0);
  const pendingOrdersCount = orders.filter(o => o.status === 'Hali yo‘lda').length;
  const deliveredOrdersCount = orders.filter(o => o.status === 'Yetkazildi').length;

  // === ROLE COMPUTATION: isOwner / isEmployee / unassigned ===
  const OWNER_ROLES = ["Do'kon egasi", 'Magazin egasi', 'Admin', 'Do‘kon egasi'];
  const EMPLOYEE_ROLES = ['Xodim', 'Kassir', 'Omborchi', 'Menejer', 'Sotuvchi', 'Katta sotuvchi'];

  // 1. Joriy do'kondagi a'zolik tekshiruvi (xodimlar ro'yxatida mavjudlik)
  const currentEmpRecord = useMemo(() => {
    if (!authUser) return null;
    return employees.find(e =>
      e.status === 'Faol' && (
        (authUser.id && (e.accountId === authUser.id || e.id === authUser.id || e.userId === authUser.id)) ||
        (authUser.email && e.email && e.email.trim().toLowerCase() === authUser.email.trim().toLowerCase())
      )
    ) || null;
  }, [authUser, employees]);

  // 2. Do'kon egasi: Haqiqiy do'kon egasini aniqlash (Step 2 talabi)
  const isOwner = useMemo(() => {
    if (!authUser) return false;

    const myId = String(authUser.id || authUser.uid || '').trim();
    const myEmail = (authUser.email || '').trim().toLowerCase();
    const storeOwnerId = String(currentStore?.ownerId || '').trim();
    const storeOwnerEmail = (currentStore?.ownerEmail || '').trim().toLowerCase();

    // 1) Agar do'konda aniq boshqa ownerId yoki ownerEmail ko'rsatilgan bo'lsa va u menga mos kelmasa
    if (storeOwnerId && myId && storeOwnerId !== myId && (!storeOwnerEmail || storeOwnerEmail !== myEmail)) {
      return false;
    }
    if (storeOwnerEmail && myEmail && storeOwnerEmail !== myEmail && (!storeOwnerId || storeOwnerId !== myId)) {
      return false;
    }

    // 2) Agar do'konda ownerId mening ID'imga yoki emailimga mos kelsa:
    if ((storeOwnerId && myId && storeOwnerId === myId) || (storeOwnerEmail && myEmail && storeOwnerEmail === myEmail)) {
      return true;
    }

    // 3) Agar joriy do'konda xodimlik rekordi bo'lsa (boshqa odamning do'konida taklif qabul qilingan bo'lsa):
    if (currentEmpRecord && currentEmpRecord.role !== "Do'kon egasi" && currentEmpRecord.role !== "Do‘kon egasi") {
      return false;
    }

    // 4) Agar authUser roli do'kon egasi bo'lsa:
    if (authUser.role && OWNER_ROLES.includes(authUser.role)) {
      return true;
    }

    // 5) Default / fallback: Savatchi ilovasidagi shaxsiy do'konlar (userStores) do'kon egasiga tegishli
    const isMyStore = userStores.some(s => s.id === currentStore.id && !s.isEmployeeStore && s.role !== 'Xodim');
    if (isMyStore && !currentEmpRecord) {
      return true;
    }

    return false;
  }, [authUser, currentStore, userStores, currentEmpRecord]);

  // 3. Xodim: Egasi bo'lmagan, joriy do'konda xodim bo'lib ishlayotgan yoki roli Xodim bo'lgan foydalanuvchi
  const isEmployee = useMemo(() => {
    if (!authUser) return false;
    if (isOwner) return false; // Do'kon egasi xodim bo'la olmaydi
    if (currentEmpRecord) return true;
    if (currentStore?.isEmployeeStore || currentStore?.role === 'Xodim') return true;
    if (authUser.role && (EMPLOYEE_ROLES.includes(authUser.role) || authUser.role.toLowerCase() === 'xodim')) {
      return true;
    }
    return false;
  }, [authUser, isOwner, currentEmpRecord, currentStore?.isEmployeeStore, currentStore?.role]);

  // 3.5. Unassigned: Na egasi, na xodim — oddiy foydalanuvchi
  const isUnassigned = useMemo(() => {
    if (!authUser) return false;
    return !isOwner && !isEmployee;
  }, [authUser, isOwner, isEmployee]);

  // 3.6 Cloud Store Persistence & Assurance
  const ensureCurrentStoreInCloud = useCallback(async () => {
    if (!isSupabaseConfigured || !currentStore?.id || !currentUserId || !isValidUUID(currentUserId)) {
      return false;
    }
    // Only owner should ensure/upsert store in Cloud!
    // Employee MUST NEVER create or modify store ownership in Cloud!
    if (!isOwner || isEmployee) {
      return false;
    }
    const storeId = currentStore.id;
    if (ensuredStoreIdsRef.current.has(storeId)) {
      return true;
    }
    try {
      const ok = await svcDB.stores.ensureStore(currentStore, currentUserId);
      if (ok) {
        ensuredStoreIdsRef.current.add(storeId);
      }
      return ok;
    } catch (err) {
      console.warn('[StoreContext] ensureCurrentStoreInCloud xatosi:', err?.message || err);
      return false;
    }
  }, [currentStore, currentUserId, isOwner, isEmployee]);

  ensureStoreFnRef.current = ensureCurrentStoreInCloud;

  // Auto-ensure Owner's active store in Supabase Cloud
  useEffect(() => {
    if (isOwner && !isEmployee && currentStore?.id && currentUserId && isValidUUID(currentUserId)) {
      ensureCurrentStoreInCloud();
    }
  }, [currentStore?.id, currentUserId, isOwner, isEmployee, ensureCurrentStoreInCloud]);

  // Restore Owner stores from Cloud if LocalStorage is empty on new login/device
  useEffect(() => {
    if (!isSupabaseConfigured || !currentUserId || !isValidUUID(currentUserId)) return;
    if (userStores && userStores.length > 0) return;
    if (isEmployee) return;

    svcDB.stores.readOwnerStores(currentUserId).then((cloudStores) => {
      if (cloudStores && cloudStores.length > 0) {
        const mapped = cloudStores.map(cs => ({
          id: cs.id,
          name: cs.name,
          type: cs.store_type || cs.type || 'food',
          emoji: cs.emoji || '🏪',
          ownerId: cs.owner_id || currentUserId,
          ownerEmail: authUser?.email || '',
          createdAt: cs.created_at || new Date().toISOString()
        }));
        setUserStores(mapped);
        userStoresHydratedUserRef.current = currentUserId;
        try {
          localStorage.setItem(getUserStoresKey(currentUserId), JSON.stringify(mapped));
        } catch (e) {}
        if (!selectedStoreId && mapped[0]?.id) {
          setSelectedStoreId(mapped[0].id);
        }
      }
    }).catch(err => {
      console.warn('[StoreContext] readOwnerStores fallback xatosi:', err?.message || err);
    });
  }, [currentUserId, userStores.length, isEmployee, selectedStoreId, authUser?.email]);

  // 4. Faol xodimlar soni (do'kon egasi o'zi xodim hisoblanmaydi)
  const activeEmployees = useMemo(() => {
    return (employees || []).filter(e => e.status === 'Faol');
  }, [employees]);

  const userRole = useMemo(() => {
    if (isEmployee) {
      return currentEmpRecord?.role || authUser?.role || 'Xodim';
    }
    if (isOwner) {
      // 1. Yangi ochilgan yoki barcha xodimlarini o'chirgan akkaunt uchun: "Foydalanuvchi"
      // 2. Kamida 1 ta faol xodimi bo'lgan do'kon egasi uchun: "Do‘kon egasi"
      return activeEmployees.length > 0 ? "Do‘kon egasi" : "Foydalanuvchi";
    }
    return authUser?.role || "Foydalanuvchi";
  }, [isOwner, isEmployee, activeEmployees.length, currentEmpRecord, authUser]);

  // Profil va tizimdagi rolni avtomatik va xavfsiz sinxronlash (Talab 1, 2, 5)
  useEffect(() => {
    if (!authUser?.id) return;

    if (isEmployee) {
      const targetRole = currentEmpRecord?.role || 'Xodim';
      if (authUser.role !== targetRole) {
        updateUserRoleInSystem(authUser.id, targetRole);
        if (authUser.email) updateUserRoleInSystem(authUser.email, targetRole);
        if (updateUserProfile) {
          updateUserProfile({ role: targetRole });
        }
      }
      return;
    }

    if (isOwner) {
      const targetRole = activeEmployees.length > 0 ? "Do‘kon egasi" : "Foydalanuvchi";
      if (authUser.role !== targetRole) {
        updateUserRoleInSystem(authUser.id, targetRole);
        if (authUser.email) updateUserRoleInSystem(authUser.email, targetRole);
        if (updateUserProfile) {
          updateUserProfile({ role: targetRole });
        }
      }
    }
  }, [authUser?.id, authUser?.email, authUser?.role, isOwner, isEmployee, activeEmployees.length, currentEmpRecord]);

  // 5. OWNER — EMPLOYEE ACTIVE STORE REAL-TIME SYNCHRONIZATION
  const effectiveOwnerId = useMemo(() => {
    if (isOwner) return currentUserId;
    if (currentStore?.ownerId && String(currentStore.ownerId).trim() !== String(currentUserId).trim()) {
      return String(currentStore.ownerId).trim();
    }
    const empStore = userStores.find(s => (s.isEmployeeStore || s.role === 'Xodim') && s.ownerId);
    if (empStore?.ownerId) return String(empStore.ownerId).trim();
    try {
      const rawMsgs = localStorage.getItem('savatchi_mail_messages');
      if (rawMsgs) {
        const msgs = JSON.parse(rawMsgs);
        const myEmail = (currentUserEmail || '').toLowerCase();
        const accepted = msgs.find(m =>
          m.type === 'staff_invitation' &&
          m.status === 'Qabul qilindi' &&
          ((m.toUser?.id && String(m.toUser.id).trim() === String(currentUserId).trim()) ||
           (m.toUser?.email && m.toUser.email.toLowerCase() === myEmail))
        );
        if (accepted?.fromUser?.id) return String(accepted.fromUser.id).trim();
      }
    } catch (e) {}
    return null;
  }, [isOwner, currentUserId, currentStore?.ownerId, userStores, currentUserEmail]);

  // Do'kon egasi faol do'konni o'zgartirganda serverda va xotirada saqlash (Talab 1, 4)
  useEffect(() => {
    if (!currentUserId || !currentStore?.id || !isOwner) return;
    try {
      localStorage.setItem(`savatchi_owner_${currentUserId}_active_store`, currentStore.id);
    } catch (e) {}

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('profiles')
        .update({ active_store_id: currentStore.id, updated_at: new Date().toISOString() })
        .eq('id', currentUserId)
        .then(({ error }) => {
          if (error) console.warn('[Supabase Sync] active_store_id update failed:', error.message);
        });
    }
  }, [currentStore?.id, currentUserId, isOwner]);

  // Xodim akkauntida Do'kon egasining faol do'konini real-vaqtda sinxronlash (Talab 1, 2, 3, 6, 7)
  useEffect(() => {
    if (!currentUserId || !isEmployee || !effectiveOwnerId) return;

    const handleOwnerActiveStoreChange = (newStoreId, storeMeta = null) => {
      if (!newStoreId) return;
      if (newStoreId === selectedStoreId) return;

      const applyTargetStore = (finalStore) => {
        // QAT'IY XAVFSIZLIK: Begona Owner do'koniga aslo ruxsat berilmasin! (Talab 6)
        if (finalStore?.ownerId && String(finalStore.ownerId).trim() !== String(effectiveOwnerId).trim()) {
          console.warn('[Xavfsizlik] Begona do‘kon egasining do‘koniga ruxsat berilmadi!');
          return;
        }

        setUserStores(prev => {
          if (prev.some(s => s.id === newStoreId)) return prev;
          const updated = [...prev, finalStore];
          try {
            localStorage.setItem(getUserStoresKey(currentUserId), JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });

        // 2. Yangi do'konga o'tishdan oldin kesh va ref'larni tozalash (Talab 7)
        loadedStoreIdRef.current = null;
        hydratedScopeRef.current = null;
        pendingHydrationRef.current = null;
        salesHydratedScopeRef.current = null;
        salesPendingLoadRef.current = null;

        // 3. Faol do'konni yangisiga almashtirish
        setSelectedStoreId(newStoreId);
        try {
          localStorage.setItem(getActiveStoreKey(currentUserId), newStoreId);
        } catch (e) {}
      };

      // 1. Yangi do'konni userStores ichida qidirish
      let targetStore = userStores.find(s => s.id === newStoreId);
      if (targetStore) {
        applyTargetStore(targetStore);
        return;
      }

      // 2. Agar storeMeta mavjud bo'lsa (broadcast yoki mahalliy parametr)
      if (storeMeta && (storeMeta.id === newStoreId || !storeMeta.id)) {
        const constructedStore = {
          id: newStoreId,
          name: storeMeta.name || 'Savatchi Do‘koni',
          type: storeMeta.type || 'food',
          emoji: storeMeta.emoji || '🏪',
          ownerId: effectiveOwnerId,
          ownerEmail: storeMeta.ownerEmail || currentStore?.ownerEmail,
          role: 'Xodim',
          isEmployeeStore: true
        };
        applyTargetStore(constructedStore);
        return;
      }

      // 3. Multi-device: Supabase'dan do'kon metadatasini olish (Owner LocalStorage ga bog'lanmasdan)
      if (isSupabaseConfigured && supabase) {
        svcDB.stores.readEmployeeStore(newStoreId).then(dbStore => {
          const constructedStore = {
            id: newStoreId,
            name: dbStore?.name || storeMeta?.name || 'Savatchi Do‘koni',
            type: dbStore?.type || storeMeta?.type || 'food',
            emoji: dbStore?.emoji || storeMeta?.emoji || '🏪',
            ownerId: dbStore?.ownerId || effectiveOwnerId,
            ownerEmail: dbStore?.ownerEmail || storeMeta?.ownerEmail || currentStore?.ownerEmail,
            role: 'Xodim',
            isEmployeeStore: true
          };
          applyTargetStore(constructedStore);
        }).catch(() => {
          const fallbackStore = {
            id: newStoreId,
            name: storeMeta?.name || 'Savatchi Do‘koni',
            type: storeMeta?.type || 'food',
            emoji: storeMeta?.emoji || '🏪',
            ownerId: effectiveOwnerId,
            ownerEmail: storeMeta?.ownerEmail || currentStore?.ownerEmail,
            role: 'Xodim',
            isEmployeeStore: true
          };
          applyTargetStore(fallbackStore);
        });
      } else {
        const fallbackStore = {
          id: newStoreId,
          name: storeMeta?.name || 'Savatchi Do‘koni',
          type: storeMeta?.type || 'food',
          emoji: storeMeta?.emoji || '🏪',
          ownerId: effectiveOwnerId,
          ownerEmail: storeMeta?.ownerEmail || currentStore?.ownerEmail,
          role: 'Xodim',
          isEmployeeStore: true
        };
        applyTargetStore(fallbackStore);
      }
    };

    // A. Serverdan joriy egasining faol do'konini olish (RPC + REST fallback)
    let cleanupSupabase = null;
    if (isSupabaseConfigured && supabase) {
      supabase
        .rpc('get_owner_active_store', { owner_uuid: effectiveOwnerId })
        .then(({ data: rpcStoreId, error: rpcErr }) => {
          if (!rpcErr && rpcStoreId && rpcStoreId !== selectedStoreId) {
            handleOwnerActiveStoreChange(rpcStoreId);
          } else if (rpcErr) {
            // Fallback to direct profiles query if RPC fails
            supabase
              .from('profiles')
              .select('active_store_id')
              .eq('id', effectiveOwnerId)
              .single()
              .then(({ data, error }) => {
                if (!error && data?.active_store_id && data.active_store_id !== selectedStoreId) {
                  handleOwnerActiveStoreChange(data.active_store_id);
                }
              });
          }
        })
        .catch(() => {});

      // B. Supabase Realtime (Postgres Changes on profiles table)
      const profileChannel = supabase
        .channel(`profiles_sync_${effectiveOwnerId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${effectiveOwnerId}`
          },
          (payload) => {
            const updatedActiveStore = payload.new?.active_store_id;
            if (updatedActiveStore) {
              handleOwnerActiveStoreChange(updatedActiveStore);
            }
          }
        )
        .subscribe();

      // C. Supabase Realtime (Broadcast event)
      const broadcastChannel = supabase
        .channel(`savatchi_owner_${effectiveOwnerId}`)
        .on('broadcast', { event: 'ACTIVE_STORE_CHANGED' }, ({ payload }) => {
          if (payload?.ownerId === effectiveOwnerId && payload?.storeId) {
            handleOwnerActiveStoreChange(payload.storeId, payload.store);
          }
        })
        .subscribe();

      cleanupSupabase = () => {
        try {
          supabase.removeChannel(profileChannel);
          supabase.removeChannel(broadcastChannel);
        } catch (e) {}
      };
    }

    // D. Mahalliy BroadcastChannel tinglovchisi (brauzer tablariaro sinxronlash)
    let bc = null;
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('savatchi_store_sync');
        bc.onmessage = (e) => {
          if (e.data?.type === 'OWNER_ACTIVE_STORE_CHANGED') {
            const { ownerId, storeId, store } = e.data;
            if (ownerId === effectiveOwnerId && storeId) {
              handleOwnerActiveStoreChange(storeId, store);
            }
          }
        };
      } catch (e) {}
    }

    // E. DOM CustomEvent tinglovchisi (bitta oyna va test runner uchun)
    const handleLocalEvent = (evt) => {
      const { ownerId, storeId, store } = evt.detail || {};
      if (ownerId === effectiveOwnerId && storeId) {
        handleOwnerActiveStoreChange(storeId, store);
      }
    };
    window.addEventListener('savatchi_owner_active_store_changed', handleLocalEvent);

    return () => {
      if (cleanupSupabase) cleanupSupabase();
      if (bc) bc.close();
      window.removeEventListener('savatchi_owner_active_store_changed', handleLocalEvent);
    };
  }, [currentUserId, isEmployee, effectiveOwnerId, selectedStoreId, userStores]);

  return (
    <StoreContext.Provider
      value={{
        // Multi-Store & Store Type Global Context
        currentStore,
        storeType,
        selectedStoreId: currentStore.id,
        storeConfig,
        userStores,
        storeTypes: STORE_TYPES,
        storeTypeAdapter: getStoreTypeAdapter(storeType),
        switchStore,
        setStoreType,
        createNewStore,
        isStoreType: (typeId) => storeType === typeId,
        getStoreProductFields: () => getStoreProductFields(storeType),
        getStoreCategories: () => getStoreCategories(storeType),
        getStoreUnits: () => getStoreUnits(storeType),
        getStoreNavMenus: () => getStoreNavMenus(storeType),
        getStoreStatsConfig: () => getStoreStatsConfig(storeType),
        getStoreInventoryConfig: () => getStoreInventoryConfig(storeType),
        getStoreSalesConfig: () => getStoreSalesConfig(storeType),
        getStoreOrdersConfig: () => getStoreOrdersConfig(storeType),

        // Isolated Data
        products,
        addProduct,
        updateProduct,
        adjustStock,
        deleteProduct,
        sales,
        addSale,
        cancelSale,
        debts,
        addDebt,
        payDebt,
        updateDebt,
        updateDebtAmount,
        deleteDebt,
        isDebtsAllowed: isDebtsSupportedStoreType(currentStore.type || storeConfig.id),
        isDebtsSupportedStoreType,
        orders,
        addOrder,
        updateOrderStatus,
        deleteOrder,
        cleanAndFixOrders,
        employees,
        addEmployee,
        deleteEmployee,
        updateEmployeeRole,
        activities,
        logActivity,
        isSyncing,
        lastSyncTime,
        syncNow,
        searchTargetItem,
        setSearchTargetItem,

        // Rentals (Ijara)
        rentals,
        addRental,
        updateRentalStatus,
        addRentalPayment,
        deleteRental,
        isRentalAllowed: isRentalSupportedStoreType(currentStore.type || storeConfig.id),
        isRentalSupportedStoreType,

        // Muddatli to'lov (Installments)
        installments,
        addInstallmentContract,
        addInstallmentPayment,
        cancelInstallmentContract,
        restoreInstallmentContract,
        deleteInstallmentContract,
        isInstallmentAllowed: isInstallmentSupportedStoreType(currentStore.type || storeConfig.id),
        isInstallmentSupportedStoreType,
        installmentStats: calculateInstallmentStats(installments),

        // Qo'shimcha xarajatlar (Expenses)
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,

        // Role & Permission Flags
        isOwner,
        isEmployee,
        isUnassigned,
        userRole,
        currentUserName,
        currentUserId,

        // 5 soniyalik bekor qilish mexanizmi uchun
        isItemPendingDelete,
        setItemPendingDelete,
        pendingDeleteIds,

        stats: {
          totalSalesAmount,
          totalDebtsAmount,
          totalDebts,
          activeDebtsCount: activeDebtsList.length,
          paidDebtsCount: paidDebtsList.length,
          totalInventoryCount,
          totalInventoryValue,
          pendingOrdersCount,
          deliveredOrdersCount,
          totalProductsCount: products.length
        }
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const useStoreType = () => {
  const {
    currentStore,
    storeType,
    selectedStoreId,
    storeConfig,
    userStores,
    storeTypes,
    storeTypeAdapter,
    switchStore,
    setStoreType,
    createNewStore,
    isStoreType,
    getStoreProductFields,
    getStoreCategories,
    getStoreUnits,
    getStoreNavMenus,
    getStoreStatsConfig,
    getStoreInventoryConfig,
    getStoreSalesConfig,
    getStoreOrdersConfig
  } = useStore();

  return {
    currentStore,
    storeType,
    selectedStoreId,
    storeConfig,
    userStores,
    storeTypes,
    storeTypeAdapter,
    switchStore,
    setStoreType,
    createNewStore,
    isStoreType,
    getStoreProductFields,
    getStoreCategories,
    getStoreUnits,
    getStoreNavMenus,
    getStoreStatsConfig,
    getStoreInventoryConfig,
    getStoreSalesConfig,
    getStoreOrdersConfig
  };
};

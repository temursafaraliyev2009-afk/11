// src/context/StoreContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
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
import { isAccountStoreOwner, updateUserRoleInSystem } from '../services/accountService';
import {
  syncStoreEmployeesWithAcceptedInvitations,
  deactivateStoreEmployeeInvitations,
  saveStoreEmployeesToStorage
} from '../services/mailService';

export {
  RENTAL_ALLOWED_STORE_TYPES,
  isRentalSupportedStoreType,
  DEBTS_RESTRICTED_STORE_TYPES,
  isDebtsSupportedStoreType,
  INSTALLMENT_ALLOWED_STORE_TYPES,
  isInstallmentSupportedStoreType
};

const StoreContext = createContext();

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

export const StoreProvider = ({ children }) => {
  // === LOGGED-IN USER INFO (from AuthContext) ===
  const { user: authUser, updateUserProfile } = useAuth();

  // Haqiqiy tizimga kirgan foydalanuvchi ID va ismi
  const currentUserId = authUser?.id || authUser?.uid || 'usr-default';
  const currentUserName = authUser?.displayName || authUser?.firstName || authUser?.email?.split('@')[0] || 'Foydalanuvchi';

  // 1. User's stores list (Multi-Store Architecture)
  const [userStores, setUserStores] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_STORES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_USER_STORES;
  });

  // Tizimga kirgan foydalanuvchini do'konlar egasi sifatida xavfsiz mustahkamlash
  useEffect(() => {
    if (!authUser?.id) return;
    setUserStores(prev => {
      let changed = false;
      const updated = prev.map(s => {
        if (!s.ownerId) {
          changed = true;
          return { ...s, ownerId: authUser.id, ownerEmail: authUser.email || '' };
        }
        return s;
      });
      if (changed) {
        try {
          localStorage.setItem(USER_STORES_KEY, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      }
      return prev;
    });
  }, [authUser?.id, authUser?.email]);

  // 2. Currently selected store ID (e.g. 'store_food', 'store_phone' or generated ID)
  const [selectedStoreId, setSelectedStoreId] = useState(() => {
    return localStorage.getItem(ACTIVE_STORE_KEY) || 'store_food';
  });

  // Current store object
  const currentStore = useMemo(() => {
    return (
      userStores.find(s => s.id === selectedStoreId) ||
      userStores.find(s => s.type === selectedStoreId) ||
      DEFAULT_USER_STORES.find(s => s.id === selectedStoreId || s.type === selectedStoreId) ||
      userStores[0] ||
      DEFAULT_USER_STORES[0]
    );
  }, [userStores, selectedStoreId]);

  const storeType = currentStore.type || 'food';
  const storeConfig = getStoreTypeById(storeType);
  const activeStoreId = currentStore.id;
  const loadedStoreIdRef = useRef(activeStoreId);

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

  // 3. Isolated State per storeId
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(PRODUCTS_KEY + activeStoreId);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return storeConfig.sampleProducts || [];
  });

  const [sales, setSales] = useState(() => {
    try {
      const saved = localStorage.getItem(SALES_KEY + activeStoreId);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return generateSalesForStore(storeConfig);
  });

  const [debts, setDebts] = useState(() => {
    try {
      const saved = localStorage.getItem(DEBTS_KEY + activeStoreId);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return generateDebtsForStore(storeConfig);
  });

  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(ORDERS_KEY + activeStoreId);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return generateOrdersForStore(storeConfig);
  });

  const [employees, setEmployees] = useState(() => {
    try {
      const syncd = syncStoreEmployeesWithAcceptedInvitations(activeStoreId);
      if (syncd && syncd.length > 0) return sanitizeStoreEmployees(syncd, currentStore.ownerId, currentStore.ownerEmail);
      const saved = localStorage.getItem(EMPLOYEES_KEY + activeStoreId);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return sanitizeStoreEmployees(parsed, currentStore.ownerId, currentStore.ownerEmail);
      }
    } catch (e) {}
    return [];
  });

  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem(ACTIVITIES_KEY + activeStoreId);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return generateActivitiesForStore(storeConfig);
  });

  const [rentals, setRentals] = useState(() => {
    try {
      const saved = localStorage.getItem(RENTALS_KEY + activeStoreId);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [installments, setInstallments] = useState(() => {
    try {
      const saved = localStorage.getItem(INSTALLMENTS_KEY + activeStoreId);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('31-avgust 16:42');
  const [searchTargetItem, setSearchTargetItem] = useState(null);

  // DATA ISOLATION EFFECT: Whenever activeStoreId changes, load ONLY that store's data
  useEffect(() => {
    const sId = currentStore.id;
    const sType = currentStore.type || 'food';
    const cfg = getStoreTypeById(sType);

    // 1. Products
    try {
      const savedP = localStorage.getItem(PRODUCTS_KEY + sId);
      setProducts(savedP ? JSON.parse(savedP) : (cfg.sampleProducts || []));
    } catch (e) {
      setProducts(cfg.sampleProducts || []);
    }

    // 2. Sales
    try {
      const savedS = localStorage.getItem(SALES_KEY + sId);
      setSales(savedS ? JSON.parse(savedS) : generateSalesForStore(cfg));
    } catch (e) {
      setSales(generateSalesForStore(cfg));
    }

    // 3. Debts
    try {
      const savedD = localStorage.getItem(DEBTS_KEY + sId);
      if (savedD) {
        setDebts(JSON.parse(savedD));
      } else {
        setDebts(generateDebtsForStore(cfg));
      }
    } catch (e) {
      setDebts(generateDebtsForStore(cfg));
    }

    // 4. Orders
    try {
      const savedO = localStorage.getItem(ORDERS_KEY + sId);
      setOrders(savedO ? JSON.parse(savedO) : generateOrdersForStore(cfg));
    } catch (e) {
      setOrders(generateOrdersForStore(cfg));
    }

    // 5. Employees
    try {
      const syncd = syncStoreEmployeesWithAcceptedInvitations(sId);
      setEmployees(sanitizeStoreEmployees(syncd, currentStore.ownerId, currentStore.ownerEmail));
    } catch (e) {
      setEmployees([]);
    }

    // 6. Activities
    try {
      const savedA = localStorage.getItem(ACTIVITIES_KEY + sId);
      setActivities(savedA ? JSON.parse(savedA) : generateActivitiesForStore(cfg));
    } catch (e) {
      setActivities(generateActivitiesForStore(cfg));
    }

    // 7. Rentals (Faqat tegishli do'kon uchun alohida saqlash va yuklash)
    try {
      const savedR = localStorage.getItem(RENTALS_KEY + sId);
      setRentals(savedR ? JSON.parse(savedR) : []);
    } catch (e) {
      setRentals([]);
    }

    // 8. Installments (Muddatli to'lov - faqat ruxsat etilgan 4 ta do'kon uchun alohida izolyatsiya)
    try {
      const savedI = localStorage.getItem(INSTALLMENTS_KEY + sId);
      setInstallments(savedI ? JSON.parse(savedI) : []);
    } catch (e) {
      setInstallments([]);
    }

    // Mark currentStore as loaded so persistence only writes matching store data
    loadedStoreIdRef.current = sId;
  }, [currentStore.id, currentStore.type, authUser?.id]);

  // Listen for employee updates, invitations accepted, or role edits
  useEffect(() => {
    const handleEmployeesSync = (e) => {
      if (!e.detail?.storeId || e.detail.storeId === currentStore.id) {
        try {
          const syncd = syncStoreEmployeesWithAcceptedInvitations(currentStore.id);
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
  }, [currentStore.id]);

  // Listen for orders dispatched from the storefront / CartContext
  useEffect(() => {
    const handleNewOrder = (e) => {
      const newOrder = e.detail;
      if (newOrder && (newOrder.storeId === currentStore.id || !newOrder.storeId)) {
        setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
        logActivity('Onlayn Xaridor', `Yangi buyurtma qabul qilindi: ${newOrder.id}`, `${newOrder.product || 'Mahsulotlar'}: ${Number(newOrder.total || 0).toLocaleString()} so‘m`, 'Buyurtma');
      }
    };
    window.addEventListener('savatchi_order_created', handleNewOrder);
    return () => window.removeEventListener('savatchi_order_created', handleNewOrder);
  }, [currentStore.id]);

  // On initial app mount, automatically normalize and repair any corrupt orders in localStorage
  useEffect(() => {
    fixAllOrders(localStorage);
  }, []);

  // Persist current isolated store data safely (only when state matches currentStore)
  useEffect(() => {
    localStorage.setItem(USER_STORES_KEY, JSON.stringify(userStores));
  }, [userStores]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_STORE_KEY, currentStore.id);
  }, [currentStore.id]);

  useEffect(() => {
    if (loadedStoreIdRef.current === currentStore.id) {
      localStorage.setItem(PRODUCTS_KEY + currentStore.id, JSON.stringify(products));
    }
  }, [products, currentStore.id]);

  useEffect(() => {
    if (loadedStoreIdRef.current === currentStore.id) {
      localStorage.setItem(SALES_KEY + currentStore.id, JSON.stringify(sales));
    }
  }, [sales, currentStore.id]);

  useEffect(() => {
    if (loadedStoreIdRef.current === currentStore.id) {
      localStorage.setItem(DEBTS_KEY + currentStore.id, JSON.stringify(debts));
    }
  }, [debts, currentStore.id]);

  useEffect(() => {
    if (loadedStoreIdRef.current === currentStore.id) {
      localStorage.setItem(ORDERS_KEY + currentStore.id, JSON.stringify(orders));
    }
  }, [orders, currentStore.id]);

  useEffect(() => {
    if (loadedStoreIdRef.current === currentStore.id) {
      localStorage.setItem(EMPLOYEES_KEY + currentStore.id, JSON.stringify(employees));
    }
  }, [employees, currentStore.id]);

  useEffect(() => {
    if (loadedStoreIdRef.current === currentStore.id) {
      localStorage.setItem(ACTIVITIES_KEY + currentStore.id, JSON.stringify(activities));
    }
  }, [activities, currentStore.id]);

  useEffect(() => {
    if (loadedStoreIdRef.current === currentStore.id) {
      localStorage.setItem(RENTALS_KEY + currentStore.id, JSON.stringify(rentals));
    }
  }, [rentals, currentStore.id]);

  useEffect(() => {
    if (loadedStoreIdRef.current === currentStore.id) {
      localStorage.setItem(INSTALLMENTS_KEY + currentStore.id, JSON.stringify(installments));
    }
  }, [installments, currentStore.id]);

  // Switch Active Store
  const switchStore = (storeIdOrType) => {
    let target = userStores.find(s => s.id === storeIdOrType);
    if (!target) {
      target = userStores.find(s => s.type === storeIdOrType);
    }
    if (!target) {
      const cfg = getStoreTypeById(storeIdOrType);
      target = {
        id: `store_${storeIdOrType}`,
        name: `Savatchi ${cfg.name}`,
        type: storeIdOrType,
        emoji: cfg.emoji,
        ownerId: authUser?.id || authUser?.uid || currentUserId,
        ownerEmail: authUser?.email || '',
        createdAt: new Date().toISOString()
      };
      setUserStores(prev => [...prev, target]);
    }
    loadedStoreIdRef.current = null;
    setSelectedStoreId(target.id);
    localStorage.setItem(ACTIVE_STORE_KEY, target.id);
  };

  // setStoreType alias for switchStore
  const setStoreType = (storeTypeId) => {
    switchStore(storeTypeId);
  };

  // Create a brand new store
  const createNewStore = ({ name, type }) => {
    const cfg = getStoreTypeById(type);
    const newStore = {
      id: `store_${type}_${Date.now()}`,
      name: name?.trim() || `Savatchi ${cfg.name} Do‘koni`,
      type: type,
      emoji: cfg.emoji,
      ownerId: authUser?.id || authUser?.uid || currentUserId,
      ownerEmail: authUser?.email || '',
      createdAt: new Date().toISOString()
    };
    loadedStoreIdRef.current = null;
    const updated = [...userStores, newStore];
    setUserStores(updated);
    localStorage.setItem(USER_STORES_KEY, JSON.stringify(updated));
    setSelectedStoreId(newStore.id);
    localStorage.setItem(ACTIVE_STORE_KEY, newStore.id);
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
      storeId: currentStore.id,
      storeType: currentStore.type,
      ...productData
    };

    setProducts(prev => [newProduct, ...prev]);
    logActivity(userName, `Mahsulot qo‘shdi: ${newProduct.name}`, `${newProduct.name}: ${newProduct.stock} ${newProduct.unit}`, 'Ombor');
    return newProduct;
  };

  const updateProduct = (id, updates, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, ...updates };
        if ('stock' in updates) {
          const numStock = Number(updates.stock);
          updated.status = numStock > 10 ? 'Yetarli' : numStock > 0 ? 'Kam' : 'Tugagan';
          logActivity(userName, `${p.name} miqdorini o‘zgartirdi`, `${p.name}: ${p.stock} → ${numStock} ${p.unit || p.unit}`, 'Ombor');
        } else {
          logActivity(userName, `${p.name} tahrirlandi`, `Ma'lumotlar yangilandi`, 'Ombor');
        }
        return updated;
      }
      return p;
    }));
  };

  const adjustStock = (id, delta, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const oldStock = p.stock;
        const newStock = Math.max(0, oldStock + delta);
        const status = newStock > 10 ? 'Yetarli' : newStock > 0 ? 'Kam' : 'Tugagan';
        logActivity(userName, `${p.name} zaxirasini o‘zgartirdi`, `${p.name}: ${oldStock} → ${newStock} ${p.unit}`, 'Ombor');
        return { ...p, stock: newStock, status };
      }
      return p;
    }));
  };

  const deleteProduct = (id, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const p = products.find(prod => prod.id === id);
    if (p) {
      logActivity(userName, `Mahsulot o‘chirildi: ${p.name}`, `Ombordan olib tashlandi`, 'Ombor');
      setProducts(prev => prev.filter(prod => prod.id !== id));
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
      storeId: currentStore.id
    };

    setSales(prev => [newSale, ...prev]);

    // Decrease stock if product exists and not a debt collection
    if (saleData.productId && !saleData.isDebtCollection) {
      adjustStock(saleData.productId, -(Number(saleData.qty) || 1), userName);
    }

    logActivity(userName, `Savdo amalga oshirildi`, `${newSale.product}: ${newSale.total.toLocaleString()} so‘m`, 'Savdo');
    return newSale;
  };

  const cancelSale = (id, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const s = sales.find(item => item.id === id);
    if (s) {
      logActivity(userName, `Savdo bekor qilindi`, `${s.product}: ${s.total.toLocaleString()} so‘m`, 'Savdo');
      setSales(prev => prev.filter(item => item.id !== id));
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
      storeId: currentStore.id
    };

    setDebts(prev => [newDebt, ...prev]);
    logActivity(userName, `Yangi qarz kiritildi: ${newDebt.name}`, `${newDebt.amount.toLocaleString()} so‘m`, 'Qarz');
    return newDebt;
  };

  const payDebt = (id, amountToPay, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const numericPay = Number(amountToPay);
    if (isNaN(numericPay) || numericPay <= 0) return;

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
          closedDate: fullyPaid ? new Date().toISOString().split('T')[0] : d.closedDate
        };

        if (fullyPaid) {
          logActivity(userName, `Qarz to‘landi: ${d.name}`, `${numericPay.toLocaleString()} so‘m (To‘liq yopildi)`, 'Qarz');
        } else {
          logActivity(userName, `Qarz to‘lovi: ${d.name}`, `${numericPay.toLocaleString()} so‘m to‘landi, qolgan: ${remainingAmount.toLocaleString()} so‘m`, 'Qarz');
        }

        return updatedDebt;
      }
      return d;
    }));
  };

  const updateDebtAmount = (id, newTotalAmount, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const num = Number(newTotalAmount);
    setDebts(prev => prev.map(d => {
      if (d.id === id) {
        const fullyPaid = num === 0;
        return {
          ...d,
          amount: Math.max(0, num),
          isPaid: fullyPaid,
          status: fullyPaid ? 'Qarz to‘landi' : (num < d.originalAmount ? 'Qisman to‘langan' : d.status)
        };
      }
      return d;
    }));
    logActivity(userName, `Qarzdorlik summasi o‘zgartirildi`, `Yangi summa: ${num.toLocaleString()} so‘m`, 'Qarz');
  };

  const updateDebt = (id, updates, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    setDebts(prev => prev.map(d => {
      if (d.id === id) {
        const updated = { ...d, ...updates };
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
        return updated;
      }
      return d;
    }));
  };

  const deleteDebt = (id, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const d = debts.find(item => item.id === id);
    if (d) {
      logActivity(userName, `Qarz o‘chirildi: ${d.name}`, `${d.amount.toLocaleString()} so‘m`, 'Qarz');
      setDebts(prev => prev.filter(item => item.id !== id));
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
      storeId: currentStore.id
    };

    setOrders(prev => [newOrder, ...prev]);
    logActivity(userName, `Yangi buyurtma yaratildi: ${newOrder.id}`, `${newOrder.product}: ${newOrder.total.toLocaleString()} so‘m`, 'Buyurtma');
    return newOrder;
  };

  const updateOrderStatus = (id, newStatus, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        const updated = { ...o, status: newStatus };
        logActivity(userName, `Buyurtma holati o‘zgartirildi: ${o.id}`, `${o.status} → ${newStatus}`, 'Buyurtma');
        return updated;
      }
      return o;
    }));

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
      const savedO = localStorage.getItem(ORDERS_KEY + currentStore.id);
      if (savedO) {
        setOrders(JSON.parse(savedO));
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
      storeId: currentStore.id
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
    saveStoreEmployeesToStorage(currentStore.id, filtered);
    try {
      localStorage.setItem(EMPLOYEES_KEY + currentStore.id, JSON.stringify(filtered));
    } catch (err) {}

    // 2. Qayta tiklanishdan himoya qilish (O'chirilganlar ro'yxatiga qo'shish)
    try {
      const delKey = `savatchi_deleted_employees_${currentStore.id}`;
      const rawDel = localStorage.getItem(delKey);
      let delList = rawDel ? JSON.parse(rawDel) : [];
      if (!Array.isArray(delList)) delList = [];
      delList.push({
        id: emp.id,
        accountId: emp.accountId || null,
        email: emp.email || '',
        name: emp.name || '',
        deletedAt: new Date().toISOString()
      });
      localStorage.setItem(delKey, JSON.stringify(delList));
    } catch (err) {}

    // 3. Pochta takliflarini yangilash (Qabul qilindi -> O'chirilgan holatga o'tkazish)
    try {
      deactivateStoreEmployeeInvitations(currentStore.id, emp);
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
        localStorage.setItem(EMPLOYEES_KEY + currentStore.id, JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });

    logActivity(userName, `Xodim roli yangilandi`, `Yangi rol: ${roleText}`, 'Xodimlar');
  };

  // Rentals Actions (Faqat ruxsat berilgan 4 ta do'kon turi uchun)
  const addRental = (rentalData, userName) => {
    userName = currentUserName || userName || 'Foydalanuvchi';
    const currentType = currentStore.type || storeConfig.id;
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

    // Qaytarilgan holat tanlanganda:
    // Buyumning ijara uchun band bo'lgan miqdori bo'shatilib, omborga qaytariladi
    if (newStatus === 'Qaytarilgan' && oldStatus !== 'Qaytarilgan') {
      if (targetProduct) {
        adjustStock(targetProduct.id, rental.qty, userName);
      }
    }
    // Agar Qaytarilgandan qayta Faolga o'tkazilsa:
    // Omborda yetarli miqdor borligini tekshiramiz va qayta band qilamiz
    else if (oldStatus === 'Qaytarilgan' && (newStatus === 'Faol' || newStatus === 'Muddati o‘tgan')) {
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
        total: (Number(it.price) || 0) * (Number(it.qty) || 1)
      })),
      productsSummary: items.map(it => `${it.name} (${it.qty} ${it.unit || 'dona'})`).join(', '),
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

    setInstallments(prev => prev.map(c => c.id === contractId ? updatedContract : c));

    // Pul tushumi sifatida savdo tizimiga yozish (omborga tegilmaydi, tovar savdosi deb hisoblanmaydi)
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

    // Shartnomaga oid savdo va to'lovlarni bekor qilingan deb belgilash
    setSales(prev => prev.map(s => {
      if (s.contractId === contractId) {
        return { ...s, isReturned: true, status: 'Bekor qilingan' };
      }
      return s;
    }));

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

    logActivity(
      userName,
      `Shartnoma qayta tiklandi`,
      `${contract.contractNumber} — ${contract.customerName} (${properStatus.toUpperCase()}${wasReturnedToStock ? ', Mahsulotlar ombordan ajratildi' : ''})`,
      'Muddatli to‘lov'
    );

    return restoredContract;
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
  const totalSalesAmount = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
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
    const isMyStore = userStores.some(s => s.id === currentStore.id);
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
    if (authUser.role && (EMPLOYEE_ROLES.includes(authUser.role) || authUser.role.toLowerCase() === 'xodim')) {
      return true;
    }
    return false;
  }, [authUser, isOwner, currentEmpRecord]);

  // 3.5. Unassigned: Na egasi, na xodim — oddiy foydalanuvchi
  const isUnassigned = useMemo(() => {
    if (!authUser) return false;
    return !isOwner && !isEmployee;
  }, [authUser, isOwner, isEmployee]);

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
        isInstallmentAllowed: isInstallmentSupportedStoreType(currentStore.type || storeConfig.id),
        isInstallmentSupportedStoreType,
        installmentStats: calculateInstallmentStats(installments),

        // Role & Permission Flags
        isOwner,
        isEmployee,
        isUnassigned,
        userRole,
        currentUserName,
        currentUserId,

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

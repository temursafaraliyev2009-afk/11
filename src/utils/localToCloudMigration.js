// src/utils/localToCloudMigration.js
// Savatchi — LocalStorage → Supabase Cloud Migration Utility (Hardened)
//
// QAT'IY XAVFSIZLIK QOIDALARI:
// 1. localStorage HECH QACHON avtomatik o'chirilmaydi yoki tozalanmaydi.
// 2. Migratsiya oldidan avtomatik JSON snapshot (backup) saqlanadi.
// 3. Faqat Do'kon Egasi (Owner) bo'lgan foydalanuvchi do'kon va uning katalogini migratsiya qilishi mumkin.
//    Xodim (Employee) qurilmasidagi lokal ma'lumotlar Owner ma'lumotlariga aralashib ketmaydi.
// 4. Demo IDlar (usr-101, usr-102 va h.k.) tekshiriladi va auth.users ga bog'lanmaydi.
// 5. Barcha upsert-lar idempotent (ON CONFLICT (store_id, id) DO UPDATE).

import svc, { isUUID } from '../services/supabaseDataService.js';

const PRODUCTS_KEY     = 'savatchi_products_';
const SALES_KEY        = 'savatchi_sales_';
const DEBTS_KEY        = 'savatchi_debts_';
const ORDERS_KEY       = 'savatchi_orders_';
const RENTALS_KEY      = 'savatchi_rentals_';
const INSTALLMENTS_KEY = 'savatchi_installments_';
const ACTIVITIES_KEY   = 'savatchi_activities_';
const USER_STORES_KEY  = 'savatchi_user_stores';
const BACKUP_PREFIX    = 'savatchi_migration_backup_';
const MIGRATION_FLAG_KEY = 'savatchi_cloud_migration_done';

function getKey(prefix, userId, storeId) {
  return `savatchi_${userId}_${prefix}${storeId}`;
}

export function getUserStoresKey(userId) {
  return userId ? `savatchi_${userId}_user_stores` : USER_STORES_KEY;
}

function readLS(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    return null;
  }
}

export function getUserStores(userId) {
  // 1. Standart user-scoped kalit (StoreContext bilan to'liq mos)
  const standardKey = getUserStoresKey(userId);
  try {
    const raw = localStorage.getItem(standardKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  // 2. Legacy fallback
  try {
    const legacy = localStorage.getItem(`savatchi_user_stores_${userId}`);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  try {
    const raw = localStorage.getItem(USER_STORES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}

  return [];
}

// ═══════════════════════════════════════════════════════════════════
// 1. AVTOMATIK BACKUP (EXPORT & LOCAL PERSISTENCE)
// ═══════════════════════════════════════════════════════════════════

export function backupLocalStorage(userId, storeId) {
  const snapshot = {
    userId,
    storeId,
    exportedAt: new Date().toISOString(),
    products:      readLS(getKey('products_', userId, storeId))     || readLS(PRODUCTS_KEY + storeId) || [],
    sales:         readLS(getKey('sales_', userId, storeId))        || readLS(SALES_KEY + storeId)    || [],
    debts:         readLS(getKey('debts_', userId, storeId))        || readLS(DEBTS_KEY + storeId)    || [],
    orders:        readLS(getKey('orders_', userId, storeId))       || readLS(ORDERS_KEY + storeId)   || [],
    rentals:       readLS(getKey('rentals_', userId, storeId))      || readLS(RENTALS_KEY + storeId)  || [],
    installments:  readLS(getKey('installments_', userId, storeId)) || readLS(INSTALLMENTS_KEY + storeId) || [],
    activities:    readLS(getKey('activities_', userId, storeId))   || readLS(ACTIVITIES_KEY + storeId) || []
  };

  // Zaxira nusxasini localStorage ga saqlab qo'yish
  try {
    const backupKey = `${BACKUP_PREFIX}${storeId}_${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('[backupLocalStorage] Zaxira nusxasini saqlashda xato:', e?.message);
  }

  return snapshot;
}

// ═══════════════════════════════════════════════════════════════════
// 2. BATCHWISE UPSERT (XAVFSIZ VA BO'LIB-BO'LIB YUBORISH)
// ═══════════════════════════════════════════════════════════════════

async function batchUpsert(upsertFn, storeId, items, batchSize = 50) {
  let ok = 0, fail = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    for (const item of batch) {
      try {
        await upsertFn(storeId, item);
        ok++;
      } catch (e) {
        fail++;
        console.warn('[migration] upsert xatosi:', e?.message || e, item?.id);
      }
    }
  }
  return { ok, fail, total: items.length };
}

// ═══════════════════════════════════════════════════════════════════
// 3. DO'KONLARNI KO'CHIRISH (FAQAT OWNER UCHUN)
// ═══════════════════════════════════════════════════════════════════

export async function migrateStoresToCloud(userId, ownerAuthId) {
  if (!isUUID(ownerAuthId)) {
    return { ok: 0, fail: 0, total: 0, reason: 'ownerAuthId haqiqiy UUID emas' };
  }
  const storeList = getUserStores(userId);
  if (!storeList.length) return { ok: 0, fail: 0, total: 0, reason: 'LocalStorage da do\'kon topilmadi' };

  let ok = 0, fail = 0;
  for (const store of storeList) {
    try {
      await svc.stores.upsert(store, ownerAuthId);
      ok++;
    } catch (e) {
      fail++;
      console.warn('[migration] store upsert xatosi:', e?.message, store?.id);
    }
  }
  return { ok, fail, total: storeList.length };
}

// ═══════════════════════════════════════════════════════════════════
// 4. ENTITY MIGRATIONS
// ═══════════════════════════════════════════════════════════════════

export async function migrateProductsToCloud(userId, storeId) {
  const items = readLS(getKey('products_', userId, storeId)) || readLS(PRODUCTS_KEY + storeId) || [];
  return batchUpsert(svc.products.upsert.bind(svc.products), storeId, items);
}

export async function migrateSalesToCloud(userId, storeId) {
  const items = readLS(getKey('sales_', userId, storeId)) || readLS(SALES_KEY + storeId) || [];
  return batchUpsert(svc.sales.upsert.bind(svc.sales), storeId, items);
}

export async function migrateDebtsToCloud(userId, storeId) {
  const items = readLS(getKey('debts_', userId, storeId)) || readLS(DEBTS_KEY + storeId) || [];
  return batchUpsert(svc.debts.upsert.bind(svc.debts), storeId, items);
}

export async function migrateOrdersToCloud(userId, storeId) {
  const items = readLS(getKey('orders_', userId, storeId)) || readLS(ORDERS_KEY + storeId) || [];
  return batchUpsert(svc.orders.upsert.bind(svc.orders), storeId, items);
}

export async function migrateRentalsToCloud(userId, storeId) {
  const items = readLS(getKey('rentals_', userId, storeId)) || readLS(RENTALS_KEY + storeId) || [];
  return batchUpsert(svc.rentals.upsert.bind(svc.rentals), storeId, items);
}

export async function migrateInstallmentsToCloud(userId, storeId) {
  const items = readLS(getKey('installments_', userId, storeId)) || readLS(INSTALLMENTS_KEY + storeId) || [];
  return batchUpsert(svc.installmentContracts.upsert.bind(svc.installmentContracts), storeId, items);
}

export async function migrateActivitiesToCloud(userId, storeId) {
  const items = readLS(getKey('activities_', userId, storeId)) || readLS(ACTIVITIES_KEY + storeId) || [];
  let ok = 0, fail = 0;
  for (const act of items) {
    try {
      await svc.activities.insert(storeId, act);
      ok++;
    } catch (e) {
      fail++;
    }
  }
  return { ok, fail, total: items.length };
}

// ═══════════════════════════════════════════════════════════════════
// 5. TO'LIQ XAVFSIZ MIGRATSIYA (BIR MARTALIK & GUARDS BILAN)
// ═══════════════════════════════════════════════════════════════════

/**
 * Do'kon ma'lumotlarini Cloud'ga ko'chirish.
 * Faqat isOwner = true bo'lganda ishga tushadi!
 * Xodim login qilganda avtomatik ishga tushmaydi.
 */
export async function migrateStoreDataToCloud(userId, storeId, ownerAuthId, isOwner = true) {
  // XAVFSIZLIK: Faqat Owner va haqiqiy UUID bo'lganda migratsiya qilinadi
  if (!isOwner) {
    console.warn('[migrateStoreDataToCloud] Xodim akkauntidan avtomatik do\'kon migratsiyasi bloklandi.');
    return { skipped: true, reason: 'Faqat do\'kon egasi migratsiyani boshlay oladi.' };
  }

  if (!ownerAuthId || !isUUID(ownerAuthId)) {
    return { skipped: true, reason: 'ownerAuthId haqiqiy auth.uid() UUID emas.' };
  }

  // 1. Avtomatik to'liq zaxira (Backup)
  const backup = backupLocalStorage(userId, storeId);

  const report = {
    storeId,
    startedAt: new Date().toISOString(),
    backupCreated: !!backup,
    stores: null,
    products: null,
    sales: null,
    debts: null,
    orders: null,
    rentals: null,
    installments: null,
    activities: null,
    totalOk: 0,
    totalFail: 0,
    errors: []
  };

  // 2. Do'konning o'zini upsert qilish
  try {
    report.stores = await migrateStoresToCloud(userId, ownerAuthId);
  } catch (e) {
    report.errors.push('stores: ' + e.message);
  }

  // 3. Biznes modullarini ko'chirish
  try { report.products = await migrateProductsToCloud(userId, storeId); } catch (e) { report.errors.push('products: ' + e.message); }
  try { report.sales = await migrateSalesToCloud(userId, storeId); } catch (e) { report.errors.push('sales: ' + e.message); }
  try { report.debts = await migrateDebtsToCloud(userId, storeId); } catch (e) { report.errors.push('debts: ' + e.message); }
  try { report.orders = await migrateOrdersToCloud(userId, storeId); } catch (e) { report.errors.push('orders: ' + e.message); }
  try { report.rentals = await migrateRentalsToCloud(userId, storeId); } catch (e) { report.errors.push('rentals: ' + e.message); }
  try { report.installments = await migrateInstallmentsToCloud(userId, storeId); } catch (e) { report.errors.push('installments: ' + e.message); }
  try { report.activities = await migrateActivitiesToCloud(userId, storeId); } catch (e) { report.errors.push('activities: ' + e.message); }

  for (const key of ['products', 'sales', 'debts', 'orders', 'rentals', 'installments', 'activities']) {
    if (report[key]) {
      report.totalOk += report[key].ok || 0;
      report.totalFail += report[key].fail || 0;
    }
  }

  report.finishedAt = new Date().toISOString();
  return report;
}

// ═══════════════════════════════════════════════════════════════════
// 6. TEKSHIRISH (VERIFY)
// ═══════════════════════════════════════════════════════════════════

export async function verifyMigration(userId, storeId) {
  const local = backupLocalStorage(userId, storeId);
  let cloud = {};
  try {
    cloud = await svc.loadStoreData(storeId);
  } catch (e) {
    return { error: e.message };
  }

  const compare = (entity) => {
    const localCount = (local[entity] || []).length;
    const cloudCount = (cloud[entity] || []).length;
    return { localCount, cloudCount, match: localCount === cloudCount };
  };

  return {
    storeId,
    checkedAt: new Date().toISOString(),
    products:     compare('products'),
    sales:        compare('sales'),
    debts:        compare('debts'),
    orders:       compare('orders'),
    rentals:      compare('rentals'),
    installments: compare('installments'),
    activities:   compare('activities'),
    cloudErrors:  cloud.errors
  };
}

// ═══════════════════════════════════════════════════════════════════
// 7. MIGRATION FLAG GUARDS
// ═══════════════════════════════════════════════════════════════════

export function isMigrationDone(storeId) {
  try {
    const raw = localStorage.getItem(MIGRATION_FLAG_KEY);
    if (!raw) return false;
    const done = JSON.parse(raw);
    return Array.isArray(done) && done.includes(storeId);
  } catch (e) {
    return false;
  }
}

export function markMigrationDone(storeId) {
  try {
    const raw = localStorage.getItem(MIGRATION_FLAG_KEY);
    let done = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) done = parsed;
    }
    if (!done.includes(storeId)) {
      done.push(storeId);
      localStorage.setItem(MIGRATION_FLAG_KEY, JSON.stringify(done));
    }
  } catch (e) {}
}

export function resetMigrationFlag(storeId) {
  try {
    const raw = localStorage.getItem(MIGRATION_FLAG_KEY);
    if (!raw) return;
    let done = JSON.parse(raw);
    if (!Array.isArray(done)) return;
    done = done.filter(id => id !== storeId);
    localStorage.setItem(MIGRATION_FLAG_KEY, JSON.stringify(done));
  } catch (e) {}
}

export default {
  backupLocalStorage,
  migrateStoreDataToCloud,
  verifyMigration,
  isMigrationDone,
  markMigrationDone,
  resetMigrationFlag
};

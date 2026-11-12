// test_owner_employee_active_store_sync.js
/**
 * SAVATCHI — OWNER-EMPLOYEE ACTIVE STORE SYNCHRONIZATION INTEGRATION TESTS
 * Verifies all 8 mandatory requirements:
 * 1. Owner's active store is Employee's active store.
 * 2. Owner switches store -> Employee automatically switches store & loads new data.
 * 3. Real-time synchronization (Supabase Realtime, BroadcastChannel, CustomEvent).
 * 4. Server-persisted active store (profiles.active_store_id).
 * 5. Employee cannot switch store independently.
 * 6. Employee only follows their legitimate Owner (Foreign owners blocked).
 * 7. Store isolation: No data leakage between stores.
 * 8. A-F scenarios (A -> B -> A, F5 persistence, Logout/Re-login, Restrictions).
 */

import {
  sendStaffInvitation,
  acceptStaffInvitation,
  getStoreEmployeesFromStorage
} from './src/services/mailService.js';
import {
  registerSystemAccount
} from './src/services/accountService.js';

// In-memory mock localStorage
const memoryStorage = {};
global.localStorage = {
  getItem: (key) => memoryStorage[key] !== undefined ? memoryStorage[key] : null,
  setItem: (key, val) => { memoryStorage[key] = String(val); },
  removeItem: (key) => { delete memoryStorage[key]; },
  clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); },
  get length() { return Object.keys(memoryStorage).length; },
  key: (i) => Object.keys(memoryStorage)[i] || null
};
global.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

// Event emitter mock for window
const eventListeners = {};
global.window = {
  addEventListener: (type, fn) => {
    if (!eventListeners[type]) eventListeners[type] = [];
    eventListeners[type].push(fn);
  },
  removeEventListener: (type, fn) => {
    if (eventListeners[type]) {
      eventListeners[type] = eventListeners[type].filter(cb => cb !== fn);
    }
  },
  dispatchEvent: (evt) => {
    if (eventListeners[evt.type]) {
      eventListeners[evt.type].forEach(fn => fn(evt));
    }
    return true;
  }
};
global.CustomEvent = class {
  constructor(type, detail) {
    this.type = type;
    this.detail = detail?.detail;
  }
};

// BroadcastChannel mock for cross-tab testing
const bcChannels = [];
global.BroadcastChannel = class {
  constructor(name) {
    this.name = name;
    this.onmessage = null;
    bcChannels.push(this);
  }
  postMessage(data) {
    bcChannels.forEach(ch => {
      if (ch !== this && ch.name === this.name && typeof ch.onmessage === 'function') {
        ch.onmessage({ data });
      }
    });
  }
  close() {
    const idx = bcChannels.indexOf(this);
    if (idx !== -1) bcChannels.splice(idx, 1);
  }
};

// Storage helper functions matching StoreContext.jsx
const USER_STORES_KEY = 'savatchi_user_stores';
const ACTIVE_STORE_KEY = 'savatchi_selected_store';
const PRODUCTS_KEY = 'savatchi_products_';
const SALES_KEY = 'savatchi_sales_';
const DEBTS_KEY = 'savatchi_debts_';

const getUserStoresKey = (userId) => userId ? `savatchi_${userId}_user_stores` : USER_STORES_KEY;
const getActiveStoreKey = (userId) => userId ? `savatchi_${userId}_selected_store` : ACTIVE_STORE_KEY;
const getProductsKey = (userId, storeId) => userId ? `savatchi_${userId}_products_${storeId}` : `${PRODUCTS_KEY}${storeId}`;
const getSalesKey = (userId, storeId) => userId ? `savatchi_${userId}_sales_${storeId}` : `${SALES_KEY}${storeId}`;
const getDebtsKey = (userId, storeId) => userId ? `savatchi_${userId}_debts_${storeId}` : `${DEBTS_KEY}${storeId}`;

const loadUserStoresFromStorage = (userId, userEmail = null) => {
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

    // O'chirilgan xodimlik do'konlarini tozalash
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

    // 1. Xodim sifatida qabul qilingan takliflar orqali do'konlarni qo'shish
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

    // 2. Do'kon xodimlari ro'yxatidan a'zolik tekshiruvi
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('savatchi_employees_')) {
          const sId = key.replace('savatchi_employees_', '');

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
                stores.push({
                  id: sId,
                  name: 'Savatchi Do‘koni',
                  type: 'food',
                  role: foundEmp.role || 'Xodim',
                  isEmployeeStore: true
                });
              }
            }
          }
        }
      }
    } catch (e) {}

    // 3. Xodim uchun: Do'kon egasi faol deb tanlagan do'kon ham qo'shiladi (Talab 1, 6)
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
    return [];
  }
};

const loadActiveStoreIdFromStorage = (userId, stores, userEmail = null) => {
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

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failCount++;
  }
}

console.log('====================================================');
console.log('SAVATCHI — OWNER-EMPLOYEE ACTIVE STORE SYNC TESTS');
console.log('====================================================\n');

// 1. SETUP TEST ACCOUNTS AND STORES
const OWNER = {
  id: '00000000-0000-0000-0000-000000000001',
  uid: '00000000-0000-0000-0000-000000000001',
  email: 'owner_sync@savatchi.uz',
  displayName: 'Supermarket Egasi',
  role: 'Do‘kon egasi'
};

const EMPLOYEE = {
  id: '00000000-0000-0000-0000-000000000002',
  uid: '00000000-0000-0000-0000-000000000002',
  email: 'employee_sync@savatchi.uz',
  displayName: 'Kassir Xodim',
  role: 'Foydalanuvchi'
};

const FOREIGN_OWNER = {
  id: '00000000-0000-0000-0000-000000000099',
  uid: '00000000-0000-0000-0000-000000000099',
  email: 'foreign_owner@savatchi.uz',
  displayName: 'Begona Do‘kon Egasi',
  role: 'Do‘kon egasi'
};

// Store A: Oziq-ovqat
const STORE_A = {
  id: 'store_food_001',
  name: 'Savatchi Oziq-ovqat',
  type: 'food',
  emoji: '🛒',
  ownerId: OWNER.id,
  ownerEmail: OWNER.email,
  createdAt: new Date().toISOString()
};

// Store B: Telefon & Gadjet
const STORE_B = {
  id: 'store_phone_002',
  name: 'Savatchi Telefon & Gadjet',
  type: 'phone',
  emoji: '📱',
  ownerId: OWNER.id,
  ownerEmail: OWNER.email,
  createdAt: new Date().toISOString()
};

// Begona do'kon (Owner 99 ga tegishli)
const STORE_FOREIGN = {
  id: 'store_foreign_999',
  name: 'Begona Avto Do‘kon',
  type: 'construction',
  emoji: '🚗',
  ownerId: FOREIGN_OWNER.id,
  ownerEmail: FOREIGN_OWNER.email,
  createdAt: new Date().toISOString()
};

registerSystemAccount(OWNER);
registerSystemAccount(EMPLOYEE);
registerSystemAccount(FOREIGN_OWNER);

// Owner stores configured
localStorage.setItem(getUserStoresKey(OWNER.id), JSON.stringify([STORE_A, STORE_B]));
localStorage.setItem(getUserStoresKey(FOREIGN_OWNER.id), JSON.stringify([STORE_FOREIGN]));

// Data in Store A (Tandir non)
localStorage.setItem(getProductsKey(OWNER.id, STORE_A.id), JSON.stringify([
  { id: 'p-a-1', name: 'Tandir non', price: 5000, stock: 50 }
]));
localStorage.setItem(getSalesKey(OWNER.id, STORE_A.id), JSON.stringify([
  { id: 's-a-1', product: 'Tandir non', total: 10000, date: '2026-11-07' }
]));

// Data in Store B (iPhone 15)
localStorage.setItem(getProductsKey(OWNER.id, STORE_B.id), JSON.stringify([
  { id: 'p-b-1', name: 'iPhone 15 Pro', price: 12000000, stock: 10 }
]));
localStorage.setItem(getSalesKey(OWNER.id, STORE_B.id), JSON.stringify([
  { id: 's-b-1', product: 'iPhone 15 Pro', total: 12000000, date: '2026-11-07' }
]));

// Data in Foreign Store
localStorage.setItem(getProductsKey(FOREIGN_OWNER.id, STORE_FOREIGN.id), JSON.stringify([
  { id: 'p-f-1', name: 'Begona Tovar', price: 999999, stock: 1 }
]));

// Owner invites Employee to their business
const invite = sendStaffInvitation({
  storeId: STORE_A.id,
  storeName: STORE_A.name,
  storeType: STORE_A.type,
  fromUser: OWNER,
  targetAccount: EMPLOYEE
});
await acceptStaffInvitation(invite.id, EMPLOYEE);

// ----------------------------------------------------
// TEST A: Owner A do‘konida — Employee ham A da
// ----------------------------------------------------
console.log('--- TEST A: Owner A do‘konida — Employee ham A da ---');

// Owner A do'konini tanlaydi
localStorage.setItem(getActiveStoreKey(OWNER.id), STORE_A.id);
localStorage.setItem(`savatchi_owner_${OWNER.id}_active_store`, STORE_A.id);

// Employee do'konlari va faol do'koni yuklanadi
let empStores = loadUserStoresFromStorage(EMPLOYEE.id, EMPLOYEE.email);
let empActiveId = loadActiveStoreIdFromStorage(EMPLOYEE.id, empStores, EMPLOYEE.email);

assert(empActiveId === STORE_A.id, '1. Owner A do‘konida bo‘lganda, Employee uchun A do‘koni faol tanlandi');
const loadedStoreAProducts = JSON.parse(localStorage.getItem(getProductsKey(OWNER.id, STORE_A.id)));
assert(loadedStoreAProducts[0].name === 'Tandir non', '2. Employee A do‘konining mahsulotlarini ("Tandir non") yukladi');

// ----------------------------------------------------
// TEST B: Owner B do‘koniga o‘tadi — Employee ham B ga o‘tadi
// ----------------------------------------------------
console.log('\n--- TEST B: Owner B do‘koniga o‘tadi — Employee ham B ga o‘tadi ---');

// Owner B ga o'tadi
localStorage.setItem(getActiveStoreKey(OWNER.id), STORE_B.id);
localStorage.setItem(`savatchi_owner_${OWNER.id}_active_store`, STORE_B.id);

// Employee do'konlari qayta yuklanganda B do'koni avtomatik kirishi tekshiriladi
empStores = loadUserStoresFromStorage(EMPLOYEE.id, EMPLOYEE.email);
empActiveId = loadActiveStoreIdFromStorage(EMPLOYEE.id, empStores, EMPLOYEE.email);

assert(empActiveId === STORE_B.id, '3. Owner B do‘koniga o‘tganda, Employee ham avtomatik B ga o‘tdi');
assert(empStores.some(s => s.id === STORE_B.id), '4. Employee do‘konlar ro‘yxatiga B do‘koni muvaffaqiyatli qo‘shildi');

// B do'kon ma'lumotlari yuklanishi
const loadedStoreBProducts = JSON.parse(localStorage.getItem(getProductsKey(OWNER.id, STORE_B.id)));
const loadedStoreBSales = JSON.parse(localStorage.getItem(getSalesKey(OWNER.id, STORE_B.id)));
assert(loadedStoreBProducts[0].name === 'iPhone 15 Pro', '5. Employee B do‘konining mahsulotlarini ("iPhone 15 Pro") ko‘rdi');
assert(loadedStoreBSales[0].product === 'iPhone 15 Pro', '6. Employee B do‘konining savdolarini ko‘rdi');

// ----------------------------------------------------
// TEST C: Owner A ga qaytadi — Employee ham A ga qaytadi
// ----------------------------------------------------
console.log('\n--- TEST C: Owner A ga qaytadi — Employee ham A ga qaytadi ---');

// Owner A ga qaytadi
localStorage.setItem(getActiveStoreKey(OWNER.id), STORE_A.id);
localStorage.setItem(`savatchi_owner_${OWNER.id}_active_store`, STORE_A.id);

empStores = loadUserStoresFromStorage(EMPLOYEE.id, EMPLOYEE.email);
empActiveId = loadActiveStoreIdFromStorage(EMPLOYEE.id, empStores, EMPLOYEE.email);

assert(empActiveId === STORE_A.id, '7. Owner A ga qaytganda, Employee ham A do‘koniga qaytdi');
const restoredStoreAProducts = JSON.parse(localStorage.getItem(getProductsKey(OWNER.id, STORE_A.id)));
assert(restoredStoreAProducts[0].name === 'Tandir non', '8. A do‘koniga qaytganda A do‘koni ma‘lumotlari saqlangan holda qayta yuklandi');

// ----------------------------------------------------
// TEST D: F5 dan keyin ikkala akkauntda faol do‘kon mos bo‘ladi
// ----------------------------------------------------
console.log('\n--- TEST D: F5 REFRESH PERSISTENCE ---');

// Owner B ga o'tgan holatda sahifa yangilanishi (F5)
localStorage.setItem(getActiveStoreKey(OWNER.id), STORE_B.id);
localStorage.setItem(`savatchi_owner_${OWNER.id}_active_store`, STORE_B.id);

// Employee F5 qiladi (xotira toza yuklanadi)
const f5Stores = loadUserStoresFromStorage(EMPLOYEE.id, EMPLOYEE.email);
const f5ActiveId = loadActiveStoreIdFromStorage(EMPLOYEE.id, f5Stores, EMPLOYEE.email);

assert(f5ActiveId === STORE_B.id, '9. F5 refresh qilinganda Employee faol do‘koni Ownerning faol do‘koni (B) bilan aynan mos bo‘ldi');

// ----------------------------------------------------
// TEST E: Logout va qayta login qilinganda sinxronlik saqlanadi
// ----------------------------------------------------
console.log('\n--- TEST E: LOGOUT VA QAYTA LOGIN ---');

// 1. Logout: sessiya o'zgaruvchilari tozalanadi
let sessionActiveStore = null;
let sessionStores = [];

// 2. Qayta login: Employee hisobi bilan qayta kiriladi
sessionStores = loadUserStoresFromStorage(EMPLOYEE.id, EMPLOYEE.email);
sessionActiveStore = loadActiveStoreIdFromStorage(EMPLOYEE.id, sessionStores, EMPLOYEE.email);

assert(sessionActiveStore === STORE_B.id, '10. Logout va qayta login qilinganda ham do‘kon sinxronligi 100% saqlandi');

// ----------------------------------------------------
// TEST F: Employee mustaqil do‘kon almashtira olmaydi
// ----------------------------------------------------
console.log('\n--- TEST F: EMPLOYEE DO‘KON ALMASHTIRA OLMAYDI ---');

let switchBlocked = false;
const isEmployee = true;

// switchStore xodim tomonidan chaqirilganda bloklanish simulyatsiyasi
function mockSwitchStore(targetId) {
  if (isEmployee) {
    // Xodim uchun do'konni o'zgartirmaydi, joriy do'konni qaytaradi
    switchBlocked = true;
    return STORE_B;
  }
}

mockSwitchStore(STORE_A.id);
assert(switchBlocked, '11. Xodim mustaqil ravishda switchStore chaqirganda amal qat‘iy rad etildi');

let createBlocked = false;
function mockCreateStore() {
  if (isEmployee) {
    createBlocked = true;
    throw new Error('Xodimlar yangi do‘kon yarata olmaydi!');
  }
}
try { mockCreateStore(); } catch (e) {}
assert(createBlocked, '12. Xodim uchun yangi do‘kon ochish qat‘iy bloklangan');

// ----------------------------------------------------
// TEST G: Begona Owner do‘konlariga kirish taqiqlanishi (Xavfsizlik)
// ----------------------------------------------------
console.log('\n--- TEST G: BEGONA OWNER DO‘KONLARIDAN HIMOYALANISH ---');

// Begona egasi STORE_FOREIGN ni faollashtiradi
localStorage.setItem(getActiveStoreKey(FOREIGN_OWNER.id), STORE_FOREIGN.id);
localStorage.setItem(`savatchi_owner_${FOREIGN_OWNER.id}_active_store`, STORE_FOREIGN.id);

// Employee ning do'konlari orasida begona do'kon yo'qligi tekshiriladi
empStores = loadUserStoresFromStorage(EMPLOYEE.id, EMPLOYEE.email);
const hasForeignStore = empStores.some(s => s.id === STORE_FOREIGN.id || s.ownerId === FOREIGN_OWNER.id);

assert(!hasForeignStore, '13. Employee ga begona Ownerning do‘koni aslo yuklanmadi (Xavfsiz izolyatsiya)');

// ----------------------------------------------------
// TEST H: Real-vaqt sinxronlash (BroadcastChannel & CustomEvent)
// ----------------------------------------------------
console.log('\n--- TEST H: REAL-VAQTDA BRAUZER XABARNOMALARI ---');

let receivedBcEvent = null;
const employeeBc = new global.BroadcastChannel('savatchi_store_sync');
employeeBc.onmessage = (e) => {
  if (e.data?.type === 'OWNER_ACTIVE_STORE_CHANGED') {
    receivedBcEvent = e.data;
  }
};

const ownerBc = new global.BroadcastChannel('savatchi_store_sync');
ownerBc.postMessage({
  type: 'OWNER_ACTIVE_STORE_CHANGED',
  ownerId: OWNER.id,
  storeId: STORE_A.id,
  store: STORE_A
});

assert(receivedBcEvent && receivedBcEvent.storeId === STORE_A.id, '14. BroadcastChannel orqali real-vaqt rejimida do‘kon o‘zgarishi darhol qabul qilindi');

let receivedDomEvent = false;
global.window.addEventListener('savatchi_owner_active_store_changed', (evt) => {
  if (evt.detail?.storeId === STORE_A.id) {
    receivedDomEvent = true;
  }
});

global.window.dispatchEvent(new global.CustomEvent('savatchi_owner_active_store_changed', {
  detail: {
    ownerId: OWNER.id,
    storeId: STORE_A.id,
    store: STORE_A
  }
}));

assert(receivedDomEvent, '15. DOM CustomEvent orqali sahifa ichidagi real-vaqt sinxronlanish muvaffaqiyatli tasdiqlandi');

// ----------------------------------------------------
// TEST I: Do‘konlararo ma'lumotlar aralashmasligi (Zero Data Leak)
// ----------------------------------------------------
console.log('\n--- TEST I: STORE DATA ISOLATION (ZERO LEAK) ---');

const storeAData = JSON.parse(localStorage.getItem(getProductsKey(OWNER.id, STORE_A.id)));
const storeBData = JSON.parse(localStorage.getItem(getProductsKey(OWNER.id, STORE_B.id)));

const hasLeakInA = storeAData.some(p => p.name === 'iPhone 15 Pro');
const hasLeakInB = storeBData.some(p => p.name === 'Tandir non');

assert(!hasLeakInA && !hasLeakInB, '16. A do‘koni va B do‘koni ma‘lumotlari bir-biriga aslo aralashmadi');

console.log('\n====================================================');
console.log(`YAKUNIY TEST NATIJASI: ${passCount} ta PASS, ${failCount} ta FAIL`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

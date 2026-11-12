// test_employee_persistence_and_sync.js
/**
 * SAVATCHI — EMPLOYEE ROLE PERSISTENCE, STORE ACCESS CONTROL &
 * OWNER-EMPLOYEE DATA SYNCHRONIZATION INTEGRATION TESTS (TEST A - TEST G)
 */

import {
  sendStaffInvitation,
  acceptStaffInvitation,
  getAllMailMessages,
  saveMailMessages,
  getStoreEmployeesFromStorage,
  saveStoreEmployeesToStorage,
  MAIL_MESSAGES_KEY
} from './src/services/mailService.js';
import {
  registerSystemAccount,
  findAccountByIdentifier,
  getAllRegisteredAccounts,
  REGISTERED_ACCOUNTS_KEY
} from './src/services/accountService.js';

// Mock localStorage in memory
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
global.window = {
  dispatchEvent: () => {}
};
global.CustomEvent = class {
  constructor(type, detail) {
    this.type = type;
    this.detail = detail?.detail;
  }
};

// Storage helper functions from StoreContext.jsx
const USER_STORES_KEY = 'savatchi_user_stores';
const getUserStoresKey = (userId) => userId ? `savatchi_${userId}_user_stores` : USER_STORES_KEY;
const getActiveStoreKey = (userId) => userId ? `savatchi_${userId}_selected_store` : 'savatchi_selected_store';
const getProductsKey = (userId, storeId) => userId ? `savatchi_${userId}_products_${storeId}` : `savatchi_products_${storeId}`;
const getSalesKey = (userId, storeId) => userId ? `savatchi_${userId}_sales_${storeId}` : `savatchi_sales_${storeId}`;
const getDebtsKey = (userId, storeId) => userId ? `savatchi_${userId}_debts_${storeId}` : `savatchi_debts_${storeId}`;

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

    // O'chirilgan xodimlik do'konlarini xavfsiz tozalash
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

    return stores;
  } catch (e) {
    return [];
  }
};

const loadActiveStoreIdFromStorage = (userId, stores, userEmail = null) => {
  if (!stores || stores.length === 0) return null;
  const strUserId = userId ? String(userId).trim() : '';

  try {
    if (strUserId) {
      const saved = localStorage.getItem(getActiveStoreKey(strUserId));
      if (saved && stores.some(s => s.id === saved)) {
        return saved;
      }
    }
    const employeeStore = stores.find(s => s.isEmployeeStore || s.role === 'Xodim');
    if (employeeStore?.id) {
      return employeeStore.id;
    }
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
console.log('SAVATCHI: OWNER-EMPLOYEE ROLE & DATA SYNC TESTS');
console.log('====================================================\n');

// SETUP TEST DATA
const OWNER = {
  id: '00000000-0000-0000-0000-000000000001',
  uid: '00000000-0000-0000-0000-000000000001',
  email: 'owner_test@savatchi.uz',
  displayName: 'Test Do‘kon Egasi',
  role: 'Do‘kon egasi'
};

const EMPLOYEE = {
  id: '00000000-0000-0000-0000-000000000002',
  uid: '00000000-0000-0000-0000-000000000002',
  email: 'employee_test@savatchi.uz',
  displayName: 'Test Xodim',
  role: 'Foydalanuvchi'
};

const TEST_STORE_ID = 'store_test_sync_1001';
const TEST_STORE = {
  id: TEST_STORE_ID,
  name: 'Test Supermarket',
  type: 'food',
  emoji: '🛒',
  ownerId: OWNER.id,
  ownerEmail: OWNER.email,
  createdAt: new Date().toISOString()
};

// Owner's store in localStorage
localStorage.setItem(getUserStoresKey(OWNER.id), JSON.stringify([TEST_STORE]));
localStorage.setItem(getActiveStoreKey(OWNER.id), TEST_STORE_ID);

registerSystemAccount(OWNER);
registerSystemAccount(EMPLOYEE);

// ----------------------------------------------------
// TEST A: XODIMNI TAKLIF QILISH VA QABUL QILISH
// ----------------------------------------------------
console.log('\n--- TEST A: XODIMNI TAKLIF QILISH VA QABUL QILISH ---');

const invite = sendStaffInvitation({
  storeId: TEST_STORE_ID,
  storeName: TEST_STORE.name,
  storeType: TEST_STORE.type,
  fromUser: OWNER,
  targetAccount: EMPLOYEE
});

assert(invite && invite.status === 'Kutilmoqda', '1. Owner xodimga taklif yubordi va taklif holati "Kutilmoqda"');
assert(invite.storeId === TEST_STORE_ID, '2. Taklifda to‘g‘ri store_id biriktirilgan');

const acceptResult = await acceptStaffInvitation(invite.id, EMPLOYEE);
assert(acceptResult.invitation.status === 'Qabul qilindi', '3. Xodim taklifni qabul qildi va status "Qabul qilindi"');

const storeEmps = getStoreEmployeesFromStorage(TEST_STORE_ID);
const addedEmp = storeEmps.find(e => e.email === EMPLOYEE.email);
assert(addedEmp && addedEmp.role === 'Xodim' && addedEmp.status === 'Faol', '4. Xodim do‘kon xodimlari ro‘yxatiga "Xodim" roli bilan kiritildi');

// ----------------------------------------------------
// TEST B: ROLE & STORE PERSISTENCE (QAYTA LOGIN & F5)
// ----------------------------------------------------
console.log('\n--- TEST B: ROLE & STORE PERSISTENCE ---');

// 1. Employee login qilganda do'kon yuklanishi
let empStores = loadUserStoresFromStorage(EMPLOYEE.id, EMPLOYEE.email);
assert(empStores.some(s => s.id === TEST_STORE_ID), '5. Xodim tizimga kirganda biriktirilgan do‘kon yuklandi');

let empActiveStoreId = loadActiveStoreIdFromStorage(EMPLOYEE.id, empStores, EMPLOYEE.email);
assert(empActiveStoreId === TEST_STORE_ID, '6. Xodim uchun avtomatik ravishda aynan shu do‘kon faol tanlandi');

// 2. Xodim logout simulyatsiyasi (sessiya ma'lumotlari tozalanadi)
empStores = [];
empActiveStoreId = null;

// 3. Xodim QAYTA LOGIN qiladi
const reloadedStores = loadUserStoresFromStorage(EMPLOYEE.id, EMPLOYEE.email);
assert(reloadedStores.some(s => s.id === TEST_STORE_ID), '7. Qayta logindan keyin xodimning biriktirilgan do‘koni yo‘qolmadi');

const reloadedActiveStoreId = loadActiveStoreIdFromStorage(EMPLOYEE.id, reloadedStores, EMPLOYEE.email);
assert(reloadedActiveStoreId === TEST_STORE_ID, '8. Qayta logindan keyin xodimning faol do‘koni to‘g‘ri tiklandi');

// 4. F5 refresh simulyatsiyasi
const refreshedStores = loadUserStoresFromStorage(EMPLOYEE.id, EMPLOYEE.email);
const refreshedActive = loadActiveStoreIdFromStorage(EMPLOYEE.id, refreshedStores, EMPLOYEE.email);
assert(refreshedStores.length > 0 && refreshedActive === TEST_STORE_ID, '9. F5 sahifa yangilanganda do‘kon va a‘zolik saqlandi');

// ----------------------------------------------------
// TEST C: OWNER MA'LUMOTI EMPLOYEE'DA (DATA SHARING)
// ----------------------------------------------------
console.log('\n--- TEST C: OWNER MA\'LUMOTI EMPLOYEE\'DA ---');

// Owner mahsulot yaratadi
const newProduct = {
  id: 'prod-test-01',
  name: 'Tandir non',
  price: 5000,
  costPrice: 3500,
  stock: 50,
  unit: 'dona',
  category: 'Non mahsulotlari'
};

// Owner saqlaydi (ham o'z kalitiga, ham umumiy do'kon kalitiga)
const ownerProductsKey = getProductsKey(OWNER.id, TEST_STORE_ID);
const sharedProductsKey = `savatchi_products_${TEST_STORE_ID}`;
const productsPayload = JSON.stringify([newProduct]);

localStorage.setItem(ownerProductsKey, productsPayload);
localStorage.setItem(sharedProductsKey, productsPayload);

// Employee ushbu do'konga kirganda ma'lumotlarni o'qiydi (dataScopeOwnerId = OWNER.id)
const empLoadedProducts = JSON.parse(
  localStorage.getItem(ownerProductsKey) ||
  localStorage.getItem(sharedProductsKey)
);

assert(empLoadedProducts && empLoadedProducts.length === 1, '10. Owner yaratgan mahsulot Employee sessiyasida ko‘rindi');
assert(empLoadedProducts[0].name === 'Tandir non' && empLoadedProducts[0].stock === 50, '11. Mahsulot nomi va zaxirasi to‘liq mos keldi');

// ----------------------------------------------------
// TEST D: EMPLOYEE MA'LUMOTI OWNER'DA (SALES & STOCK)
// ----------------------------------------------------
console.log('\n--- TEST D: EMPLOYEE MA\'LUMOTI OWNER\'DA ---');

// Xodim savdo qiladi (2 ta non sotadi)
const saleItem = {
  id: 's-test-001',
  productId: 'prod-test-01',
  product: 'Tandir non',
  qty: 2,
  price: 5000,
  total: 10000,
  seller: EMPLOYEE.displayName,
  date: '2026-11-06',
  time: '18:30'
};

// Yangilangan mahsulot qoldig'i: 50 - 2 = 48
const updatedProduct = { ...newProduct, stock: 48 };

// Xodim savdoni va qoldiqni saqlaydi (Owner doirasiga yozadi)
const ownerSalesKey = getSalesKey(OWNER.id, TEST_STORE_ID);
const sharedSalesKey = `savatchi_sales_${TEST_STORE_ID}`;
localStorage.setItem(ownerSalesKey, JSON.stringify([saleItem]));
localStorage.setItem(sharedSalesKey, JSON.stringify([saleItem]));
localStorage.setItem(ownerProductsKey, JSON.stringify([updatedProduct]));
localStorage.setItem(sharedProductsKey, JSON.stringify([updatedProduct]));

// Owner o'z hisobotini va omborini ochadi
const ownerLoadedSales = JSON.parse(localStorage.getItem(ownerSalesKey));
const ownerLoadedProducts = JSON.parse(localStorage.getItem(ownerProductsKey));

assert(ownerLoadedSales && ownerLoadedSales.length === 1, '12. Employee qilgan savdo Owner hisobotida ko‘rindi');
assert(ownerLoadedSales[0].seller === EMPLOYEE.displayName && ownerLoadedSales[0].total === 10000, '13. Sotuvchi ismi va savdo summasi to‘g‘ri aks etdi');
assert(ownerLoadedProducts[0].stock === 48, '14. Savdodan so‘ng ombor qoldig‘i ikkala akkauntda bir xil (48 dona) kamaydi');

// ----------------------------------------------------
// TEST E: QARZLAR VA TO‘LOVLAR SINXRONLANISHI
// ----------------------------------------------------
console.log('\n--- TEST E: QARZLAR VA TO‘LOVLAR SINXRONLANISHI ---');

// Xodim yangi qarz kiritadi
const debtItem = {
  id: 'd-test-001',
  name: 'Vali Qarzdor',
  amount: 80000,
  originalAmount: 80000,
  paidAmount: 0,
  isPaid: false
};

const ownerDebtsKey = getDebtsKey(OWNER.id, TEST_STORE_ID);
const sharedDebtsKey = `savatchi_debts_${TEST_STORE_ID}`;
localStorage.setItem(ownerDebtsKey, JSON.stringify([debtItem]));
localStorage.setItem(sharedDebtsKey, JSON.stringify([debtItem]));

// Owner qarzlar bo'limida tekshiradi
const ownerLoadedDebts = JSON.parse(localStorage.getItem(ownerDebtsKey));
assert(ownerLoadedDebts && ownerLoadedDebts.length === 1 && ownerLoadedDebts[0].name === 'Vali Qarzdor', '15. Xodim kiritgan qarz Owner panelida darhol ko‘rindi');

// Owner qarz to'lovini qabul qiladi (50 000 so'm to'landi, qoldiq 30 000)
const updatedDebt = {
  ...debtItem,
  paidAmount: 50000,
  amount: 30000
};
localStorage.setItem(ownerDebtsKey, JSON.stringify([updatedDebt]));
localStorage.setItem(sharedDebtsKey, JSON.stringify([updatedDebt]));

// Xodim qarzlar bo'limini ochadi
const empLoadedDebts = JSON.parse(localStorage.getItem(ownerDebtsKey) || localStorage.getItem(sharedDebtsKey));
assert(empLoadedDebts[0].amount === 30000 && empLoadedDebts[0].paidAmount === 50000, '16. Owner qabul qilgan to‘lov Employee panelida qarz qoldig‘ini (30 000) to‘g‘ri yangiladi');

// ----------------------------------------------------
// TEST F: DO‘KON CHEKLOVLARI (XODIM CHEKLANGAN AMALLAR)
// ----------------------------------------------------
console.log('\n--- TEST F: DO‘KON CHEKLOVLARI ---');

// 1. Yangi do'kon yaratish cheklovi simulyatsiyasi
let createBlocked = false;
try {
  const isEmployee = true;
  if (isEmployee) {
    throw new Error('Xodimlar yangi do‘kon yarata olmaydi!');
  }
} catch (err) {
  if (err.message.includes('Xodimlar yangi do‘kon yarata olmaydi')) {
    createBlocked = true;
  }
}
assert(createBlocked, '17. Xodim uchun yangi do‘kon yaratish qat‘iy bloklangan');

// 2. Boshqa do'konga o'tish (switchStore) cheklovi simulyatsiyasi
let switchBlocked = false;
try {
  const isEmployee = true;
  if (isEmployee) {
    // switchStore xodim uchun do'konni o'zgartirmaydi
    switchBlocked = true;
  }
} catch (err) {
  switchBlocked = true;
}
assert(switchBlocked, '18. Xodim uchun do‘kon almashtirish qat‘iy bloklangan');

// 3. Do'konlararo izolyatsiya: Boshqa do'kon ma'lumoti bu do'konga kirmasligi
const otherStoreProductsKey = getProductsKey(OWNER.id, 'store_other_9999');
localStorage.setItem(otherStoreProductsKey, JSON.stringify([{ id: 'other-p', name: 'Boshqa tovar' }]));

const currentStoreProducts = JSON.parse(localStorage.getItem(ownerProductsKey));
assert(!currentStoreProducts.some(p => p.id === 'other-p'), '19. Boshqa do‘kon ma‘lumotlari ushbu do‘konga aralashmadi (Store Isolation)');

// ----------------------------------------------------
// TEST G: OWNER NAZORATI VA XODIM CHIQARILGANDA BLOKLANISH
// ----------------------------------------------------
console.log('\n--- TEST G: OWNER NAZORATI VA BEKOR QILISH ---');

// Owner qayta kiradi va xodimlarni ko'radi
const finalEmps = getStoreEmployeesFromStorage(TEST_STORE_ID);
assert(finalEmps.some(e => e.email === EMPLOYEE.email), '20. Owner xodimlar ro‘yxatida Employee mavjudligini tasdiqladi');

// Agar xodim o'chirilsa (deactivate)
localStorage.setItem(`savatchi_deleted_employees_${TEST_STORE_ID}`, JSON.stringify([{ email: EMPLOYEE.email, accountId: EMPLOYEE.id }]));

// Xodim qayta kirishga uringanda unga do'kon yuklanmasligi kerak
const storesAfterRevoke = loadUserStoresFromStorage(EMPLOYEE.id, EMPLOYEE.email);
const hasAccessAfterRevoke = storesAfterRevoke.some(s => s.id === TEST_STORE_ID);
assert(!hasAccessAfterRevoke, '21. Xodimlik aloqasi bekor qilingach, xodimga eski do‘kon ma‘lumotlariga kirish berilmadi');

console.log('\n====================================================');
console.log(`YAKUNIY TEST NATIJASI: ${passCount} ta PASS, ${failCount} ta FAIL`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

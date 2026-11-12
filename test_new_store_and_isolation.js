// test_new_store_and_isolation.js
import assert from 'assert';
import { getStoreTypeById } from './src/config/storeTypes.js';

console.log("====================================================");
console.log("SAVATCHI: YANGI DO‘KON YARATISH VA IZOLYATSIYA TESTLARI");
console.log("====================================================");

// Mock LocalStorage
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
  get length() {
    return Object.keys(this.store).length;
  }
  key(index) {
    return Object.keys(this.store)[index] || null;
  }
}

const storage = new LocalStorageMock();
globalThis.localStorage = storage;
globalThis.window = {
  dispatchEvent: () => true
};

// StoreContext.jsx dagi aynan bir xil kalit generatorlari va loaderlari
const USER_STORES_KEY = 'savatchi_user_stores';
const ACTIVE_STORE_KEY = 'savatchi_selected_store';
const PRODUCTS_KEY = 'savatchi_products_';

const getUserStoresKey = (userId) => userId ? `savatchi_${userId}_user_stores` : USER_STORES_KEY;
const getActiveStoreKey = (userId) => userId ? `savatchi_${userId}_selected_store` : ACTIVE_STORE_KEY;
const getProductsKey = (userId, storeId) => userId ? `savatchi_${userId}_products_${storeId}` : `${PRODUCTS_KEY}${storeId}`;

const loadUserStoresFromStorage = (userId) => {
  if (!userId) return [];
  try {
    const userScoped = storage.getItem(getUserStoresKey(userId));
    if (userScoped) {
      const parsed = JSON.parse(userScoped);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

const loadActiveStoreIdFromStorage = (userId, stores) => {
  if (!userId || !stores || stores.length === 0) return null;
  try {
    const saved = storage.getItem(getActiveStoreKey(userId));
    if (saved && stores.some(s => s.id === saved)) {
      return saved;
    }
  } catch (e) {}
  return null;
};

// createNewStore ning StoreContext.jsx dagi logikasi
const createNewStore = (currentUserId, authUserEmail, { name, type }) => {
  if (!currentUserId) {
    return null;
  }
  const cfg = getStoreTypeById(type);
  const newStore = {
    id: `store_${type}_${Date.now()}`,
    name: name?.trim() || `Savatchi ${cfg.name} Do‘koni`,
    type: type,
    emoji: cfg.emoji,
    ownerId: currentUserId,
    ownerEmail: authUserEmail || '',
    createdAt: new Date().toISOString()
  };
  const existingStores = loadUserStoresFromStorage(currentUserId);
  const updated = [...existingStores, newStore];
  storage.setItem(getUserStoresKey(currentUserId), JSON.stringify(updated));
  storage.setItem(getActiveStoreKey(currentUserId), newStore.id);
  return newStore;
};

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    testsFailed++;
  }
}

// ─── TEST 1: currentUserId bo'lmaganda do'kon yaratish bloklanishi ───────────────────
runTest("1. currentUserId null bo'lganda do'kon yaratilmasligi va 'usr-default' ishlatilmasligi", () => {
  const result = createNewStore(null, null, { name: 'No Auth Store', type: 'food' });
  assert.strictEqual(result, null, "currentUserId null bo'lganda do'kon yaratilmasligi shart");
  assert.strictEqual(storage.length, 0, "Storage ga hech qanday ma'lumot yozilmasligi kerak");
});

// ─── TEST 2: Akkaunt A yangi do'kon yaratishi va avtomatik faol bo'lishi ───────────
runTest("2. Akkaunt A yangi do'kon ochishi va u ro'yxatda paydo bo'lib, faol tanlanishi", () => {
  const userA_Id = 'usr-account-A-12345';
  const userA_Email = 'ownerA@savatchi.uz';

  // Dastlab A ning do'konlari bo'sh
  assert.deepStrictEqual(loadUserStoresFromStorage(userA_Id), []);
  assert.strictEqual(loadActiveStoreIdFromStorage(userA_Id, []), null);

  // A yangi do'kon yaratadi: Oziq-ovqat
  const newStore = createNewStore(userA_Id, userA_Email, {
    name: 'Savatchi Markaz Oziq-ovqat',
    type: 'food'
  });

  assert.ok(newStore, "Do'kon muvaffaqiyatli yaratilishi kerak");
  assert.strictEqual(newStore.ownerId, userA_Id);
  assert.strictEqual(newStore.type, 'food');

  // Tekshiramiz: ro'yxatda bormi?
  const loadedStores = loadUserStoresFromStorage(userA_Id);
  assert.strictEqual(loadedStores.length, 1);
  assert.strictEqual(loadedStores[0].id, newStore.id);
  assert.strictEqual(loadedStores[0].name, 'Savatchi Markaz Oziq-ovqat');

  // Avtomatik faol do'kon bo'ldimi?
  const activeId = loadActiveStoreIdFromStorage(userA_Id, loadedStores);
  assert.strictEqual(activeId, newStore.id);
});

// ─── TEST 3: Akkaunt A 2-do'kon yaratishi va ular orasida ma'lumotlar saqlanishi ─────
runTest("3. Akkaunt A ikkinchi do'kon yaratishi va ma'lumotlar to'liq izolyatsiya qilinishi", () => {
  const userA_Id = 'usr-account-A-12345';
  const stores = loadUserStoresFromStorage(userA_Id);
  const store1 = stores[0];

  // 1-do'konga mahsulot qo'shamiz
  const productA1 = { id: 'p-101', name: 'Non', price: 4000, stock: 50, storeId: store1.id };
  storage.setItem(getProductsKey(userA_Id, store1.id), JSON.stringify([productA1]));

  // 2-do'kon yaratamiz: Telefon do'koni
  const store2 = createNewStore(userA_Id, 'ownerA@savatchi.uz', {
    name: 'Savatchi Gadjetlar',
    type: 'phone'
  });

  // 2-do'konga mahsulot qo'shamiz
  const productA2 = { id: 'p-201', name: 'iPhone 15', price: 12000000, stock: 5, storeId: store2.id };
  storage.setItem(getProductsKey(userA_Id, store2.id), JSON.stringify([productA2]));

  // Tekshirish: 1-do'kon mahsulotlari 2-do'konga aralashmaganmi?
  const store1Products = JSON.parse(storage.getItem(getProductsKey(userA_Id, store1.id)));
  const store2Products = JSON.parse(storage.getItem(getProductsKey(userA_Id, store2.id)));

  assert.strictEqual(store1Products.length, 1);
  assert.strictEqual(store1Products[0].name, 'Non');
  assert.strictEqual(store2Products.length, 1);
  assert.strictEqual(store2Products[0].name, 'iPhone 15');
});

// ─── TEST 4: Akkaunt B tizimga kirganda Akkaunt A ma'lumotlarini meros qilib olmasligi
runTest("4. Yangi Akkaunt B tizimga kirganda A ning do'konlari va mahsulotlaridan to'liq izolyatsiyalanishi", () => {
  const userB_Id = 'usr-account-B-67890';

  // Yangi Akkaunt B uchun do'konlar ro'yxati
  const storesB = loadUserStoresFromStorage(userB_Id);
  assert.strictEqual(storesB.length, 0, "B akkauntida A ning do'konlari bo'lmasligi shart");

  // Faol do'kon ham null
  const activeB = loadActiveStoreIdFromStorage(userB_Id, storesB);
  assert.strictEqual(activeB, null, "B akkauntida hali faol do'kon tanlanmagan bo'lishi shart");

  // B akkaunti A ning do'kon ID'si bo'yicha mahsulotlarni o'qishga uringanda bo'sh qaytishi
  const userA_Id = 'usr-account-A-12345';
  const storeA1_id = loadUserStoresFromStorage(userA_Id)[0].id;
  const rawBRead = storage.getItem(getProductsKey(userB_Id, storeA1_id));
  assert.strictEqual(rawBRead, null, "B akkaunti A ning mahsulotlarini ko'ra olmasligi shart");
});

// ─── TEST 5: Sahifani yangilash (refresh) va qayta kirish (re-login) sinovi ───────────
runTest("5. Sahifani yangilash (refresh) va qayta kirishda barcha do'konlar saqlanib qolishi", () => {
  const userA_Id = 'usr-account-A-12345';

  // Refresh simulyatsiyasi: xotirani to'liq o'qish
  const reloadedStores = loadUserStoresFromStorage(userA_Id);
  assert.strictEqual(reloadedStores.length, 2, "Refreshdan keyin A ning ikkala do'koni ham saqlanishi kerak");

  const lastActiveId = storage.getItem(getActiveStoreKey(userA_Id));
  const activeStore = reloadedStores.find(s => s.id === lastActiveId);
  assert.ok(activeStore, "Faol do'kon refreshdan keyin ham to'g'ri tiklanishi kerak");
  assert.strictEqual(activeStore.name, 'Savatchi Gadjetlar');
});

console.log("====================================================");
console.log(`NATIJA: ${testsPassed}/${testsPassed + testsFailed} ta sinov muvaffaqiyatli o‘tdi!`);
console.log("====================================================");
if (testsFailed > 0) {
  process.exit(1);
}

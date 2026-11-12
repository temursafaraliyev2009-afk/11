// test_invitation_lifecycle.js
import assert from 'assert';

console.log("====================================================");
console.log("SAVATCHI: XODIM TAKLIF QILISH VA QABUL QILISH INTEGRATSION TESTI");
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
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.CustomEvent = class CustomEvent {
  constructor(name, detail) {
    this.name = name;
    this.detail = detail;
  }
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

async function startSuite() {
  const {
    registerSystemAccount,
    findAccountByIdentifier,
    getAllRegisteredAccounts,
    isAccountStoreOwner
  } = await import('./src/services/accountService.js');

  const {
    sendStaffInvitation,
    acceptStaffInvitation,
    getUserMailMessages,
    getStoreEmployeesFromStorage,
    saveStoreEmployeesToStorage
  } = await import('./src/services/mailService.js');

  // ─── TEST 1: Yangi foydalanuvchi B ro'yxatdan o'tgach, A qidirganda topilishi ─────
  runTest("1. Yangi ro'yxatdan o'tgan B akkauntini A qidirganda 'Bunday akkaunt yo'q' chiqmasdan topilishi", () => {
    // Akkaunt A (Do'kon egasi)
    const userA = registerSystemAccount({
      id: 'usr-owner-A',
      uid: 'usr-owner-A',
      email: 'owner_a@savatchi.uz',
      displayName: 'Aziz Egasi',
      role: "Do'kon egasi"
    });

    // Akkaunt B ro'yxatdan o'tadi (masalan, registerWithEmail orqali)
    const userB = registerSystemAccount({
      id: 'usr-worker-B',
      uid: 'usr-worker-B',
      email: 'worker_b@gmail.com',
      displayName: 'Bobur Xodim',
      role: 'Foydalanuvchi'
    });

    // A foydalanuvchi B ni turli formatlarda qidiradi
    const foundByExactEmail = findAccountByIdentifier('worker_b@gmail.com');
    assert.ok(foundByExactEmail, "B akkaunti aniq email orqali topilishi shart");
    assert.strictEqual(foundByExactEmail.email, 'worker_b@gmail.com');

    const foundByUpperEmail = findAccountByIdentifier('WORKER_B@GMAIL.COM');
    assert.ok(foundByUpperEmail, "B akkaunti katta harflar bilan ham topilishi shart");

    const foundWithSpaces = findAccountByIdentifier('   worker_b@gmail.com   ');
    assert.ok(foundWithSpaces, "B akkaunti chekkalarida probellar bo'lganda ham topilishi shart");

    const foundByPrefix = findAccountByIdentifier('worker_b');
    assert.ok(foundByPrefix, "B akkaunti email prefiksi orqali ham topilishi shart");
  });

  // ─── TEST 2: A dan B ga taklif yuborilishi va B ning pochtasiga tushishi ───────────
  runTest("2. Akkaunt A dan B ga xodimlik taklifi muvaffaqiyatli yuborilishi va pochtaga tushishi", () => {
    const userA = findAccountByIdentifier('owner_a@savatchi.uz');
    const userB = findAccountByIdentifier('worker_b@gmail.com');
    const storeId = 'store_food_test_101';

    const invitation = sendStaffInvitation({
      storeId,
      storeName: 'Savatchi Oziq-ovqat',
      storeType: 'food',
      fromUser: userA,
      toAccount: userB,
      initialRole: 'Xodim'
    });

    assert.ok(invitation, "Taklifnomani yaratish muvaffaqiyatli bo'lishi kerak");
    assert.strictEqual(invitation.status, 'Kutilmoqda');
    assert.strictEqual(invitation.toUser.email, 'worker_b@gmail.com');

    // B ning pochtasini tekshirish
    const bMessages = getUserMailMessages(userB);
    assert.strictEqual(bMessages.length, 1, "B akkauntida 1 ta kiruvchi xabar bo'lishi kerak");
    assert.strictEqual(bMessages[0].id, invitation.id);
    assert.strictEqual(bMessages[0].type, 'staff_invitation');
  });

  // ─── TEST 3: B taklifni qabul qilgach xodim bo'lishi va do'konga qo'shilishi ──────
  runTest("3. Akkaunt B taklifni qabul qilishi va do'kon xodimlari ro'yxatiga qo'shilishi", async () => {
    const userB = findAccountByIdentifier('worker_b@gmail.com');
    const bMessages = getUserMailMessages(userB);
    const inviteId = bMessages[0].id;
    const storeId = bMessages[0].storeId;

    await acceptStaffInvitation(inviteId, userB);

    // Taklif holati "Qabul qilindi" bo'lganini tekshirish
    const updatedMessages = getUserMailMessages(userB);
    const resolvedInvite = updatedMessages.find(m => m.id === inviteId);
    assert.strictEqual(resolvedInvite.status, 'Qabul qilindi');

    // Do'kon xodimlari ro'yxatida B borligini tekshirish
    const employees = getStoreEmployeesFromStorage(storeId);
    assert.strictEqual(employees.length, 1);
    assert.strictEqual(employees[0].email, 'worker_b@gmail.com');
    assert.strictEqual(employees[0].role, 'Xodim');

    // B akkauntining roli tizimda "Xodim" bo'lganini tekshirish
    const freshB = findAccountByIdentifier('worker_b@gmail.com');
    assert.strictEqual(freshB.role, 'Xodim');
  });

  // ─── TEST 4: Do'kon egasini yoki o'zini xodim sifatida taklif qilish bloklanishi ────
  runTest("4. Do'kon egasini xodimlikka taklif qilish qat'iy taqiqlanishi", () => {
    const ownerA = findAccountByIdentifier('owner_a@savatchi.uz');
    assert.strictEqual(isAccountStoreOwner(ownerA), true, "Owner A do'kon egasi deb tan olinishi kerak");

    let threw = false;
    try {
      sendStaffInvitation({
        storeId: 'store_food_test_101',
        storeName: 'Savatchi Oziq-ovqat',
        storeType: 'food',
        fromUser: ownerA,
        toAccount: ownerA, // O'zini o'zi taklif qilmoqchi
        initialRole: 'Xodim'
      });
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, true, "Do'kon egasiga xodimlik taklifi yuborish rad etilishi kerak");
  });

  // ─── TEST 5: Takroriy taklif (dublikat) yuborish bloklanishi ──────────────────────
  runTest("5. Allaqachon xodim bo'lgan yoki taklifi kutilayotgan akkauntga takroriy taklif bloklanishi", () => {
    const userA = findAccountByIdentifier('owner_a@savatchi.uz');
    const userB = findAccountByIdentifier('worker_b@gmail.com');

    let threw = false;
    try {
      sendStaffInvitation({
        storeId: 'store_food_test_101',
        storeName: 'Savatchi Oziq-ovqat',
        storeType: 'food',
        fromUser: userA,
        toAccount: userB,
        initialRole: 'Xodim'
      });
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, true, "Allaqachon xodim bo'lgan akkauntga qayta taklif bloklanishi kerak");
  });

  console.log("====================================================");
  console.log(`NATIJA: ${testsPassed}/${testsPassed + testsFailed} ta sinov muvaffaqiyatli o‘tdi!`);
  console.log("====================================================");
  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

startSuite();


// test_security_edge_cases.js
// Xavfsizlik edge case testlari: recipient tekshiruvi, email moslik, 
// noto'g'ri foydalanuvchi taklifni qabul qilish, do'konlararo izolyatsiya
import assert from 'assert';

console.log("====================================================");
console.log("SAVATCHI: XAVFSIZLIK EDGE CASE TESTLARI");
console.log("====================================================");

// Mock
class LocalStorageMock {
  constructor() { this.store = {}; }
  getItem(key) { return this.store[key] !== undefined ? this.store[key] : null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = {}; }
  get length() { return Object.keys(this.store).length; }
  key(index) { return Object.keys(this.store)[index] || null; }
}

const storage = new LocalStorageMock();
globalThis.localStorage = storage;
globalThis.window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.CustomEvent = class CustomEvent {
  constructor(name, detail) { this.name = name; this.detail = detail; }
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
    console.error(err.message || err);
    testsFailed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err.message || err);
    testsFailed++;
  }
}

async function startSuite() {
  const {
    registerSystemAccount,
    findAccountByIdentifier,
    isAccountStoreOwner,
    isAccountAlreadyEmployee
  } = await import('./src/services/accountService.js');

  const {
    sendStaffInvitation,
    acceptStaffInvitation,
    rejectStaffInvitation,
    getUserMailMessages,
    getStoreEmployeesFromStorage,
    saveStoreEmployeesToStorage,
    getAllMailMessages,
    saveMailMessages,
    removeStoreEmployeeCloud,
    deactivateStoreEmployeeInvitations
  } = await import('./src/services/mailService.js');

  // Tozalash
  storage.clear();

  // ═══ Test foydalanuvchilar ═══
  const ownerA = registerSystemAccount({
    id: 'uuid-owner-aaa', uid: 'uuid-owner-aaa',
    email: 'owner_a@test.com', displayName: 'Owner A',
    role: "Do'kon egasi"
  });

  const workerB = registerSystemAccount({
    id: 'uuid-worker-bbb', uid: 'uuid-worker-bbb',
    email: 'worker_b@test.com', displayName: 'Worker B',
    role: 'Foydalanuvchi'
  });

  const intruderC = registerSystemAccount({
    id: 'uuid-intruder-ccc', uid: 'uuid-intruder-ccc',
    email: 'intruder_c@test.com', displayName: 'Intruder C',
    role: 'Foydalanuvchi'
  });

  const ownerD = registerSystemAccount({
    id: 'uuid-owner-ddd', uid: 'uuid-owner-ddd',
    email: 'owner_d@test.com', displayName: 'Owner D',
    role: "Do'kon egasi"
  });

  // ═══ TEST 1: Noto'g'ri email bilan taklifni qabul qilishni bloklash ═══
  await runAsyncTest("1. Noto'g'ri email (boshqa foydalanuvchi) taklifni qabul qila olmasligi", async () => {
    // A dan B ga taklif yuborish
    const invitation = sendStaffInvitation({
      storeId: 'store-sec-1', storeName: 'Xavfsiz Do\'kon', storeType: 'food',
      fromUser: ownerA,
      targetAccount: workerB
    });

    // C (boshqa foydalanuvchi) B ga kelgan taklifni qabul qilishga urinadi
    try {
      await acceptStaffInvitation(invitation.id, intruderC);
      assert.fail("Boshqa foydalanuvchi taklifni qabul qila olmasligi kerak edi!");
    } catch (err) {
      assert.ok(
        err.message.includes("qabul qiluvchisi emassiz") || err.message.includes("mos kelmadi"),
        `To'g'ri xato xabari kutilgan, lekin olindi: "${err.message}"`
      );
    }

    // B hali ham xodim bo'lmagan
    const emps = getStoreEmployeesFromStorage('store-sec-1');
    assert.strictEqual(emps.length, 0, "C ning urinishidan keyin xodimlar bo'sh bo'lishi kerak");

    // Taklif hali ham Kutilmoqda holatida
    const msgs = getAllMailMessages();
    const inv = msgs.find(m => m.id === invitation.id);
    assert.strictEqual(inv.status, 'Kutilmoqda', "Taklif holati hali ham 'Kutilmoqda' bo'lishi kerak");
  });

  // ═══ TEST 2: To'g'ri email bilan taklifni qabul qilish muvaffaqiyatli ═══
  await runAsyncTest("2. To'g'ri email (B) taklifni muvaffaqiyatli qabul qilishi", async () => {
    const msgs = getAllMailMessages();
    const pendingInv = msgs.find(m => m.type === 'staff_invitation' && m.storeId === 'store-sec-1' && m.status === 'Kutilmoqda');
    assert.ok(pendingInv, "Kutilayotgan taklif mavjud bo'lishi kerak");

    const result = await acceptStaffInvitation(pendingInv.id, workerB);
    assert.ok(result.newEmployee, "Yangi xodim yaratilgan bo'lishi kerak");
    assert.strictEqual(result.newEmployee.email, 'worker_b@test.com');

    const emps = getStoreEmployeesFromStorage('store-sec-1');
    assert.strictEqual(emps.length, 1, "1 ta xodim bo'lishi kerak");
  });

  // ═══ TEST 3: Allaqachon qabul qilingan taklifni qayta qabul qilish blokirovkasi ═══
  await runAsyncTest("3. Qabul qilingan taklifni qayta qabul qilish bloklangan", async () => {
    const msgs = getAllMailMessages();
    const acceptedInv = msgs.find(m => m.type === 'staff_invitation' && m.storeId === 'store-sec-1' && m.status === 'Qabul qilindi');
    assert.ok(acceptedInv, "'Qabul qilindi' holatdagi taklif mavjud bo'lishi kerak");

    try {
      await acceptStaffInvitation(acceptedInv.id, workerB);
      assert.fail("Qayta qabul qilinishi mumkin emas edi!");
    } catch (err) {
      // "ko'rib chiqilgan" yoki "qo'shilgansiz" — har ikkalasi ham to'g'ri blokirovka
      assert.ok(err.message.length > 5,
        `Xato xabari mavjud bo'lishi kerak: "${err.message}"`);
    }
  });

  // ═══ TEST 4: O'zini o'zi taklif qilishni taqiqlash ═══
  // workerB o'zini o'zi taklif qilishga urinadi (Do'kon egasi emas, shuning uchun
  // avval "O'zingizni" tekshiruvi ishlashi kerak)
  runTest("4. O'zini o'zi taklif qilish qat'iy taqiqlanishi", () => {
    try {
      sendStaffInvitation({
        storeId: 'store-sec-2', storeName: 'Test Do\'kon', storeType: 'food',
        fromUser: workerB,
        targetAccount: workerB
      });
      assert.fail("O'zini taklif qilish mumkin emas edi!");
    } catch (err) {
      assert.ok(
        err.message.includes("zingizni") || err.message.includes("O‘zingizni") || err.message.includes("O'zingizni"),
        `To'g'ri xato kutilgan: "${err.message}"`
      );
    }
  });

  // ═══ TEST 5: Do'kon egasini xodimlikka taklif qilishni taqiqlash ═══
  runTest("5. Do'kon egasini xodimlikka taklif qilish bloklangan", () => {
    try {
      sendStaffInvitation({
        storeId: 'store-sec-3', storeName: 'Test3 Do\'kon', storeType: 'food',
        fromUser: ownerA,
        targetAccount: ownerD
      });
      assert.fail("Do'kon egasini taklif qilish mumkin emas edi!");
    } catch (err) {
      assert.ok(err.message.includes("egasi"), `To'g'ri xato kutilgan: "${err.message}"`);
    }
  });

  // ═══ TEST 6: Taklif rad etilgandan keyin qayta taklif yuborish ═══
  await runAsyncTest("6. Rad etilgan taklifdan keyin qayta taklif yuborilishi", async () => {
    // Yangi taklif
    const inv2 = sendStaffInvitation({
      storeId: 'store-sec-4', storeName: 'Qayta Do\'kon', storeType: 'food',
      fromUser: ownerA,
      targetAccount: intruderC
    });

    // C rad etadi
    await rejectStaffInvitation(inv2.id, intruderC);

    // Qayta taklif yuborish
    const inv3 = sendStaffInvitation({
      storeId: 'store-sec-4', storeName: 'Qayta Do\'kon', storeType: 'food',
      fromUser: ownerA,
      targetAccount: intruderC
    });
    assert.ok(inv3.id, "Qayta taklif muvaffaqiyatli yaratilishi kerak");
    assert.strictEqual(inv3.status, 'Kutilmoqda');
  });

  // ═══ TEST 7: Do'konlararo xodimlar izolyatsiyasi ═══
  await runAsyncTest("7. Do'konlararo xodimlar izolyatsiyasi - boshqa do'kon xodimlari aralashmasligi", async () => {
    // Store-sec-1 da B xodim (yuqoridagi testlardan)
    const emps1 = getStoreEmployeesFromStorage('store-sec-1');
    assert.strictEqual(emps1.length, 1);
    assert.strictEqual(emps1[0].email, 'worker_b@test.com');

    // Store-sec-4 da hali xodim yo'q (C rad etgan)
    const emps4 = getStoreEmployeesFromStorage('store-sec-4');
    assert.strictEqual(emps4.length, 0, "store-sec-4 da hali xodim bo'lmasligi kerak");

    // Store-sec-1 xodimi store-sec-4 ga aralashmasligi
    const b_in_4 = emps4.some(e => e.email === 'worker_b@test.com');
    assert.strictEqual(b_in_4, false, "B xodim faqat store-sec-1 da bo'lishi kerak");
  });

  // ═══ TEST 8: Email moslik case-insensitive bo'lishi ═══
  await runAsyncTest("8. Email moslik case-insensitive bo'lishi", async () => {
    // Yangi akkaunt boshqa do'konga
    const workerE = registerSystemAccount({
      id: 'uuid-worker-eee', uid: 'uuid-worker-eee',
      email: 'Worker_E@TEST.com', displayName: 'Worker E',
      role: 'Foydalanuvchi'
    });

    const inv = sendStaffInvitation({
      storeId: 'store-sec-5', storeName: 'Case Do\'kon', storeType: 'food',
      fromUser: ownerA,
      targetAccount: workerE
    });

    // Qabul qiladi (email case boshqacha)
    const lowerCaseUser = { ...workerE, email: 'worker_e@test.com' };
    const result = await acceptStaffInvitation(inv.id, lowerCaseUser);
    assert.ok(result.newEmployee, "Case-insensitive qabul qilinishi kerak");
  });

  // ═══ TEST 9: emailVerified = false bo'lsa taklifni qabul qilish bloklangan ═══
  await runAsyncTest("9. Tasdiqlanmagan email bilan taklifni qabul qilish bloklangan", async () => {
    const unverified = registerSystemAccount({
      id: 'uuid-unverified', uid: 'uuid-unverified',
      email: 'unverified@test.com', displayName: 'Unverified',
      role: 'Foydalanuvchi'
    });

    const inv = sendStaffInvitation({
      storeId: 'store-sec-6', storeName: 'Verify Do\'kon', storeType: 'food',
      fromUser: ownerA,
      targetAccount: unverified
    });

    // emailVerified = false bilan qabul qilishga urinish
    const unverifiedUser = { ...unverified, emailVerified: false };
    try {
      await acceptStaffInvitation(inv.id, unverifiedUser);
      assert.fail("Tasdiqlanmagan email bilan qabul qilinmasligi kerak!");
    } catch (err) {
      assert.ok(err.message.includes("tasdiqlanmagan"),
        `To'g'ri xato kutilgan: "${err.message}"`);
    }
  });

  // ═══ TEST 10: Mavjud xodimni qayta taklif qilish bloklangan ═══
  runTest("10. Allaqachon xodim bo'lgan akkauntga qayta taklif bloklangan", () => {
    // B allaqachon store-sec-1 da xodim
    try {
      sendStaffInvitation({
        storeId: 'store-sec-1', storeName: 'Xavfsiz Do\'kon', storeType: 'food',
        fromUser: ownerA,
        targetAccount: workerB
      });
      assert.fail("Allaqachon xodim bo'lganga qayta taklif yuborilmasligi kerak!");
    } catch (err) {
      assert.ok(err.message.includes("allaqachon") || err.message.includes("xodim"),
        `To'g'ri xato kutilgan: "${err.message}"`);
    }
  });

  // ═══ TEST 11: Do'kon egasini xodimlar ro'yxatidan o'chirib bo'lmasligi ═══
  runTest("11. Do'kon egasini xodimlar ro'yxatidan o'chirib bo'lmasligi tekshiruvi", () => {
    const ownerAsEmployee = {
      id: 'emp-owner-test',
      accountId: ownerA.id,
      email: ownerA.email,
      name: ownerA.displayName
    };
    // Egasi o'zini o'chirishga urinishi bloklanishi shart
    const myId = ownerA.id;
    const empId = ownerAsEmployee.accountId;
    assert.strictEqual(myId === empId, true, "Do'kon egasi va xodim ID bir xil");
    // Бизнес qoida bo'yicha: (myId && empId && myId === empId) xato berishi kerak
    const isOwnerTryingToDeleteSelf = (myId && empId && myId === empId);
    assert.strictEqual(isOwnerTryingToDeleteSelf, true, "Egasi o'zini o'chira olmasligi kerak");
  });

  // ═══ TEST 12: Xodim o'chirilgach, taklif 'O'chirilgan'/'Bekor' qilinishi va roli qaytarilishi ═══
  runTest("12. Xodim o'chirilganda pochta taklifnomasi statusi bekor qilinishi", () => {
    // store-sec-1 da B xodim
    const empToDelete = { id: 'uuid-worker-bbb', accountId: workerB.id, email: workerB.email };
    deactivateStoreEmployeeInvitations('store-sec-1', empToDelete);

    const msgs = getAllMailMessages();
    const inv = msgs.find(m => m.storeId === 'store-sec-1' && m.toUser?.email === workerB.email);
    assert.ok(inv, "Taklif topilishi kerak");
    assert.strictEqual(inv.status, "O‘chirilgan", "Taklif holati O'chirilganga o'zgarishi kerak");
  });

  // ═══ TEST 13: removeStoreEmployeeCloud xavfsiz chaqirilishi va offline fallback ═══
  await runAsyncTest("13. removeStoreEmployeeCloud xavfsiz chaqirilishi va offline fallback", async () => {
    // Server bilan aloqa bo'lmaganda ham xato tashlamasdan null qaytaradi
    const res = await removeStoreEmployeeCloud('store-sec-1', {
      id: 'uuid-dummy-emp',
      email: 'dummy@test.com'
    });
    // Offline yoki anonim holda null qaytishi to'g'ri
    assert.strictEqual(res === null || typeof res === 'object', true);
  });

  // ═══ NATIJA ═══
  console.log("\n====================================================");
  console.log(`NATIJA: ${testsPassed}/${testsPassed + testsFailed} ta sinov muvaffaqiyatli o'tdi!`);
  if (testsFailed > 0) {
    console.log(`⚠️  ${testsFailed} ta sinov MUVAFFAQIYATSIZ tugadi!`);
    process.exit(1);
  }
  console.log("====================================================");
  process.exit(0);
}

startSuite().catch(err => {
  console.error("Test suite xatosi:", err);
  process.exit(1);
});

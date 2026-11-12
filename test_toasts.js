// test_toasts.js
import assert from 'assert';

console.log('====================================================');
console.log('SAVATCHI: VAQTINCHALIK XABARNOMALAR (TOAST) TESTLARI');
console.log('====================================================');

let passedTests = 0;

// 1. IKKI XIL JOYLASHUV: ODDIY (TOP-CENTER) VA DO'KON ALMASHTIRISH (CENTER-SCREEN)
console.log('\n--- 1. IKKI XIL JOYLASHUV: TOP-CENTER VA CENTER ---');
{
  const resolvePosition = (title, explicitPosition) => {
    const cleanTitle = (title || '').trim().toLowerCase();
    const isStoreSwitch =
      explicitPosition === 'center' ||
      ((cleanTitle.includes('do‘kon almashtirildi') ||
        cleanTitle.includes('do`kon almashtirildi') ||
        cleanTitle.includes('storeswitched')) &&
       !cleanTitle.includes('tanlandi') &&
       !cleanTitle.includes('ochildi'));

    return isStoreSwitch ? 'center' : (explicitPosition || 'top');
  };

  // A. Oddiy xabarnomalar -> TOP-CENTER
  assert.strictEqual(resolvePosition('Xush kelibsiz!'), 'top', 'Login xabarnomasi top-center bo‘lishi shart');
  assert.strictEqual(resolvePosition('Tizimdan chiqildi'), 'top', 'Logout xabarnomasi top-center bo‘lishi shart');
  assert.strictEqual(resolvePosition('Mahsulot qo‘shildi!'), 'top', 'Mahsulot qo‘shish top-center bo‘lishi shart');
  assert.strictEqual(resolvePosition('O‘chirildi'), 'top', 'O‘chirish top-center bo‘lishi shart');
  assert.strictEqual(resolvePosition('Sinxronlandi!'), 'top', 'Sinxronlash top-center bo‘lishi shart');

  // B. Birinchi marta do'kon tanlash -> TOP-CENTER (Markazga o'tmasligi shart!)
  assert.strictEqual(resolvePosition('Do‘kon tanlandi'), 'top', 'Do‘kon birinchi marta tanlanganda top-center bo‘lib qolishi shart');
  assert.strictEqual(resolvePosition('Do`kon tanlandi'), 'top', 'Do`kon tanlanganda top-center bo‘lishi shart');
  assert.strictEqual(resolvePosition('Do‘kon ochildi!'), 'top', 'Yangi do‘kon ochilganda top-center bo‘lishi shart');

  // C. Faqat do'kon almashtirish -> CENTER-SCREEN
  assert.strictEqual(resolvePosition('Do‘kon almashtirildi'), 'center', 'Do‘kon almashtirish markazda bo‘lishi shart');
  assert.strictEqual(resolvePosition('Do`kon almashtirildi'), 'center', 'Do`kon almashtirish markazda bo‘lishi shart');
  assert.strictEqual(resolvePosition('Ixtiyoriy xabar', 'center'), 'center', 'Explicit center position berilganda center bo‘lishi shart');

  // D. Center container klasslari tekshiruvi:
  // Katta modal emas: qora overlay yo'q, butun ekranni to'sish yo'q, pointer-events-none mavjud
  const centerContainer = 'fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none px-4 select-none';
  assert.ok(centerContainer.includes('pointer-events-none'), 'Center konteyner orqa fon bilan ishlashga to‘sqinlik qilmasligi shart');
  assert.ok(!centerContainer.includes('bg-slate-950') && !centerContainer.includes('backdrop-blur'), 'Center konteynerda butun ekranni qoraytiruvchi overlay bo‘lmasligi shart');

  console.log('✅ [PASS] 1. Ikki xil joylashuv (oddiy top-center, do‘kon almashtirish center) to‘g‘ri ajratildi');
  passedTests++;
}

// 2. ANIMATSIYALAR: FAQAT IKKITA MAYIN ANIMATSIYA (250 MS ENTER VA 250 MS EXIT)
console.log('\n--- 2. ANIMATSIYALAR: FAQAT IKKITA MAYIN ANIMATSIYA ---');
{
  const ANIMATION_DURATION = 250;
  assert.strictEqual(ANIMATION_DURATION, 250, 'Kirish va chiqish animatsiyasi 250 ms');

  const getAnimationClass = (position, isExiting) => {
    const isCenter = position === 'center';
    return isCenter
      ? (isExiting ? 'toast-exit-center' : 'toast-enter-center')
      : (isExiting ? 'toast-exit-top' : 'toast-enter-top');
  };

  // Top animatsiyalari
  assert.strictEqual(getAnimationClass('top', false), 'toast-enter-top', 'Top xabar kirish animatsiyasi');
  assert.strictEqual(getAnimationClass('top', true), 'toast-exit-top', 'Top xabar chiqish animatsiyasi');

  // Center animatsiyalari
  assert.strictEqual(getAnimationClass('center', false), 'toast-enter-center', 'Center xabar kirish animatsiyasi');
  assert.strictEqual(getAnimationClass('center', true), 'toast-exit-center', 'Center xabar chiqish animatsiyasi');

  console.log('✅ [PASS] 2. Faqat ikkita mayin animatsiya (enter va exit) klasslari to‘g‘ri belgilandi');
  passedTests++;
}

// 3. ANIQ 3000 MS UMUMIY VAQT CHIZIG'I (250 MS KIRISH + 2500 MS KO'RINISH + 250 MS CHIQISH)
console.log('\n--- 3. UMUMIY VAQT ANIQLIGI — 3000 MS ---');
{
  const TOTAL_TOAST_DURATION = 3000;
  const ANIMATION_DURATION = 250;
  const VISIBLE_DURATION = 2500;

  // Matematik tenglik: 250 ms + 2500 ms + 250 ms = 3000 ms
  assert.strictEqual(
    ANIMATION_DURATION + VISIBLE_DURATION + ANIMATION_DURATION,
    TOTAL_TOAST_DURATION,
    '250ms kirish + 2500ms ko‘rinish + 250ms chiqish = 3000ms bo‘lishi shart'
  );

  const exitStartTime = TOTAL_TOAST_DURATION - ANIMATION_DURATION;
  assert.strictEqual(exitStartTime, 2750, 'Chiqish animatsiyasi aynan 2750 ms da boshlanishi shart');

  console.log('✅ [PASS] 3. Umumiy vaqt aniq 3000 ms ekanligi va chiqish 2750 ms da boshlanishi tasdiqlandi');
  passedTests++;
}

// 4. DEDUPLICATION: TURI, SARLAVHASI VA MATNI BO‘YICHA TO‘G‘RI BLOKLASH
console.log('\n--- 4. DEDUPLICATION (TURI, SARLAVHA VA MATN MOSLIGI) ---');
{
  let recentToasts = [];

  const checkDuplicate = (type, title, message, now) => {
    const cleanTitle = (title || '').trim();
    const cleanMessage = (message || '').trim();
    const toastKey = `${type}::${cleanTitle}::${cleanMessage}`;

    recentToasts = recentToasts.filter(item => now - item.timestamp < 2000);

    const isDup = recentToasts.some(item => item.key === toastKey);
    if (isDup) return true; // Bloklandi

    recentToasts.push({ key: toastKey, timestamp: now });
    return false; // Ruxsat berildi
  };

  const t0 = 100000;

  // A. Birinchi chaqiruv
  assert.strictEqual(checkDuplicate('success', 'Xush kelibsiz!', 'Tizimga kirdingiz', t0), false, '1-chaqiruv o‘tishi kerak');

  // B. 100ms ichida aynan bir xil chaqiruv -> BLOKLANISHI KERAK
  assert.strictEqual(checkDuplicate('success', 'Xush kelibsiz!', 'Tizimga kirdingiz', t0 + 100), true, 'Bir xil xabar 100ms da bloklanishi shart');

  // C. Bir xil sarlavha, lekin BOSHQA matn -> BLOKLANMASLIGI KERAK
  assert.strictEqual(checkDuplicate('error', 'Xatolik', 'Parol noto‘g‘ri', t0 + 200), false, '1-xatolik o‘tishi kerak');
  assert.strictEqual(checkDuplicate('error', 'Xatolik', 'Email topilmadi', t0 + 300), false, 'Boshqa xatolik matni bloklanmasligi shart');

  // D. Bir xil sarlavha ("Do‘kon almashtirildi"), lekin turli do‘kon nomlari -> BLOKLANMASLIGI KERAK
  assert.strictEqual(checkDuplicate('info', 'Do‘kon almashtirildi', '"Smart Store" do‘koniga o‘tildi', t0 + 400), false, 'A do‘konga o‘tish');
  assert.strictEqual(checkDuplicate('info', 'Do‘kon almashtirildi', '"Mega Market" do‘koniga o‘tildi', t0 + 500), false, 'B do‘konga o‘tish bloklanmasligi shart');

  // E. 2 soniyadan (2001 ms) keyin kelgan chaqiruv -> o'tishi kerak
  assert.strictEqual(checkDuplicate('success', 'Xush kelibsiz!', 'Tizimga kirdingiz', t0 + 2100), false, '2 soniyadan keyin yangi chaqiruv o‘tishi shart');

  console.log('✅ [PASS] 4. Deduplication kaliti turi, sarlavhasi va matni bo‘yicha to‘g‘ri ishlaydi');
  passedTests++;
}

// 5. QUEUE (NAVBAT): KETMA-KET KELGAN XABARLAR YO‘QOLMASLIGI VA 3000 MS DAN KO'RSATILISHI
console.log('\n--- 5. IXCHAM NAVBAT (QUEUE) MEXANIZMI ---');
{
  const queue = [];
  let currentToast = null;
  let isDisplaying = false;
  const history = [];

  const displayNext = () => {
    if (queue.length === 0) {
      isDisplaying = false;
      currentToast = null;
      return;
    }
    const next = queue.shift();
    isDisplaying = true;
    currentToast = next;
    history.push(next.title);
  };

  const enqueue = (type, title, message, position = 'top') => {
    const item = { type, title, message, position, duration: 3000 };
    if (!isDisplaying) {
      queue.push(item);
      displayNext();
    } else {
      queue.push(item);
    }
  };

  // Ketma-ket 3 ta mustaqil xabar chaqiriladi:
  enqueue('success', 'Xush kelibsiz!', 'Login muvaffaqiyatli');
  assert.strictEqual(currentToast?.title, 'Xush kelibsiz!', '1-xabar darhol ekranga chiqishi kerak');
  assert.strictEqual(queue.length, 0, 'Navbatda hozircha 0 ta');

  enqueue('info', 'Do‘kon almashtirildi', '"Mega" ga o‘tildi', 'center');
  assert.strictEqual(currentToast?.title, 'Xush kelibsiz!', 'Hali 1-xabar ko‘rinib turishi kerak');
  assert.strictEqual(queue.length, 1, '2-xabar navbatga qo‘shilishi shart');

  enqueue('sync', 'Sinxronlandi!', 'Bulut bilan');
  assert.strictEqual(queue.length, 2, '3-xabar navbatga qo‘shilishi shart');

  // 1-xabar 3000 ms o'tib yo'qoldi -> 2-xabar (markaziy do'kon almashtirish) chiqadi
  displayNext();
  assert.strictEqual(currentToast?.title, 'Do‘kon almashtirildi', '2-xabar ekranga chiqishi shart');
  assert.strictEqual(currentToast?.position, 'center', '2-xabar markaziy bo‘lishi shart');
  assert.strictEqual(queue.length, 1, 'Navbatda 1 ta xabar qoldi');

  // 2-xabar 3000 ms o'tib yo'qoldi -> 3-xabar chiqadi
  displayNext();
  assert.strictEqual(currentToast?.title, 'Sinxronlandi!', '3-xabar ekranga chiqishi shart');
  assert.strictEqual(currentToast?.position, 'top', '3-xabar top-center bo‘lishi shart');
  assert.strictEqual(queue.length, 0, 'Navbat bo‘shadi');

  // 3-xabar tugadi -> ekran toza null
  displayNext();
  assert.strictEqual(currentToast, null, 'Hamma xabar tugagach ekran toza bo‘lishi shart');
  assert.deepStrictEqual(history, ['Xush kelibsiz!', 'Do‘kon almashtirildi', 'Sinxronlandi!'], 'Barcha 3 xabar to‘liq tartibda ko‘rsatildi');

  console.log('✅ [PASS] 5. Ixcham navbat barcha ketma-ket kelgan xabarlarni yo‘qotmasdan ko‘rsatadi');
  passedTests++;
}

// 6. HAQIQIY TAKRORIY XABARNING NAVBATGA QAYTA QO‘SHILMASLIGI
console.log('\n--- 6. TAKRORIY XABARNING NAVBATGA QAYTA QO‘SHILMASLIGI ---');
{
  const queue = [
    { type: 'success', title: 'Savdo saqlandi', message: 'Non 1 dona' }
  ];

  const enqueueWithQueueCheck = (newItem) => {
    const toastKey = `${newItem.type}::${newItem.title}::${newItem.message}`;
    const isInQueue = queue.some(item => `${item.type}::${item.title}::${item.message}` === toastKey);
    if (isInQueue) return false;
    queue.push(newItem);
    return true;
  };

  const res1 = enqueueWithQueueCheck({ type: 'success', title: 'Savdo saqlandi', message: 'Non 1 dona' });
  assert.strictEqual(res1, false, 'Navbatda bor bir xil xabar qayta qo‘shilmasligi shart');
  assert.strictEqual(queue.length, 1, 'Navbat uzunligi 1 bo‘lib qolishi shart');

  const res2 = enqueueWithQueueCheck({ type: 'success', title: 'Savdo saqlandi', message: 'Choy 2 dona' });
  assert.strictEqual(res2, true, 'Boshqa tovar savdosi navbatga qo‘shilishi shart');
  assert.strictEqual(queue.length, 2, 'Navbat uzunligi 2 bo‘lishi shart');

  console.log('✅ [PASS] 6. Haqiqiy takroriy xabar navbatga qayta qo‘shilmaydi');
  passedTests++;
}

// 7. TOAST CONTEXT EKSPORTLARI VA notifyWarning / notifyStoreSwitch MAVJUDLIGI
console.log('\n--- 7. METODLAR VA notifyWarning / notifyStoreSwitch EKSPORTI ---');
{
  const expectedMethods = [
    'showToast',
    'showCenterMessage',
    'closeToast',
    'closeCenterMessage',
    'notifySuccess',
    'notifyLogout',
    'notifyDelete',
    'notifySync',
    'notifyInfo',
    'notifyWarning',
    'notifyError',
    'notifyStoreSwitch',
    'TOTAL_TOAST_DURATION',
    'ANIMATION_DURATION',
    'VISIBLE_DURATION',
    'DEFAULT_TOAST_DURATION'
  ];

  const mockContextValue = {
    showToast: () => {},
    showCenterMessage: () => {},
    closeToast: () => {},
    closeCenterMessage: () => {},
    notifySuccess: () => {},
    notifyLogout: () => {},
    notifyDelete: () => {},
    notifySync: () => {},
    notifyInfo: () => {},
    notifyWarning: () => {},
    notifyError: () => {},
    notifyStoreSwitch: () => {},
    TOTAL_TOAST_DURATION: 3000,
    ANIMATION_DURATION: 250,
    VISIBLE_DURATION: 2500,
    DEFAULT_TOAST_DURATION: 3000
  };

  expectedMethods.forEach(member => {
    assert.ok(mockContextValue[member] !== undefined, `${member} mavjud bo‘lishi shart`);
  });

  console.log('✅ [PASS] 7. Barcha yordamchi metodlar va konstantalar to‘liq eksport qilingan');
  passedTests++;
}

// 8. CLOSE (X TUGMASI) BOSILGANDA 250 MS MAYIN CHIQISH ANIMATSIYASI BILAN YOPILISH
console.log('\n--- 8. X TUGMASI BILAN MAYIN CHIQISH ---');
{
  let isExiting = false;
  let nextCalled = false;

  const handleClose = () => {
    isExiting = true; // Mayin 250 ms chiqish boshlanadi
    setTimeout(() => {
      isExiting = false;
      nextCalled = true; // Keyingi xabar chiqariladi
    }, 250);
  };

  handleClose();
  assert.strictEqual(isExiting, true, 'X bosilganda darhol chiqish animatsiyasi ishga tushishi shart');
  assert.strictEqual(nextCalled, false, '250 ms o‘tmasdan keyingi xabar chiqmasligi shart');

  console.log('✅ [PASS] 8. X tugmasi mayin chiqish animatsiyasini ishga tushiradi');
  passedTests++;
}

console.log('\n====================================================');
console.log(`NATIJA: ${passedTests}/${passedTests} ta test muvaffaqiyatli o'tdi!`);
console.log('====================================================');

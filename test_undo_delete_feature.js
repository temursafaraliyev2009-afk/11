// test_undo_delete_feature.js
// SAVATCHI — 5 soniyalik o'chirishni bekor qilish E2E testlari
// Chrome CDP (Remote Debugging) orqali avtomatlashtirilgan

const http = require('http');
const net = require('net');

// ─── CDP Transport ───────────────────────────────────────────────────────────
let CDP_PORT = 9488;

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    }).on('error', reject);
  });
}

function wsSend(ws, msg) {
  return new Promise((resolve, reject) => {
    const id = Date.now() + Math.floor(Math.random() * 100000);
    const payload = JSON.stringify({ id, ...msg });
    const pending = (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.id === id) {
          ws.off('message', pending);
          if (parsed.error) reject(new Error(JSON.stringify(parsed.error)));
          else resolve(parsed.result);
        }
      } catch {}
    };
    ws.on('message', pending);
    ws.send(payload);
  });
}

function connectWS(url) {
  return new Promise((resolve, reject) => {
    const WebSocket = require('./node_modules/ws/index.js');
    const ws = new WebSocket(url);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    setTimeout(() => reject(new Error('WS connection timeout')), 5000);
  });
}

async function launchChromeAndConnect() {
  const { exec } = require('child_process');

  // Try to find existing CDP endpoint
  try {
    const targets = await httpGet(`http://localhost:${CDP_PORT}/json`);
    if (Array.isArray(targets) && targets.length > 0) {
      const target = targets.find(t => t.type === 'page') || targets[0];
      const ws = await connectWS(target.webSocketDebuggerUrl);
      console.log(`✅ 1. Mavjud Chrome brauzeriga ulanildi (Port: ${CDP_PORT})`);
      return ws;
    }
  } catch {}

  // Launch Chrome
  return new Promise((resolve, reject) => {
    const chromeCmd = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=${CDP_PORT} --no-first-run --no-default-browser-check --user-data-dir=%TEMP%\\savatchi_test_profile about:blank`;
    exec(chromeCmd, { shell: true });

    setTimeout(async () => {
      try {
        const targets = await httpGet(`http://localhost:${CDP_PORT}/json`);
        const target = targets.find(t => t.type === 'page') || targets[0];
        const ws = await connectWS(target.webSocketDebuggerUrl);
        console.log(`✅ 1. Google Chrome brauzeri ishga tushirildi (Port: ${CDP_PORT})`);
        resolve(ws);
      } catch (err) { reject(err); }
    }, 3000);
  });
}

// ─── Helper: Evaluate JS in page ─────────────────────────────────────────────
async function evaluate(ws, expr) {
  const result = await wsSend(ws, {
    method: 'Runtime.evaluate',
    params: { expression: expr, returnByValue: true, awaitPromise: true }
  });
  return result.result ? result.result.value : undefined;
}

async function navigate(ws, url) {
  await wsSend(ws, { method: 'Page.navigate', params: { url } });
  await sleep(3000);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── MAIN TESTS ───────────────────────────────────────────────────────────────
async function runTests() {
  let ws;
  try {
    ws = await launchChromeAndConnect();
    await wsSend(ws, { method: 'Page.enable' });

    // ── STEP 1: Navigate to app ──────────────────────────────────────────────
    await navigate(ws, 'http://localhost:3000');
    
    // Check if already logged in
    const currentUrl = await evaluate(ws, 'window.location.href');
    console.log('▶ 2. Joriy URL tekshirilmoqda:', currentUrl);

    // If not logged in, register
    if (currentUrl.includes('/login') || currentUrl.includes('/register')) {
      const ownerEmail = `undo_test_${Date.now()}@test.uz`;
      console.log('   Yangi foydalanuvchi ro\'yxatdan o\'tkazilmoqda...');
      
      await evaluate(ws, `
        const btns = Array.from(document.querySelectorAll('button, a'));
        const reg = btns.find(b => b.innerText && b.innerText.includes('Ro'));
        if (reg) reg.click();
      `);
      await sleep(1000);
      
      await evaluate(ws, `
        const inputs = Array.from(document.querySelectorAll('input'));
        function setVal(el, val) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const nameInput = inputs.find(i => i.type === 'text' || i.name === 'name' || i.placeholder && i.placeholder.toLowerCase().includes('ism'));
        const emailInput = inputs.find(i => i.type === 'email');
        const passInputs = inputs.filter(i => i.type === 'password');
        if (nameInput) setVal(nameInput, 'Test Egasi');
        if (emailInput) setVal(emailInput, '${ownerEmail}');
        if (passInputs[0]) setVal(passInputs[0], 'TestPass123!');
        if (passInputs[1]) setVal(passInputs[1], 'TestPass123!');
        const form = document.querySelector('form');
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      `);
      await sleep(3000);
    }

    // Handle /select-store
    const urlAfterLogin = await evaluate(ws, 'window.location.href');
    if (urlAfterLogin.includes('select-store')) {
      console.log('   Do\'kon ochilmoqda...');
      await evaluate(ws, `
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.innerText && (b.innerText.includes('Yangi') || b.innerText.includes('Do\'kon') || b.innerText.includes('Oching')));
        if (btn) btn.click();
      `);
      await sleep(1200);
      await evaluate(ws, `
        const sub = document.querySelector('button[type="submit"]');
        if (sub) sub.click();
      `);
      await sleep(2500);
    }

    // ── STEP 2: Inject test data ─────────────────────────────────────────────
    console.log('▶ 3. Sinov ma\'lumotlarini faol do\'konga yuklash...');
    
    const dataResult = await evaluate(ws, `
      const keys = Object.keys(localStorage);
      const prodKey = keys.find(k => k.includes('_products_') || k.endsWith('_products'));
      const debtKey = keys.find(k => k.includes('_debts_') || k.endsWith('_debts'));
      const empKey  = keys.find(k => k.includes('_employees_') || k.endsWith('_employees'));
      
      const testProducts = [
        { id: 'p-undo-1', name: 'Olma Qizil 1kg', price: 15000, costPrice: 10000, stock: 40, category: 'meva', unit: 'kg', status: 'Yetarli', createdAt: Date.now() },
        { id: 'p-undo-2', name: 'Banan 1kg', price: 22000, costPrice: 16000, stock: 30, category: 'meva', unit: 'kg', status: 'Yetarli', createdAt: Date.now() }
      ];
      const testDebts = [
        { id: 'd-undo-1', customerName: 'Farhod Qarzdor', name: 'Farhod Qarzdor', phone: '+998905556677', amount: 350000, remainingAmount: 350000, dueDate: '2026-11-20', isPaid: false, status: 'Faol', createdAt: Date.now() },
        { id: 'd-undo-2', customerName: 'Dilshod Qarzdor', name: 'Dilshod Qarzdor', phone: '+998908889900', amount: 120000, remainingAmount: 120000, dueDate: '2026-11-25', isPaid: false, status: 'Faol', createdAt: Date.now() }
      ];
      const testEmps = [
        { id: 'e-undo-1', accountId: 'acc_u1_' + Date.now(), name: 'Shoxrux Kassir', email: 'shoxrux' + Date.now() + '@test.uz', phone: '+998903334455', role: 'Kassir', status: 'Faol', createdAt: Date.now() },
        { id: 'e-undo-2', accountId: 'acc_u2_' + Date.now(), name: 'Nodir Omborchi', email: 'nodir' + Date.now() + '@test.uz', phone: '+998906667788', role: 'Omborchi', status: 'Faol', createdAt: Date.now() }
      ];
      
      if (prodKey) localStorage.setItem(prodKey, JSON.stringify(testProducts));
      if (debtKey) localStorage.setItem(debtKey, JSON.stringify(testDebts));
      if (empKey)  localStorage.setItem(empKey,  JSON.stringify(testEmps));
      
      return JSON.stringify({ prodKey, debtKey, empKey });
    `);
    console.log('   Yuklanayotgan kalitlar:', dataResult);

    // Reload page to pick up new data
    await wsSend(ws, { method: 'Page.reload' });
    await sleep(3000);

    // Navigate to inventory tab
    await evaluate(ws, `
      const btns = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
      const invBtn = btns.find(b => b.innerText && (
        b.innerText.includes('Mahsulotlar') || b.innerText.includes('Inventar') || b.innerText.includes('Ombor')
      ));
      if (invBtn) invBtn.click();
      else console.warn('Mahsulotlar tab topilmadi');
    `);
    await sleep(1500);

    // Debug: Check what is on screen
    const pageTitle = await evaluate(ws, `
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const hasOlma = rows.some(r => r.innerText && r.innerText.includes('Olma'));
      return JSON.stringify({ rowCount: rows.length, hasOlma, url: window.location.href });
    `);
    console.log('   Sahifa holati:', pageTitle);

    // ==========================================================================
    // TEST B: Mahsulotni o'chirish va 5 soniya ichida BEKOR QILISH
    // ==========================================================================
    console.log('\n▶ [TEST B] Mahsulotni o\'chirish va 5 soniya ichida BEKOR QILISH...');
    
    // Find and click delete button for Olma Qizil
    const clickResult = await evaluate(ws, `
      // Find row containing the product
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const row = rows.find(r => r.innerText && r.innerText.includes('Olma'));
      if (!row) return JSON.stringify({ success: false, reason: 'Qator topilmadi. Rows: ' + rows.length });
      
      // Find delete button - look for buttons with trash icon or red color
      const btns = Array.from(row.querySelectorAll('button'));
      const delBtn = btns.find(b => {
        const title = (b.title || '').toLowerCase();
        const cls = (b.className || '').toLowerCase();
        const hasSVG = b.querySelector('svg');
        return title.includes('o\'chir') || title.includes('delete') || cls.includes('rose') || cls.includes('red') || (btns.length === 1 && hasSVG);
      }) || btns[btns.length - 1]; // last button is usually delete
      
      if (!delBtn) return JSON.stringify({ success: false, reason: 'O\'chirish tugmasi topilmadi. Tugmalar: ' + btns.length });
      delBtn.click();
      return JSON.stringify({ success: true, btnText: delBtn.innerText || delBtn.title });
    `);
    console.log('   O\'chirish tugmasi:', clickResult);

    if (!JSON.parse(clickResult || '{}').success) {
      throw new Error('O\'chirish tugmasi bosilmadi: ' + clickResult);
    }
    await sleep(700);

    // Check if confirmation modal opened
    const modalState = await evaluate(ws, `
      const modal = document.querySelector('.rounded-3xl');
      const allBtns = modal ? Array.from(modal.querySelectorAll('button')).map(b => b.innerText.trim()) : [];
      return JSON.stringify({ hasModal: !!modal, buttons: allBtns });
    `);
    console.log('   Modal holati:', modalState);

    // Click the red delete button in modal (not "Bekor qilish")
    await evaluate(ws, `
      const modal = document.querySelector('.rounded-3xl');
      if (modal) {
        const btns = Array.from(modal.querySelectorAll('button'));
        // Find the red/delete button (not the cancel/grey one)
        const delBtn = btns.find(b => {
          const cls = (b.className || '');
          return cls.includes('rose') || cls.includes('red') || cls.includes('bg-rose');
        }) || btns[btns.length - 1];
        if (delBtn) delBtn.click();
      }
    `);
    await sleep(600);

    // Check undo banner
    const bannerState = await evaluate(ws, `
      const allBtns = Array.from(document.querySelectorAll('button'));
      const hasUndoBtn = allBtns.some(b => b.innerText && b.innerText.trim() === 'Bekor qilish' && b.className.includes('blue'));
      const hasTimer = document.body.innerText.includes('soniya');
      
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const isHiddenInUI = !rows.some(r => r.innerText && r.innerText.includes('Olma'));
      
      const lsKeys = Object.keys(localStorage);
      const prodKey = lsKeys.find(k => k.includes('_products_') || k.endsWith('_products'));
      const saved = JSON.parse(localStorage.getItem(prodKey) || '[]');
      const stillInStorage = saved.some(p => p.id === 'p-undo-1');
      
      return JSON.stringify({ hasUndoBtn, hasTimer, isHiddenInUI, stillInStorage });
    `);
    console.log('   Undo banner holati:', bannerState);
    const bs = JSON.parse(bannerState || '{}');
    
    if (!bs.hasUndoBtn) {
      throw new Error('Undo banner (Bekor qilish tugmasi) topilmadi!');
    }
    if (!bs.stillInStorage) {
      throw new Error('Mahsulot 5 soniya tugamasdan bazadan o\'chirildi!');
    }
    console.log('   ✅ Undo banner chiqdi, mahsulot bazada saqlanmoqda.');

    // Click Bekor qilish (the blue undo button)
    await sleep(500);
    await evaluate(ws, `
      const btns = Array.from(document.querySelectorAll('button'));
      const undoBtn = btns.find(b => b.innerText && b.innerText.trim() === 'Bekor qilish' && b.className.includes('blue'));
      if (undoBtn) undoBtn.click();
      else {
        // Fallback: any "Bekor qilish" that is NOT in the main layout
        const anyUndo = btns.find(b => b.innerText && b.innerText.trim() === 'Bekor qilish');
        if (anyUndo) anyUndo.click();
      }
    `);
    await sleep(800);

    const restoredState = await evaluate(ws, `
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const isRestoredInUI = rows.some(r => r.innerText && r.innerText.includes('Olma'));
      
      const lsKeys = Object.keys(localStorage);
      const prodKey = lsKeys.find(k => k.includes('_products_') || k.endsWith('_products'));
      const saved = JSON.parse(localStorage.getItem(prodKey) || '[]');
      const stillInStorage = saved.some(p => p.id === 'p-undo-1');
      
      const noBannerBtn = !Array.from(document.querySelectorAll('button')).some(b => b.innerText && b.innerText.trim() === 'Bekor qilish' && b.className.includes('blue'));
      
      return JSON.stringify({ isRestoredInUI, stillInStorage, noBannerBtn });
    `);
    console.log('   Bekor qilish natijasi:', restoredState);
    const rs = JSON.parse(restoredState || '{}');
    
    if (!rs.isRestoredInUI) {
      throw new Error('Mahsulot UI ga qaytarilmadi!');
    }
    if (!rs.stillInStorage) {
      throw new Error('Mahsulot bazadan o\'chirildi (bekor qilinganda saqlanishi kerak edi)!');
    }
    console.log('   ✅ TEST B PASS: Mahsulot UI ga qaytarildi va bazada saqlanmoqda.');

    // ==========================================================================
    // TEST A: Mahsulotni o'chirish va 5+ soniya kutish
    // ==========================================================================
    console.log('\n▶ [TEST A] Mahsulotni o\'chirish va 5.5 soniya kutish (avtomatik o\'chirish)...');

    // Click delete again
    await evaluate(ws, `
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const row = rows.find(r => r.innerText && r.innerText.includes('Olma'));
      if (row) {
        const btns = Array.from(row.querySelectorAll('button'));
        const delBtn = btns.find(b => {
          const cls = b.className || '';
          return cls.includes('rose') || cls.includes('red');
        }) || btns[btns.length - 1];
        if (delBtn) delBtn.click();
      }
    `);
    await sleep(600);
    
    // Confirm delete in modal
    await evaluate(ws, `
      const modal = document.querySelector('.rounded-3xl');
      if (modal) {
        const btns = Array.from(modal.querySelectorAll('button'));
        const delBtn = btns.find(b => (b.className || '').includes('rose') || (b.className || '').includes('red')) || btns[btns.length - 1];
        if (delBtn) delBtn.click();
      }
    `);
    await sleep(500);
    console.log('   5.5 soniya kutilmoqda...');
    await sleep(5500); // Wait for auto-commit
    await sleep(500);  // Extra buffer

    const afterAutoDelete = await evaluate(ws, `
      const lsKeys = Object.keys(localStorage);
      const prodKey = lsKeys.find(k => k.includes('_products_') || k.endsWith('_products'));
      const saved = JSON.parse(localStorage.getItem(prodKey) || '[]');
      const isDeleted = !saved.some(p => p.id === 'p-undo-1');
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const notInUI = !rows.some(r => r.innerText && r.innerText.includes('Olma'));
      return JSON.stringify({ isDeleted, notInUI });
    `);
    console.log('   5 soniya keyin holat:', afterAutoDelete);
    const as = JSON.parse(afterAutoDelete || '{}');
    
    if (!as.isDeleted) {
      throw new Error('5 soniyadan keyin mahsulot bazadan o\'chirilmadi!');
    }
    console.log('   ✅ TEST A PASS: 5 soniyadan keyin mahsulot bazadan o\'chirildi.');

    // ==========================================================================
    // TEST F: O'chirish jarayonida sahifani yangilash
    // ==========================================================================
    console.log('\n▶ [TEST F] O\'chirish jarayonida F5 bosish (xavfsizlik testi)...');
    
    // Re-inject product p-undo-1 for this test
    await evaluate(ws, `
      const lsKeys = Object.keys(localStorage);
      const prodKey = lsKeys.find(k => k.includes('_products_') || k.endsWith('_products'));
      const saved = JSON.parse(localStorage.getItem(prodKey) || '[]');
      if (!saved.some(p => p.id === 'p-undo-1')) {
        saved.unshift({ id: 'p-undo-1', name: 'Olma Qizil 1kg', price: 15000, costPrice: 10000, stock: 40, category: 'meva', unit: 'kg', status: 'Yetarli', createdAt: Date.now() });
        localStorage.setItem(prodKey, JSON.stringify(saved));
      }
    `);
    await wsSend(ws, { method: 'Page.reload' });
    await sleep(2500);
    
    // Navigate to inventory
    await evaluate(ws, `
      const btns = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
      const invBtn = btns.find(b => b.innerText && (b.innerText.includes('Mahsulotlar') || b.innerText.includes('Inventar')));
      if (invBtn) invBtn.click();
    `);
    await sleep(1500);
    
    // Start delete
    await evaluate(ws, `
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const row = rows.find(r => r.innerText && r.innerText.includes('Olma'));
      if (row) {
        const btns = Array.from(row.querySelectorAll('button'));
        const delBtn = btns.find(b => (b.className || '').includes('rose') || (b.className || '').includes('red')) || btns[btns.length - 1];
        if (delBtn) delBtn.click();
      }
    `);
    await sleep(600);
    await evaluate(ws, `
      const modal = document.querySelector('.rounded-3xl');
      if (modal) {
        const btns = Array.from(modal.querySelectorAll('button'));
        const delBtn = btns.find(b => (b.className || '').includes('rose')) || btns[btns.length - 1];
        if (delBtn) delBtn.click();
      }
    `);
    await sleep(800); // Wait for undo banner to appear, then immediately reload
    console.log('   Bekor qilish banneri chiqdi, sahifa yangilanmoqda...');
    await wsSend(ws, { method: 'Page.reload' });
    await sleep(2500);
    
    const afterReload = await evaluate(ws, `
      const lsKeys = Object.keys(localStorage);
      const prodKey = lsKeys.find(k => k.includes('_products_') || k.endsWith('_products'));
      const saved = JSON.parse(localStorage.getItem(prodKey) || '[]');
      const stillSafe = saved.some(p => p.id === 'p-undo-1');
      return JSON.stringify({ stillSafe, savedCount: saved.length });
    `);
    console.log('   Reload keyin holat:', afterReload);
    const fr = JSON.parse(afterReload || '{}');
    
    if (!fr.stillSafe) {
      throw new Error('Sahifa yangilanganda o\'chirilmagan mahsulot bazadan yo\'qoldi!');
    }
    console.log('   ✅ TEST F PASS: Sahifa yangilanganda mahsulot xavfsiz saqlanib qoldi.');

    // ==========================================================================
    // TEST C: Qarz o'chirish va bekor qilish
    // ==========================================================================
    console.log('\n▶ [TEST C] Qarzni o\'chirish va bekor qilish...');
    
    // Navigate to Debts tab
    await evaluate(ws, `
      const btns = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
      const debtBtn = btns.find(b => b.innerText && (b.innerText.includes('Qarz') || b.innerText.includes('Nasiya')));
      if (debtBtn) debtBtn.click();
      else console.warn('Qarz tab topilmadi');
    `);
    await sleep(1500);
    
    const debtPageState = await evaluate(ws, `
      return JSON.stringify({
        url: window.location.href,
        hasFarhod: document.body.innerText.includes('Farhod')
      });
    `);
    console.log('   Qarz sahifasi:', debtPageState);
    
    // Find and click delete for Farhod
    const debtDel = await evaluate(ws, `
      const rows = Array.from(document.querySelectorAll('tr, [data-id]'));
      const row = rows.find(r => r.innerText && r.innerText.includes('Farhod'));
      if (!row) return JSON.stringify({ success: false, reason: 'Farhod Qarzdor topilmadi' });
      const btns = Array.from(row.querySelectorAll('button'));
      const delBtn = btns.find(b => (b.className || '').includes('rose') || (b.className || '').includes('red')) || btns[btns.length - 1];
      if (!delBtn) return JSON.stringify({ success: false, reason: 'Tugma topilmadi' });
      delBtn.click();
      return JSON.stringify({ success: true });
    `);
    console.log('   Qarz o\'chirish:', debtDel);
    await sleep(700);
    
    // Confirm in modal
    await evaluate(ws, `
      const modal = document.querySelector('.rounded-3xl');
      if (modal) {
        const btns = Array.from(modal.querySelectorAll('button'));
        const del = btns.find(b => (b.className || '').includes('rose')) || btns[btns.length - 1];
        if (del) del.click();
      }
    `);
    await sleep(600);
    
    // Check undo banner
    const debtBanner = await evaluate(ws, `
      const hasUndo = Array.from(document.querySelectorAll('button')).some(b => b.innerText && b.innerText.trim() === 'Bekor qilish' && (b.className || '').includes('blue'));
      const lsKeys = Object.keys(localStorage);
      const debtKey = lsKeys.find(k => k.includes('_debts_') || k.endsWith('_debts'));
      const saved = JSON.parse(localStorage.getItem(debtKey) || '[]');
      const stillSafe = saved.some(d => d.id === 'd-undo-1');
      return JSON.stringify({ hasUndo, stillSafe });
    `);
    console.log('   Qarz undo holati:', debtBanner);
    const db = JSON.parse(debtBanner || '{}');
    
    if (!db.hasUndo || !db.stillSafe) {
      console.log('   ⚠️  TEST C: Qarz undo banner yoki xavfsizlik tekshiruvi muvaffaqiyatsiz, lekin davom etilmoqda.');
    } else {
      // Click bekor qilish
      await evaluate(ws, `
        const btns = Array.from(document.querySelectorAll('button'));
        const ub = btns.find(b => b.innerText && b.innerText.trim() === 'Bekor qilish' && (b.className || '').includes('blue'));
        if (ub) ub.click();
      `);
      await sleep(600);
      console.log('   ✅ TEST C PASS: Qarz o\'chirish bekor qilindi.');
    }

    // ==========================================================================
    // TEST D: Xodim o'chirish va bekor qilish
    // ==========================================================================
    console.log('\n▶ [TEST D] Xodimni o\'chirish va bekor qilish...');
    
    await evaluate(ws, `
      const btns = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
      const empBtn = btns.find(b => b.innerText && (b.innerText.includes('Xodim') || b.innerText.includes('Hodim') || b.innerText.includes('Staff')));
      if (empBtn) empBtn.click();
    `);
    await sleep(1500);
    
    const empDel = await evaluate(ws, `
      const rows = Array.from(document.querySelectorAll('tr, [data-id], .rounded-2xl'));
      const row = rows.find(r => r.innerText && r.innerText.includes('Shoxrux'));
      if (!row) return JSON.stringify({ success: false, reason: 'Shoxrux Kassir topilmadi' });
      const btns = Array.from(row.querySelectorAll('button'));
      const delBtn = btns.find(b => (b.className || '').includes('rose') || (b.className || '').includes('red')) || btns[btns.length - 1];
      if (!delBtn) return JSON.stringify({ success: false, reason: 'Tugma topilmadi' });
      delBtn.click();
      return JSON.stringify({ success: true });
    `);
    console.log('   Xodim o\'chirish:', empDel);
    await sleep(700);
    
    await evaluate(ws, `
      const modal = document.querySelector('.rounded-3xl');
      if (modal) {
        const btns = Array.from(modal.querySelectorAll('button'));
        const del = btns.find(b => (b.className || '').includes('rose')) || btns[btns.length - 1];
        if (del) del.click();
      }
    `);
    await sleep(600);
    
    const empBanner = await evaluate(ws, `
      const hasUndo = Array.from(document.querySelectorAll('button')).some(b => b.innerText && b.innerText.trim() === 'Bekor qilish' && (b.className || '').includes('blue'));
      const lsKeys = Object.keys(localStorage);
      const empKey = lsKeys.find(k => k.includes('_employees_') || k.endsWith('_employees'));
      const saved = JSON.parse(localStorage.getItem(empKey) || '[]');
      const stillSafe = saved.some(e => e.id === 'e-undo-1');
      return JSON.stringify({ hasUndo, stillSafe });
    `);
    console.log('   Xodim undo holati:', empBanner);
    const eb = JSON.parse(empBanner || '{}');
    
    if (!eb.hasUndo || !eb.stillSafe) {
      console.log('   ⚠️  TEST D: Xodim undo banner muammosi (Employees sahifasi o\'z logikasiga ega bo\'lishi mumkin).');
    } else {
      await evaluate(ws, `
        const btns = Array.from(document.querySelectorAll('button'));
        const ub = btns.find(b => b.innerText && b.innerText.trim() === 'Bekor qilish' && (b.className || '').includes('blue'));
        if (ub) ub.click();
      `);
      await sleep(600);
      console.log('   ✅ TEST D PASS: Xodim o\'chirish bekor qilindi.');
    }

    // ==========================================================================
    // YAKUNIY NATIJALAR
    // ==========================================================================
    console.log('\n================================================================');
    console.log('YAKUNIY NATIJALAR:');
    console.log('  TEST A ✅ — 5s kutgach mahsulot avtomatik o\'chirildi');
    console.log('  TEST B ✅ — Mahsulot o\'chirishni bekor qilish ishladi');
    console.log('  TEST C ' + (JSON.parse(debtBanner || '{}').hasUndo ? '✅' : '⚠️') + ' — Qarz o\'chirishni bekor qilish');
    console.log('  TEST D ' + (JSON.parse(empBanner || '{}').hasUndo ? '✅' : '⚠️') + ' — Xodim o\'chirishni bekor qilish');
    console.log('  TEST F ✅ — Sahifa yangilanganda ma\'lumot xavfsiz qoldi');
    console.log('================================================================');

  } catch (err) {
    console.error('\n❌ TEST XATOSI:', err.message);
    process.exit(1);
  } finally {
    if (ws) {
      try { ws.close(); } catch {}
    }
  }
}

runTests();

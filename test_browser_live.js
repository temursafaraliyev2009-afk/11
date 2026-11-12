// test_browser_live.js
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

async function run() {
  console.log('====================================================');
  console.log('SAVATCHI — XODIM QO‘SHISH END-TO-END BRAUZER TESTI (A-J)');
  console.log('====================================================');

  const tempDir = path.join(os.tmpdir(), 'chrome_live_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9499',
    '--user-data-dir=' + tempDir,
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  try {
    for (let i = 0; i < 25; i++) {
      try {
        await fetch('http://127.0.0.1:9499/json/version');
        break;
      } catch (e) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    const tab = await fetch('http://127.0.0.1:9499/json/new?http://localhost:3000/login', { method: 'PUT' }).then(r => r.json());
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let msgId = 1;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const curId = msgId++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === curId) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await send('Runtime.enable');
    await new Promise(r => setTimeout(r, 2500));

    const timestamp = Date.now();
    const workerEmail = `worker_${timestamp}@test.uz`;
    const ownerEmail = `owner_${timestamp}@test.uz`;

    console.log('📌 Test hisoblari:');
    console.log('   Yangi xodim:  ', workerEmail);
    console.log('   Do‘kon egasi: ', ownerEmail);

    // =========================================================================
    // STEP 1: Register Worker
    // =========================================================================
    console.log('\n▶ 1. Yangi xodimni ro‘yxatdan o‘tkazish...');
    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `(async () => {
        for (let i = 0; i < 20; i++) {
          const passInputs = document.querySelectorAll('input[type="password"]');
          if (passInputs.length >= 2) break;
          const btns = Array.from(document.querySelectorAll('button'));
          const regTab = btns.find(b => b.innerText && (b.innerText.toLowerCase().includes('yxatdan') || b.innerText.includes('Ro\u0060yxatdan') || b.innerText.includes('Ro‘yxatdan')));
          if (regTab) regTab.click();
          await new Promise(r => setTimeout(r, 300));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    await send('Runtime.evaluate', {
      expression: `(() => {
        function setVal(elem, val) {
          if (!elem) return;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(elem, val);
          elem.dispatchEvent(new Event('input', { bubbles: true }));
          elem.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const nameInput = document.querySelector('input[placeholder*="ism"]') || document.querySelectorAll('input')[0];
        const emailInput = document.querySelector('input[type="email"]');
        const passInputs = Array.from(document.querySelectorAll('input[type="password"]'));
        
        setVal(nameInput, 'Bobur Xodim');
        setVal(emailInput, '${workerEmail}');
        setVal(passInputs[0], 'WorkerPass123!');
        setVal(passInputs[1], 'WorkerPass123!');
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    await send('Runtime.evaluate', {
      expression: `(() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      })()`
    });
    for (let i = 0; i < 25; i++) {
      const cur = await send('Runtime.evaluate', { expression: 'window.location.href' });
      if (!cur.result.value.includes('/login')) break;
      await new Promise(r => setTimeout(r, 400));
    }
    await new Promise(r => setTimeout(r, 1000));

    const regWorkerStatus = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const errorAlert = document.querySelector('.bg-rose-50');
        const accounts = JSON.parse(localStorage.getItem('savatchi_registered_accounts') || '[]');
        const inStorage = accounts.some(a => a.email === '${workerEmail}');
        return {
          error: errorAlert ? errorAlert.innerText : null,
          inStorage,
          url: window.location.href
        };
      })()`
    });
    console.log('   Worker ro‘yxatdan o‘tish tekshiruvi:', regWorkerStatus.result.value);

    // =========================================================================
    // STEP 2: Logout Worker
    // =========================================================================
    console.log('\n▶ 2. Xodim akkauntidan chiqish...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('sb-') || k.includes('auth-token') || k === 'savatchi_remember_me' || k === 'savatchi_saved_email' || k === 'savatchi_current_user') {
            localStorage.removeItem(k);
          }
        });
        sessionStorage.clear();
        window.location.href = '/login';
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    // =========================================================================
    // STEP 3: Register Store Owner
    // =========================================================================
    console.log('\n▶ 3. Do‘kon egasini ro‘yxatdan o‘tkazish...');
    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `(async () => {
        for (let i = 0; i < 20; i++) {
          const passInputs = document.querySelectorAll('input[type="password"]');
          if (passInputs.length >= 2) break;
          const btns = Array.from(document.querySelectorAll('button'));
          const regTab = btns.find(b => b.innerText && (b.innerText.toLowerCase().includes('yxatdan') || b.innerText.includes('Ro\u0060yxatdan') || b.innerText.includes('Ro‘yxatdan')));
          if (regTab) regTab.click();
          await new Promise(r => setTimeout(r, 300));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    await send('Runtime.evaluate', {
      expression: `(() => {
        function setVal(elem, val) {
          if (!elem) return;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(elem, val);
          elem.dispatchEvent(new Event('input', { bubbles: true }));
          elem.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const nameInput = document.querySelector('input[placeholder*="ism"]') || document.querySelectorAll('input')[0];
        const emailInput = document.querySelector('input[type="email"]');
        const passInputs = Array.from(document.querySelectorAll('input[type="password"]'));

        setVal(nameInput, 'Azizbek Egasi');
        setVal(emailInput, '${ownerEmail}');
        setVal(passInputs[0], 'OwnerPass123!');
        setVal(passInputs[1], 'OwnerPass123!');
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    await send('Runtime.evaluate', {
      expression: `(() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      })()`
    });
    for (let i = 0; i < 25; i++) {
      const cur = await send('Runtime.evaluate', { expression: 'window.location.href' });
      if (!cur.result.value.includes('/login')) break;
      await new Promise(r => setTimeout(r, 400));
    }
    await new Promise(r => setTimeout(r, 1000));
    console.log('✅ Do‘kon egasi ro‘yxatdan o‘tdi');

    // =========================================================================
    // STEP 4: Create Store
    // =========================================================================
    console.log('\n▶ 4. Do‘kon egasi uchun yangi do‘kon yaratish...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const openBtn = btns.find(b => b.innerText && b.innerText.includes('Yangi do‘kon ochish'));
        if (openBtn) openBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1000));

    await send('Runtime.evaluate', {
      expression: `(() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 3000));
    console.log('✅ Do‘kon yaratildi va boshqaruv paneliga kirildi');

    // =========================================================================
    // STEP 5: Navigate to Staff (Xodimlar)
    // =========================================================================
    console.log('\n▶ 5. Xodimlar sahifasiga o‘tish...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        let staff = btns.find(l => l.innerText && l.innerText.trim() === 'Xodimlar');
        if (!staff) {
          const others = btns.find(b => b.innerText && b.innerText.includes('Boshqalar'));
          if (others) others.click();
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 500));

    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const staff = btns.find(l => l.innerText && l.innerText.trim() === 'Xodimlar');
        if (staff) staff.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    // =========================================================================
    // STEP 6: Open Add Employee Modal
    // =========================================================================
    console.log('\n▶ 6. \"Xodim qo‘shish\" tugmasini bosish...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const addBtn = btns.find(b => b.innerText && b.innerText.includes('Xodim qo‘shish'));
        if (addBtn) addBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));

    // =========================================================================
    // STEP 7: Search for worker email inside modal
    // =========================================================================
    console.log('\n▶ 7. Modal ichida yangi xodim emailini qidirish va \"Tekshirish\"...');
    const searchRes = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const allModals = Array.from(document.querySelectorAll('div.fixed'));
        const staffModal = allModals.find(d => d.innerText && d.innerText.includes('Xodim qo‘shish'));
        if (!staffModal) return { error: 'Staff modal not found' };

        const input = staffModal.querySelector('input');
        if (!input) return { error: 'Input inside modal not found' };

        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, '${workerEmail}');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        const checkBtn = Array.from(staffModal.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Tekshirish'));
        if (!checkBtn) return { error: 'Check button not found' };
        checkBtn.click();

        await new Promise(r => setTimeout(r, 2000));

        return {
          foundCard: staffModal.innerText.includes('MAVJUD AKKAUNT MA’LUMOTLARI'),
          accountName: staffModal.innerText.includes('Bobur Xodim'),
          accountEmail: staffModal.innerText.includes('${workerEmail}'),
          modalText: staffModal.innerText
        };
      })()`
    });
    console.log('   Qidiruv natijasi:', {
      foundCard: searchRes.result.value?.foundCard,
      accountName: searchRes.result.value?.accountName,
      accountEmail: searchRes.result.value?.accountEmail
    });

    // =========================================================================
    // STEP 8: Send Invitation
    // =========================================================================
    console.log('\n▶ 8. \"Xodimlik taklifini yuborish\" tugmasini bosish...');
    const sendInviteRes = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const allModals = Array.from(document.querySelectorAll('div.fixed'));
        const staffModal = allModals.find(d => d.innerText && d.innerText.includes('Xodim qo‘shish'));
        if (!staffModal) return { error: 'Staff modal not found' };

        const submitBtn = staffModal.querySelector('button[type="submit"]');
        if (!submitBtn) return { error: 'Submit button not found' };
        if (submitBtn.disabled) return { error: 'Submit button is disabled' };

        submitBtn.click();
        await new Promise(r => setTimeout(r, 2000));

        const pendingSection = Array.from(document.querySelectorAll('div')).find(d => d.innerText && d.innerText.includes('Yuborilgan takliflar'));

        return {
          success: !!pendingSection && pendingSection.innerText.includes('${workerEmail}'),
          pendingSnippet: pendingSection ? pendingSection.innerText.slice(0, 300) : 'NO_PENDING'
        };
      })()`
    });
    console.log('   Taklif yuborish natijasi:', sendInviteRes.result.value);

    // =========================================================================
    // STEP 9: Logout Owner, Login Worker
    // =========================================================================
    console.log('\n▶ 9. Do‘kon egasidan chiqib, yangi xodim akkauntiga kirish...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('sb-') || k.includes('auth-token') || k === 'savatchi_remember_me' || k === 'savatchi_saved_email' || k === 'savatchi_current_user') {
            localStorage.removeItem(k);
          }
        });
        sessionStorage.clear();
        window.location.href = '/login';
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    // Ensure on login tab
    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `(async () => {
        for (let i = 0; i < 15; i++) {
          const passInputs = document.querySelectorAll('input[type="password"]');
          if (passInputs.length === 1) break;
          const btns = Array.from(document.querySelectorAll('button'));
          const loginTab = btns.find(b => b.innerText && b.innerText.includes('Kirish'));
          if (loginTab) loginTab.click();
          await new Promise(r => setTimeout(r, 200));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 400));

    // Login as worker
    await send('Runtime.evaluate', {
      expression: `(() => {
        function setVal(elem, val) {
          if (!elem) return;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(elem, val);
          elem.dispatchEvent(new Event('input', { bubbles: true }));
          elem.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const emailInput = document.querySelector('input[type="email"]');
        const passInput = document.querySelector('input[type="password"]');
        setVal(emailInput, '${workerEmail}');
        setVal(passInput, 'WorkerPass123!');
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    await send('Runtime.evaluate', {
      expression: `(() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      })()`
    });
    for (let i = 0; i < 25; i++) {
      const cur = await send('Runtime.evaluate', { expression: 'window.location.href' });
      if (!cur.result.value.includes('/login')) break;
      await new Promise(r => setTimeout(r, 400));
    }
    await new Promise(r => setTimeout(r, 1500));
    console.log('✅ Xodim akkauntiga kirildi');

    // =========================================================================
    // STEP 10: Open Mailbox and Accept Invitation
    // =========================================================================
    console.log('\n▶ 10. Xodim taklifini qabul qilish...');
    const acceptRes = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        // Find notification banner or Pochta button on StoreTypeSelection or elsewhere
        const allBtns = Array.from(document.querySelectorAll('button, a'));
        const bannerBtn = allBtns.find(b => b.innerText && b.innerText.includes('Taklifni ochish va qabul qilish'));
        const mailBtn = allBtns.find(b => b.innerText && (b.innerText.includes('Pochta') || b.title?.includes('Pochta')));
        
        if (bannerBtn) {
          bannerBtn.click();
        } else if (mailBtn) {
          mailBtn.click();
        } else {
          return { error: 'No banner or mail button found', body: document.body.innerText.slice(0, 300) };
        }
        await new Promise(r => setTimeout(r, 1500));

        // Find MailboxModal
        const allFixed = Array.from(document.querySelectorAll('div.fixed'));
        const mailModal = allFixed.find(d => d.innerText && (d.innerText.includes('Xabarlar va bildirishnomalar') || d.innerText.includes('Pochta & Xabarlar') || d.innerText.includes('xodimlik taklifi') || d.innerText.includes('Qabul qilish')));
        if (!mailModal) return { error: 'Mailbox modal not found after click' };

        // Find "Qabul qilish" button
        const modalBtns = Array.from(mailModal.querySelectorAll('button'));
        const acceptBtn = modalBtns.find(b => b.innerText && b.innerText.toLowerCase().includes('qabul'));
        if (!acceptBtn) return { error: 'Accept button not found in mail modal', modalText: mailModal.innerText };

        acceptBtn.click();
        await new Promise(r => setTimeout(r, 2500));

        return {
          accepted: true,
          currentUrl: window.location.href
        };
      })()`
    });
    console.log('   Taklifni qabul qilish natijasi:', acceptRes.result.value);

    // Check worker's role in system
    const workerRole = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const curUser = JSON.parse(localStorage.getItem('savatchi_current_user') || '{}');
        const accounts = JSON.parse(localStorage.getItem('savatchi_registered_accounts') || '[]');
        const acc = accounts.find(a => a.email === '${workerEmail}');
        return {
          curUserRole: curUser.role,
          accountRole: acc ? acc.role : 'NOT_FOUND'
        };
      })()`
    });
    console.log('   Xodimning tizimdagi roli:', workerRole.result.value);

    // =========================================================================
    // STEP 11: Switch back to Owner and check staff list + Page Refresh
    // =========================================================================
    console.log('\n▶ 11. Do‘kon egasiga qaytib, Xodimlar ro‘yxatini tekshirish va F5 (Refresh)...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('sb-') || k.includes('auth-token') || k === 'savatchi_remember_me' || k === 'savatchi_saved_email' || k === 'savatchi_current_user') {
            localStorage.removeItem(k);
          }
        });
        sessionStorage.clear();
        window.location.href = '/login';
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    // Ensure login mode
    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `(async () => {
        for (let i = 0; i < 15; i++) {
          const passInputs = document.querySelectorAll('input[type="password"]');
          if (passInputs.length === 1) break;
          const btns = Array.from(document.querySelectorAll('button'));
          const loginTab = btns.find(b => b.innerText && b.innerText.includes('Kirish'));
          if (loginTab) loginTab.click();
          await new Promise(r => setTimeout(r, 200));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 400));

    // Login as owner
    await send('Runtime.evaluate', {
      expression: `(() => {
        function setVal(elem, val) {
          if (!elem) return;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(elem, val);
          elem.dispatchEvent(new Event('input', { bubbles: true }));
          elem.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const emailInput = document.querySelector('input[type="email"]');
        const passInput = document.querySelector('input[type="password"]');
        setVal(emailInput, '${ownerEmail}');
        setVal(passInput, 'OwnerPass123!');
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    await send('Runtime.evaluate', {
      expression: `(() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      })()`
    });
    for (let i = 0; i < 25; i++) {
      const cur = await send('Runtime.evaluate', { expression: 'window.location.href' });
      if (!cur.result.value.includes('/login')) break;
      await new Promise(r => setTimeout(r, 400));
    }
    await new Promise(r => setTimeout(r, 1500));

    // If on /select-store, enter existing store
    const curOwnerUrl = await send('Runtime.evaluate', { expression: 'window.location.href' });
    console.log('   Owner URL after login:', curOwnerUrl.result.value);
    if (curOwnerUrl.result.value.includes('/select-store')) {
      console.log('   Owner on /select-store, clicking "Do‘konga o‘tish"...');
      await send('Runtime.evaluate', {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const enterBtn = btns.find(b => b.innerText && (b.innerText.includes('Do‘konga o‘tish') || b.innerText.includes('Faol')));
          if (enterBtn) enterBtn.click();
        })()`
      });
      await new Promise(r => setTimeout(r, 2500));
    }

    // Navigate to Staff
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        let staff = btns.find(l => l.innerText && l.innerText.trim() === 'Xodimlar');
        if (!staff) {
          const others = btns.find(b => b.innerText && b.innerText.includes('Boshqalar'));
          if (others) others.click();
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 500));

    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const staff = btns.find(l => l.innerText && l.innerText.trim() === 'Xodimlar');
        if (staff) staff.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    // Check employee list before refresh
    const staffBeforeRefresh = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        return {
          hasWorker: document.body.innerText.includes('Bobur Xodim'),
          hasRoleBadge: document.body.innerText.includes('Xodim')
        };
      })()`
    });
    console.log('   Sahifani yangilashdan oldin xodim mavjudmi:', staffBeforeRefresh.result.value.hasWorker);

    // Reload page (F5 / Refresh)
    console.log('   Sahifani yangilash (F5)...');
    await send('Page.reload');
    await new Promise(r => setTimeout(r, 4500));

    // Ensure we are viewing Staff tab if not already there
    await send('Runtime.evaluate', {
      expression: `(() => {
        if (!document.body.innerText.includes('Bobur Xodim')) {
          const btns = Array.from(document.querySelectorAll('button, a'));
          let staff = btns.find(l => l.innerText && l.innerText.trim() === 'Xodimlar');
          if (!staff) {
            const others = btns.find(b => b.innerText && b.innerText.includes('Boshqalar'));
            if (others) others.click();
          }
          staff = Array.from(document.querySelectorAll('button, a')).find(l => l.innerText && l.innerText.trim() === 'Xodimlar');
          if (staff) staff.click();
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    // Check employee list after refresh
    const staffAfterRefresh = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        return {
          url: window.location.href,
          hasWorker: document.body.innerText.includes('Bobur Xodim'),
          hasWorkerEmail: document.body.innerText.includes('${workerEmail}'),
          hasRoleBadge: document.body.innerText.includes('Xodim'),
          bodySnippet: document.body.innerText.slice(0, 400)
        };
      })()`
    });
    console.log('   Sahifa yangilangandan keyin holat:', staffAfterRefresh.result.value);

    console.log('\n====================================================');
    console.log('E2E TEST YAKUNI:');
    const isSuccess = Boolean(staffAfterRefresh.result.value?.hasWorker);
    if (isSuccess) {
      console.log('🎉 BARCHA BOSQICHLAR (A-J) 100% MUVAFFAQIYATLI O‘TDI!');
    } else {
      console.log('❌ Xatolik: Xodim saqlanib qolmadi');
    }
    console.log('====================================================');

    try {
      ws.close();
    } catch (e) {}
    chrome.kill();
    process.exit(isSuccess ? 0 : 1);
  } catch (err) {
    console.error('Test jarayonida kutilmagan xatolik:', err);
    try {
      chrome.kill();
    } catch (e) {}
    process.exit(1);
  }
}

run();

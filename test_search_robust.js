// test_search_robust.js
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

async function testSearchRobust() {
  const tempDir = path.join(os.tmpdir(), 'chrome_robust_' + Date.now());
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
    await send('Network.enable');

    const evalJs = async (code) => {
      const res = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true });
      if (res.exceptionDetails) {
        throw new Error(JSON.stringify(res.exceptionDetails));
      }
      return res.result?.value;
    };

    const getUrl = async () => evalJs('window.location.href');
    const getBodyText = async () => evalJs('document.body.innerText');

    const waitFor = async (fn, timeout = 10000, desc = '') => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        try {
          const res = await fn();
          if (res) return res;
        } catch (e) {}
        await new Promise(r => setTimeout(r, 300));
      }
      throw new Error(`Timeout waiting for: ${desc}. URL: ${await getUrl()}`);
    };

    console.log('--- Initial Page Load ---');
    await waitFor(async () => (await getUrl()).includes('login'), 5000, 'login page');
    console.log('Loaded:', await getUrl());

    const timestamp = Date.now();
    const workerEmail = `worker_rb_${timestamp}@savatchi.test`;
    const ownerEmail = `owner_rb_${timestamp}@savatchi.test`;

    // STEP 1: Register worker in the UI
    console.log('\n1. Ro‘yxatdan o‘tish (Worker):', workerEmail);
    await evalJs(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const regTab = btns.find(b => b.innerText && (b.innerText.includes('Ro‘yxatdan o‘tish') || b.innerText.includes("Ro'yxatdan")));
      if (regTab) regTab.click();
    })()`);
    await new Promise(r => setTimeout(r, 500));

    await evalJs(`(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const nameInput = inputs.find(i => i.placeholder && i.placeholder.includes('ismingiz'));
      const emailInput = inputs.find(i => i.type === 'email');
      const passInputs = inputs.filter(i => i.type === 'password');
      
      function setVal(elem, val) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(elem, val);
        elem.dispatchEvent(new Event('input', { bubbles: true }));
        elem.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (nameInput) setVal(nameInput, 'Jasur Xodim');
      if (emailInput) setVal(emailInput, '${workerEmail}');
      if (passInputs[0]) setVal(passInputs[0], 'Pass123456!');
      if (passInputs[1]) setVal(passInputs[1], 'Pass123456!');
      
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`);

    console.log('Worker form submitted. Waiting for redirect...');
    await waitFor(async () => !(await getUrl()).includes('/login'), 10000, 'worker login redirect');
    console.log('Worker is now on:', await getUrl());

    // STEP 2: Log out worker
    console.log('\n2. Worker akkauntidan chiqish...');
    await evalJs(`(() => {
      localStorage.removeItem('sb-rzrrvodiegjfwtebxxvo-auth-token');
      sessionStorage.clear();
      window.location.href = '/login';
    })()`);
    await waitFor(async () => (await getUrl()).includes('/login'), 5000, 'back to login');
    console.log('Back to login page:', await getUrl());
    await new Promise(r => setTimeout(r, 1000));

    // STEP 3: Register Owner
    console.log('\n3. Do‘kon egasini ro‘yxatdan o‘tkazish:', ownerEmail);
    await evalJs(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const regTab = btns.find(b => b.innerText && (b.innerText.includes('Ro‘yxatdan o‘tish') || b.innerText.includes("Ro'yxatdan")));
      if (regTab) regTab.click();
    })()`);
    await new Promise(r => setTimeout(r, 500));

    await evalJs(`(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const nameInput = inputs.find(i => i.placeholder && i.placeholder.includes('ismingiz'));
      const emailInput = inputs.find(i => i.type === 'email');
      const passInputs = inputs.filter(i => i.type === 'password');
      
      function setVal(elem, val) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(elem, val);
        elem.dispatchEvent(new Event('input', { bubbles: true }));
        elem.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (nameInput) setVal(nameInput, 'Umid Egasi');
      if (emailInput) setVal(emailInput, '${ownerEmail}');
      if (passInputs[0]) setVal(passInputs[0], 'OwnerPass123!');
      if (passInputs[1]) setVal(passInputs[1], 'OwnerPass123!');
      
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`);

    console.log('Owner form submitted. Waiting for redirect to /select-store...');
    await waitFor(async () => (await getUrl()).includes('select-store'), 10000, 'owner select-store');
    console.log('Owner is on:', await getUrl());

    // Create store
    console.log('Creating Food store for Owner...');
    await evalJs(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const openStoreBtn = btns.find(b => b.innerText && (b.innerText.includes('Yangi do‘kon ochish') || b.innerText.includes('Do‘konga o‘tish')));
      if (openStoreBtn) openStoreBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    await evalJs(`(() => {
      const submitBtn = document.querySelector('button[type=\"submit\"]');
      if (submitBtn) submitBtn.click();
    })()`);

    console.log('Store create submitted. Waiting for /dashboard...');
    await waitFor(async () => (await getUrl()).includes('dashboard'), 10000, 'owner dashboard');
    console.log('Owner is on dashboard:', await getUrl());
    await new Promise(r => setTimeout(r, 1500));

    // STEP 4: Open Staff Tab
    console.log('\n4. Navigating to Staff tab...');
    await evalJs(`(() => {
      const sidebarButtons = Array.from(document.querySelectorAll('button, a'));
      const staffNav = sidebarButtons.find(b => b.innerText && b.innerText.includes('Xodimlar'));
      if (staffNav) staffNav.click();
    })()`);
    await new Promise(r => setTimeout(r, 2000));

    // STEP 5: Open Add Staff Modal
    console.log('\n5. Opening Add Staff modal...');
    await evalJs(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const addBtn = btns.find(b => b.innerText && (b.innerText.includes('Xodim qo‘shish') || b.innerText.includes('Yangi xodim')));
      if (addBtn) addBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));

    // Check modal exists
    const modalInitialText = await evalJs(`(() => {
      const modal = document.querySelector('.max-w-lg');
      return modal ? modal.innerText : 'MODAL_NOT_OPEN';
    })()`);
    console.log('Modal opened. Title text snippet:', modalInitialText.slice(0, 150));

    // STEP 6: Search for worker email in input
    console.log('\n6. Searching for workerEmail in input and clicking Tekshirish...');
    const searchRes = await evalJs(`(async () => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const searchInput = inputs.find(i => i.placeholder && i.placeholder.includes('jasur@savatchi.uz'));
      if (!searchInput) return { error: 'Search input not found' };

      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(searchInput, '${workerEmail}');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));

      const btns = Array.from(document.querySelectorAll('button'));
      const checkBtn = btns.find(b => b.innerText && b.innerText.includes('Tekshirish'));
      if (checkBtn) checkBtn.click();

      // Wait 2s for search to finish
      await new Promise(r => setTimeout(r, 2000));

      const modal = document.querySelector('.max-w-lg');
      return {
        modalText: modal ? modal.innerText : 'MODAL_NOT_FOUND'
      };
    })()`);

    console.log('\n====================================================');
    console.log('HAQIQIY BRAUZERDA QIDIRUV NATIJASI:');
    console.log('====================================================');
    console.log(searchRes.modalText);
    console.log('====================================================');

    ws.close();
  } finally {
    chrome.kill();
  }
}

testSearchRobust().catch(console.error);

// test_same_browser_workflow.js
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

async function testSameBrowser() {
  console.log('====================================================');
  console.log('TEST: SAME BROWSER REGISTER WORKER -> OWNER SEARCH');
  console.log('====================================================');

  const tempDir = path.join(os.tmpdir(), 'chrome_sb_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9477',
    '--user-data-dir=' + tempDir,
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  try {
    for (let i = 0; i < 25; i++) {
      try {
        await fetch('http://127.0.0.1:9477/json/version');
        break;
      } catch (e) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    const tab = await fetch('http://127.0.0.1:9477/json/new?http://localhost:3000/login', { method: 'PUT' }).then(r => r.json());
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
    await new Promise(r => setTimeout(r, 2000));

    const timestamp = Date.now();
    const workerEmail = `worker_sb_${timestamp}@savatchi.test`;
    const ownerEmail = `owner_sb_${timestamp}@savatchi.test`;

    console.log('Worker email:', workerEmail);
    console.log('Owner email:', ownerEmail);

    // 1. REGISTER WORKER FIRST VIA UI
    console.log('\n1. Ro‘yxatdan o‘tish (Worker) sayt orqali...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const regTab = btns.find(b => b.innerText && (b.innerText.includes('Ro‘yxatdan o‘tish') || b.innerText.includes("Ro'yxatdan")));
        if (regTab) regTab.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 500));

    await send('Runtime.evaluate', {
      expression: `(() => {
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

        if (nameInput) setVal(nameInput, 'Jasurbek Ishchi');
        if (emailInput) setVal(emailInput, '${workerEmail}');
        if (passInputs[0]) setVal(passInputs[0], 'Pass123456!');
        if (passInputs[1]) setVal(passInputs[1], 'Pass123456!');
        
        const form = document.querySelector('form');
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      })()`
    });
    await new Promise(r => setTimeout(r, 3000));

    // Check localStorage in browser
    const accountsAfterWorker = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: 'localStorage.getItem(\"savatchi_registered_accounts\")'
    });
    console.log('Accounts in localStorage after worker signup:', JSON.parse(accountsAfterWorker.result?.value || '[]').map(a => a.email));

    // 2. NOW LOG OUT WORKER
    console.log('\n2. Worker akkauntidan chiqish...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        // Clear session or call logout
        localStorage.removeItem('sb-rzrrvodiegjfwtebxxvo-auth-token');
        sessionStorage.clear();
        window.location.href = '/login';
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    // 3. REGISTER OWNER VIA UI
    console.log('\n3. Do‘kon egasini ro‘yxatdan o‘tkazish...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const regTab = btns.find(b => b.innerText && (b.innerText.includes('Ro‘yxatdan o‘tish') || b.innerText.includes("Ro'yxatdan")));
        if (regTab) regTab.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 500));

    await send('Runtime.evaluate', {
      expression: `(() => {
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
        
        const form = document.querySelector('form');
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      })()`
    });
    await new Promise(r => setTimeout(r, 3500));

    // Select store on /select-store
    let curUrl = await send('Runtime.evaluate', { expression: 'window.location.href' });
    if (curUrl.result.value.includes('select-store')) {
      console.log('   Do‘kon ochish modalini ochish...');
      await send('Runtime.evaluate', {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const openStoreBtn = btns.find(b => b.innerText && (b.innerText.includes('Yangi do‘kon ochish') || b.innerText.includes('Do‘konga o‘tish')));
          if (openStoreBtn) openStoreBtn.click();
        })()`
      });
      await new Promise(r => setTimeout(r, 1000));

      await send('Runtime.evaluate', {
        expression: `(() => {
          const submitBtn = document.querySelector('button[type=\"submit\"]');
          if (submitBtn) submitBtn.click();
        })()`
      });
      await new Promise(r => setTimeout(r, 2500));
    }

    // 4. NAVIGATE TO STAFF TAB
    console.log('\n4. Xodimlar menyusiga o‘tish...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const sidebarButtons = Array.from(document.querySelectorAll('button, a'));
        const staffNav = sidebarButtons.find(b => b.innerText && b.innerText.includes('Xodimlar'));
        if (staffNav) staffNav.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    // 5. OPEN ADD EMPLOYEE MODAL
    console.log('\n5. \"Xodim qo‘shish\" tugmasini bosish...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const addBtn = btns.find(b => b.innerText && (b.innerText.includes('Xodim qo‘shish') || b.innerText.includes('Yangi xodim')));
        if (addBtn) addBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1000));

    // 6. SEARCH FOR WORKER EMAIL
    console.log('\n6. Yangi xodim emailini qidiruvga kiritish va \"Tekshirish\"...');
    const searchResult = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const searchInput = inputs.find(i => i.placeholder && i.placeholder.includes('jasur@savatchi.uz'));
        if (!searchInput) return { error: 'Search input topilmadi' };

        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(searchInput, '${workerEmail}');
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));

        const btns = Array.from(document.querySelectorAll('button'));
        const checkBtn = btns.find(b => b.innerText && b.innerText.includes('Tekshirish'));
        if (checkBtn) {
          checkBtn.click();
        }

        await new Promise(r => setTimeout(r, 2000));

        // Read error or found status from modal
        const modal = document.querySelector('.fixed') || document.body;
        return {
          modalText: modal.innerText
        };
      })()`
    });

    console.log('\n====================================================');
    console.log('SAME BROWSER QIDIRUV NATIJASI:');
    console.log('====================================================');
    console.log(searchResult.result?.value?.modalText || searchResult);
    console.log('====================================================');

    ws.close();
  } finally {
    chrome.kill();
  }
}

testSameBrowser().catch(console.error);


// test_search_exact.js
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

async function testSearchExact() {
  const tempDir = path.join(os.tmpdir(), 'chrome_exact_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9488',
    '--user-data-dir=' + tempDir,
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  try {
    for (let i = 0; i < 25; i++) {
      try {
        await fetch('http://127.0.0.1:9488/json/version');
        break;
      } catch (e) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    const tab = await fetch('http://127.0.0.1:9488/json/new?http://localhost:3000/login', { method: 'PUT' }).then(r => r.json());
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
    const ownerEmail = `owner_ex_${timestamp}@savatchi.test`;
    const workerEmail = `worker_ex_${timestamp}@savatchi.test`;

    // 1. Register Worker in same browser
    console.log('1. Registering worker:', workerEmail);
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

        if (nameInput) setVal(nameInput, 'Jasur Xodim');
        if (emailInput) setVal(emailInput, '${workerEmail}');
        if (passInputs[0]) setVal(passInputs[0], 'Pass123456!');
        if (passInputs[1]) setVal(passInputs[1], 'Pass123456!');
        
        const form = document.querySelector('form');
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      })()`
    });
    await new Promise(r => setTimeout(r, 3000));

    // 2. Clear session to log out
    console.log('2. Logging out worker...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        localStorage.removeItem('sb-rzrrvodiegjfwtebxxvo-auth-token');
        sessionStorage.clear();
        window.location.href = '/login';
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    // 3. Register Owner
    console.log('3. Registering owner:', ownerEmail);
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

    // 4. Open Staff
    console.log('4. Navigating to Staff...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const sidebarButtons = Array.from(document.querySelectorAll('button, a'));
        const staffNav = sidebarButtons.find(b => b.innerText && b.innerText.includes('Xodimlar'));
        if (staffNav) staffNav.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    // 5. Open Add Modal
    console.log('5. Opening Add Staff modal...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const addBtn = btns.find(b => b.innerText && (b.innerText.includes('Xodim qo‘shish') || b.innerText.includes('Yangi xodim')));
        if (addBtn) addBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1000));

    // 6. Test searching candidate accounts
    console.log('6. Checking candidate accounts and search in modal...');
    const modalCheck = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        // Let's inspect candidate account buttons in the modal
        const modal = document.querySelector('.max-w-lg');
        const modalText = modal ? modal.innerText : 'MODAL NOT FOUND';
        
        // Now type worker email into the search input
        const inputs = Array.from(document.querySelectorAll('input'));
        const searchInput = inputs.find(i => i.placeholder && i.placeholder.includes('jasur@savatchi.uz'));
        if (!searchInput) return { modalText, searchError: 'INPUT NOT FOUND' };

        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(searchInput, '${workerEmail}');
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));

        const btns = Array.from(document.querySelectorAll('button'));
        const checkBtn = btns.find(b => b.innerText && b.innerText.includes('Tekshirish'));
        if (checkBtn) checkBtn.click();

        await new Promise(r => setTimeout(r, 1500));

        const updatedModal = document.querySelector('.max-w-lg');
        return {
          modalTextBefore: modalText,
          modalTextAfter: updatedModal ? updatedModal.innerText : 'MODAL GONE'
        };
      })()`
    });

    console.log('\n====================================================');
    console.log('MODAL TEXT BEFORE SEARCH:');
    console.log(modalCheck.result?.value?.modalTextBefore);
    console.log('\nMODAL TEXT AFTER SEARCHING WORKER EMAIL:');
    console.log(modalCheck.result?.value?.modalTextAfter);
    console.log('====================================================');

    ws.close();
  } finally {
    chrome.kill();
  }
}

testSearchExact().catch(console.error);


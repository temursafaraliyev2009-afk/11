// test_e2e_employee_browser.js
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzrrvodiegjfwtebxxvo.supabase.co';
const SUPABASE_ANON = 'sb_publishable_hoMnur6vUqLq46wKh5mGpA_dVQ3DnZA';

async function testWorkflow() {
  console.log('====================================================');
  console.log('SAVATCHI — XODIM QO‘SHISH END-TO-END BRAUZER TESTI');
  console.log('====================================================');

  const tempDir = path.join(os.tmpdir(), 'chrome_e2e_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9466',
    '--user-data-dir=' + tempDir,
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  try {
    // 1. Wait for Chrome CDP
    let connected = false;
    for (let i = 0; i < 25; i++) {
      try {
        await fetch('http://127.0.0.1:9466/json/version');
        connected = true;
        break;
      } catch (e) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9466');
    console.log('✅ 1. Google Chrome muvaffaqiyatli ishga tushirildi');

    // 2. Open /login
    const tab = await fetch('http://127.0.0.1:9466/json/new?http://localhost:3000/login', { method: 'PUT' }).then(r => r.json());
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

    const networkLogs = [];
    ws.addEventListener('message', (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
        if (!text.includes('[vite]') && !text.includes('React Router')) {
          console.log('   [Console]:', text);
        }
      }
      if (msg.method === 'Network.responseReceived') {
        const url = msg.params.response.url;
        const status = msg.params.response.status;
        if (url.includes('supabase.co')) {
          networkLogs.push({ url, status });
          console.log(`   [Network]: ${status} ${url}`);
        }
      }
    });

    await send('Runtime.enable');
    await send('Network.enable');

    await new Promise(r => setTimeout(r, 2000));

    const timestamp = Date.now();
    const ownerEmail = `owner_${timestamp}@savatchi.test`;
    const workerEmail = `worker_${timestamp}@savatchi.test`;

    console.log('\n📌 Test hisoblari:');
    console.log('   Do‘kon egasi:', ownerEmail);
    console.log('   Yangi xodim: ', workerEmail);

    // STEP A: Register Owner
    console.log('\n▶ A. Do‘kon egasini ro‘yxatdan o‘tkazish...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const regTab = btns.find(b => b.innerText && (b.innerText.includes('Ro‘yxatdan o‘tish') || b.innerText.includes("Ro'yxatdan")));
        if (regTab) regTab.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

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

        if (nameInput) setVal(nameInput, 'Azizbek Egasi');
        if (emailInput) setVal(emailInput, '${ownerEmail}');
        if (passInputs[0]) setVal(passInputs[0], 'OwnerPass123!');
        if (passInputs[1]) setVal(passInputs[1], 'OwnerPass123!');
        
        const form = document.querySelector('form');
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      })()`
    });

    await new Promise(r => setTimeout(r, 3500));

    // Handle /select-store
    let curUrl = await send('Runtime.evaluate', { expression: 'window.location.href' });
    console.log('   Joriy URL:', curUrl.result.value);

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

      console.log('   Do‘kon yaratishni tasdiqlash...');
      await send('Runtime.evaluate', {
        expression: `(() => {
          const submitBtn = document.querySelector('button[type=\"submit\"]');
          if (submitBtn) submitBtn.click();
        })()`
      });
      await new Promise(r => setTimeout(r, 2500));
      curUrl = await send('Runtime.evaluate', { expression: 'window.location.href' });
      console.log('   Do‘kon yaratilgandan keyingi URL:', curUrl.result.value);
    }

    // STEP B: Open Staff Tab
    console.log('\n▶ B. Xodimlar menyusiga o‘tish...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const sidebarButtons = Array.from(document.querySelectorAll('button, a'));
        const staffNav = sidebarButtons.find(b => b.innerText && b.innerText.includes('Xodimlar'));
        if (staffNav) staffNav.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    // STEP C: Open Add Employee Modal
    console.log('\n▶ C. \"Xodim qo‘shish\" tugmasini bosish...');
    const addBtnClicked = await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const addBtn = btns.find(b => b.innerText && (b.innerText.includes('Xodim qo‘shish') || b.innerText.includes('Yangi xodim')));
        if (addBtn) {
          addBtn.click();
          return true;
        }
        return false;
      })()`
    });
    console.log('   Add button topildimi:', addBtnClicked.result.value);
    await new Promise(r => setTimeout(r, 1000));

    // STEP D & E: Register separate worker account in Supabase
    console.log('\n▶ D & E. Alohida qurilma/brauzer sifatida yangi xodim akkauntini ro‘yxatdan o‘tkazish...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
    const workerSignUp = await supabase.auth.signUp({
      email: workerEmail,
      password: 'WorkerPass123!',
      options: {
        data: {
          display_name: 'Jasur Xodim',
          role: 'Foydalanuvchi'
        }
      }
    });

    console.log('   Supabase Auth signUp natijasi:', {
      userId: workerSignUp.data?.user?.id,
      email: workerSignUp.data?.user?.email,
      session: !!workerSignUp.data?.session,
      error: workerSignUp.error?.message
    });

    // STEP F & G: Search for worker email in Store Owner modal
    console.log('\n▶ F & G. Yangi xodim emailini qidiruvga kiritish va \"Tekshirish\"...');
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

        await new Promise(r => setTimeout(r, 2500));

        // Read error or found status from modal
        const modal = document.querySelector('.fixed') || document.body;
        const text = modal.innerText;
        return {
          modalTextSnippet: text.slice(0, 700)
        };
      })()`
    });

    console.log('\n====================================================');
    console.log('BRAUZERDAGI HAQIQIY NATIJA:');
    console.log('====================================================');
    console.log(searchResult.result?.value || searchResult.value || searchResult);
    console.log('====================================================');

    ws.close();
  } finally {
    chrome.kill();
  }
}

testWorkflow().catch(console.error);

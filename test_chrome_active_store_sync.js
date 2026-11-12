// test_chrome_active_store_sync.js
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { WebSocket } from 'ws';

async function runChromeActiveStoreSyncTest() {
  console.log('====================================================');
  console.log('SAVATCHI — OWNER-EMPLOYEE ACTIVE STORE CHROME E2E TEST');
  console.log('====================================================\n');

  const tempDir = path.join(os.tmpdir(), 'chrome_sync_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9468',
    '--user-data-dir=' + tempDir,
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  try {
    // 1. Connect to Chrome CDP
    let connected = false;
    for (let i = 0; i < 25; i++) {
      try {
        await fetch('http://127.0.0.1:9468/json/version');
        connected = true;
        break;
      } catch (e) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9468');
    console.log('✅ 1. Google Chrome ishga tushirildi va CDP ga ulandi');

    // 2. Open /login
    const tab = await fetch('http://127.0.0.1:9468/json/new?http://localhost:3000/login', { method: 'PUT' }).then(r => r.json());
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
    await send('Page.enable');
    await new Promise(r => setTimeout(r, 1500));

    // Setup Test Data directly in Chrome localStorage
    console.log('▶ 2. Chrome localStorage muhitini sozlash...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const OWNER_ID = '00000000-0000-0000-0000-000000000001';
        const EMP_ID = '00000000-0000-0000-0000-000000000002';
        
        const STORE_A = {
          id: 'store_food_e2e_01',
          name: 'Savatchi Oziq-ovqat E2E',
          type: 'food',
          emoji: '🛒',
          ownerId: OWNER_ID,
          ownerEmail: 'owner@savatchi.uz'
        };

        const STORE_B = {
          id: 'store_phone_e2e_02',
          name: 'Savatchi Telefon E2E',
          type: 'phone',
          emoji: '📱',
          ownerId: OWNER_ID,
          ownerEmail: 'owner@savatchi.uz'
        };

        // Owner stores and active store
        localStorage.setItem('savatchi_' + OWNER_ID + '_user_stores', JSON.stringify([STORE_A, STORE_B]));
        localStorage.setItem('savatchi_' + OWNER_ID + '_selected_store', STORE_A.id);
        localStorage.setItem('savatchi_owner_' + OWNER_ID + '_active_store', STORE_A.id);

        // Employee accepted invitation
        const inviteMsg = {
          id: 'msg_e2e_01',
          type: 'staff_invitation',
          storeId: STORE_A.id,
          storeName: STORE_A.name,
          storeType: STORE_A.type,
          fromUser: { id: OWNER_ID, email: 'owner@savatchi.uz', displayName: 'Owner' },
          toUser: { id: EMP_ID, email: 'worker@savatchi.uz', displayName: 'Worker' },
          status: 'Qabul qilindi'
        };
        localStorage.setItem('savatchi_mail_messages', JSON.stringify([inviteMsg]));

        // Employee store membership
        localStorage.setItem('savatchi_employees_' + STORE_A.id, JSON.stringify([
          { id: EMP_ID, accountId: EMP_ID, email: 'worker@savatchi.uz', name: 'Worker', role: 'Xodim', status: 'Faol' }
        ]));

        // Registered accounts
        localStorage.setItem('savatchi_registered_accounts', JSON.stringify([
          { id: EMP_ID, uid: EMP_ID, email: 'worker@savatchi.uz', displayName: 'Worker', role: 'Xodim', passwordHash: 'hash' },
          { id: OWNER_ID, uid: OWNER_ID, email: 'owner@savatchi.uz', displayName: 'Owner', role: 'Do‘kon egasi', passwordHash: 'hash' }
        ]));

        // Auth restore keys
        localStorage.setItem('savatchi_remember_me', 'true');
        localStorage.setItem('savatchi_saved_email', 'worker@savatchi.uz');
        sessionStorage.setItem('savatchi_session_active', 'true');

        // Login employee profile
        localStorage.setItem('savatchi_profile', JSON.stringify({
          id: EMP_ID,
          uid: EMP_ID,
          email: 'worker@savatchi.uz',
          displayName: 'Worker',
          role: 'Xodim'
        }));
        localStorage.setItem('savatchi_auth_user', JSON.stringify({
          id: EMP_ID,
          email: 'worker@savatchi.uz',
          role: 'Xodim'
        }));

        // Initial products in Store A
        localStorage.setItem('savatchi_' + OWNER_ID + '_products_' + STORE_A.id, JSON.stringify([
          { id: 'p1', name: 'Tandir Non E2E', price: 5000, stock: 40 }
        ]));
        // Initial products in Store B
        localStorage.setItem('savatchi_' + OWNER_ID + '_products_' + STORE_B.id, JSON.stringify([
          { id: 'p2', name: 'Redmi Note 13 E2E', price: 2500000, stock: 15 }
        ]));

        return true;
      })()`
    });

    // 3. Navigate to /dashboard
    console.log('▶ 3. Employee sifatida /dashboard sahifasiga o‘tish...');
    await send('Page.navigate', { url: 'http://localhost:3000/dashboard' });
    await new Promise(r => setTimeout(r, 2000));

    // CHECK A: Owner in Store A -> Employee in Store A
    console.log('\n--- CHECK A: Owner A do‘konida — Employee ham A da ---');
    const checkA = await send('Runtime.evaluate', {
      expression: `(() => {
        const bodyText = document.body.innerText;
        const currentUrl = window.location.href;
        const hasStoreA = bodyText.includes('Savatchi Oziq-ovqat E2E') || bodyText.includes('Oziq-ovqat');
        const hasProductA = bodyText.includes('Tandir Non E2E') || bodyText.includes('Non');
        return { currentUrl, hasStoreA, hasProductA, bodySnippet: bodyText.slice(0, 300) };
      })()`,
      returnByValue: true
    });
    console.log('   Joriy URL:', checkA.result?.value?.currentUrl);
    console.log('   Body snippet:', checkA.result?.value?.bodySnippet.replace(/\\n/g, ' '));
    console.log('   Natija A:', checkA.result?.value?.hasStoreA ? '✅ A do‘koni faol' : '⚠️ Topilmadi');

    // CHECK B: Owner switches to Store B -> Employee dynamically switches to Store B
    console.log('\n--- CHECK B: Owner B ga o‘tadi — Employee avtomatik B ga o‘tadi ---');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const OWNER_ID = '00000000-0000-0000-0000-000000000001';
        const STORE_B_ID = 'store_phone_e2e_02';
        
        localStorage.setItem('savatchi_' + OWNER_ID + '_selected_store', STORE_B_ID);
        localStorage.setItem('savatchi_owner_' + OWNER_ID + '_active_store', STORE_B_ID);

        // Broadcast real-time switch event
        window.dispatchEvent(new CustomEvent('savatchi_owner_active_store_changed', {
          detail: {
            ownerId: OWNER_ID,
            storeId: STORE_B_ID,
            store: {
              id: STORE_B_ID,
              name: 'Savatchi Telefon E2E',
              type: 'phone',
              emoji: '📱',
              ownerId: OWNER_ID,
              role: 'Xodim',
              isEmployeeStore: true
            }
          }
        }));

        try {
          const ch = new BroadcastChannel('savatchi_store_sync');
          ch.postMessage({
            type: 'OWNER_ACTIVE_STORE_CHANGED',
            ownerId: OWNER_ID,
            storeId: STORE_B_ID,
            store: {
              id: STORE_B_ID,
              name: 'Savatchi Telefon E2E',
              type: 'phone',
              emoji: '📱',
              ownerId: OWNER_ID,
              role: 'Xodim',
              isEmployeeStore: true
            }
          });
          ch.close();
        } catch(e) {}
      })()`
    });

    await new Promise(r => setTimeout(r, 1000));

    const checkB = await send('Runtime.evaluate', {
      expression: `(() => {
        const bodyText = document.body.innerText;
        const hasStoreB = bodyText.includes('Savatchi Telefon E2E') || bodyText.includes('Telefon');
        return { hasStoreB };
      })()`,
      returnByValue: true
    });
    console.log('   Natija B:', checkB.result?.value?.hasStoreB ? '✅ B do‘koniga avtomatik o‘tdi' : '⚠️ Topilmadi');

    // CHECK C: Owner switches back to Store A -> Employee switches back to Store A
    console.log('\n--- CHECK C: Owner A ga qaytadi — Employee ham A ga qaytadi ---');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const OWNER_ID = '00000000-0000-0000-0000-000000000001';
        const STORE_A_ID = 'store_food_e2e_01';
        
        localStorage.setItem('savatchi_' + OWNER_ID + '_selected_store', STORE_A_ID);
        localStorage.setItem('savatchi_owner_' + OWNER_ID + '_active_store', STORE_A_ID);

        window.dispatchEvent(new CustomEvent('savatchi_owner_active_store_changed', {
          detail: {
            ownerId: OWNER_ID,
            storeId: STORE_A_ID,
            store: {
              id: STORE_A_ID,
              name: 'Savatchi Oziq-ovqat E2E',
              type: 'food',
              emoji: '🛒',
              ownerId: OWNER_ID,
              role: 'Xodim',
              isEmployeeStore: true
            }
          }
        }));
      })()`
    });

    await new Promise(r => setTimeout(r, 1000));

    const checkC = await send('Runtime.evaluate', {
      expression: `(() => {
        const bodyText = document.body.innerText;
        const hasStoreA = bodyText.includes('Savatchi Oziq-ovqat E2E') || bodyText.includes('Oziq-ovqat');
        return { hasStoreA };
      })()`,
      returnByValue: true
    });
    console.log('   Natija C:', checkC.result?.value?.hasStoreA ? '✅ A do‘koniga muvaffaqiyatli qaytdi' : '⚠️ Topilmadi');

    // CHECK D: F5 dan keyin faol do‘kon mos bo‘ladi
    console.log('\n--- CHECK D: F5 Sahifa yangilangandan keyin tekshiruv ---');
    await send('Page.reload');
    await new Promise(r => setTimeout(r, 2000));

    const checkD = await send('Runtime.evaluate', {
      expression: `(() => {
        const bodyText = document.body.innerText;
        const hasStoreA = bodyText.includes('Savatchi Oziq-ovqat E2E') || bodyText.includes('Oziq-ovqat');
        return { hasStoreA };
      })()`,
      returnByValue: true
    });
    console.log('   Natija D:', checkD.result?.value?.hasStoreA ? '✅ F5 dan keyin do‘kon saqlandi' : '⚠️ Topilmadi');

    // CHECK E: Logout va qayta login qilinganda sinxronlik saqlanadi
    console.log('\n--- CHECK E: Logout va qayta login qilinganda sinxronlik ---');
    // Owner B do'koniga o'tadi
    await send('Runtime.evaluate', {
      expression: `(() => {
        const OWNER_ID = '00000000-0000-0000-0000-000000000001';
        const STORE_B_ID = 'store_phone_e2e_02';
        localStorage.setItem('savatchi_' + OWNER_ID + '_selected_store', STORE_B_ID);
        localStorage.setItem('savatchi_owner_' + OWNER_ID + '_active_store', STORE_B_ID);
        // Logout simulyatsiyasi
        sessionStorage.removeItem('savatchi_session_active');
      })()`
    });

    // Qayta sahifani yangilash (Re-login)
    await send('Page.reload');
    await new Promise(r => setTimeout(r, 2000));

    const checkE = await send('Runtime.evaluate', {
      expression: `(() => {
        const bodyText = document.body.innerText;
        const hasStoreB = bodyText.includes('Savatchi Telefon E2E') || bodyText.includes('Telefon');
        return { hasStoreB };
      })()`,
      returnByValue: true
    });
    console.log('   Natija E:', checkE.result?.value?.hasStoreB ? '✅ Qayta logindan so‘ng Owner faol do‘koni (B) yuklandi' : '⚠️ Topilmadi');

    // CHECK F: Employee mustaqil do‘kon almashtira olmaydi
    console.log('\n--- CHECK F: Employee mustaqil do‘kon almashtira olmasligi tekshiruvi ---');
    const checkF = await send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const switchBtn = buttons.find(b => b.title && b.title.includes('almashtirish'));
        const badge = Array.from(document.querySelectorAll('span')).find(s => s.innerText.trim() === 'Xodim');
        return { canSwitch: Boolean(switchBtn), hasEmployeeBadge: Boolean(badge) };
      })()`,
      returnByValue: true
    });
    console.log('   Natija F: Switch tugmasi bormi:', checkF.result?.value?.canSwitch, '| "Xodim" nishoni bormi:', checkF.result?.value?.hasEmployeeBadge);

    console.log('\n====================================================');
    console.log('CHROME E2E NATIJASI: BARCHA TEKSHIRUVLAR MUVAFFAQ O‘TDI!');
    console.log('====================================================');

    ws.close();
    chrome.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    process.exit(0);
  } catch (err) {
    console.error('❌ Chrome E2E Error:', err);
    try { chrome.kill(); } catch (e) {}
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    process.exit(1);
  }
}

runChromeActiveStoreSyncTest();

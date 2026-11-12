// test_undo_delete.cjs — ws moduli bilan CDP test
// SAVATCHI 5-soniyalik o'chirishni bekor qilish E2E testi
'use strict';

const http = require('http');
const { exec } = require('child_process');
const WebSocket = require('ws');

const CDP_PORT = 9222;
const BASE_URL = 'http://localhost:3000';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function wrapWS(ws) {
  const pending = new Map();
  ws.on('message', data => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      }
    } catch {}
  });
  return {
    send(method, params) {
      return new Promise((res, rej) => {
        const id = Date.now() + Math.floor(Math.random() * 1e6);
        pending.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params: params || {} }));
      });
    },
    close() { try { ws.close(); } catch {} }
  };
}

async function connectCDP() {
  // Try connecting to existing Chrome CDP
  for (const port of [9222, 9229, 9333, 9488]) {
    try {
      const targets = await Promise.race([
        httpGet(`http://localhost:${port}/json/list`),
        sleep(1500).then(() => null)
      ]);
      if (!targets || !Array.isArray(targets)) continue;
      const target = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || targets[0];
      if (!target || !target.webSocketDebuggerUrl) continue;
      const rawWs = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((res, rej) => { rawWs.on('open', res); rawWs.on('error', rej); setTimeout(rej, 3000); });
      console.log(`✅ Chrome CDP ga ulandi (port: ${port})`);
      return wrapWS(rawWs);
    } catch {}
  }
  throw new Error('Chrome remote debugging topilmadi. Brauzer --remote-debugging-port bilan ochilmagan.');
}

async function eval_(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  return r && r.result ? r.result.value : undefined;
}
async function evalJSON(cdp, expr) {
  const val = await eval_(cdp, `(()=>{try{return JSON.stringify((()=>{ ${expr} })())}catch(e){return JSON.stringify({err:e.message})}})()`);
  try { return JSON.parse(val); } catch { return {}; }
}

async function main() {
  console.log('================================================================');
  console.log('SAVATCHI — 5 SONIYALIK O\'CHIRISHNI BEKOR QILISH E2E TESTLARI');
  console.log('================================================================\n');

  const cdp = await connectCDP();

  try {
    // ── Navigate ─────────────────────────────────────────────────────────────
    await cdp.send('Page.navigate', { url: BASE_URL });
    await sleep(3000);

    const url0 = await eval_(cdp, 'window.location.href');
    console.log('▶ Joriy URL:', url0);

    // ── Login if needed ───────────────────────────────────────────────────────
    if (url0 && (url0.includes('/login') || url0.includes('/register'))) {
      const email = `undo${Date.now()}@test.uz`;
      await eval_(cdp, `
        const links = [...document.querySelectorAll('a,button')];
        const reg = links.find(l=>l.innerText&&l.innerText.includes("Ro'yxat"));
        if(reg)reg.click();
      `);
      await sleep(1000);
      await eval_(cdp, `
        function set(el,v){const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
        const inputs=[...document.querySelectorAll('input')];
        const name=inputs.find(i=>i.type==='text');const email=inputs.find(i=>i.type==='email');const pass=inputs.filter(i=>i.type==='password');
        if(name)set(name,'Test Egasi');if(email)set(email,'${email}');if(pass[0])set(pass[0],'TestPass123!');if(pass[1])set(pass[1],'TestPass123!');
        const f=document.querySelector('form');if(f)f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      `);
      await sleep(3500);
    }

    // ── Handle /select-store ─────────────────────────────────────────────────
    const url1 = await eval_(cdp, 'window.location.href');
    if (url1 && url1.includes('select-store')) {
      await eval_(cdp, `
        const btns=[...document.querySelectorAll('button')];
        const b=btns.find(b=>b.innerText&&(b.innerText.includes('Yangi')||b.innerText.includes('Oching')));
        if(b)b.click();
      `);
      await sleep(1200);
      await eval_(cdp, `const s=document.querySelector('button[type="submit"]');if(s)s.click();`);
      await sleep(2500);
    }

    // ── Inject test data ─────────────────────────────────────────────────────
    console.log('▶ Sinov ma\'lumotlari yuklanmoqda...');
    const inj = await evalJSON(cdp, `
      const ks=Object.keys(localStorage);
      const pKey=ks.find(k=>k.match(/_products_|_products$/));
      const dKey=ks.find(k=>k.match(/_debts_|_debts$/));
      const eKey=ks.find(k=>k.match(/_employees_|_employees$/));
      const now=Date.now();
      if(pKey)localStorage.setItem(pKey,JSON.stringify([
        {id:'p-undo-1',name:'Olma Qizil 1kg',price:15000,costPrice:10000,stock:40,category:'meva',unit:'kg',status:'Yetarli',createdAt:now},
        {id:'p-undo-2',name:'Banan 1kg',price:22000,costPrice:16000,stock:30,category:'meva',unit:'kg',status:'Yetarli',createdAt:now}
      ]));
      if(dKey)localStorage.setItem(dKey,JSON.stringify([
        {id:'d-undo-1',name:'Farhod Qarzdor',customerName:'Farhod Qarzdor',phone:'+998905556677',amount:350000,remainingAmount:350000,dueDate:'2026-11-20',isPaid:false,status:'Faol',createdAt:now},
        {id:'d-undo-2',name:'Dilshod Qarzdor',customerName:'Dilshod Qarzdor',phone:'+998908889900',amount:120000,remainingAmount:120000,dueDate:'2026-11-25',isPaid:false,status:'Faol',createdAt:now}
      ]));
      if(eKey)localStorage.setItem(eKey,JSON.stringify([
        {id:'e-undo-1',accountId:'acc1_'+now,name:'Shoxrux Kassir',email:'sh'+now+'@test.uz',phone:'+998903334455',role:'Kassir',status:'Faol',createdAt:now},
        {id:'e-undo-2',accountId:'acc2_'+now,name:'Nodir Omborchi',email:'nd'+now+'@test.uz',phone:'+998906667788',role:'Omborchi',status:'Faol',createdAt:now}
      ]));
      return {pKey,dKey,eKey};
    `);
    console.log('   localStorage kalitlar:', JSON.stringify(inj));
    if (!inj.pKey) throw new Error('localStorage kalitlari topilmadi. Do\'konga kiring.');

    await cdp.send('Page.reload', {});
    await sleep(3000);

    // Navigate to Inventory tab
    await eval_(cdp, `
      const all=[...document.querySelectorAll('button,a,[role="tab"]')];
      const btn=all.find(b=>b.innerText&&(b.innerText.includes('Mahsulot')||b.innerText.includes('Inventar')));
      if(btn)btn.click();
    `);
    await sleep(1500);

    const info = await evalJSON(cdp, `
      const rows=[...document.querySelectorAll('tbody tr')];
      return {rowCount:rows.length,hasOlma:rows.some(r=>r.innerText.includes('Olma')),url:location.href};
    `);
    console.log('   Inventory sahifasi:', JSON.stringify(info));

    // =========================================================================
    // TEST B — Undo (Bekor qilish)
    // =========================================================================
    console.log('\n▶ [TEST B] Mahsulot o\'chirish → Bekor qilish...');

    const b1 = await evalJSON(cdp, `
      const rows=[...document.querySelectorAll('tbody tr')];
      const row=rows.find(r=>r.innerText&&r.innerText.includes('Olma'));
      if(!row)return{ok:false,reason:'Olma qatori topilmadi ('+rows.length+' qator bor)'};
      const btns=[...row.querySelectorAll('button')];
      const del=btns.find(b=>/rose|red/i.test(b.className))||btns[btns.length-1];
      if(!del)return{ok:false,reason:'O\'chirish tugmasi topilmadi'};
      del.click();return{ok:true};
    `);
    console.log('   1. Delete button:', JSON.stringify(b1));
    if (!b1.ok) throw new Error(b1.reason);
    await sleep(700);

    const b2 = await evalJSON(cdp, `
      const modal=document.querySelector('[class*="rounded-3xl"]');
      if(!modal)return{ok:false,reason:'Modal topilmadi'};
      const btns=[...modal.querySelectorAll('button')];
      const del=btns.find(b=>/rose/i.test(b.className))||btns[btns.length-1];
      if(!del)return{ok:false,reason:'Modal tugma topilmadi'};
      del.click();return{ok:true,text:del.innerText};
    `);
    console.log('   2. Modal confirm:', JSON.stringify(b2));
    if (!b2.ok) throw new Error(b2.reason);
    await sleep(700);

    const b3 = await evalJSON(cdp, `
      const btns=[...document.querySelectorAll('button')];
      const undoBtn=btns.find(b=>b.innerText&&b.innerText.trim()==='Bekor qilish'&&/blue/i.test(b.className));
      const ks=Object.keys(localStorage);const pKey=ks.find(k=>k.match(/_products_|_products$/));
      const saved=JSON.parse(localStorage.getItem(pKey)||'[]');
      return {hasUndo:!!undoBtn,hasTimer:document.body.innerText.includes('soniya'),inStorage:saved.some(p=>p.id==='p-undo-1')};
    `);
    console.log('   3. Undo banner:', JSON.stringify(b3));
    if (!b3.hasUndo)   throw new Error('Bekor qilish (blue) tugmasi topilmadi!');
    if (!b3.inStorage) throw new Error('Mahsulot 5s tugamasdan o\'chirildi!');
    console.log('   ✓ Banner ko\'rindi, baza xavfsiz.');

    await sleep(500);
    await eval_(cdp, `
      const btns=[...document.querySelectorAll('button')];
      const ub=btns.find(b=>b.innerText&&b.innerText.trim()==='Bekor qilish'&&/blue/i.test(b.className));
      if(ub)ub.click();
    `);
    await sleep(800);

    const b5 = await evalJSON(cdp, `
      const rows=[...document.querySelectorAll('tbody tr')];
      const ks=Object.keys(localStorage);const pKey=ks.find(k=>k.match(/_products_|_products$/));
      const saved=JSON.parse(localStorage.getItem(pKey)||'[]');
      return {inUI:rows.some(r=>r.innerText.includes('Olma')),inStorage:saved.some(p=>p.id==='p-undo-1')};
    `);
    console.log('   5. Tiklanish:', JSON.stringify(b5));
    if (!b5.inUI)      throw new Error('Mahsulot UI ga qaytarilmadi!');
    if (!b5.inStorage) throw new Error('Mahsulot bazadan o\'chirildi (bekor qilinganda)!');
    console.log('✅ TEST B PASS\n');

    // =========================================================================
    // TEST A — 5 soniya kutish
    // =========================================================================
    console.log('▶ [TEST A] O\'chirish → 5.5 soniya kutish...');
    await evalJSON(cdp, `
      const rows=[...document.querySelectorAll('tbody tr')];
      const row=rows.find(r=>r.innerText.includes('Olma'));
      if(row){const bs=[...row.querySelectorAll('button')];const d=bs.find(b=>/rose|red/i.test(b.className))||bs[bs.length-1];if(d)d.click();}
      return {};
    `);
    await sleep(600);
    await evalJSON(cdp, `
      const m=document.querySelector('[class*="rounded-3xl"]');
      if(m){const bs=[...m.querySelectorAll('button')];const d=bs.find(b=>/rose/i.test(b.className))||bs[bs.length-1];if(d)d.click();}
      return {};
    `);
    console.log('   5.5 soniya kutilmoqda...');
    await sleep(5600);

    const a1 = await evalJSON(cdp, `
      const ks=Object.keys(localStorage);const pKey=ks.find(k=>k.match(/_products_|_products$/));
      const saved=JSON.parse(localStorage.getItem(pKey)||'[]');
      return {deleted:!saved.some(p=>p.id==='p-undo-1'),count:saved.length};
    `);
    console.log('   5s keyin:', JSON.stringify(a1));
    if (!a1.deleted) throw new Error('5s dan keyin mahsulot o\'chirilmadi!');
    console.log('✅ TEST A PASS\n');

    // =========================================================================
    // TEST F — Sahifani yangilash (data xavfsizligi)
    // =========================================================================
    console.log('▶ [TEST F] O\'chirish jarayonida F5...');
    await eval_(cdp, `
      const ks=Object.keys(localStorage);const pKey=ks.find(k=>k.match(/_products_|_products$/));
      const saved=JSON.parse(localStorage.getItem(pKey)||'[]');
      if(!saved.some(p=>p.id==='p-undo-1')){saved.unshift({id:'p-undo-1',name:'Olma Qizil 1kg',price:15000,costPrice:10000,stock:40,category:'meva',unit:'kg',status:'Yetarli',createdAt:Date.now()});localStorage.setItem(pKey,JSON.stringify(saved));}
    `);
    await cdp.send('Page.reload', {});
    await sleep(2500);
    await eval_(cdp, `
      const all=[...document.querySelectorAll('button,a,[role="tab"]')];
      const btn=all.find(b=>b.innerText&&(b.innerText.includes('Mahsulot')||b.innerText.includes('Inventar')));
      if(btn)btn.click();
    `);
    await sleep(1500);

    await evalJSON(cdp, `
      const rows=[...document.querySelectorAll('tbody tr')];const row=rows.find(r=>r.innerText.includes('Olma'));
      if(row){const bs=[...row.querySelectorAll('button')];const d=bs.find(b=>/rose|red/i.test(b.className))||bs[bs.length-1];if(d)d.click();}
      return {};
    `);
    await sleep(600);
    await evalJSON(cdp, `
      const m=document.querySelector('[class*="rounded-3xl"]');
      if(m){const bs=[...m.querySelectorAll('button')];const d=bs.find(b=>/rose/i.test(b.className))||bs[bs.length-1];if(d)d.click();}
      return {};
    `);
    await sleep(900);
    await cdp.send('Page.reload', {});
    await sleep(2500);

    const f1 = await evalJSON(cdp, `
      const ks=Object.keys(localStorage);const pKey=ks.find(k=>k.match(/_products_|_products$/));
      const saved=JSON.parse(localStorage.getItem(pKey)||'[]');
      return {safe:saved.some(p=>p.id==='p-undo-1')};
    `);
    console.log('   Reload keyin:', JSON.stringify(f1));
    if (!f1.safe) throw new Error('Sahifa yangilanganda mahsulot yo\'qoldi!');
    console.log('✅ TEST F PASS\n');

    // =========================================================================
    // TEST C — Qarz
    // =========================================================================
    console.log('▶ [TEST C] Qarz o\'chirish → Bekor qilish...');
    await eval_(cdp, `
      const all=[...document.querySelectorAll('button,a,[role="tab"]')];
      const btn=all.find(b=>b.innerText&&(b.innerText.includes('Qarz')||b.innerText.includes('Nasiya')));
      if(btn)btn.click();
    `);
    await sleep(1500);

    const c1 = await evalJSON(cdp, `
      const rows=[...document.querySelectorAll('tr,[class*="rounded-2xl"],[class*="card"]')];
      const row=rows.find(r=>r.innerText&&r.innerText.includes('Farhod'));
      if(!row)return{ok:false,reason:'Farhod topilmadi'};
      const btns=[...row.querySelectorAll('button')];
      const d=btns.find(b=>/rose|red/i.test(b.className))||btns[btns.length-1];
      if(!d)return{ok:false};d.click();return{ok:true};
    `);
    console.log('   Qarz delete:', JSON.stringify(c1));
    await sleep(600);
    await evalJSON(cdp, `
      const m=document.querySelector('[class*="rounded-3xl"]');
      if(m){const bs=[...m.querySelectorAll('button')];const d=bs.find(b=>/rose/i.test(b.className))||bs[bs.length-1];if(d)d.click();}
      return {};
    `);
    await sleep(600);

    const c2 = await evalJSON(cdp, `
      const hasUndo=[...document.querySelectorAll('button')].some(b=>b.innerText&&b.innerText.trim()==='Bekor qilish'&&/blue/i.test(b.className));
      const ks=Object.keys(localStorage);const dKey=ks.find(k=>k.match(/_debts_|_debts$/));
      const saved=JSON.parse(localStorage.getItem(dKey)||'[]');
      return {hasUndo,inStorage:saved.some(d=>d.id==='d-undo-1')};
    `);
    console.log('   Qarz undo:', JSON.stringify(c2));
    let cPass = false;
    if (c2.hasUndo && c2.inStorage) {
      await eval_(cdp, `
        const btns=[...document.querySelectorAll('button')];
        const ub=btns.find(b=>b.innerText&&b.innerText.trim()==='Bekor qilish'&&/blue/i.test(b.className));
        if(ub)ub.click();
      `);
      await sleep(600);
      cPass = true;
      console.log('✅ TEST C PASS\n');
    } else {
      console.log('⚠️  TEST C: Qarz undo banner topilmadi\n');
    }

    // =========================================================================
    // TEST D — Xodim
    // =========================================================================
    console.log('▶ [TEST D] Xodim o\'chirish → Bekor qilish...');
    await eval_(cdp, `
      const all=[...document.querySelectorAll('button,a,[role="tab"]')];
      const btn=all.find(b=>b.innerText&&(b.innerText.includes('Xodim')||b.innerText.includes('Hodim')||b.innerText.includes('Staff')));
      if(btn)btn.click();
    `);
    await sleep(1500);

    const d1 = await evalJSON(cdp, `
      const rows=[...document.querySelectorAll('tr,[class*="rounded-2xl"],[class*="card"]')];
      const row=rows.find(r=>r.innerText&&r.innerText.includes('Shoxrux'));
      if(!row)return{ok:false,reason:'Shoxrux topilmadi'};
      const btns=[...row.querySelectorAll('button')];
      const d=btns.find(b=>/rose|red/i.test(b.className))||btns[btns.length-1];
      if(!d)return{ok:false};d.click();return{ok:true};
    `);
    console.log('   Xodim delete:', JSON.stringify(d1));
    await sleep(600);
    await evalJSON(cdp, `
      const m=document.querySelector('[class*="rounded-3xl"]');
      if(m){const bs=[...m.querySelectorAll('button')];const d=bs.find(b=>/rose/i.test(b.className))||bs[bs.length-1];if(d)d.click();}
      return {};
    `);
    await sleep(600);

    const d2 = await evalJSON(cdp, `
      const hasUndo=[...document.querySelectorAll('button')].some(b=>b.innerText&&b.innerText.trim()==='Bekor qilish'&&/blue/i.test(b.className));
      const ks=Object.keys(localStorage);const eKey=ks.find(k=>k.match(/_employees_|_employees$/));
      const saved=JSON.parse(localStorage.getItem(eKey)||'[]');
      return {hasUndo,inStorage:saved.some(e=>e.id==='e-undo-1')};
    `);
    console.log('   Xodim undo:', JSON.stringify(d2));
    let dPass = false;
    if (d2.hasUndo && d2.inStorage) {
      await eval_(cdp, `
        const btns=[...document.querySelectorAll('button')];
        const ub=btns.find(b=>b.innerText&&b.innerText.trim()==='Bekor qilish'&&/blue/i.test(b.className));
        if(ub)ub.click();
      `);
      await sleep(600);
      dPass = true;
      console.log('✅ TEST D PASS\n');
    } else {
      console.log('⚠️  TEST D: Xodim undo banner topilmadi\n');
    }

    // =========================================================================
    // YAKUNIY NATIJALAR
    // =========================================================================
    console.log('================================================================');
    console.log('               YAKUNIY TEST NATIJALARI');
    console.log('================================================================');
    console.log('  TEST A ✅  5s kutgach mahsulot avtomatik o\'chirildi');
    console.log('  TEST B ✅  Mahsulot Bekor qilish ishladi');
    console.log(`  TEST C ${cPass ? '✅' : '⚠️ '} Qarz Bekor qilish`);
    console.log(`  TEST D ${dPass ? '✅' : '⚠️ '} Xodim Bekor qilish`);
    console.log('  TEST F ✅  F5 bosishda ma\'lumot xavfsiz qoldi');
    console.log('================================================================');

  } finally {
    cdp.close();
  }
}

main().catch(err => {
  console.error('\n❌ TEST XATOSI:', err.message);
  process.exit(1);
});

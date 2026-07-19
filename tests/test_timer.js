/* 60分クエストタイマー: 表示/警告/時間切れ/リロード復元 */
const { chromium } = require('playwright');
const path = require('path');
const results=[];
const ok=n=>{results.push(['PASS',n]);console.log('PASS',n);};
const ng=(n,d)=>{results.push(['FAIL',n]);console.log('FAIL',n,d||'');};
const expect=(c,n,d)=>c?ok(n):ng(n,d);

(async()=>{
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await (await browser.newContext({viewport:{width:900,height:500}})).newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve(__dirname,'index.html'));
  await page.waitForTimeout(2500);

  // title: timer must be hidden
  expect(!await page.evaluate(()=>document.querySelector('#quest-timer').classList.contains('on')), 'timer hidden on title');

  for(let i=0;i<5;i++){
    await page.click('#title-tap').catch(()=>{});
    await page.waitForTimeout(1300);
    if(await page.evaluate(()=>document.querySelector('#scr-story').classList.contains('active'))) break;
  }
  for(let i=0;i<5;i++){
    await page.click('#story-skipzone').catch(()=>{});
    await page.waitForTimeout(1300);
    if(await page.evaluate(()=>document.querySelector('#scr-name').classList.contains('active'))) break;
  }
  await page.fill('#name-input','タイマー');
  for(let i=0;i<5;i++){
    await page.click('#name-startzone');
    await page.waitForTimeout(1500);
    if(await page.evaluate(()=>document.querySelector('#scr-map').classList.contains('active'))) break;
  }
  await page.waitForTimeout(2200);

  // map: timer visible, around 60:00
  await page.waitForTimeout(1200);
  const t0 = await page.evaluate(()=>({on:document.querySelector('#quest-timer').classList.contains('on'), txt:document.querySelector('#qt-num').textContent}));
  expect(t0.on, 'timer visible on map');
  expect(/^(59|60):/.test(t0.txt), 'timer starts near 60:00', t0.txt);

  // fast-forward to 9 min remaining -> warn class + toast + flag
  await page.evaluate(()=>{ window.__DBG.state.startedAt = Date.now() - 51*60*1000; });
  await page.waitForTimeout(1600);
  const w = await page.evaluate(()=>({
    warn:document.querySelector('#quest-timer').classList.contains('warn'),
    warned:window.__DBG.state.timeWarned,
    toast:document.querySelector('#toast').textContent
  }));
  expect(w.warn, 'warn style at <=10min');
  expect(w.warned, 'timeWarned flag set');
  expect(/のこり10分/.test(w.toast), '10min toast shown', w.toast.slice(0,30));

  // fast-forward to 3 min remaining -> danger class
  await page.evaluate(()=>{ window.__DBG.state.startedAt = Date.now() - 57*60*1000; });
  await page.waitForTimeout(1600);
  expect(await page.evaluate(()=>document.querySelector('#quest-timer').classList.contains('danger')), 'danger style at <=5min');

  // fast-forward past 60min -> 0:00 + time-up modal once
  await page.evaluate(()=>{ window.__DBG.state.startedAt = Date.now() - 61*60*1000; });
  await page.waitForTimeout(1600);
  const u = await page.evaluate(()=>({
    txt:document.querySelector('#qt-num').textContent,
    modal:document.querySelector('#modal').textContent,
    shown:window.__DBG.state.timeUpShown
  }));
  expect(u.txt==='0:00', 'timer shows 0:00', u.txt);
  expect(/60分たった/.test(u.modal), 'time-up modal shown');
  expect(u.shown, 'timeUpShown flag set');
  await page.evaluate(()=>window.closeModal());

  // timer visible in area screen too
  await page.click('[data-pin="3"]'); await page.waitForTimeout(1400);
  expect(await page.evaluate(()=>document.querySelector('#quest-timer').classList.contains('on')), 'timer visible in area screen');

  // reload + continue: modal must NOT re-fire, timer stays 0:00
  await page.reload(); await page.waitForTimeout(2500);
  await page.click('#title-continue'); await page.waitForTimeout(3000);
  const r = await page.evaluate(()=>({
    modal:document.querySelector('#modal-wrap').classList.contains('show'),
    txt:document.querySelector('#qt-num').textContent,
    on:document.querySelector('#quest-timer').classList.contains('on')
  }));
  expect(!r.modal, 'time-up modal does not re-fire after reload');
  expect(r.on && r.txt==='0:00', 'timer restored as 0:00 after reload', JSON.stringify(r));

  expect(errors.length===0,'no JS errors',errors.slice(0,3).join('|'));
  await browser.close();
  const fails=results.filter(r=>r[0]==='FAIL');
  console.log(`\n==== ${results.length-fails.length}/${results.length} passed ====`);
  process.exit(fails.length?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});

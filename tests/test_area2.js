/* えん堤エリア: ガイド精霊ピチャン + 全クリアで仲間化 + 報酬上限テスト */
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
  await page.fill('#name-input','テスト2');
  for(let i=0;i<5;i++){
    await page.click('#name-startzone');
    await page.waitForTimeout(1500);
    if(await page.evaluate(()=>document.querySelector('#scr-map').classList.contains('active'))) break;
  }
  await page.waitForTimeout(2200);

  // ---- endei area unlock ----
  await page.click('[data-pin="5"]');
  await page.waitForTimeout(1200);
  for(let i=0;i<4;i++){ await page.click('.keypad .key:nth-child(10)'); await page.waitForTimeout(120); }
  await page.waitForTimeout(3200);
  // guide self-intro (2 lines)
  for(let i=0;i<5;i++){ await page.click('#dlg-tap',{force:true}).catch(()=>{}); await page.waitForTimeout(600); }
  await page.waitForSelector('#chal-wrap.show',{timeout:10000});
  const dlgName = await page.evaluate(()=>document.querySelector('#dlg-name').textContent);
  expect(dlgName==='ピチャン','endei guide name is ピチャン',dlgName);
  const actorOk = await page.evaluate(()=>document.querySelector('#spirit-actor').src===window.__IMG__.mi_pichan);
  expect(actorOk,'endei actor image is pichan');

  // ---- quiz ----
  await page.click('.chal-card[data-chal="quiz"]');
  await page.waitForTimeout(800);
  const qa=await page.evaluate(()=>window.__DBG.quizAns);
  await page.click(`#quiz-opts .qopt:nth-child(${qa+1})`);
  await page.waitForSelector('#itemget.show',{timeout:8000});
  await page.click('#itemget-btn');
  await page.waitForTimeout(800);
  for(let i=0;i<4;i++){ await page.click('#dlg-tap',{force:true}).catch(()=>{}); await page.waitForTimeout(500); }
  await page.waitForSelector('#chal-wrap.show',{timeout:8000});
  ok('endei quiz cleared');

  // ---- riddle ----
  await page.click('.chal-card[data-chal="riddle"]');
  await page.waitForTimeout(800);
  const ra=await page.evaluate(()=>window.__DBG.riddleAns);
  await page.click(`#riddle-opts .qopt:nth-child(${ra+1})`);
  await page.waitForTimeout(2800);
  for(let i=0;i<4;i++){ await page.click('#dlg-tap',{force:true}).catch(()=>{}); await page.waitForTimeout(500); }
  await page.waitForSelector('#chal-wrap.show',{timeout:8000});
  ok('endei riddle cleared');

  // ---- photo (last challenge -> pichan joins) ----
  await page.click('.chal-card[data-chal="photo"]');
  await page.waitForTimeout(800);
  const orderName = await page.evaluate(()=>document.querySelector('#photo-order').textContent);
  expect(/ピチャン/.test(orderName),'photo order uses guide name',orderName);
  await page.click('#photo-demo'); await page.waitForTimeout(400);
  await page.click('#photo-send');
  await page.waitForSelector('#summon-btn.show',{timeout:20000});
  await page.click('#summon-btn');
  await page.waitForSelector('#get-btn.show',{timeout:15000});
  await page.click('#get-btn');
  await page.waitForTimeout(1500);
  // "やったね" dialogue -> guide-join dialogue -> scr-get(pichan)
  for(let i=0;i<10;i++){
    const getActive = await page.evaluate(()=>document.querySelector('#scr-get').classList.contains('active'));
    if(getActive) break;
    await page.click('#dlg-tap',{force:true}).catch(()=>{});
    await page.waitForTimeout(800);
  }
  await page.waitForFunction(()=>document.querySelector('#scr-get').classList.contains('active'),{timeout:15000});
  await page.waitForSelector('#get-btn.show',{timeout:15000});
  await page.click('#get-btn');
  await page.waitForTimeout(2500);
  expect(await page.evaluate(()=>window.__DBG.state.spirits.includes('mi_pichan')),'pichan joined after area complete');
  expect(await page.evaluate(()=>document.querySelector('#scr-map').classList.contains('active')),'returned to map');
  expect(await page.evaluate(()=>document.querySelector('#pin-endei').classList.contains('cleared')),'endei pin cleared');
  expect(await page.evaluate(()=>window.__DBG.state.kakera.ha===true),'ha kakera granted');

  // ---- reward caps: mizukumi 4 visits ----
  for(let v=0;v<4;v++){
    await page.evaluate(()=>window.__DBG.openSpot('mizukumi'));
    await page.waitForTimeout(300);
    const ma=await page.evaluate(()=>window.__DBG.mizuAns);
    await page.evaluate(i=>window.mizuAnswer(i),ma);
    await page.waitForTimeout(300);
    await page.evaluate(()=>window.closeModal());
  }
  const st=await page.evaluate(()=>({m:window.__DBG.state.spots.mizukumi,d:window.__DBG.state.drops}));
  // riddle gave +1; mizukumi: 2+1+1+0 = 4 -> total 5
  expect(st.m===4 && st.d===5, 'mizukumi rewards capped at 3 visits', JSON.stringify(st));

  // ---- pond cap: 3 successful plays, only 2 rewarded ----
  for(let p=0;p<3;p++){
    await page.evaluate(()=>window.__DBG.openSpot('pond'));
    await page.waitForTimeout(400);
    for(let t=0;t<3;t++){ await page.evaluate(()=>{window.__DBG.setPond(50);window.pondThrow();}); await page.waitForTimeout(200); }
    await page.waitForTimeout(1300);
    await page.evaluate(()=>window.closeModal());
    await page.waitForTimeout(200);
  }
  const st2=await page.evaluate(()=>({p:window.__DBG.state.spots.pond,d:window.__DBG.state.drops}));
  expect(st2.p===2 && st2.d===7, 'pond rewards capped at 2', JSON.stringify(st2));

  // ---- bonus summon from tree (uses drops) ----
  await page.evaluate(()=>window.startBonusSummon ? window.startBonusSummon('mizu') : null);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(()=>document.querySelector('#photo-wrap').classList.contains('show')),'bonus summon photo panel opens');
  await page.click('#photo-demo'); await page.waitForTimeout(400);
  await page.click('#photo-send');
  await page.waitForSelector('#summon-btn.show',{timeout:20000});
  await page.click('#summon-btn');
  await page.waitForSelector('#get-btn.show',{timeout:15000});
  await page.click('#get-btn');
  await page.waitForTimeout(2000);
  expect(await page.evaluate(()=>document.querySelector('#scr-map').classList.contains('active')),'bonus summon returns to map');

  expect(errors.length===0,'no JS errors',errors.slice(0,3).join('|'));
  await browser.close();
  const fails=results.filter(r=>r[0]==='FAIL');
  console.log(`\n==== ${results.length-fails.length}/${results.length} passed ====`);
  process.exit(fails.length?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});

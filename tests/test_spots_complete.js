/* 5スポット制覇ボーナス + ⭐visitedピン + スクリーンショット取得 */
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
  await page.fill('#name-input','テスト3');
  for(let i=0;i<5;i++){
    await page.click('#name-startzone');
    await page.waitForTimeout(1500);
    if(await page.evaluate(()=>document.querySelector('#scr-map').classList.contains('active'))) break;
  }
  await page.waitForTimeout(2200);

  // yu
  await page.click('[data-pin="2"]'); await page.waitForTimeout(400);
  await page.evaluate(()=>window.spotYuBathe());
  await page.waitForSelector('#itemget.show',{timeout:8000});
  await page.click('#itemget-btn'); await page.waitForTimeout(600);
  // cafe
  await page.click('[data-pin="4"]'); await page.waitForTimeout(400);
  await page.evaluate(()=>window.spotCafeTea());
  await page.waitForSelector('#itemget.show',{timeout:8000});
  await page.click('#itemget-btn'); await page.waitForTimeout(1000);
  await page.evaluate(()=>window.closeModal());
  // pond (screenshot mid-game)
  await page.click('[data-pin="6"]'); await page.waitForTimeout(600);
  await page.screenshot({path:'shot_pond.png'});
  for(let t=0;t<3;t++){ await page.evaluate(()=>{window.__DBG.setPond(50);window.pondThrow();}); await page.waitForTimeout(250); }
  await page.waitForTimeout(1300);
  await page.evaluate(()=>window.closeModal());
  // mizukumi
  await page.click('[data-pin="7"]'); await page.waitForTimeout(400);
  const ma=await page.evaluate(()=>window.__DBG.mizuAns);
  await page.evaluate(i=>window.mizuAnswer(i),ma); await page.waitForTimeout(400);
  await page.evaluate(()=>window.closeModal());
  // hidamari (last -> completion bonus should fire)
  const dropsBefore=await page.evaluate(()=>window.__DBG.state.drops);
  await page.click('[data-pin="8"]'); await page.waitForTimeout(1400);
  const modalText=await page.evaluate(()=>document.querySelector('#modal').textContent);
  expect(/べるがめぐり/.test(modalText),'completion bonus modal fires',modalText.slice(0,40));
  const dropsAfter=await page.evaluate(()=>window.__DBG.state.drops);
  expect(dropsAfter===dropsBefore+1,'completion +1 drop',`${dropsBefore}->${dropsAfter}`);
  expect(await page.evaluate(()=>window.__DBG.state.spots.completeShown===true),'completeShown persisted');
  await page.screenshot({path:'shot_complete.png'});
  await page.evaluate(()=>window.closeModal());
  await page.waitForTimeout(300);

  // visited stars on all 5 spot pins
  const visited=await page.evaluate(()=>document.querySelectorAll('.pin-hot.spot.visited').length);
  expect(visited===5,'all 5 spot pins show visited star',String(visited));
  await page.screenshot({path:'shot_map.png'});

  // reload -> completion modal must NOT re-fire
  await page.reload(); await page.waitForTimeout(2500);
  await page.click('#title-continue'); await page.waitForTimeout(2800);
  const modalShown=await page.evaluate(()=>document.querySelector('#modal-wrap').classList.contains('show'));
  expect(!modalShown,'completion bonus does not re-fire after reload');
  const visited2=await page.evaluate(()=>document.querySelectorAll('.pin-hot.spot.visited').length);
  expect(visited2===5,'visited stars restored after reload',String(visited2));

  // zukan screenshot
  await page.evaluate(()=>window.openZukan('all'));
  await page.waitForTimeout(500);
  await page.screenshot({path:'shot_zukan.png'});

  expect(errors.length===0,'no JS errors',errors.slice(0,3).join('|'));
  await browser.close();
  const fails=results.filter(r=>r[0]==='FAIL');
  console.log(`\n==== ${results.length-fails.length}/${results.length} passed ====`);
  process.exit(fails.length?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});

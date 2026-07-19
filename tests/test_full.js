/* べるがクエスト 通しプレイ自動テスト */
const { chromium } = require('playwright');
const path = require('path');

const results = [];
function ok(name){ results.push(['PASS',name]); console.log('PASS', name); }
function ng(name,detail){ results.push(['FAIL',name+(detail?' :: '+detail:'')]); console.log('FAIL', name, detail||''); }
async function expect(cond, name, detail){ cond ? ok(name) : ng(name, detail); }

(async()=>{
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ viewport:{width:900,height:500} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e=>errors.push('pageerror: '+e.message));
  page.on('console', m=>{ if(m.type()==='error' && !/gstatic|firebase|net::|Failed to load resource/i.test(m.text())) errors.push('console: '+m.text()); });

  const url = 'file://' + path.resolve(__dirname,'index.html');
  await page.goto(url);
  await page.waitForTimeout(2500); // boot

  // ---- title -> story(skip) -> name ----
  for(let i=0;i<5;i++){
    await page.click('#title-tap').catch(()=>{});
    await page.waitForTimeout(1300);
    if(await page.evaluate(()=>document.querySelector('#scr-story').classList.contains('active'))) break;
  }
  await expect(await page.isVisible('#scr-story'), 'story screen shows');
  for(let i=0;i<5;i++){
    await page.click('#story-skipzone').catch(()=>{});
    await page.waitForTimeout(1300);
    if(await page.evaluate(()=>document.querySelector('#scr-name').classList.contains('active'))) break;
  }
  await page.fill('#name-input','テスト');
  for(let i=0;i<5;i++){
    await page.click('#name-startzone');
    await page.waitForTimeout(1500);
    if(await page.evaluate(()=>document.querySelector('#scr-map').classList.contains('active'))) break;
  }
  await page.waitForTimeout(2200);
  await expect(await page.evaluate(()=>document.querySelector('#scr-map').classList.contains('active')), 'map screen active');

  // ---- forest unlock (code 0000) ----
  await page.click('[data-pin="3"]');
  await page.waitForTimeout(1200);
  await expect(await page.evaluate(()=>document.querySelector('#unlock-wrap').classList.contains('show')), 'unlock panel shows');
  for(let i=0;i<4;i++){ await page.click('.keypad .key:nth-child(10)'); await page.waitForTimeout(120); } // "0"
  await page.waitForTimeout(3200); // unlock anim
  // forest intro dialogues -> morinoko joins
  for(let i=0;i<8;i++){ await page.click('#dlg-tap',{force:true}).catch(()=>{}); await page.waitForTimeout(700); }
  // scr-get(morinoko)
  await page.waitForSelector('#get-btn.show',{timeout:15000});
  await page.click('#get-btn');
  await page.waitForTimeout(1500);
  for(let i=0;i<6;i++){ await page.click('#dlg-tap',{force:true}).catch(()=>{}); await page.waitForTimeout(600); }
  await page.waitForSelector('#chal-wrap.show',{timeout:10000});
  ok('forest intro + guide joined + challenge menu');
  await expect(await page.evaluate(()=>window.__DBG.state.spirits.includes('ki_morinoko')), 'morinoko in party');

  // ---- quiz (answer correctly using DBG) ----
  await page.click('.chal-card[data-chal="quiz"]');
  await page.waitForTimeout(800);
  const qa = await page.evaluate(()=>window.__DBG.quizAns);
  await page.click(`#quiz-opts .qopt:nth-child(${qa+1})`);
  await page.waitForTimeout(1400);
  await page.waitForSelector('#itemget.show',{timeout:8000});
  await page.click('#itemget-btn');
  await page.waitForTimeout(800);
  for(let i=0;i<4;i++){ await page.click('#dlg-tap',{force:true}).catch(()=>{}); await page.waitForTimeout(500); }
  await page.waitForSelector('#chal-wrap.show',{timeout:8000});
  await expect(await page.evaluate(()=>window.__DBG.state.areas.forest.chal.quiz), 'quiz cleared, blade item', JSON.stringify(await page.evaluate(()=>window.__DBG.state.items)));

  // ---- riddle ----
  await page.click('.chal-card[data-chal="riddle"]');
  await page.waitForTimeout(800);
  const ra = await page.evaluate(()=>window.__DBG.riddleAns);
  await page.click(`#riddle-opts .qopt:nth-child(${ra+1})`);
  await page.waitForTimeout(2800);
  for(let i=0;i<4;i++){ await page.click('#dlg-tap',{force:true}).catch(()=>{}); await page.waitForTimeout(500); }
  await page.waitForSelector('#chal-wrap.show',{timeout:8000});
  await expect(await page.evaluate(()=>window.__DBG.state.areas.forest.chal.riddle && window.__DBG.state.drops>=1), 'riddle cleared, drop gained');

  // ---- photo -> summon ----
  await page.click('.chal-card[data-chal="photo"]');
  await page.waitForTimeout(800);
  await page.click('#photo-demo');
  await page.waitForTimeout(500);
  await page.click('#photo-send');
  await page.waitForSelector('#summon-btn.show',{timeout:20000});
  await page.click('#summon-btn');
  await page.waitForSelector('#get-btn.show',{timeout:15000});
  await page.click('#get-btn');
  await page.waitForTimeout(1500);
  // boss unlock dialogue
  for(let i=0;i<6;i++){ await page.click('#dlg-tap',{force:true}).catch(()=>{}); await page.waitForTimeout(600); }
  await page.waitForTimeout(2500);
  await expect(await page.evaluate(()=>window.__DBG.state.bossUnlocked), 'boss unlocked after 3 challenges');
  await expect(await page.evaluate(()=>document.querySelector('#pin-boss').classList.contains('show')), 'boss pin visible');

  // ---- spots on map ----
  // yu
  await page.click('[data-pin="2"]');
  await page.waitForTimeout(600);
  await page.evaluate(()=>window.spotYuBathe());
  await page.waitForSelector('#itemget.show',{timeout:8000});
  await page.click('#itemget-btn');
  await page.waitForTimeout(800);
  await expect(await page.evaluate(()=>window.__DBG.state.items.includes('yunohana') && window.__DBG.state.spots.yu===true), 'yu spot: yunohana item');
  const defWithItem = await page.evaluate(()=>window.__DBG.state.items.includes('yunohana'));
  await expect(defWithItem, 'yunohana counted');
  // repeat visit shows flavor modal
  await page.click('[data-pin="2"]');
  await page.waitForTimeout(500);
  await expect(await page.evaluate(()=>document.querySelector('#modal-wrap').classList.contains('show')), 'yu repeat modal');
  await page.evaluate(()=>window.closeModal());

  // cafe
  await page.click('[data-pin="4"]');
  await page.waitForTimeout(500);
  await page.evaluate(()=>window.spotCafeTea());
  await page.waitForSelector('#itemget.show',{timeout:8000});
  await page.click('#itemget-btn');
  await page.waitForTimeout(1200);
  await expect(await page.evaluate(()=>window.__DBG.state.items.includes('cookie')), 'cafe spot: cookie item');
  await page.evaluate(()=>window.closeModal());

  // pond minigame (use DBG to position marker)
  await page.click('[data-pin="6"]');
  await page.waitForTimeout(600);
  for(let t=0;t<3;t++){
    await page.evaluate(()=>{ window.__DBG.setPond(50); window.pondThrow(); });
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(1400);
  const dropsBeforePondClose = await page.evaluate(()=>window.__DBG.state.drops);
  await expect(await page.evaluate(()=>window.__DBG.state.spots.pond>=1), 'pond minigame success + reward', 'drops='+dropsBeforePondClose);
  await page.evaluate(()=>{ document.querySelectorAll('#modal .fbtn').forEach(b=>{ if(b.textContent.includes('やった')) b.click(); }); });
  await page.waitForTimeout(500);
  await page.evaluate(()=>window.closeModal());

  // mizukumi quiz
  await page.click('[data-pin="7"]');
  await page.waitForTimeout(500);
  const ma = await page.evaluate(()=>window.__DBG.mizuAns);
  const dropsBefore = await page.evaluate(()=>window.__DBG.state.drops);
  await page.evaluate((i)=>window.mizuAnswer(i), ma);
  await page.waitForTimeout(600);
  const dropsAfter = await page.evaluate(()=>window.__DBG.state.drops);
  await expect(dropsAfter===dropsBefore+2, 'mizukumi first visit +2 drops', `${dropsBefore}->${dropsAfter}`);
  await page.evaluate(()=>window.closeModal());

  // hidamari
  await page.click('[data-pin="8"]');
  await page.waitForTimeout(500);
  await expect(await page.evaluate(()=>window.__DBG.state.spots.hidamari>=1), 'hidamari spot visited');
  await page.evaluate(()=>window.closeModal());
  // all 5 spots visited -> completion bonus modal fires after delay
  await page.waitForTimeout(1400);
  await expect(await page.evaluate(()=>/べるがめぐり/.test(document.querySelector('#modal').textContent)), 'spots completion bonus fires');
  await page.evaluate(()=>window.closeModal());
  await page.waitForTimeout(300);

  // ---- zukan tabs & NEW badge ----
  await page.evaluate(()=>window.openZukan('all'));
  await page.waitForTimeout(400);
  await expect(await page.evaluate(()=>document.querySelectorAll('.ztab').length===7), 'zukan 7 tabs');
  await expect(await page.evaluate(()=>document.querySelectorAll('.newbadge').length>=1), 'NEW badge shows');
  const newKey = await page.evaluate(()=>window.__DBG.state.newSpirits[0]);
  await page.evaluate((k)=>window.spiritDetail(k), newKey);
  await page.waitForTimeout(300);
  await expect(await page.evaluate((k)=>!window.__DBG.state.newSpirits.includes(k), newKey), 'NEW badge cleared after detail view');
  // genre tab filter
  await page.evaluate(()=>window.openZukan('mizu'));
  await page.waitForTimeout(300);
  await expect(await page.evaluate(()=>document.querySelectorAll('.zukan-cell').length===9), 'mizu tab shows 9 cells');
  await page.evaluate(()=>window.closeModal());

  // ---- quiz no-repeat sanity ----
  const seen = await page.evaluate(()=>window.__DBG.state.quizSeen.length);
  await expect(seen>=1, 'quizSeen tracked', 'len='+seen);

  // ---- boss battle -> win -> ending ----
  await page.click('#pin-boss');
  await page.waitForTimeout(800);
  await page.click('#btl-go');
  await page.waitForTimeout(4500);
  await page.evaluate(()=>window.__DBG.setBoss(1));
  await page.click('#cmd-atk');
  await page.waitForTimeout(2500);
  await page.waitForSelector('#battle-result.show',{timeout:15000});
  await page.click('#br-next');
  await page.waitForTimeout(2500);
  await page.waitForSelector('#boss-reveal.show',{timeout:8000});
  await page.click('#boss-reveal-btn');
  await page.waitForSelector('#ending.show',{timeout:20000});
  await expect(await page.evaluate(()=>window.__DBG.state.bossDefeated), 'boss defeated, ending shows');
  const endingText = await page.evaluate(()=>document.querySelector('#ending-stats').textContent);
  await expect(/なかま/.test(endingText), 'ending stats render');
  await page.click('#ending-btn');
  await page.waitForTimeout(600);

  // ---- save/continue ----
  await page.reload();
  await page.waitForTimeout(2500);
  await page.waitForSelector('#title-continue.show',{timeout:8000});
  await page.click('#title-continue');
  await page.waitForTimeout(2500);
  await expect(await page.evaluate(()=>window.__DBG.state.name==='テスト' && window.__DBG.state.spirits.length>=2 && window.__DBG.state.spots.yu===true), 'continue restores state incl. spots');
  await expect(await page.evaluate(()=>document.querySelector('#tree-glow').classList.contains('on')), 'tree glow restored after boss defeat');

  // ---- reset flow ----
  await page.evaluate(()=>window.confirmReset());
  await page.waitForTimeout(300);
  await page.evaluate(()=>window.doReset());
  await page.waitForTimeout(2500);
  await expect(await page.evaluate(()=>localStorage.getItem('vergaquest_save_v3')===null), 'reset clears save');
  await expect(await page.evaluate(()=>!document.querySelector('#title-continue').classList.contains('show')), 'continue hidden after reset');

  // ---- js errors ----
  await expect(errors.length===0, 'no JS errors', errors.slice(0,5).join(' | '));

  await browser.close();
  const fails = results.filter(r=>r[0]==='FAIL');
  console.log(`\n==== ${results.length-fails.length}/${results.length} passed ====`);
  process.exit(fails.length?1:0);
})().catch(e=>{ console.error('TEST CRASH:', e); process.exit(2); });

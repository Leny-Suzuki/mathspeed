/* MASPEED 百鬼夜行 EVENT / original pixel portraits (approved) */
(()=>{'use strict';
const KEY='mathspeed-hyakki-event-v1';
const ROOT='assets/hyakki/';
const records=[
 {id:'sunekosuri',name:'すねこすり',img:'sunekosuri.webp',desc:'夜道を歩く人の足元に、そっと体をすり寄せるという小さな妖怪。ふわふわの毛並みが特徴。',gacha:'SSR'},
 {id:'boroboroton',name:'暮露暮露団（ぼろぼろとん）',img:'boroboroton.webp',desc:'長く使われた古い布団が妖怪になった姿。継ぎはぎの布の隙間から、いたずらっぽい目がのぞく。'},
 {id:'mokumokuren',name:'目目連（もくもくれん）',img:'mokumokuren.webp',desc:'古い障子のあちこちに目が浮かぶ妖怪。たくさんの目がこちらをじっと見つめている。'},
 {id:'tankororin',name:'たんころりん',img:'tankororin.webp',desc:'熟した柿が妖怪になったと伝わる不思議な存在。笠をかぶって夜道を散歩する。'},
 {id:'karakasa',name:'唐傘小僧（からかさこぞう）',img:'approved_karakasa.webp',desc:'一本足と大きな目、長い舌を持つ古い傘の付喪神。ぴょんぴょん跳ねて人を驚かせる。',gacha:'SR'},
 {id:'chochin',name:'提灯お化け（ちょうちんおばけ）',img:'approved_chochin.webp',desc:'古い提灯に顔や舌が現れた付喪神。夜道にふわりと浮かび、怪しい灯りをともす。',gacha:'SR'},
 {id:'ittanmomen',name:'一反木綿（いったんもめん）',img:'approved_ittanmomen.webp',desc:'細長い木綿の布の姿で空を飛ぶといわれる妖怪。風に乗って夜空をひらひらと舞う。',gacha:'SR'},
 {id:'tofu',name:'豆腐小僧（とうふこぞう）',img:'approved_tofu.webp',desc:'豆腐をのせたお盆を持って現れる小さな妖怪。大きな笠をかぶった、どこかおとなしい姿。'},
 {id:'kappa',name:'河童（かっぱ）',img:'approved_kappa.webp',desc:'川や池に住むとされる水辺の妖怪。頭の皿とくちばし、水かきのある手足が目印。'},
 {id:'nurikabe',name:'ぬりかべ',img:'approved_nurikabe.webp',desc:'夜道をふさぐように現れる、壁のような妖怪。進もうとしても、なかなか先へ行けない。'},
 {id:'tengu',name:'天狗（てんぐ）',img:'tengu.webp',desc:'深い山にすむと伝わる妖怪。長い鼻や羽を持ち、山風を自在に操るといわれる。'},
 {id:'nekomata',name:'猫又（ねこまた）',img:'approved_nekomata.webp',desc:'長く生きた猫が変化したといわれる妖怪。二股に分かれた尻尾と妖しい火が特徴。'}
].map(r=>({...r,image:ROOT+r.img}));
const byId=id=>records.find(x=>x.id===id);
const fresh=()=>({seen:false,enabled:null,attempted:[],defeated:[],winsSince:0,pending:null,current:null,escapes:0});
function load(){let x;try{x=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}const d=fresh();if(x&&typeof x==='object'){
 d.seen=!!x.seen;d.enabled=typeof x.enabled==='boolean'?x.enabled:null;d.attempted=Array.isArray(x.attempted)?x.attempted.filter(id=>!!byId(id)):[];
 d.defeated=Array.isArray(x.defeated)?x.defeated.filter(id=>!!byId(id)):[];
 d.winsSince=0;d.pending=byId(x.pending)?x.pending:null;d.current=byId(x.current)?x.current:null;
 d.escapes=Math.max(0,Number(x.escapes)||0);}
 return d;}
let data=load(),offerContinuation=null,demoMatch=false,demoSavedPending=null,demoSavedCurrent=null,previewCount=null;
function save(){try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}}
function remaining(){return records.filter(r=>!data.defeated.includes(r.id));}
function rollAfterWin(){if(data.enabled!==true||data.pending||data.current||!remaining().length)return;
 if(Math.random()<.05){const list=remaining();data.pending=list[Math.floor(Math.random()*list.length)].id;}
 save();}
function howl(){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 const a=new AC(),t=a.currentTime;
 for(let i=0;i<3;i++){const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(520-i*95,t+i*.16);o.frequency.exponentialRampToValueAtTime(170-i*24,t+i*.16+.54);g.gain.setValueAtTime(.0001,t+i*.16);g.gain.exponentialRampToValueAtTime(.075,t+i*.16+.06);g.gain.exponentialRampToValueAtTime(.0001,t+i*.16+.55);o.connect(g).connect(a.destination);o.start(t+i*.16);o.stop(t+i*.16+.56)}setTimeout(()=>a.close().catch(()=>{}),1700);
 }catch(e){}}
function closeEl(id){const el=document.getElementById(id);if(el)el.hidden=true;}
function offerPending(continuation){if(data.enabled!==true&&!demoMatch)return false;const enemy=byId(data.pending);if(!enemy)return false;
 offerContinuation=typeof continuation==='function'?continuation:null;
 const el=document.getElementById('hyakkiEncounter');if(!el)return false;
 document.getElementById('hyakkiEncounterName').textContent=enemy.name+'が現れた！';
 document.getElementById('hyakkiEncounterImg').src=enemy.image;
 el.hidden=false;howl();return true;}
function flee(){closeEl('hyakkiEncounter');if(demoMatch){data.pending=demoSavedPending;data.current=demoSavedCurrent;}else{data.pending=null;data.escapes++;save();}demoMatch=false;const next=offerContinuation;offerContinuation=null;if(next)next();}
function fight(){const enemy=byId(data.pending);if(!enemy||(!demoMatch&&data.defeated.includes(enemy.id))){flee();return;}
 closeEl('hyakkiEncounter');closeEl('hyakkiEventModal');offerContinuation=null;
 const wasAttempted=data.attempted.includes(enemy.id);if(!demoMatch&&!wasAttempted)data.attempted.push(enemy.id);data.current=enemy.id;data.pending=null;if(!demoMatch)save();
 const ok=window.MasHyakkiBattle?.begin?.(enemy);
 if(!ok){if(!demoMatch){if(!wasAttempted)data.attempted=data.attempted.filter(id=>id!==enemy.id);data.pending=enemy.id;data.current=null;save();}else{data.current=demoSavedCurrent;data.pending=demoSavedPending;demoMatch=false;}}
}
function complete(id,winner){const e=byId(id||data.current);if(!e)return {coins:0};if(demoMatch){demoMatch=false;data.current=demoSavedCurrent;data.pending=demoSavedPending;return {coins:0,demo:true};}
 if(!data.attempted.includes(e.id))data.attempted.push(e.id);
 let coins=0;
 if(winner==='player'&&!data.defeated.includes(e.id)){data.defeated.push(e.id);coins=window.MasHyakkiBattle?.awardCoins?.(500)||0;}
 data.current=null;save();return {coins};}
function drawLibrary(){const grid=document.getElementById('hyakkiBookGrid');if(!grid)return;
 grid.replaceChildren();
 for(const [i,r] of records.entries()){const isWon=previewCount===null?data.defeated.includes(r.id):i<previewCount,tried=data.attempted.includes(r.id);
 const card=document.createElement('article');card.className='hyakki-book-card '+(isWon?'won':'unseen');
 const image=document.createElement('img');image.src=r.image;image.alt=isWon?r.name:'未発見の妖怪';image.loading='lazy';
 const h=document.createElement('h4');h.textContent=isWon?r.name:(tried?'🌫️ 再挑戦を待つ妖怪':'？？？');
 const p=document.createElement('p');p.textContent=isWon?r.desc:(tried?'まだ退治できていない。次に現れたら再挑戦できるよ。':'戦いに勝つと正体が明らかになる。');
 card.append(image,h,p);grid.append(card);}
 const won=previewCount===null?data.defeated.length:previewCount;
 document.getElementById('hyakkiBookProgress').textContent=(previewCount===null?`図鑑 ${won}/12種　🪙 ${won*500}/6000 コイン獲得`:`🧪 テスト表示：図鑑 ${won}/12種（コイン・セーブ変更なし）`);
}
function showModal(tab='intro'){
 data.seen=true;save();const modal=document.getElementById('hyakkiEventModal');if(!modal)return;
 modal.hidden=false;
 document.getElementById('hyakkiIntroPage').hidden=tab==='book';document.getElementById('hyakkiBookPage').hidden=tab!=='book';
 document.querySelectorAll('.hyakki-tab').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===tab));
 drawLibrary();updateModeUI();
}
function hideModal(){closeEl('hyakkiEventModal');}
function updateModeUI(){const status=document.getElementById('hyakkiModeStatus');if(!status)return;
 status.textContent=data.enabled===true?'✅ きもだめし中：勝利後5％で妖怪が出現':data.enabled===false?'🌿 通常モード：妖怪は出現しない':'どちらかの遊び方を選んでね。';
 for(const [id,yes] of [['hyakkiEnable',true],['hyakkiDisable',false]]){const b=document.getElementById(id);b?.classList.toggle('active',data.enabled===yes);b?.setAttribute('aria-pressed',String(data.enabled===yes))}}
function setEnabled(v){data.enabled=!!v;save();updateModeUI();closeEl('hyakkiEncounter');hideModal()}
function launchButton(){const host=document.getElementById('ms109News');if(!host)return;
 const row=document.createElement('div');row.className='msHyakkiHomeRow';row.id='msHyakkiHomeRow';const b=document.createElement('button');b.type='button';b.id='hyakkiEventLauncher';b.className='hyakki-event-launch';b.textContent='🏮 百鬼夜行　｜　きもだめし・妖怪図鑑';b.onclick=()=>showModal('intro');row.appendChild(b);host.after(row);
}
function install(){if(document.getElementById('hyakkiEventModal'))return;
 const d=document.createElement('div');
 d.innerHTML=`
 <section class="hyakki-modal" id="hyakkiEventModal" hidden aria-label="百鬼夜行">
  <div class="hyakki-window" role="dialog" aria-modal="true">
   <header class="hyakki-head"><div><small>MASPEED / HYAKKI YAKOU</small><h2>🏮 百鬼夜行</h2></div><button type="button" id="hyakkiClose">× 閉じる</button></header>
   <nav class="hyakki-tabs"><button class="hyakki-tab active" data-tab="intro">📜 イベント案内</button><button class="hyakki-tab" data-tab="book">📖 妖怪図鑑</button></nav>
   <div id="hyakkiIntroPage">
    <div class="hyakki-mode-card"><h3>きもだめしモード</h3><p>いつものマスピードを遊ぶか、妖怪と出会えるマスピードを遊ぶか選ぼう！ 後からいつでも切り替えられるよ。</p>
      <div class="hyakki-mode-actions"><button type="button" id="hyakkiEnable">👻 きもだめしする<small>対戦後に妖怪が出現するようになるよ</small></button><button type="button" id="hyakkiDisable">🌿 きもだめししない<small>いままでどおりの通常マスピード</small></button></div><div id="hyakkiModeStatus" class="hyakki-mode-status" aria-live="polite"></div>
    </div>
    <div class="hyakki-intro-hero"><div><strong>ひゅ〜どろどろ……</strong><p>十二の妖怪たちが、マスピードの世界へ迷い込んだ！</p></div></div>
    <div class="hyakki-intro-section"><h3>① ガチャに限定キャラ登場！</h3><div class="hyakki-portraits">
      <figure><img src="${ROOT}sunekosuri.webp" alt="すねこすり"><figcaption>SSR すねこすり</figcaption></figure>
      <figure><img src="${ROOT}karakasa.webp" alt="唐傘小僧"><figcaption>SR 唐傘小僧</figcaption></figure>
      <figure><img src="${ROOT}chochin.webp" alt="提灯お化け"><figcaption>SR 提灯お化け</figcaption></figure>
      <figure><img src="${ROOT}ittanmomen.webp" alt="一反木綿"><figcaption>SR 一反木綿</figcaption></figure>
     </div><p>いつものガチャに4体が追加！ SR・SSRの合計排出率はそのまま。</p></div>
    <div class="hyakki-intro-section"><h3>② 12体の妖怪が突然乱入！</h3><p>きもだめし中、通常対戦に勝つと5％の確率で「ひゅ〜どろどろ……」と妖怪が現れる。<strong>勝負する／逃げる</strong>を選ぼう！</p>
       <p>勝てば図鑑に妖怪の絵と紹介が追加され、<b>1体につき500マスコイン</b>。12体で最大6000枚！　一度倒した妖怪はもう出現しないけど、負けた妖怪にはまた出会えるよ。</p></div>
    <div class="hyakki-intro-section hyakki-secret"><img src="${ROOT}sunekosuri_walk_front.png" alt="ひみつきちを歩くすねこすりの小さなドット絵"><div><h3>③ ひみつきちにすねこすりが遊びに来る！</h3><p>きせきねこと同じ確率で秘密基地を訪問！ 出会えたら5,000マスコインをプレゼント！</p></div></div>
    <div class="hyakki-actions"><button type="button" id="hyakkiIntroBook">妖怪図鑑を見る</button><button type="button" id="hyakkiIntroStart">冒険を続ける</button></div>
   </div>
   <div id="hyakkiBookPage" hidden><div class="hyakki-progress" id="hyakkiBookProgress"></div><p class="hyakki-book-info">戦いに勝つと妖怪の姿と説明が明らかになるよ。負けた妖怪は、次の出現時にもう一度挑戦できる。</p><div class="hyakki-book-grid" id="hyakkiBookGrid"></div></div>
    <section id="hyakkiTestPanel" class="hyakki-test-panel" hidden><h3>🧪 百鬼夜行・試遊メニュー（正式版には非表示）</h3>
   <p>図鑑のプレビューも妖怪との模擬戦も、本番の図鑑・コイン・挑戦履歴を変更しません。</p>
   <label for="hyakkiTestEnemy">試す妖怪</label><select id="hyakkiTestEnemy"></select>
   <div class="hyakki-test-buttons"><button type="button" id="hyakkiTestEncounter">👻 この妖怪と模擬戦</button><button type="button" id="hyakkiTestBook0">未収集（0/12）</button><button type="button" id="hyakkiTestBook6">半分（6/12）</button><button type="button" id="hyakkiTestBook12">全収集（12/12）</button><button type="button" id="hyakkiTestBookReal">実際の図鑑に戻す</button></div>
  </section>
  </div>
 </section>
 <section class="hyakki-modal hyakki-encounter" id="hyakkiEncounter" hidden aria-label="妖怪の乱入">
   <div class="hyakki-encounter-body" role="dialog" aria-modal="true">
    <div class="hyakki-mist">ひゅ〜どろどろ……</div><img id="hyakkiEncounterImg" alt="乱入した妖怪" src="${ROOT}nurikabe.webp">
    <h2 id="hyakkiEncounterName">ぬりかべが現れた！</h2>
    <p>勝てば妖怪図鑑に登録！ 負けても、いつかまた出会えるよ。</p>
    <div class="hyakki-choice"><button type="button" id="hyakkiFight">⚔ 勝負する！</button><button type="button" id="hyakkiFlee">🌫️ 逃げる</button></div>
   </div>
 </section>`;
 document.body.append(...Array.from(d.children));
 // Debug previews remain opt-in; ordinary players see the finished event only.
 if(new URLSearchParams(location.search).get('hyakki_test')==='1') document.getElementById('hyakkiTestPanel').hidden=false;
 document.getElementById('hyakkiClose').onclick=hideModal;
 document.getElementById('hyakkiIntroStart').onclick=hideModal;
 document.getElementById('hyakkiIntroBook').onclick=()=>showModal('book');
 document.getElementById('hyakkiFight').onclick=fight;
 document.getElementById('hyakkiFlee').onclick=flee;
 document.querySelectorAll('.hyakki-tab').forEach(b=>b.onclick=()=>showModal(b.dataset.tab));
 document.getElementById('hyakkiEnable').onclick=()=>setEnabled(true);
 document.getElementById('hyakkiDisable').onclick=()=>setEnabled(false);
 const select=document.getElementById('hyakkiTestEnemy');for(const r of records){const opt=document.createElement('option');opt.value=r.id;opt.textContent=r.name;select.appendChild(opt)}
 document.getElementById('hyakkiTestEncounter').onclick=()=>{const r=byId(select.value);if(!r)return;demoMatch=true;demoSavedPending=data.pending;demoSavedCurrent=data.current;data.pending=r.id;hideModal();offerPending(()=>{});};
 for(const count of [0,6,12])document.getElementById('hyakkiTestBook'+count).onclick=()=>{previewCount=count;showModal('book')};
 document.getElementById('hyakkiTestBookReal').onclick=()=>{previewCount=null;showModal('book')};
 launchButton();
 // Test controls are directly inside the event dialog: keep the title menu compact.

 if(data.enabled===null)setTimeout(()=>showModal('intro'),1000);
 else if(data.pending&&data.enabled)setTimeout(()=>{if(document.getElementById('titleOverlay')&&!document.getElementById('titleOverlay').classList.contains('hidden'))offerPending(null)},1000);
}
window.MasHyakki={records,rollAfterWin,offerPending,complete,current:()=>byId(data.current),open:showModal,isEnabled:()=>data.enabled,testState:()=>({enabled:data.enabled,pending:data.pending,defeated:data.defeated.slice(),attempted:data.attempted.slice()})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();

(()=>{'use strict';
const $=id=>document.getElementById(id),cv=$('game'),ctx=cv.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
const W=320,H=180,G=137,PH=17,PW=18,END=1800,PROFILE='mathspeed-v4-profile',LIMIT=50;
const pits=[{x:378,w:29},{x:676,w:32},{x:1008,w:33},{x:1345,w:34}];
const obstacles=[{x:247,w:13,h:15,kind:'stump'},{x:520,w:14,h:10,kind:'stone'},{x:824,w:17,h:15,kind:'bush'},{x:1130,w:14,h:15,kind:'stump'},{x:1490,w:15,h:10,kind:'stone'}];
const positions=[80,118,157,202,284,326,445,487,558,606,746,791,867,924,1078,1164,1246,1300,1437,1525,1610,1692];
const flowers=[[57,0],[124,1],[184,2],[310,0],[463,2],[616,1],[890,0],[1075,2],[1330,1],[1560,0]];
const zones=[{name:'🌼 花の草原',sky:'#84cde4',horizon:'#c2e7c6',hill:'#90c9a6',grass:'#6fac67',tree:'#3e8b67'},{name:'🍄 きのこの森',sky:'#92c7ba',horizon:'#d8ddab',hill:'#84ae8d',grass:'#549b6e',tree:'#367461'},{name:'🏡 スライムの村',sky:'#e6c4b7',horizon:'#fbdfae',hill:'#c7b795',grass:'#87bb70',tree:'#648c6e'}];
let state='ready',p={x:40,y:G-PH,vy:0},cam=0,time=0,last=0,raf=0,hearts=3,invuln=0,held=false,holdFor=0,falling=false,picked=0,coins=[],sparkles=[],runId='',drawOffset=0,mute=false;
let ac=null,musicTimer=0,tuneIdx=0;
function safeRead(){try{return JSON.parse(localStorage.getItem(PROFILE)||'{}')||{}}catch{return {}}}
function safeWrite(obj){try{localStorage.setItem(PROFILE,JSON.stringify(obj));return true}catch{return false}}
function day(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function dayUsed(o){return Math.max(o.miniGamesDaily?.date===day()?(Number(o.miniGamesDaily.earned)||0):0,o.coinAdventureDaily?.date===day()?(Number(o.coinAdventureDaily.earned)||0):0)}
function refreshWallet(){const o=safeRead();$('wallet').textContent='🪙 '+Math.max(0,Math.floor(Number(o.coins)||0)).toLocaleString('ja-JP')+'枚';$('dailyInfo').textContent='1回最大15枚 ／ ミニゲーム1日最大50枚（残り'+Math.max(0,LIMIT-dayUsed(o))+'枚）'}
function reward(clear){const raw=clear?10+Math.min(5,Math.floor(picked/4)):Math.min(2,Math.floor(picked/7));const data=safeRead();if(!Array.isArray(data.miniGamesRuns))data.miniGamesRuns=[];if(data.miniGamesRuns.includes(runId))return {ok:true,gained:0,raw};const gained=Math.max(0,Math.min(raw,LIMIT-dayUsed(data)));data.coins=Math.max(0,Math.floor(Number(data.coins)||0))+gained;data.miniGamesDaily={date:day(),earned:dayUsed(data)+gained};data.miniGamesRuns=[...data.miniGamesRuns.slice(-55),runId];if(clear)data.slimeAdventureClears=Math.max(0,Math.floor(Number(data.slimeAdventureClears)||0))+1;const ok=safeWrite(data);refreshWallet();return {ok,gained:ok?gained:0,raw}}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h))}
function pixLine(x1,y1,x2,y2,c){ctx.strokeStyle=c;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(Math.round(x1)+.5,Math.round(y1)+.5);ctx.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);ctx.stroke()}
function text(t,x,y,color='#fffbdd',size=9){ctx.fillStyle='#23436c';ctx.font=`bold ${size}px monospace`;ctx.fillText(t,x+1,y+1);ctx.fillStyle=color;ctx.fillText(t,x,y)}
function zoneFor(x){return x<610?0:x<1240?1:2}
function inPit(x){return pits.some(g=>x>g.x&&x<g.x+g.w)}
function note(freq,len=.12,gain=.025,type='square',delay=0){if(mute)return;try{if(!ac)ac=new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();const t=ac.currentTime+delay,osc=ac.createOscillator(),vol=ac.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);vol.gain.setValueAtTime(.0001,t);vol.gain.linearRampToValueAtTime(gain,t+.015);vol.gain.exponentialRampToValueAtTime(.0001,t+len);osc.connect(vol).connect(ac.destination);osc.start(t);osc.stop(t+len+.02)}catch{}}
function fx(type){const a={jump:[540,720],coin:[880,1110],hurt:[280,210],win:[523,659,784,1047],start:[392,523,659],lose:[330,260]};(a[type]||[]).forEach((f,i)=>note(f,.12,.032,'triangle',i*.085))}
const tune=[392,440,494,587,494,440,392,330,349,392,440,523,440,392,349,330,392,440,523,659,587,523,494,440,392,349,392,494,440,392,330,294];
function musicStop(){if(musicTimer){clearInterval(musicTimer);musicTimer=0}}
function musicStart(){musicStop();if(mute||state!=='running')return;musicTimer=setInterval(()=>{if(state!=='running'||document.hidden)return;const i=tuneIdx++%tune.length;note(tune[i],.16,.009,'triangle');if(i%4===0)note(tune[i]/2,.23,.006,'sine')},240)}
function bubble(x,y,color='#ffe3a6',n=7){for(let i=0;i<n;i++)sparkles.push({x,y,vx:(Math.random()-.5)*34,vy:-15-Math.random()*35,life:.32+Math.random()*.4,color})}
function show(title,msg,coinsLabel,icon,button){$('overlayTitle').textContent=title;$('overlayText').textContent=msg;$('overlayReward').textContent=coinsLabel;$('overlayIcon').textContent=icon;$('start').textContent=button;$('overlay').hidden=false;refreshWallet()}
function setup(){p={x:35,y:G-PH,vy:0};cam=0;last=0;time=0;hearts=3;invuln=0;held=false;holdFor=0;falling=false;picked=0;sparkles=[];coins=positions.map((x,i)=>({x,y:G-26-(i%3===0?16:0),got:false}));runId='slime109-'+Date.now()+'-'+Math.random().toString(36).slice(2);state='running';$('overlay').hidden=true;$('jump').disabled=false;$('pause').disabled=false;updateHud();tuneIdx=0;musicStart();fx('start');cancelAnimationFrame(raf);raf=requestAnimationFrame(tick)}
function pause(){if(state!=='running')return;state='paused';musicStop();cancelAnimationFrame(raf);$('jump').disabled=true;$('pause').disabled=true;show('おさんぽを休憩中','ちょっとひと休み。準備ができたら、続きを遊ぼう。','集めた星 '+picked+' 個','☕','▶ おさんぽを再開')}
function resume(){state='running';last=0;$('overlay').hidden=true;$('jump').disabled=false;$('pause').disabled=false;musicStart();raf=requestAnimationFrame(tick)}
function done(win,reason=''){if(state!=='running')return;state=win?'clear':'failed';cancelAnimationFrame(raf);musicStop();$('jump').disabled=true;$('pause').disabled=true;const r=reward(win);const msg=win?'おかえり！ ポポは無事に村へ帰ってきました。\n花と星のおみやげもいっぱい！':reason==='fall'?'水たまりにぽちゃん！ ポポはびっくりしておうちに戻りました。\nジャンプのタイミングを変えてまた挑戦しよう。':'疲れちゃったね。おうちでひと休みして、またおさんぽしよう。';show(win?'ただいま！ おさんぽ大成功':'また あそぼうね',msg,r.ok?'🪙 +'+r.gained+' マスコイン'+(r.gained<r.raw?'（今日の上限に到達）':''):'保存できませんでした',win?'🏡🌷':'💧💤','↻ もう一度あそぶ');fx(win?'win':'lose')}
function jump(){if(state!=='running'||falling)return;held=true;if(p.y+PH>=G-1&&!inPit(p.x+PW/2)){p.vy=-190;holdFor=.15;bubble(p.x+8,G-3,'#f9efd0',4);fx('jump')}}
function release(){held=false}
$('start').addEventListener('click',()=>{if(state==='paused')resume();else setup()});$('pause').addEventListener('click',pause);
$('sound').addEventListener('click',()=>{mute=!mute;$('sound').textContent=mute?'🔇 音 OFF':'🔊 音 ON';if(mute)musicStop();else musicStart()});
for(const target of [cv,$('jump')]){target.addEventListener('pointerdown',e=>{e.preventDefault();jump()});target.addEventListener('pointerup',e=>{e.preventDefault();release()});target.addEventListener('pointercancel',release)}
window.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();if(!e.repeat)jump()}if(e.code==='Escape'&&state==='running')pause()});window.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='ArrowUp')release()});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
function updateHud(){$('hearts').textContent='♥ '.repeat(hearts)+'♡ '.repeat(3-hearts);$('score').textContent='🌟 '+picked+' 個';$('zone').textContent=zones[zoneFor(p.x)].name;$('time').textContent=state==='running'?Math.round(100*p.x/END)+'% 進んだよ':'🍀 ゴールを目指そう！';$('progressFill').style.width=Math.min(100,Math.max(0,p.x/END*100))+'%'}
function update(dt){time+=dt;invuln=Math.max(0,invuln-dt);const oldBottom=p.y+PH;const speed=65;p.x+=speed*dt;const mid=p.x+PW/2;
 if(held&&holdFor>0&&p.vy<0){p.vy-=340*dt;holdFor-=dt}else holdFor=0;
 p.vy+=470*dt;p.y+=p.vy*dt;
 const here=inPit(mid);
 if(!falling&&!here&&p.vy>=0&&p.y+PH>=G&&oldBottom<=G+8){p.y=G-PH;p.vy=0}
 if(here&&p.y+PH>G+11)falling=true;
 if(falling&&p.y>H+15){done(false,'fall');return}
 for(const o of obstacles){if(invuln>0||falling)break;const overlap=mid>o.x-5&&p.x<o.x+o.w-3&&p.y+PH>G-o.h+3&&p.y<G-3;
 if(overlap){hearts--;invuln=1.4;p.vy=-104;bubble(mid,G-o.h,'#fbe5a9',10);fx('hurt');if(hearts<=0){done(false,'bump');return}}}
 for(const c of coins){if(!c.got&&!falling&&Math.abs(c.x-mid)<13&&Math.abs(c.y-(p.y+PH/2))<16){c.got=true;picked++;bubble(c.x,c.y,'#ffeb7d',7);fx('coin')}}
 sparkles=sparkles.filter(s=>s.life>0);for(const s of sparkles){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt}
 cam=Math.max(0,p.x-80);if(p.x>=END-38){done(true);return}updateHud()}
function sky(){const z=zones[zoneFor(p.x)];rect(0,0,W,H,z.sky);rect(0,56,W,53,z.horizon);rect(0,108,W,69,'#b8d6aa');const cloudShift=(cam*.1)%164;for(let i=-1;i<5;i++){const x=Math.floor(i*140-cloudShift),y=17+(i%2)*12;rect(x,y+6,44,7,'#f9e9d5');rect(x+9,y+1,31,6,'#fff2e6');rect(x+16,y-3,18,6,'#fff7ee')}
 const hills=(cam*.21)%170;for(let i=-2;i<5;i++){const x=i*170-hills;for(let s=0;s<8;s++)rect(x+s*12,108-s*3,130-s*13,5,z.hill)}
 if(zoneFor(p.x)===2){rect(242,55,17,31,'#fff0d0');rect(247,46,7,14,'#e8d9bb');rect(234,72,35,7,'#c99877');rect(247,37,7,9,'#ac7c79');}
 const forestShift=(cam*.35)%74;for(let i=-2;i<8;i++){const x=Math.floor(i*74-forestShift);if(zoneFor(p.x)!==2){rect(x+18,90,7,45,'#87634e');rect(x+6,90,32,10,'#437f64');rect(x+10,79,27,12,z.tree);rect(x+16,70,17,12,'#4da075');rect(x+23,78,5,7,'#80c291')}else{rect(x+17,111,7,20,'#8b705e');rect(x+9,102,23,12,'#66a779')}}}
function ground(){for(let x=0;x<W;x+=5){const wx=Math.floor(cam+x);if(inPit(wx)){rect(x,G,5,H-G,'#407ba3');if(Math.floor(time*3)%2===0)rect(x,G+6,5,1,'#84d0de')}else{const z=zones[zoneFor(wx)];rect(x,G,5,7,z.grass);rect(x,G+7,5,H-G-7,'#986d4a');if(wx%41<6)rect(x,G+10,5,4,'#b88c61');if(wx%37<4)rect(x,G+22,5,4,'#6e584c');if(wx%31<4)rect(x,G-2,5,2,'#bee199')}}
 for(const item of flowers){const x=Math.round(item[0]-cam);if(x< -10||x>W+10||inPit(item[0]))continue;rect(x,G-5,2,6,'#34845f');rect(x-2,G-8,3,3,item[1]===0?'#fbe8dd':item[1]===1?'#ffe5a1':'#d4d3f7');rect(x+1,G-8,3,3,'#fff4de');rect(x,G-7,2,2,'#f5b749')}
 for(const o of obstacles){const x=Math.round(o.x-cam);if(x< -24||x>W+24)continue;if(o.kind==='stump'){rect(x,G-15,13,15,'#543e45');rect(x+2,G-13,10,13,'#9a6547');rect(x,G-16,13,5,'#dfb480');rect(x+3,G-15,7,3,'#805548');rect(x+6,G-11,3,10,'#bf9167')}else if(o.kind==='stone'){rect(x+1,G-8,13,8,'#59676e');rect(x+3,G-11,9,4,'#a2ac9c');rect(x+5,G-9,5,4,'#c9d2c4')}else{rect(x,G-8,16,8,'#3f805d');rect(x+2,G-15,12,9,'#65ae77');rect(x+5,G-18,6,5,'#b7d184');rect(x+4,G-13,4,3,'#d58fab')}}
 if(END-cam<W+45){const gx=Math.round(END-30-cam);rect(gx,G-49,33,49,'#d2b494');rect(gx+3,G-45,27,42,'#eee1b5');rect(gx-4,G-51,40,6,'#a17b71');rect(gx+6,G-33,20,33,'#8a745d');rect(gx+10,G-28,12,28,'#463f56');rect(gx+13,G-46,6,12,'#dd9690');text('GOAL',gx-1,G-62,'#fff8c6',11)}}
function coinDraw(x,y,t){const bob=Math.sin(t*5+x*.07)*2;const xx=Math.floor(x-cam),yy=Math.floor(y+bob);rect(xx-3,yy-4,8,9,'#a87439');rect(xx-2,yy-5,6,9,'#ffdc70');rect(xx,yy-3,2,5,'#fff6be');rect(xx-1,yy-1,4,2,'#d89c35')}
function slimeDraw(){const x=Math.round(p.x-cam),y=Math.round(p.y),squash=p.vy>0&&p.y+PH>=G-1?.89:p.vy<-30?1.13:1;ctx.save();ctx.translate(x+PW/2,y+PH);ctx.scale(1,Math.max(.82,Math.min(1.18,squash)));ctx.translate(-PW/2,-PH);if(invuln>0&&Math.floor(time*14)%2){ctx.restore();return}
 const wiggle=Math.round(Math.sin(time*10)*1.2);rect(3,9,13,7,'#1d577d');rect(1,12,17,5,'#1d577d');rect(4,6,11,10,'#208fc1');rect(6,3+wiggle,7,12,'#208fc1');rect(8,1+wiggle,3,7,'#208fc1');rect(2,10,15,5,'#5bc8e6');rect(4,6,11,8,'#5bc8e6');rect(7,3+wiggle,5,11,'#5bc8e6');rect(9,2+wiggle,2,4,'#baf1ff');rect(5,6,4,3,'#bdf3fa');rect(4,12,3,3,'#f38fad');rect(13,12,3,3,'#f38fad');rect(6,10,2,3,'#142e53');rect(13,10,2,3,'#142e53');rect(10,12,2,1,'#142e53');rect(11,13,2,1,'#142e53');ctx.restore()}
function draw(){sky();ground();for(const c of coins)if(!c.got)coinDraw(c.x,c.y,time);slimeDraw();for(const s of sparkles)rect(s.x-cam,s.y,2,2,s.color);if(state==='ready')text('おさんぽの準備中...',85,91);}
function tick(t){if(state!=='running')return;const dt=Math.min(.033,last?(t-last)/1000:.016);last=t;update(dt);draw();if(state==='running')raf=requestAnimationFrame(tick)}
refreshWallet();coins=positions.map((x,i)=>({x,y:G-26-(i%3===0?16:0),got:false}));updateHud();draw();
})();

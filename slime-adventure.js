(()=>{'use strict';
const $=id=>document.getElementById(id),cv=$('game'),ctx=cv.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
const W=320,H=180,G=137,PH=17,PW=18,END=1800,PROFILE='mathspeed-v4-profile';
const pits=[{x:378,w:29},{x:676,w:32},{x:1008,w:33},{x:1345,w:34}];
const obstacles=[{x:247,w:13,h:15,kind:'stump'},{x:520,w:14,h:10,kind:'stone'},{x:824,w:17,h:15,kind:'bush'},{x:1130,w:14,h:15,kind:'stump'},{x:1490,w:15,h:10,kind:'stone'}];
const positions=[80,118,157,202,284,326,445,487,558,606,746,791,867,924,1078,1164,1246,1300,1437,1525,1610,1692];
const flowers=[[57,0],[124,1],[184,2],[310,0],[463,2],[616,1],[890,0],[1075,2],[1330,1],[1560,0]];
const zones=[{name:'🌼 花の草原',sky:'#84cde4',horizon:'#c2e7c6',hill:'#90c9a6',grass:'#6fac67',tree:'#3e8b67'},{name:'🍄 きのこの森',sky:'#92c7ba',horizon:'#d8ddab',hill:'#84ae8d',grass:'#549b6e',tree:'#367461'},{name:'🏡 スライムの村',sky:'#e6c4b7',horizon:'#fbdfae',hill:'#c7b795',grass:'#87bb70',tree:'#648c6e'}];
let state='ready',p={x:40,y:G-PH,vy:0},cam=0,time=0,last=0,raf=0,hearts=3,invuln=0,held=false,holdFor=0,falling=false,picked=0,coins=[],sparkles=[],runId='',drawOffset=0,mute=false;
let ac=null,musicTimer=0,tuneIdx=0;
function safeRead(){try{return JSON.parse(localStorage.getItem(PROFILE)||'{}')||{}}catch{return {}}}
function safeWrite(obj){try{localStorage.setItem(PROFILE,JSON.stringify(obj));return true}catch{return false}}
function refreshWallet(){const o=safeRead();$('wallet').textContent='🪙 '+Math.max(0,Math.floor(Number(o.coins)||0)).toLocaleString('ja-JP')+'枚';$('dailyInfo').textContent='1回最大15枚 ／ 1日の回数制限なし'}
function reward(clear){const raw=clear?10+Math.min(5,Math.floor(picked/4)):Math.min(2,Math.floor(picked/7));const data=safeRead();if(!Array.isArray(data.miniGamesRuns))data.miniGamesRuns=[];if(data.miniGamesRuns.includes(runId))return {ok:true,gained:0,raw};const gained=Math.max(0,Math.min(raw,15));data.coins=Math.max(0,Math.floor(Number(data.coins)||0))+gained;data.miniGamesRuns=[...data.miniGamesRuns.slice(-55),runId];if(clear)data.slimeAdventureClears=Math.max(0,Math.floor(Number(data.slimeAdventureClears)||0))+1;const ok=safeWrite(data);refreshWallet();return {ok,gained:ok?gained:0,raw}}
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
function done(win,reason=''){if(state!=='running')return;state=win?'clear':'failed';cancelAnimationFrame(raf);musicStop();$('jump').disabled=true;$('pause').disabled=true;const r=reward(win);const msg=win?'おかえり！ ポポは無事に村へ帰ってきました。\n花と星のおみやげもいっぱい！':reason==='fall'?'水たまりにぽちゃん！ ポポはびっくりしておうちに戻りました。\nジャンプのタイミングを変えてまた挑戦しよう。':'疲れちゃったね。おうちでひと休みして、またおさんぽしよう。';show(win?'ただいま！ おさんぽ大成功':'また あそぼうね',msg,r.ok?'🪙 +'+r.gained+' マスコイン':'保存できませんでした',win?'🏡🌷':'💧💤','↻ もう一度あそぶ');fx(win?'win':'lose')}
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
// All terrain and scenery textures are anchored to WORLD coordinates.
// Previously the 5px-wide texture was anchored to screen columns and shimmered as the camera moved.
const hash=n=>{let x=(Math.floor(n)*1664525+1013904223)|0;x^=x>>>13;return (x>>>0)/4294967296};
function leafBall(x,y,c1,c2,c3){
 rect(x+7,y,14,5,c1);rect(x+2,y+5,24,6,c1);rect(x,y+11,29,8,c1);
 rect(x+4,y+17,22,5,c1);rect(x+7,y+3,13,4,c2);rect(x+4,y+9,17,5,c2);
 rect(x+11,y+2,7,2,c3);rect(x+5,y+8,5,3,c3);rect(x+19,y+11,4,3,c3);
}
function sky(){
 const zone=zoneFor(p.x),z=zones[zone],v=Math.round(cam);
 // Muted storybook color bands, not changing every frame.
 rect(0,0,W,58,z.sky);rect(0,58,W,55,z.horizon);rect(0,113,W,G-113,zone===2?'#bec8a1':'#a5c99e');
 rect(234,12,20,20,'#fff0ba');rect(238,8,12,4,'#fff8cd');rect(229,19,31,7,'#fff8ce');
 // Clouds float slowly; each is built from the same 1–3px shapes as the slime.
 const cloudV=Math.round(v*.08+time*1.5);
 for(let i=-1;i<6;i++){
  const wx=i*105-cloudV,x=wx-((Math.floor(wx/690))*690),y=14+(i%3)*15;
  rect(x,y+7,42,8,'#e4edef');rect(x+5,y+3,31,11,'#fff5e4');
  rect(x+11,y,14,7,'#fffaf0');rect(x+1,y+11,45,3,'#d6e5df');
 }
 // Scrolling distant hills have consistent stepped silhouettes.
 const far=Math.round(v*.18);
 for(let i=-2;i<8;i++){
  const wx=i*75-far,top=92+(i%3)*5;
  for(let k=0;k<14;k++){const off=Math.abs(7-k)*3;rect(wx+k*6,top+off,7,G-top-off,zone===1?'#6e9e93':zone===2?'#aaaf90':'#84b9a8')}
 }
 const mid=Math.round(v*.38);
 for(let i=-2;i<12;i++){
  const x=i*56-mid,seed=Math.floor(i*1.7),h=22+(i%3)*4;
  rect(x+16,G-h+10,6,h-10,'#7e7557');rect(x+17,G-h+11,2,h-11,'#a29166');
  const treeBase=zone===1?'#315f62':zone===2?'#6e9977':'#458d74';
  leafBall(x+4,G-h-8,treeBase,zone===1?'#417d77':'#75b58b',zone===1?'#70a49c':'#b1d8a0');
  // alternate little blossom trees and green pines
  if(i%5===2&&zone!==1){rect(x+12,G-h+1,14,3,'#f4bace');rect(x+8,G-h+8,6,3,'#fce0d4')}
 }
 if(zone===2){
  // A small, visible village on the distant hill.
  const x=244-Math.round(v*.14)%47;
  rect(x+2,79,30,35,'#d5b69a');rect(x,79,34,5,'#8e7472');rect(x+6,66,22,13,'#c48b80');
  rect(x+9,58,16,11,'#e9b5a4');rect(x+15,51,4,9,'#e9b5a4');rect(x+13,91,9,21,'#5a5567');
  rect(x+5,88,5,7,'#faf2be');rect(x+24,88,5,7,'#faf2be');
 }
}
function flower(x,y,kind=0){
 rect(x+2,y+4,1,5,'#337d61');rect(x+1,y+6,3,1,'#66af66');
 const petal=kind===0?'#fff5df':kind===1?'#ffc1d4':'#f7e693';
 rect(x+1,y+1,3,5,petal);rect(x,y+2,5,3,petal);rect(x+2,y+2,1,2,'#f0b454');
}
function mushroom(x,y,color='#dc8da4'){
 rect(x+6,y+8,6,7,'#f5ead8');rect(x+3,y+7,12,5,'#c8b6a8');
 rect(x+2,y+4,16,5,color);rect(x+5,y+2,10,4,color);rect(x+7,y+4,3,2,'#fce7dc');rect(x+13,y+5,2,2,'#fce7dc');
}
function ground(){
 const v=Math.round(cam);const start=v,zone=zoneFor(p.x),z=zones[zone];
 rect(0,G,W,H-G,'#7e5a42');
 // World-space pixel columns make the soil texture stable at every camera step.
 for(let x=0;x<W;x++){
  const wx=start+x,zx=zones[zoneFor(wx)];
  if(inPit(wx+.5)){
   rect(x,G,1,H-G,'#4a95ad');
   if((wx+Math.floor(time*5))%20<3)rect(x,G+4,1,2,'#a4e5e1');
  }else{
   rect(x,G-2,1,4,zx.grass);rect(x,G+2,1,3,'#466d4d');
   if(wx%7<2)rect(x,G-3,1,1,'#d6e7aa');
   if(wx%15<4)rect(x,G+10,1,2,'#b98b62');
   if(wx%22>17)rect(x,G+23,1,2,'#5f483e');
  }
 }
 // Repeated 8px world tiles instead of 5px screen strips.
 for(let wx=Math.floor(v/8)*8-8;wx<v+W+8;wx+=8){
  const x=wx-v;if(inPit(wx+4))continue;
  if(hash(wx/8)<.33){rect(x+3,G+14,3,2,'#b99068');rect(x+5,G+16,1,1,'#e0b985')}
  if(hash(wx/8+97)<.27){rect(x+2,G+29,3,2,'#60483f')}
  if(hash(wx/8+36)<.19){rect(x+1,G+5,2,1,'#c69b70')}
 }
 // World-anchored decorative plants and friendly mushrooms.
 for(const item of flowers){const x=Math.round(item[0]-v);if(x<-12||x>W+12||inPit(item[0]))continue;flower(x,G-11,item[1])}
 for(const o of obstacles){const x=Math.round(o.x-v);if(x<-30||x>W+30)continue;
  if(o.kind==='stump'){
   rect(x+1,G-14,12,14,'#6a4d40');rect(x+3,G-12,9,12,'#ac7652');rect(x,G-16,14,5,'#e7bb82');rect(x+3,G-15,8,3,'#aa8058');
   rect(x+7,G-13,2,3,'#f4d39c');rect(x+4,G-8,2,7,'#d69b6b');
  }else if(o.kind==='stone'){
   rect(x+1,G-7,14,7,'#586b75');rect(x+4,G-11,9,6,'#84999b');rect(x+6,G-10,6,4,'#c8cfb2');rect(x+2,G-3,12,2,'#51606a');
  }else{
   rect(x+1,G-7,17,7,'#397a59');rect(x+2,G-13,15,7,'#4c9b69');rect(x+5,G-19,8,8,'#83bd80');
   flower(x+6,G-22,1);rect(x+13,G-13,3,3,'#bad5a1');
  }
 }
 if(zone!==2){
  for(let n=Math.floor(v/180)*180;n<v+W+180;n+=180){const x=n+75-v;if(x<-20||x>W+20||inPit(n+75))continue;
   if(zone===1)mushroom(x,G-16,'#e991a2');else {rect(x+7,G-13,3,12,'#9b7054');rect(x+2,G-16,12,5,'#6eaf76');rect(x+5,G-20,6,5,'#93c898')}
  }
 }
 if(END-v<W+55){
  const x=Math.round(END-30-v);
  // Cozy cottage door, glowing lantern and flowers at the goal.
  rect(x+1,G-33,35,33,'#e5c7a0');rect(x-2,G-38,41,6,'#855975');
  rect(x+3,G-43,32,7,'#a97785');rect(x+9,G-49,19,7,'#c59ba1');
  rect(x+11,G-23,14,23,'#725c62');rect(x+14,G-20,8,20,'#574b63');
  rect(x+2,G-22,6,9,'#ffe8a4');rect(x+28,G-22,6,9,'#ffe8a4');
  flower(x-8,G-10,1);flower(x+40,G-10,2);text('おかえり！',x-16,G-55,'#fff5c3',10);
 }
}
function coinDraw(x,y,t){
 const v=Math.round(cam), bob=Math.round(Math.sin(t*4+x*.035)*1.5),xx=Math.round(x-v),yy=Math.round(y+bob);
 rect(xx-4,yy-4,9,10,'#92613c');rect(xx-3,yy-5,7,10,'#f6c35c');
 rect(xx-2,yy-4,5,8,'#ffdb83');rect(xx-1,yy-3,3,6,'#eeb657');
 // Tiny pi engraving on the pickup coin, consistent with the main game's currency.
 rect(xx-2,yy-2,5,1,'#fff6c9');rect(xx-1,yy-1,1,4,'#fff6c9');rect(xx+2,yy-1,1,4,'#fff6c9');
 if((Math.floor(t*2)+Math.floor(x/10))%5===0){rect(xx+6,yy-4,2,2,'#fffbd2');rect(xx+7,yy-6,1,5,'#fffbd2')}
}
function slimeDraw(){
 const x=Math.round(p.x-cam),y=Math.round(p.y),nearGround=p.y+PH>=G-1,
  squash=nearGround?(1+Math.sin(time*8)*.045):p.vy<-30?1.12:p.vy>65?.88:1;
 ctx.save();ctx.translate(x+PW/2,y+PH);ctx.scale(1,Math.max(.82,Math.min(1.15,squash)));ctx.translate(-PW/2,-PH);
 if(invuln>0&&Math.floor(time*12)%2){ctx.restore();return}
 // Four blue shades, navy 1px outline, readable face and transparent droplet highlight.
 const wiggle=nearGround?Math.round(Math.sin(time*6)):(Math.round(Math.sin(time*10)*1));
 rect(5,0+wiggle,8,5,'#214568');rect(4,3+wiggle,10,4,'#214568');
 rect(2,7,14,8,'#244d75');rect(1,10,16,6,'#244d75');rect(3,14,12,3,'#244d75');
 rect(5,2+wiggle,8,6,'#329cc3');rect(3,7,13,7,'#3396bf');rect(2,11,14,4,'#3396bf');
 rect(4,9,12,6,'#69d3e6');rect(5,4+wiggle,8,7,'#64c9df');rect(8,2+wiggle,4,6,'#8be6f0');
 rect(7,4+wiggle,3,2,'#d7ffff');rect(5,7,3,2,'#c4f9f1');rect(3,13,3,1,'#97e5e8');
 rect(4,12,3,2,'#ed9eb6');rect(13,12,3,2,'#ef9bb1');
 rect(6,10,2,3,'#19304f');rect(12,10,2,3,'#19304f');
 rect(7,10,1,1,'#fffaf2');rect(13,10,1,1,'#fffaf2');
 rect(9,13,3,1,'#19304f');rect(10,14,2,1,'#19304f');
 ctx.restore();
}
function draw(){sky();ground();for(const c of coins)if(!c.got)coinDraw(c.x,c.y,time);slimeDraw();for(const s of sparkles)rect(Math.round(s.x-cam),Math.round(s.y),2,2,s.color);if(state==='ready')text('おさんぽの準備中...',85,91);}
function tick(t){if(state!=='running')return;const dt=Math.min(.033,last?(t-last)/1000:.016);last=t;update(dt);draw();if(state==='running')raf=requestAnimationFrame(tick)}
refreshWallet();coins=positions.map((x,i)=>({x,y:G-26-(i%3===0?16:0),got:false}));updateHud();draw();
})();

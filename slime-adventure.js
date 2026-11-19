(()=>{'use strict';
const $=id=>document.getElementById(id),cv=$('game'),ctx=cv.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
const W=480,H=270,G=207,PROFILE='mathspeed-v4-profile',MAX_PLAYS=3,MAX_DAILY=500;
const slime=new Image();slime.src='./assets/avatars/e0.webp';slime.onload=()=>{if(mode!=='playing')draw()};
const colors=[
 {name:'はじまりの草原',sky:['#88c9f2','#d6f5e1'],hills:'#6dbb9c',back:'#509e8a',leaf:'#458d6f',light:'#8ecb88',soil:'#916b50'},
 {name:'こもれびの森',sky:['#82bba8','#d5e8b2'],hills:'#5b9e89',back:'#3d8170',leaf:'#35745b',light:'#79ba78',soil:'#72594b'},
 {name:'数の遺跡',sky:['#9cb1d5','#e4c9b4'],hills:'#898db0',back:'#6b7294',leaf:'#59847c',light:'#98bd92',soil:'#76616c'},
 {name:'星の夜',sky:['#253d79','#686caf'],hills:'#455c99',back:'#304477',leaf:'#345974',light:'#6696a3',soil:'#504761'}
];
let mode='ready',world=70,py=G,vy=0,cam=0,seconds=0,last=0,frame=0,hearts=3,inv=0,falling=false,pressed=false,hold=0,items=[],loot=[],particles=[],spawnAt=560,seed=333,picked=0,meters=0,recordMeters=0,runId='',runFinished=false,muted=false,ac=null,musicInterval=null,melody=0;
function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
function rint(a,b){return Math.floor(a+rng()*(b-a+1))}
function hash(n){let x=(n|0);x=Math.imul(x^(x>>>16),2246822507);x=Math.imul(x^(x>>>13),3266489909);return ((x^(x>>>16))>>>0)/4294967296}
function dateJP(){return new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'})}
function read(){try{return JSON.parse(localStorage.getItem(PROFILE)||'{}')||{}}catch{return {}}}
function write(p){try{localStorage.setItem(PROFILE,JSON.stringify(p));return true}catch{return false}}
function day(p){const d=dateJP();if(!p.slimeDaily||p.slimeDaily.date!==d)p.slimeDaily={date:d,plays:0,earned:0};if(!p.miniGameDaily||p.miniGameDaily.date!==d)p.miniGameDaily={date:d,earned:0};return p.slimeDaily}
function wallet(){const p=read(),d=day(p),common=p.miniGameDaily;$('wallet').textContent='🪙 '+Math.max(0,Math.floor(Number(p.coins)||0)).toLocaleString('ja-JP')+'枚';$('attempts').textContent=Math.max(0,MAX_PLAYS-d.plays)+' / 3 回';$('daily').textContent=Math.max(0,Math.floor(common.earned||0))+' / 500';$('best').textContent=(p.slimeBestMeters||0).toLocaleString('ja-JP')+' m';$('pickups').textContent=picked+' 枚';}
function tone(freq,dur=.11,volume=.018,kind='triangle',delay=0){if(muted)return;try{if(!ac)ac=new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type=kind;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(volume,t+.014);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+dur+.02)}catch{}}
function fx(kind){const seq={start:[392,494,587],jump:[523,680],coin:[790,1050],hit:[280,200],fall:[410,295,195],end:[392,350,294],best:[523,659,784,1047]};(seq[kind]||[]).forEach((f,i)=>tone(f,.14,.027,'triangle',i*.07))}
const notes=[392,440,494,587,494,440,392,330,349,392,440,523,587,523,440,392,392,494,587,659,587,523,494,440,349,392,440,523,494,392,330,349];
function musicOff(){if(musicInterval){clearInterval(musicInterval);musicInterval=null}}
function musicOn(){musicOff();if(muted||mode!=='playing')return;musicInterval=setInterval(()=>{if(mode!=='playing'||document.hidden)return;const i=melody++%notes.length;tone(notes[i],.18,.008,'triangle');if(i%4===0)tone(notes[i]/2,.24,.004,'sine')},225)}
function show(title,msg,reward,note,button){$('overlayTitle').textContent=title;$('overlayText').textContent=msg;$('overlayReward').textContent=reward;$('overlayNote').textContent=note;$('start').textContent=button;$('overlay').hidden=false;wallet()}
function showReady(){mode='ready';const p=read(),d=day(p),left=Math.max(0,3-d.plays);$('jump').disabled=true;$('pause').disabled=true;const locked=left===0;$('start').disabled=locked;show(locked?'今日の冒険はおしまい！':'計算スライムの冒険',locked?'今日の3回は使い切ったよ。明日またチャレンジしてね！':'本編の黄緑色の計算スライムが主人公！\nジャンプで障害物をよけて、どこまでも遠くへ進もう。',locked?'自己ベスト '+(p.slimeBestMeters||0)+' m':'拾ったコイン + 100mごとに12枚','今日の残り '+left+' 回',locked?'明日のお楽しみ':'▶ 冒険に出発！');}
function emit(x,y,col,n=6){for(let i=0;i<n;i++)particles.push({x,y,vx:(rng()-.5)*95,vy:-rng()*80-20,life:.35+rng()*.45,col})}
function generate(){while(spawnAt<world+W+520){const difficulty=Math.min(1,spawnAt/(15*1150)),gap=Math.round(245-95*difficulty+rint(-24,25));spawnAt+=Math.max(130,gap);const type=rng(),hazard={x:spawnAt,kind:'log',w:28,h:26};if(type<.24){hazard.kind='pit';hazard.w=Math.round(40+difficulty*21+rint(0,13));hazard.h=0}else if(type<.52){hazard.kind='log';hazard.w=30;hazard.h=25}else if(type<.8){hazard.kind='stone';hazard.w=27;hazard.h=23}else{hazard.kind='mushroom';hazard.w=28;hazard.h=28}items.push(hazard);
const base=spawnAt-gap+35,count=rint(3,6);for(let j=0;j<count;j++){const x=base+j*24;if(x>hazard.x-47&&x<hazard.x+hazard.w+28)continue;loot.push({x,y:G-35-(j%3===0?27:0),got:false})}
}}
function start(){if(mode==='playing')return;const p=read(),d=day(p);if(d.plays>=3){showReady();return}d.plays++;if(!write(p)){show('保存エラー','この端末に挑戦回数を保存できません。ブラウザの設定を確認してね。','','コインは変更していません','戻る');return}
world=70;py=G;vy=0;cam=0;seconds=0;last=0;hearts=3;inv=0;falling=false;pressed=false;hold=0;picked=0;meters=0;items=[];loot=[];particles=[];spawnAt=550;seed=((Date.now()^Math.floor(Math.random()*1e9))>>>0)||333;runId='slime111-'+Date.now()+'-'+Math.random().toString(36).slice(2);runFinished=false;melody=0;mode='playing';$('overlay').hidden=true;$('jump').disabled=false;$('pause').disabled=false;generate();wallet();musicOn();fx('start');cancelAnimationFrame(frame);frame=requestAnimationFrame(loop)}
function award(){const p=read(),d=day(p),common=p.miniGameDaily;recordMeters=Math.max(0,Math.floor(meters));const distanceCoins=Math.floor(recordMeters/100)*12,raw=distanceCoins+picked;if(!Array.isArray(p.slimeRunIds))p.slimeRunIds=[];if(p.slimeRunIds.includes(runId))return {earned:0,raw,distanceCoins,persisted:true};const remaining=Math.max(0,MAX_DAILY-Math.floor(common.earned||0)),earned=Math.min(remaining,raw);p.coins=Math.max(0,Math.floor(Number(p.coins)||0))+earned;d.earned=(d.earned||0)+earned;common.earned=(common.earned||0)+earned;p.slimeBestMeters=Math.max(p.slimeBestMeters||0,recordMeters);p.slimeTotalMeters=Math.max(0,p.slimeTotalMeters||0)+recordMeters;p.slimeRunIds=[...p.slimeRunIds.slice(-29),runId];const saved=write(p);return {earned:saved?earned:0,raw,distanceCoins,persisted:saved}}
function finish(reason){if(mode!=='playing'||runFinished)return;runFinished=true;mode='ended';musicOff();cancelAnimationFrame(frame);$('jump').disabled=true;$('pause').disabled=true;const r=award();const p=read(),d=day(p),again=d.plays<3;fx('end');const main=`${recordMeters.toLocaleString('ja-JP')}m 到達！\n拾ったコイン ${picked}枚 + 距離ボーナス ${r.distanceCoins}枚`;show(reason==='pit'?'ぽちゃん！また明日…':reason==='hp'?'ふにゃ〜、おつかれ！':'おさんぽ終了！',main,r.persisted?'🪙 +'+r.earned+' マスコイン':'保存できませんでした',`自己ベスト ${p.slimeBestMeters||0}m ・ 今日の残り ${Math.max(0,3-d.plays)}回`,again?'↻ もう一度チャレンジ':'本日の挑戦終了');if(!again)$('start').disabled=true;}
function pause(){if(mode!=='playing')return;mode='paused';musicOff();cancelAnimationFrame(frame);$('jump').disabled=true;$('pause').disabled=true;show('ちょっと休憩','中断している間も挑戦回数は使われたままだよ。\n続きから再開しよう！','ここまで '+Math.floor(meters)+' m','残りの挑戦回数は変更されません','▶ 続きを遊ぶ')}
function resume(){mode='playing';last=0;$('overlay').hidden=true;$('jump').disabled=false;$('pause').disabled=false;musicOn();frame=requestAnimationFrame(loop)}
function jump(){if(mode!=='playing'||falling)return;pressed=true;if(Math.abs(py-G)<2){vy=-325;hold=.17;fx('jump');emit(world,G-3,'#e5f3c0',4)}}function release(){pressed=false}
$('start').addEventListener('click',()=>{if(mode==='paused'){resume();return}if(mode==='ended'||mode==='ready')start()});$('pause').addEventListener('click',pause);$('sound').addEventListener('click',()=>{muted=!muted;$('sound').textContent=muted?'🔇 音 OFF':'🔊 音 ON';if(muted)musicOff();else musicOn()});for(const el of [cv,$('jump')]){el.addEventListener('pointerdown',e=>{e.preventDefault();jump()});el.addEventListener('pointerup',e=>{e.preventDefault();release()});el.addEventListener('pointercancel',release)}
window.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();if(!e.repeat)jump()}if(e.code==='Escape'&&mode==='playing')pause()});window.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='ArrowUp')release()});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
function inPit(x){return items.some(o=>o.kind==='pit'&&x>o.x+2&&x<o.x+o.w-2)}
function simulate(dt){seconds+=dt;inv=Math.max(0,inv-dt);const speed=116+Math.min(70,meters*.07);world+=speed*dt;meters=Math.max(0,(world-70)/14.6);cam=Math.max(0,world-122);
if(pressed&&hold>0&&vy<0){vy-=315*dt;hold-=dt}else hold=0;vy+=890*dt;py+=vy*dt;
if(!falling&&inPit(world)&&py>G+4){falling=true;fx('fall')}
if(!falling&&!inPit(world)&&py>=G){py=G;vy=0}
if(falling&&py>H+45){finish('pit');return}
for(const o of items){if(o.kind==='pit'||falling||inv>0)continue;if(world+21>o.x&&world-21<o.x+o.w&&py>G-o.h+6){hearts--;inv=1.25;vy=-142;fx('hit');emit(world,py-20,'#ffe2a9',12);if(hearts<=0){finish('hp');return}break}}
for(const c of loot){if(c.got||falling)continue;if(Math.abs(c.x-world)<27&&Math.abs(c.y-(py-23))<31){c.got=true;picked++;fx('coin');emit(c.x,c.y,'#ffed8c',9)}}
for(const part of particles){part.life-=dt;part.x+=part.vx*dt;part.y+=part.vy*dt;part.vy+=95*dt}particles=particles.filter(x=>x.life>0);
if(items.length>50)items=items.filter(x=>x.x>cam-95);if(loot.length>200)loot=loot.filter(x=>!x.got&&x.x>cam-90);generate();
$('distance').textContent=Math.floor(meters).toLocaleString('ja-JP')+' m';$('hp').textContent='♥ '.repeat(hearts)+'♡ '.repeat(3-hearts);$('pickups').textContent=picked+' 枚';}
function box(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h))}
function txt(str,x,y,size=11,c='#fff9df'){ctx.font=`bold ${size}px monospace`;ctx.fillStyle='#1e4059';ctx.fillText(str,Math.round(x)+1,Math.round(y)+1);ctx.fillStyle=c;ctx.fillText(str,Math.round(x),Math.round(y))}
function phase(){return Math.floor(meters/260)%4}
function drawBackdrop(){const t=colors[phase()],v=cam;
const gr=ctx.createLinearGradient(0,0,0,G);gr.addColorStop(0,t.sky[0]);gr.addColorStop(1,t.sky[1]);ctx.fillStyle=gr;ctx.fillRect(0,0,W,G);
if(phase()===3){for(let i=0;i<46;i++){const x=(i*81+19)%W,y=(i*29+11)%130,r=(seconds*2+i*7)%11>6?2:1;box(x,y,r,r,'#f7ebd1')}}else{box(347,31,36,35,phase()===2?'#ffe4d7':'#fff1b3');box(343,42,45,12,'#fff8d8')}
// Cloud layer: every shape shares the same small-pixel language as the foreground.
for(let i=-1;i<9;i++){const x=i*126-Math.round((v*.075)%126),y=30+(i%3)*24;box(x+8,y+7,73,13,'#d7e8e4');box(x+21,y+1,51,16,'#f9f0dc');box(x+36,y-5,25,8,'#fff8e9');box(x+1,y+14,78,5,'#c3dfe1')}
for(let i=-1;i<14;i++){const x=i*75-Math.round((v*.16)%75),tip=115+(i%4)*11;ctx.beginPath();ctx.moveTo(x-26,G);ctx.lineTo(x+36,tip);ctx.lineTo(x+103,G);ctx.closePath();ctx.fillStyle=t.hills;ctx.fill();box(x+26,tip+19,23,6,t.light)}
for(let i=-1;i<13;i++){const x=i*91-Math.round((v*.33)%91),treeHeight=53+(i%4)*9;box(x+27,G-treeHeight+18,9,treeHeight,'#735d55');box(x+30,G-treeHeight+18,3,treeHeight,'#9c7958');if(phase()===2&&i%3===0){box(x+8,G-treeHeight+7,53,22,'#b4a7a4');box(x+18,G-treeHeight-12,31,25,'#d2b9b0');box(x+30,G-treeHeight-18,7,13,'#e9d7c8')}else{box(x+5,G-treeHeight+13,55,20,t.leaf);box(x+13,G-treeHeight+4,41,25,t.back);box(x+21,G-treeHeight-5,27,17,t.light);box(x+30,G-treeHeight-7,14,7,'#cae2a6');box(x+10,G-treeHeight+16,9,7,t.light)}}
if(phase()===3){box(0,G-12,W,10,'#6581a1');for(let i=0;i<18;i++){const x=(i*93-Math.round(v*.28))%W;if(x>=0)box(x,110+(i%3)*26,3,3,'#bce0e4')}}
}
function drawGround(){const v=Math.floor(cam),c=colors[phase()];box(0,G-1,W,H-G+1,c.soil);box(0,G+3,W,H-G,'#5a484a');for(let i=-1;i<Math.ceil(W/19)+2;i++){const wx=Math.floor(v/19)*19+i*19,x=wx-v,hasPit=inPit(wx+9);if(hasPit)continue;box(x,G-4,19,8,c.light);box(x,G+4,19,4,'#40785c');if(hash(wx/19)>.34){box(x+4,G+15,8,4,'#99755d');box(x+6,G+18,3,4,'#ae8a6c')}if(hash(wx/19+991)>.56){box(x+12,G+33,5,4,'#bd9784');box(x+2,G+47,8,3,'#86605a')}}
for(const pit of items){if(pit.kind!=='pit')continue;const x=Math.floor(pit.x-v);if(x>W+15||x+pit.w<0)continue;box(x-1,G-4,pit.w+2,H-G+5,'#1f4566');box(x+2,G+34,pit.w-4,3,'#345c87');box(x+5,G+55,pit.w-12,2,'#4a6792');box(x-3,G-9,5,15,'#405e58');box(x+pit.w-1,G-9,5,15,'#405e58')}
for(let i=-1;i<Math.ceil(W/67)+2;i++){const n=Math.floor(v/67)+i,wx=n*67+13,x=wx-v;if(inPit(wx))continue;if(hash(n+1)>.45){box(x,G-13,4,10,'#398658');box(x+3,G-16,3,9,'#78a85e');box(x-2,G-20,8,6,n%3===0?'#ffd3e8':'#fff0bc');box(x,G-18,4,3,'#f3a751');box(x+12,G-8,4,5,'#a9d47b')}else{box(x,G-19,5,16,'#53764e');box(x-8,G-27,21,14,'#468663');box(x-4,G-31,15,10,'#75a866');box(x,G-33,6,4,'#aed88c')}}
for(const ob of items){if(ob.kind==='pit')continue;const x=Math.floor(ob.x-v);if(x<-40||x>W+40)continue;const y=G;
if(ob.kind==='log'){box(x,y-25,30,24,'#654f48');box(x+4,y-27,22,7,'#cba279');box(x+8,y-25,14,5,'#f0d6a2');box(x+4,y-14,22,10,'#956b57');box(x+11,y-16,10,5,'#b68d66');box(x+13,y-22,5,4,'#795c50')}
if(ob.kind==='stone'){box(x+4,y-23,19,22,'#677a82');box(x+1,y-15,27,14,'#798c8e');box(x+7,y-21,14,10,'#b7c6be');box(x+3,y-6,22,4,'#526970');box(x+11,y-18,7,3,'#e3e4cf')}
if(ob.kind==='mushroom'){box(x+10,y-18,9,18,'#e9d9ae');box(x+7,y-22,15,6,'#a7b79a');box(x+1,y-28,27,13,'#bc6684');box(x+5,y-31,19,9,'#e88f9c');box(x+8,y-28,5,4,'#fff1da');box(x+20,y-24,3,5,'#ffefc9')}}
}
function drawCoins(){for(const c of loot){if(c.got)continue;const x=Math.floor(c.x-cam),y=Math.round(c.y+Math.sin(seconds*5+c.x)*2);if(x<0||x>W+10)continue;const spin=Math.abs(Math.sin(seconds*3+c.x));const ww=Math.max(4,Math.round(14*spin));box(x-ww/2-1,y-9,ww+2,18,'#815d39');box(x-ww/2,y-8,ww,16,'#eab85d');box(x-ww/2+2,y-6,Math.max(1,ww-4),12,'#ffdf79');if(ww>8){txt('π',x-5,y+4,11,'#96612b');box(x+5,y-5,2,2,'#fffbc5')}}}
function drawPlayer(){const x=Math.floor(world-cam)-35,y=Math.floor(py)-42,wiggle=(mode==='playing'&&Math.abs(py-G)<1)?1+Math.sin(seconds*10)*.035:1;ctx.save();if(inv>0&&Math.floor(seconds*13)%2){ctx.restore();return}ctx.translate(x+35,y+42);if(falling)ctx.rotate(Math.min(.75,(py-G)/110));ctx.scale(1,wiggle);if(slime.complete&&slime.naturalWidth){ctx.drawImage(slime,7,39,146,81,-35,-42,70,42)}else{box(-30,-27,60,26,'#80cf4c');box(-24,-34,48,20,'#a9ed6d');box(-17,-19,5,5,'#1c573b');box(12,-19,5,5,'#1c573b')}ctx.restore();if(Math.abs(py-G)<1&&!falling)box(x+10,G+5,46,3,'#2c5a4c66')}
function drawParticles(){for(const p of particles){const x=p.x-cam;if(x<0||x>W)continue;box(x,p.y,3,3,p.col)}}
function draw(){drawBackdrop();drawGround();drawCoins();drawPlayer();drawParticles();if(mode==='playing'&&meters>=260){txt(colors[phase()].name,15,H-15,11,phase()===3?'#fff1a8':'#fff0b3')}}
function loop(t){if(mode!=='playing')return;const dt=Math.min(.033,last?(t-last)/1000:.016);last=t;simulate(dt);draw();if(mode==='playing')frame=requestAnimationFrame(loop)}
wallet();showReady();draw();
})();

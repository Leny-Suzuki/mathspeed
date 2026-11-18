(()=>{'use strict';
const $=id=>document.getElementById(id),CV=$('game'),ctx=CV.getContext('2d',{alpha:false}),W=960,H=540,GROUND=410,HEIGHT=83,WIDTH=60,TOTAL=11600,SPEED=5.8,GRAVITY=.8,JUMP=-17.3,KEY='mathspeed-v4-profile';
let p={x:140,y:GROUND-HEIGHT,vy:0,onGround:true,dead:false},mode='ready',cam=0,coins=[],enemies=[],gaps=[],taken=0,stomps=0,frames=0,last=0,frameID=0,runId='',character='s0',sprite=null,paint=[];
let lastWallet=0;
function getProfile(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return {}}}
function saveProfile(obj){try{localStorage.setItem(KEY,JSON.stringify(obj));return true}catch{return false}}
function wallet(){lastWallet=Math.max(0,Math.floor(Number(getProfile().coins)||0));$('wallet').textContent='🪙 '+lastWallet+' マスコイン';return lastWallet}
function loadAvatar(){const pr=getProfile();let id=String(pr.avatar||'s0');if(!/^(?:[se][0-9](?:_[12])?|g[0-2])$/.test(id))id='s0';character=id;const img=new Image();img.onload=()=>{sprite=img;draw()};img.onerror=()=>{if(id!=='s0'){character='s0';loadFallback()}else{sprite=null;draw()}};img.src='./assets/avatars/'+id+'.'+(id.startsWith('g')?'png':'webp');const j=(/^s([0-9])/.exec(id)||[])[1],base=Number(j),labels=['剣士','魔法使い','弓使い','忍者','モンク','ナイト','ドラゴン使い','獣人','ロボット','アルケミスト'];$('activeAvatar').textContent='装備中：'+(id.startsWith('s')?(labels[base]||'勇者'):id.startsWith('g')?'限定アバター':'仲間アバター');$('panelAvatar').src=img.src}
function loadFallback(){const img=new Image();img.onload=()=>{sprite=img;draw()};img.src='./assets/avatars/s0.webp';$('panelAvatar').src=img.src}
function rnd(seed){let v=seed>>>0;return ()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296}}
function makeLevel(){const rng=rnd(20261119);gaps=[];for(let x=1850;x<TOTAL-650;x+=1320){gaps.push({x:x+Math.floor(rng()*150),w:117+Math.floor(rng()*30)})}const nearGap=(x,dist)=>gaps.some(g=>x>g.x-dist&&x<g.x+g.w+dist);
 coins=[];enemies=[];for(let x=380;x<TOTAL-200;x+=250){if(nearGap(x,36))continue;coins.push({x:x+Math.floor(rng()*30),y:GROUND-52-((Math.floor(x/250)%5===0)?85:0),got:false});if(Math.floor(x/250)%5===0&&!nearGap(x+85,15))coins.push({x:x+85,y:GROUND-115,got:false})}
 for(let x=880;x<TOTAL-350;x+=720){const ex=x+Math.floor(rng()*125);if(!nearGap(ex,140))enemies.push({x:ex,alive:true})}
}
function inGap(x){return gaps.some(g=>x>g.x&&x<g.x+g.w)}
function reset(){cancelAnimationFrame(frameID);p={x:140,y:GROUND-HEIGHT,vy:0,onGround:true,dead:false};mode='playing';cam=0;frames=0;last=0;taken=0;stomps=0;runId=String(Date.now())+'-'+Math.random().toString(36).slice(2);makeLevel();$('panelOverlay').hidden=true;$('jump').disabled=false;hud();frameID=requestAnimationFrame(tick)}
function hud(){$('hudCoin').textContent='🪙 拾ったコイン '+taken;$('hudEnemy').textContent='⚔ 倒した敵 '+stomps;$('hudProgress').textContent='進行 '+Math.min(100,Math.round((p.x/TOTAL)*100))+'%'}
function jump(){if(mode==='ready')return;if(mode!=='playing')return;if(p.onGround){p.vy=JUMP;p.onGround=false;chirp(540,.06)}}
let ac=null;function chirp(freq,duration){try{if(!ac)ac=new (window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),v=ac.createGain();o.type='triangle';o.frequency.value=freq;v.gain.value=.035;o.connect(v);v.connect(ac.destination);o.start();o.stop(ac.currentTime+duration)}catch{}}
function tick(time){if(mode!=='playing')return;const dt=Math.min(2.2,Math.max(.6,(time-(last||time))/16.666));last=time;update(dt);draw();if(mode==='playing')frameID=requestAnimationFrame(tick)}
function update(dt){frames+=dt;p.x+=SPEED*dt;const priorBottom=p.y+HEIGHT;p.vy+=GRAVITY*dt;p.y+=p.vy*dt;
 if(!inGap(p.x+WIDTH*.5)&&p.y+HEIGHT>=GROUND&&p.vy>=0&&priorBottom<=GROUND+18*dt){p.y=GROUND-HEIGHT;p.vy=0;p.onGround=true}else if(p.onGround&&inGap(p.x+WIDTH*.5)){p.onGround=false;p.vy=Math.max(0,p.vy)}
 if(!p.onGround&&p.y+HEIGHT>=GROUND&&p.vy>=0&&!inGap(p.x+WIDTH*.5)){p.y=GROUND-HEIGHT;p.vy=0;p.onGround=true}
 cam=Math.max(0,p.x-190);
 for(const c of coins){if(!c.got&&Math.abs(c.x-(p.x+WIDTH/2))<42&&Math.abs(c.y-(p.y+HEIGHT*.47))<57){c.got=true;taken++;chirp(850+Math.min(500,taken*15),.07)}}
 for(const e of enemies){if(!e.alive||Math.abs(e.x-(p.x+WIDTH*.5))>49)continue;const top=GROUND-52;const overlap=p.y+HEIGHT>top+4&&p.y<GROUND-6;if(!overlap)continue;
  if(p.vy>0&&priorBottom<=top+20*dt){e.alive=false;stomps++;p.y=top-HEIGHT;p.vy=-12.7;p.onGround=false;chirp(230,.11)}else{end(false);return}
 }
 if(p.y>H+150){end(false);return}if(p.x>=TOTAL){end(true);return}if(Math.floor(frames)%6===0)hud();
}
function grant(value,success){const a=getProfile(),records=Array.isArray(a.coinAdventureRuns)?a.coinAdventureRuns.slice(-79):[];if(records.includes(runId))return {credited:0,wallet:Math.floor(Number(a.coins)||0),ok:true};
 const current=Math.max(0,Math.floor(Number(a.coins)||0));a.coins=current+value;records.push(runId);a.coinAdventureRuns=records;a.coinAdventureBest=Math.max(Number(a.coinAdventureBest)||0,success?1:0);const ok=saveProfile(a);return {credited:ok?value:0,wallet:ok?a.coins:current,ok}}
function end(success){if(mode!=='playing')return;mode=success?'clear':'failed';cancelAnimationFrame(frameID);hud();$('jump').disabled=true;const base=taken*5+stomps*10,earned=success?base+50:Math.floor(base/2);const granted=grant(earned,success);wallet();$('panelOverlay').hidden=false;$('panelTitle').textContent=success?'🏆 ゴール！ おめでとう！':'💥 ゲームオーバー';$('panelBody').innerHTML='拾ったコイン '+taken+'枚（'+taken*5+'）<br>倒したスライム '+stomps+'体（'+stomps*10+'）'+(success?'<br>ゴールボーナス +50':'<br>失敗したので半分を持ち帰るよ');$('panelReward').textContent=granted.ok?'🪙 +'+granted.credited+' マスコイン獲得！':'⚠️ 保存できなかったよ。端末の保存設定を確認してね。';$('start').textContent='🔄 もう一度冒険';if(success)chirp(1150,.2);draw()}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function hill(cx,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(cx-r,H);ctx.quadraticCurveTo(cx-r*.6,290,cx,260+r*.07);ctx.quadraticCurveTo(cx+r*.65,290,cx+r,H);ctx.fill()}
function drawBG(){const sky=ctx.createLinearGradient(0,0,0,GROUND);sky.addColorStop(0,'#3d83cf');sky.addColorStop(.5,'#8ad7fd');sky.addColorStop(1,'#dbf3ff');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);rect(792,68,70,70,'#f9e5a1');rect(802,78,50,50,'#fff2c7');for(let i=0;i<11;i++){let x=((i*196-cam*.19)%(W+300)+(W+300))%(W+300)-80,y=45+(i%3)*45;rect(x,y,95,21,'#f7ffffc9');rect(x+12,y-12,55,22,'#f7ffffc9')}
 for(let i=0;i<9;i++){let x=((i*235-cam*.11)%(W+450)+(W+450))%(W+450)-230;hill(x,210+i%3*28,i%2?'#91bfc0':'#83adb8')}
 for(let i=0;i<13;i++){let x=((i*151-cam*.33)%(W+200)+(W+200))%(W+200)-100;hill(x,150,i%2?'#4fae8c':'#61b695')}
 for(let i=0;i<23;i++){let x=((i*132-cam*.53)%(W+150)+(W+150))%(W+150)-80;rect(x,318,13,86,'#468c68');rect(x-25,301,64,27,'#2b9864');rect(x-12,283,35,26,'#37aa74')}
}
function drawGround(){for(let x=Math.floor(cam/48)*48;x<cam+W+48;x+=48){const cx=x-cam;if(inGap(x+24)){rect(cx,GROUND+32,48,H-GROUND,'#316d95');continue;}rect(cx,GROUND,49,15,'#8bd065');rect(cx,GROUND+14,49,H-GROUND-14,'#a15c34');rect(cx,GROUND+28,48,8,'#87502d');rect(cx+7,GROUND+51,12,8,'#c07b41');rect(cx+24,GROUND+87,8,8,'#734525')}
 for(const g of gaps){if(g.x-cam>W+80||g.x+g.w-cam<0)continue;rect(g.x-cam,GROUND+1,g.w,H-GROUND,'#357b9c');rect(g.x-cam,GROUND+5,g.w,10,'#c7e8ff55')}
}
function drawCoins(){coins.forEach(c=>{if(c.got||Math.abs(c.x-cam-W/2)>W/2+45)return;const x=Math.round(c.x-cam),y=Math.round(c.y+Math.sin(frames*.1+c.x)*3);ctx.fillStyle='#8f5617';ctx.beginPath();ctx.ellipse(x+2,y+2,13,17,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fbd751';ctx.beginPath();ctx.ellipse(x,y,12,16,0,0,Math.PI*2);ctx.fill();rect(x-3,y-10,6,20,'#fff4a5');rect(x-7,y-3,14,6,'#fff4a5')})}
function drawSlimes(){enemies.forEach(e=>{if(!e.alive||Math.abs(e.x-cam-W/2)>W/2+60)return;const x=e.x-cam,y=GROUND-50+Math.sin(frames*.07+e.x)*2;ctx.fillStyle='#18466c';ctx.beginPath();ctx.ellipse(x+1,y+43,30,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3989cf';ctx.beginPath();ctx.moveTo(x-29,y+41);ctx.quadraticCurveTo(x-35,y+20,x,y-4);ctx.quadraticCurveTo(x+35,y+18,x+29,y+41);ctx.closePath();ctx.fill();rect(x-17,y+24,9,10,'#fff');rect(x+10,y+24,9,10,'#fff');rect(x-14,y+28,4,5,'#162454');rect(x+13,y+28,4,5,'#162454');rect(x-7,y+39,14,3,'#142c57')})}
function drawPlayer(){const x=p.x-cam,y=p.y+(p.onGround?Math.sin(frames*.27)*2:0);rect(x+6,GROUND-7,54,7,'#223a4980');if(sprite&&sprite.complete&&sprite.naturalWidth){ctx.save();ctx.translate(x+WIDTH/2,y+HEIGHT/2);if(!p.onGround)ctx.rotate(-.1);ctx.drawImage(sprite,-WIDTH/2-3,-HEIGHT/2-4,WIDTH+6,HEIGHT+8);ctx.restore()}else{rect(x+13,y+6,39,44,'#f6b57f');rect(x+8,y+52,17,26,'#243f79');rect(x+35,y+52,17,26,'#243f79');rect(x+21,y+24,6,6,'#152442');rect(x+37,y+24,6,6,'#152442')}
}
function drawGoal(){const x=TOTAL-cam;if(x<-100||x>W+100)return;rect(x,GROUND-205,11,205,'#e1c48b');rect(x+11,GROUND-198,99,70,'#d2456e');rect(x+19,GROUND-185,78,12,'#f9e4a0');rect(x+19,GROUND-158,52,12,'#f9e4a0');rect(x-26,GROUND-12,70,12,'#f9df76')}
function draw(){if(!ctx)return;drawBG();drawGround();drawGoal();drawCoins();drawSlimes();drawPlayer();if(mode==='ready'){rect(0,0,960,540,'#09152b10')} }
$('jump').addEventListener('pointerdown',e=>{e.preventDefault();jump()});CV.addEventListener('pointerdown',e=>{if(mode==='playing'){e.preventDefault();jump()}});window.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='ArrowUp'){if(e.repeat)return;e.preventDefault();jump()}});$('start').addEventListener('click',reset);window.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing'){mode='pause';cancelAnimationFrame(frameID);$('jump').disabled=true;$('panelOverlay').hidden=false;$('panelTitle').textContent='⏸ 一時停止';$('panelBody').textContent='画面を離れたので冒険を停止したよ。もう一度始めると新しい冒険になるよ。';$('panelReward').textContent='今回のコインはまだ確定していません';$('start').textContent='▶ 最初から始める'}});window.addEventListener('storage',e=>{if(e.key===KEY){wallet();if(mode==='ready')loadAvatar()}});wallet();loadAvatar();makeLevel();draw();
})();

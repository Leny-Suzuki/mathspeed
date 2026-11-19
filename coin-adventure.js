(()=>{'use strict';
const $=id=>document.getElementById(id),CV=$('game'),ctx=CV.getContext('2d',{alpha:false}),W=960,H=540,GROUND=410,HEIGHT=83,WIDTH=60,TOTAL=11600,SPEED=6.4,GRAVITY=.85,JUMP=-17.3,KEY='mathspeed-v4-profile';
let p={x:140,y:GROUND-HEIGHT,vy:0,onGround:true,dead:false},mode='ready',cam=0,coins=[],enemies=[],gaps=[],taken=0,stomps=0,frames=0,last=0,frameID=0,runId='',character='s0',sprite=null,paint=[];
let lastWallet=0,falling=false,coinFx=[],coinStreak=0,coinStreakFrame=-999;
let soundEnabled=true,musicTimer=0,musicStep=0;
function getProfile(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return {}}}
function saveProfile(obj){try{localStorage.setItem(KEY,JSON.stringify(obj));return true}catch{return false}}
function wallet(){lastWallet=Math.max(0,Math.floor(Number(getProfile().coins)||0));$('wallet').textContent='🪙 '+lastWallet+' マスコイン';return lastWallet}
function loadAvatar(){const pr=getProfile();let id=String(pr.avatar||'s0');if(!/^(?:[se][0-9](?:_[12])?|g[0-5])$/.test(id))id='s0';character=id;const img=new Image();img.onload=()=>{sprite=img;draw()};img.onerror=()=>{if(id!=='s0'){character='s0';loadFallback()}else{sprite=null;draw()}};img.src='./assets/avatars/'+id+'.'+(id.startsWith('g')?'png':'webp');const j=(/^s([0-9])/.exec(id)||[])[1],base=Number(j),labels=['剣士','魔法使い','弓使い','忍者','モンク','ナイト','ドラゴン使い','獣人','ロボット','アルケミスト'];$('activeAvatar').textContent='装備中：'+(id.startsWith('s')?(labels[base]||'勇者'):id.startsWith('g')?'限定アバター':'仲間アバター');$('panelAvatar').src=img.src}
function loadFallback(){const img=new Image();img.onload=()=>{sprite=img;draw()};img.src='./assets/avatars/s0.webp';$('panelAvatar').src=img.src}
function rnd(seed){let v=seed>>>0;return ()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296}}
function makeLevel(){const rng=rnd(20261119);gaps=[];for(let x=1150;x<TOTAL-650;x+=880){gaps.push({x:x+Math.floor(rng()*150),w:155+Math.floor(rng()*38)})}const nearGap=(x,dist)=>gaps.some(g=>x>g.x-dist&&x<g.x+g.w+dist);
 coins=[];enemies=[];for(let x=380;x<TOTAL-200;x+=250){if(nearGap(x,36))continue;coins.push({x:x+Math.floor(rng()*30),y:GROUND-52-((Math.floor(x/250)%5===0)?85:0),got:false});if(Math.floor(x/250)%5===0&&!nearGap(x+85,15))coins.push({x:x+85,y:GROUND-115,got:false})}
 for(let x=720;x<TOTAL-350;x+=510){const ex=x+Math.floor(rng()*125);if(!nearGap(ex,140))enemies.push({x:ex,alive:true})}
}
function inGap(x){return gaps.some(g=>x>g.x&&x<g.x+g.w)}
function reset(){falling=false;coinFx=[];coinStreak=0;coinStreakFrame=-999;startMusic();sfx('start');cancelAnimationFrame(frameID);p={x:140,y:GROUND-HEIGHT,vy:0,onGround:true,dead:false};mode='playing';cam=0;frames=0;last=0;taken=0;stomps=0;runId=String(Date.now())+'-'+Math.random().toString(36).slice(2);makeLevel();$('panelOverlay').hidden=true;$('jump').disabled=false;hud();frameID=requestAnimationFrame(tick)}
function hud(){$('hudCoin').textContent='🪙 拾ったコイン '+taken+(coinStreak>=3&&frames-coinStreakFrame<90?'　✦ '+coinStreak+' COMBO!':'');$('hudEnemy').textContent='⚔ 倒した敵 '+stomps;$('hudProgress').textContent='進行 '+Math.min(100,Math.round((p.x/TOTAL)*100))+'%'}
function jump(){if(mode==='ready')return;if(mode!=='playing'||falling)return;if(p.onGround){p.vy=JUMP;p.onGround=false;sfx('jump')}}
let ac=null;
function audio(){try{if(!ac)ac=new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();return ac}catch{return null}}
function note(freq,duration=.13,volume=.028,type='triangle',delay=0){if(!soundEnabled)return;const a=audio();if(!a)return;const t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+duration+.02)}
function sfx(type){if(!soundEnabled)return;const patterns={jump:[[440,0],[660,.08]],coin:[[880,0],[1320,.07]],stomp:[[270,0],[170,.08]],start:[[440,0],[550,.12],[660,.24]],clear:[[523,0],[659,.12],[784,.24],[1047,.4]],fail:[[440,0],[330,.16],[220,.33]],fall:[[300,0],[230,.14],[160,.28]]};for(const [hz,d] of patterns[type]||[])note(hz,.13,.065,'square',d)}
const melody=[392,494,587,494,440,523,659,523,392,494,587,784,659,587,494,440,349,440,523,440,392,494,587,494,330,392,494,587,523,440,392,330];
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=0}}
function startMusic(){stopMusic();if(!soundEnabled)return;musicStep=0;musicTimer=setInterval(()=>{if(mode!=='playing'||document.hidden)return;const i=musicStep++%melody.length;note(melody[i],.19,.012,'triangle');if(i%4===0)note(melody[i]/2,.29,.011,'sine');if(i%8===4)note(130.81,.09,.008,'square')},230)}
$('soundToggle').addEventListener('click',()=>{soundEnabled=!soundEnabled;$('soundToggle').textContent=soundEnabled?'🔊 BGM ON':'🔇 BGM OFF';if(soundEnabled&&mode==='playing')startMusic();else stopMusic()});
function tick(time){if(mode!=='playing')return;const dt=Math.min(2.2,Math.max(.6,(time-(last||time))/16.666));last=time;update(dt);draw();if(mode==='playing')frameID=requestAnimationFrame(tick)}
function update(dt){frames+=dt;p.x+=(falling?SPEED*.35:SPEED)*dt;const priorBottom=p.y+HEIGHT;p.vy+=GRAVITY*dt;p.y+=p.vy*dt;
 if(!falling&&!inGap(p.x+WIDTH*.5)&&p.y+HEIGHT>=GROUND&&p.vy>=0&&priorBottom<=GROUND+18*dt){p.y=GROUND-HEIGHT;p.vy=0;p.onGround=true}else if(p.onGround&&inGap(p.x+WIDTH*.5)){p.onGround=false;p.vy=Math.max(0,p.vy)}
 if(!falling&&!p.onGround&&p.y+HEIGHT>=GROUND&&p.vy>=0&&!inGap(p.x+WIDTH*.5)&&priorBottom<=GROUND){p.y=GROUND-HEIGHT;p.vy=0;p.onGround=true}
 cam=Math.max(0,p.x-190);
 for(const c of coins){if(falling)break;if(!c.got&&Math.abs(c.x-(p.x+WIDTH/2))<42&&Math.abs(c.y-(p.y+HEIGHT*.47))<57){
   c.got=true;taken++;coinStreak=frames-coinStreakFrame<150?coinStreak+1:1;coinStreakFrame=frames;
   for(let i=0;i<12;i++){const a=i*Math.PI*2/12+(c.x%4)*.33;
     coinFx.push({x:c.x,y:c.y,vx:Math.cos(a)*(1.8+i%3),vy:Math.sin(a)*(1.7+i%3)-.6,life:1.0,hue:i%3});}
   sfx('coin');
  }}
  // Particle physics are visual only and never modify wallet or scoring.
  for(const spark of coinFx){spark.x+=spark.vx*dt;spark.y+=spark.vy*dt;spark.vy+=.055*dt;spark.life-=.035*dt;}
  coinFx=coinFx.filter(q=>q.life>0).slice(-100);
 for(const e of enemies){if(falling)break;if(!e.alive||Math.abs(e.x-(p.x+WIDTH*.5))>49)continue;const top=GROUND-52;const overlap=p.y+HEIGHT>top+4&&p.y<GROUND-6;if(!overlap)continue;
  if(p.vy>0&&priorBottom<=top+20*dt){e.alive=false;stomps++;p.y=top-HEIGHT;p.vy=-12.7;p.onGround=false;sfx('stomp')}else{end(false);return}
 }
 if(!falling&&p.y+HEIGHT>GROUND+18&&inGap(p.x+WIDTH*.5)){falling=true;p.onGround=false;p.vy=Math.max(p.vy,2);sfx('fall')}if(falling){p.onGround=false;if(p.y>H+85){end(false,'fall');return}}if(p.x>=TOTAL){end(true);return}if(Math.floor(frames)%6===0)hud();
}
function grant(value,success){const a=getProfile(),records=Array.isArray(a.coinAdventureRuns)?a.coinAdventureRuns.slice(-79):[];if(records.includes(runId))return {credited:0,wallet:Math.floor(Number(a.coins)||0),ok:true};
 const current=Math.max(0,Math.floor(Number(a.coins)||0));a.coins=current+value;records.push(runId);a.coinAdventureRuns=records;a.coinAdventureBest=Math.max(Number(a.coinAdventureBest)||0,success?1:0);const ok=saveProfile(a);return {credited:ok?value:0,wallet:ok?a.coins:current,ok}}
function end(success,reason){if(mode!=='playing')return;mode=success?'clear':'failed';cancelAnimationFrame(frameID);hud();$('jump').disabled=true;const base=taken*5+stomps*10,earned=success?base+50:Math.floor(base/2);const granted=grant(earned,success);wallet();$('panelOverlay').hidden=false;$('panelTitle').textContent=success?'🏆 ゴール！ おめでとう！':reason==='fall'?'🌊 崖から落ちた！ ゲームオーバー':'💥 ゲームオーバー';$('panelBody').innerHTML='拾ったコイン '+taken+'枚（'+taken*5+'）<br>倒したモンスター '+stomps+'体（'+stomps*10+'）'+(success?'<br>ゴールボーナス +50':'<br>失敗したので半分を持ち帰るよ');$('panelReward').textContent=granted.ok?'🪙 +'+granted.credited+' マスコイン獲得！':'⚠️ 保存できなかったよ。端末の保存設定を確認してね。';$('start').textContent='🔄 もう一度冒険';sfx(success?'clear':'fail');stopMusic();draw()}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function hill(cx,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(cx-r,H);ctx.quadraticCurveTo(cx-r*.6,290,cx,260+r*.07);ctx.quadraticCurveTo(cx+r*.65,290,cx+r,H);ctx.fill()}
function drawBG(){const sky=ctx.createLinearGradient(0,0,0,GROUND);sky.addColorStop(0,'#2760a8');sky.addColorStop(.55,'#8ad0f0');sky.addColorStop(1,'#e5f6f5');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
const sun=ctx.createRadialGradient(795,91,5,795,91,125);sun.addColorStop(0,'#fff8d0');sun.addColorStop(.3,'#ffedb1bb');sun.addColorStop(1,'#ffedb100');ctx.fillStyle=sun;ctx.fillRect(670,0,250,240);ctx.fillStyle='#fff5cf';ctx.beginPath();ctx.arc(795,91,36,0,Math.PI*2);ctx.fill();
for(let i=0;i<10;i++){const x=((i*243-cam*.15)%(W+350)+(W+350))%(W+350)-160,y=55+(i%4)*42;ctx.fillStyle='#f5fcffe0';for(let k=0;k<4;k++){ctx.beginPath();ctx.ellipse(x+k*24,y+(k%2)*4,36-k*2,13+(k%3)*5,0,0,Math.PI*2);ctx.fill()}}
for(let i=0;i<8;i++){const x=((i*280-cam*.11)%(W+500)+(W+500))%(W+500)-250;hill(x,220+i%3*26,i%2?'#9abdc4':'#8db4c2')}
for(let i=0;i<12;i++){const x=((i*174-cam*.31)%(W+230)+(W+230))%(W+230)-110;hill(x,150,i%2?'#57aa92':'#69b69a')}
for(let i=0;i<18;i++){const x=((i*144-cam*.57)%(W+210)+(W+210))%(W+210)-100;const y=329+(i%3)*13;ctx.fillStyle='#4b7656';ctx.fillRect(x-5,y,12,GROUND-y);for(let k=0;k<3;k++){ctx.fillStyle=['#267b57','#329769','#4da778'][k];ctx.beginPath();ctx.ellipse(x+(k-1)*13,y-12-k*10,26,24,0,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#86ca9b';ctx.beginPath();ctx.ellipse(x-9,y-29,10,5,-.5,0,Math.PI*2);ctx.fill()}
}
function drawGround(){for(let x=Math.floor(cam/32)*32;x<cam+W+32;x+=32){const cx=x-cam;if(inGap(x+16)){const water=ctx.createLinearGradient(0,GROUND,0,H);water.addColorStop(0,'#75bfe0');water.addColorStop(1,'#1b658e');ctx.fillStyle=water;ctx.fillRect(cx,GROUND,33,H-GROUND);ctx.fillStyle='#b6e4f755';ctx.fillRect(cx,GROUND+32+Math.sin(x*.04+frames*.04)*5,27,2);continue}
const soil=ctx.createLinearGradient(0,GROUND,0,H);soil.addColorStop(0,'#b87845');soil.addColorStop(.4,'#92532f');soil.addColorStop(1,'#683b28');ctx.fillStyle=soil;ctx.fillRect(cx,GROUND,33,H-GROUND);ctx.fillStyle='#6ec86a';ctx.fillRect(cx,GROUND,33,10);ctx.fillStyle='#a0e17e';ctx.fillRect(cx,GROUND,33,4);ctx.fillStyle='#3f9d58';ctx.fillRect(cx,GROUND+9,33,4);ctx.fillStyle='#d49b65';ctx.fillRect(cx+(x%3)*4+4,GROUND+28,9,3);ctx.fillRect(cx+18,GROUND+70,5,3);ctx.fillStyle='#663d2b';ctx.fillRect(cx+9,GROUND+54,7,3);ctx.fillRect(cx+25,GROUND+99,5,3);if(x%96===0){ctx.fillStyle='#358e51';ctx.fillRect(cx+4,GROUND-6,3,6);ctx.fillRect(cx+10,GROUND-9,2,9);ctx.fillStyle='#f2d978';ctx.fillRect(cx+12,GROUND-9,4,4)}}
for(const g of gaps){if(g.x-cam>W+80||g.x+g.w-cam<0)continue;const x=g.x-cam;ctx.fillStyle='#1b577a';ctx.fillRect(x,GROUND+1,g.w,H-GROUND);ctx.fillStyle='#a6def9';ctx.fillRect(x,GROUND+38+Math.sin(frames*.04)*4,g.w,3)}
}
function drawCoins(){
  coins.forEach(c=>{
   if(c.got||Math.abs(c.x-cam-W/2)>W/2+45)return;
   const x=Math.round(c.x-cam), y=Math.round(c.y+Math.sin(frames*.08+c.x)*4);
   const phase=frames*.065+c.x*.03;
   // A spinning coin with a changing width, relief engraving and a soft gold glint.
   ctx.save();ctx.translate(x,y);ctx.scale(.27+.73*Math.abs(Math.cos(phase)),1);
   if(coinSprite.complete&&coinSprite.naturalWidth){ctx.imageSmoothingEnabled=false;ctx.drawImage(coinSprite,-19,-20,38,38)}
   else{ctx.fillStyle='#ffc64a';ctx.beginPath();ctx.ellipse(0,0,14,17,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8e521b';ctx.font='bold 18px serif';ctx.textAlign='center';ctx.fillText('π',0,6)}
   ctx.restore();
   if(Math.sin(phase)>0.95){const g=ctx.createRadialGradient(x-13,y-13,0,x-13,y-13,13);g.addColorStop(0,'#ffffffdd');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(x-26,y-26,26,26)}
  });
  for(const spark of coinFx){const x=spark.x-cam,y=spark.y,size=Math.max(1,Math.round(4*spark.life));
    ctx.globalAlpha=Math.min(1,spark.life);ctx.fillStyle=['#fffaab','#ffd452','#ffffff'][spark.hue];ctx.fillRect(x,y,size,size)}
  ctx.globalAlpha=1;
  if(coinStreak>=3&&frames-coinStreakFrame<85&&mode==='playing'){
    const y=85-Math.min(8,(frames-coinStreakFrame)*.12);
    ctx.save();ctx.font='900 27px system-ui';ctx.textAlign='center';ctx.lineWidth=6;ctx.strokeStyle='#734318';ctx.strokeText('✦ COIN COMBO ×'+coinStreak+' ✦',W/2,y);ctx.fillStyle='#fff6a4';ctx.fillText('✦ COIN COMBO ×'+coinStreak+' ✦',W/2,y);ctx.restore();
  }
}
const slimeSprite=new Image();slimeSprite.onload=()=>{if(mode==='ready'||mode==='failed'||mode==='clear')draw()};slimeSprite.src='./assets/evil-slime.png';
const coinSprite=new Image();coinSprite.onload=()=>{if(mode==='ready'||mode==='failed'||mode==='clear')draw()};coinSprite.src='./assets/mascoin.png';
function drawSlimes(){enemies.forEach(e=>{if(!e.alive||Math.abs(e.x-cam-W/2)>W/2+80)return;
 const x=e.x-cam,y=GROUND-58+Math.sin(frames*.085+e.x)*3;
 ctx.fillStyle='#163c5970';ctx.beginPath();ctx.ellipse(x,y+54,34,7,0,0,Math.PI*2);ctx.fill();
 if(slimeSprite.complete&&slimeSprite.naturalWidth){const bounce=1+Math.sin(frames*.13+e.x)*.045;ctx.save();ctx.translate(x,y+50);ctx.scale(1/bounce,bounce);ctx.drawImage(slimeSprite,-42,-74,84,76);ctx.restore()}
 else{ctx.fillStyle='#482478';ctx.beginPath();ctx.ellipse(x,y+24,30,26,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e4a0ff';rect(x-16,y+10,8,4,'#e4a0ff');rect(x+8,y+10,8,4,'#e4a0ff');ctx.fillStyle='#ffbf54';rect(x-12,y+18,7,5,'#ffbf54');rect(x+5,y+18,7,5,'#ffbf54');rect(x-3,y+29,7,4,'#e7e0fa')}
})}
function drawPlayer(){const x=p.x-cam,y=p.y+(p.onGround?Math.sin(frames*.27)*2:0);if(!falling&&p.y+HEIGHT<=GROUND+12)rect(x+6,GROUND-7,54,7,'#223a4980');if(sprite&&sprite.complete&&sprite.naturalWidth){ctx.save();ctx.translate(x+WIDTH/2,y+HEIGHT/2);if(falling)ctx.rotate(Math.min(1.15,(p.y+HEIGHT-GROUND)/110));else if(!p.onGround)ctx.rotate(-.1);ctx.drawImage(sprite,-WIDTH/2-3,-HEIGHT/2-4,WIDTH+6,HEIGHT+8);ctx.restore()}else{rect(x+13,y+6,39,44,'#f6b57f');rect(x+8,y+52,17,26,'#243f79');rect(x+35,y+52,17,26,'#243f79');rect(x+21,y+24,6,6,'#152442');rect(x+37,y+24,6,6,'#152442')}
}
function drawGoal(){const x=TOTAL-cam;if(x<-100||x>W+100)return;rect(x,GROUND-205,11,205,'#e1c48b');rect(x+11,GROUND-198,99,70,'#d2456e');rect(x+19,GROUND-185,78,12,'#f9e4a0');rect(x+19,GROUND-158,52,12,'#f9e4a0');rect(x-26,GROUND-12,70,12,'#f9df76')}
function draw(){if(!ctx)return;drawBG();drawGround();drawGoal();drawCoins();drawSlimes();drawPlayer();if(mode==='ready'){rect(0,0,960,540,'#09152b10')} }
$('jump').addEventListener('pointerdown',e=>{e.preventDefault();jump()});CV.addEventListener('pointerdown',e=>{if(mode==='playing'){e.preventDefault();jump()}});window.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='ArrowUp'){if(e.repeat)return;e.preventDefault();jump()}});$('start').addEventListener('click',reset);window.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing'){mode='pause';stopMusic();cancelAnimationFrame(frameID);$('jump').disabled=true;$('panelOverlay').hidden=false;$('panelTitle').textContent='⏸ 一時停止';$('panelBody').textContent='画面を離れたので冒険を停止したよ。もう一度始めると新しい冒険になるよ。';$('panelReward').textContent='今回のコインはまだ確定していません';$('start').textContent='▶ 最初から始める'}});window.addEventListener('storage',e=>{if(e.key===KEY){wallet();if(mode==='ready')loadAvatar()}});wallet();loadAvatar();makeLevel();draw();
})();

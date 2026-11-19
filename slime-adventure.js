(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;
const W=960,H=540,G=412,PROFILE='mathspeed-v4-profile',MAX_PLAYS=3,DAILY_CAP=500,DEV=window.MS_SLIME_DEVELOPER===true;
// Compact, readable jumps at every running speed. All physics are in px / second.
const GRAVITY=1900,FIRST_JUMP=-500,SECOND_JUMP=-450;
// Speed keeps rising well past 1,250m, then caps at a challenging but controllable pace.
const speedAt=m=>285+Math.min(335,Math.max(0,m)*.11);
const base='./assets/slime/';
function asset(name){const im=new Image();im.src=base+name;im.onload=()=>{if(mode!=='playing')render()};return im}
const img={bg:asset('forest.webp'),ground:asset('ground.png'),hero_idle:asset('hero_idle_a.png'),hero_jump:asset('hero_jump_a.png'),hero_double:asset('hero_double_a.png'),hero_land:asset('hero_land_a.png'),hero_hurt:asset('hero_hurt_a.png'),hero_fall:asset('hero_fall_a.png'),spikes:asset('spikes.png'),rock:asset('rock.png'),bat:asset('bat.png'),coin:asset('coin.png'),warning:asset('warning.png')};
let lastPattern='solo';
let mode='ready',worldX=260,py=G,vy=0,onGround=true,jumps=0,falling=false,cam=0,seconds=0,lastTime=0,raf=0,frame=0,hearts=3,inv=0,landSquash=0,obstacles=[],coins=[],fxParts=[],spawnX=1040,picked=0,meters=0,runId='',finished=false,seed=0,mute=false,audio=null,musicId=null,noteI=0,devBest=0;
try{devBest=Number(sessionStorage.getItem('mathspeed-slime-dev-best'))||0}catch{}
const R=(a,b)=>a+Math.floor(random()*(b-a+1));
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
function randHash(n){let v=Math.imul((n|0)^0x9e3779b9,0x85ebca6b);v=Math.imul(v^(v>>>13),0xc2b2ae35);return ((v^(v>>>16))>>>0)/4294967296}
function jpDate(){return new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'})}
function read(){try{return JSON.parse(localStorage.getItem(PROFILE)||'{}')||{}}catch{return {}}}
function write(p){try{localStorage.setItem(PROFILE,JSON.stringify(p));return true}catch{return false}}
function day(p){const now=jpDate();if(!p.slimeDaily||p.slimeDaily.date!==now)p.slimeDaily={date:now,plays:0,earned:0};if(!p.miniGameDaily||p.miniGameDaily.date!==now)p.miniGameDaily={date:now,earned:0};return p.slimeDaily}
function setText(id,val){$(id).textContent=val}
function hud(){const p=read(),d=day(p);setText('wallet','🪙 '+Math.max(0,Math.floor(Number(p.coins)||0)).toLocaleString('ja-JP')+'枚');setText('attempts',DEV?'∞ 無制限':Math.max(0,3-(d.plays||0))+' / 3 回');setText('best',Math.floor(DEV?devBest:(p.slimeBestMeters||0)).toLocaleString('ja-JP')+' m');setText('daily',DEV?'試遊中：加算なし':Math.max(0,Math.floor(p.miniGameDaily.earned||0))+' / 500');setText('pickups',picked+' 枚');setText('biome',meters<300?'陽だまりの森':meters<650?'きのこの森':meters<1200?'古代の小道':'星の大森林');setText('distance','⚑ '+Math.floor(meters).toLocaleString('ja-JP')+' m');setText('hp','♥ '.repeat(hearts)+'♡ '.repeat(3-hearts));setText('airJump',onGround?'2段ジャンプ OK':jumps<2?'もう1回ジャンプ！':'ジャンプ使い切り');}
function sound(f,d=.12,v=.018,wave='triangle',offset=0){if(mute)return;try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const t=audio.currentTime+offset,o=audio.createOscillator(),g=audio.createGain();o.type=wave;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+d+.02)}catch{}}
function sfx(k){const f={jump:[490,640],double:[570,780,1000],coin:[880,1100],hit:[280,180],fall:[430,305,220],over:[440,350,290],best:[520,650,785,1000],start:[440,554,660]}[k]||[];f.forEach((n,i)=>sound(n,.13,.02,'triangle',.065*i))}
const melody=[392,440,494,523,587,494,440,392,349,392,440,494,523,440,392,349,392,494,587,659,587,523,494,440,392,440,494,523,494,440,392,330];
function musicOff(){if(musicId){clearInterval(musicId);musicId=null}}
function musicOn(){musicOff();if(mute||mode!=='playing')return;musicId=setInterval(()=>{if(mode!=='playing'||document.hidden)return;const i=noteI++%melody.length;sound(melody[i],.22,.0075,'triangle');if(i%4===0)sound(melody[i]/2,.28,.004,'sine')},230)}
function overlay(title,desc,reward,foot,btn,disabled=false){setText('overlayTitle',title);setText('overlayText',desc);setText('overlayReward',reward);setText('overlayNote',foot);setText('start',btn);$('start').disabled=disabled;$('overlay').hidden=false;hud()}
function ready(){mode='ready';const p=read(),d=day(p),left=Math.max(0,3-d.plays);$('jump').disabled=true;$('pause').disabled=true;const locked=!DEV&&left===0;overlay(locked?'今日はここまで！':'計算スライムの冒険',locked?'今日の挑戦は3回使い切ったよ。明日また会おうね！':'計算スライムと、どこまでも遠くへ！\nトゲや岩はジャンプ！ コウモリは地面を走ってくぐろう。\n短い連続障害物には2段ジャンプ！ 黄色いπ金貨を集めよう。',DEV?'🧪 開発者テスト：何回でも遊べる・報酬なし':'🪙 金貨＋100mごとに12枚',DEV?'開発者モード：記録とコインは通常の成績に加算しません':`本日の残り：${left}回`,locked?'明日のお楽しみ':'▶ おさんぽ出発！',locked)}
function spark(x,y,color,num=9){for(let i=0;i<num;i++)fxParts.push({x,y,vx:(random()-.5)*180,vy:-random()*145-15,age:0,ttl:.36+random()*.48,color,size:3+R(0,3)})}
function spawn(){
 // Build readable obstacle "phrases" instead of spreading every hazard evenly.
 // Single hazards, tight two/three-hazard combos and underpass bats all have
 // different solutions. Every phrase receives a full recovery runway after it.
 while(spawnX<worldX+W+700){
  const projectedMeters=Math.max(0,(spawnX-260)/18),futureSpeed=speedAt(projectedMeters);
  const progress=Math.min(1,projectedMeters/2600);
  const roll=random();
  let pattern='solo';
  if(projectedMeters>320&&roll<.10+progress*.10)pattern='bat';
  else if(projectedMeters>170&&roll<.27+progress*.04)pattern='pit';
  else if(projectedMeters>1200&&roll<.31+progress*.16)pattern='triple';
  else if(projectedMeters>280&&roll<.43+progress*.32)pattern='pair';
  // After an airborne combo, a bat can be passed safely by staying grounded.
  // Don't place a bat too soon after a triple, pit, or previous bat.
  const extraRecovery=pattern==='bat'||lastPattern==='triple'||lastPattern==='pit'||lastPattern==='bat';
  const reactionTime=extraRecovery ? .91+random()*.27 : .58+random()*.32;
  // Deliberate short beats occur between *single* ground hazards as well.
  const shortBeat=!extraRecovery&&projectedMeters>650&&random()<(.13+progress*.12);
  const approach=Math.ceil(futureSpeed*(shortBeat ? .46 : reactionTime)+(shortBeat?25:45));
  const previousRight=spawnX,firstX=previousRight+approach;
  const pieces=[];
  function piece(type,x){
   const width=type==='pit'?R(Math.round(85+45*progress),Math.round(118+90*progress)):
     type==='spikes'?62:type==='rock'?64:76;
   const height=type==='spikes'?41:type==='rock'?51:type==='bat'?58:0;
   const obj={type,x,w:width,h:height,y:type==='bat'?G-132:G,phase:random()*6.28};
   pieces.push(obj);return obj;
  }
  if(pattern==='bat')piece('bat',firstX);
  else if(pattern==='pit')piece('pit',firstX);
  else{
   const count=pattern==='triple'?3:pattern==='pair'?2:1;
   let at=firstX;
   for(let i=0;i<count;i++){
    const type=random()<.54?'spikes':'rock';
    const part=piece(type,at);
    if(i<count-1){
     // For a combo, the short, conspicuous gaps are meant to be crossed
     // with one well-timed jump or a purposeful second jump.
     at=part.x+part.w+R(20,pattern==='triple'?Math.round(34+Math.max(0,projectedMeters-1200)/1800*26):Math.round(47+progress*25));
    }
   }
  }
  for(const obj of pieces)obstacles.push(obj);
  const last=pieces[pieces.length-1];
  spawnX=last.x+last.w;
  lastPattern=pattern;
  // Coins form a line in the clear approach, not inside dangerous objects.
  const available=firstX-previousRight;
  const n=Math.min(6,Math.max(0,Math.floor((available-90)/45)));
  for(let i=0;i<n;i++){
   const x=previousRight+60+i*45;
   if(x>firstX-50)break;
   coins.push({x,y:G-85-(i%3===1?35:0),taken:false,phase:random()*6});
  }
 }
}
function begin(){if(mode==='playing')return;let p=read();const d=day(p);if(!DEV){if(d.plays>=3){ready();return}d.plays+=1;if(!write(p)){overlay('保存できません','挑戦回数を保存できないため、開始を中止したよ。ブラウザの保存設定を確認してね。','','','戻る');return}}
worldX=260;py=G;vy=0;onGround=true;jumps=0;falling=false;cam=0;seconds=0;lastTime=0;hearts=3;inv=0;landSquash=0;obstacles=[];coins=[];fxParts=[];spawnX=900;lastPattern='solo';picked=0;meters=0;finished=false;seed=((Date.now()^Math.floor(Math.random()*10000000))>>>0)||920;runId='ms-10123-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);noteI=0;mode='playing';$('overlay').hidden=true;$('jump').disabled=false;$('pause').disabled=false;spawn();hud();musicOn();sfx('start');cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
function jump(){if(mode!=='playing'||falling||jumps>=2)return; // Single tap = first jump; second tap while airborne = double-jump.
 if(onGround||jumps===1){jumps++;vy=jumps===1?FIRST_JUMP:SECOND_JUMP;onGround=false;landSquash=0;sfx(jumps===1?'jump':'double');spark(worldX,py-12,jumps===1?'#eafbbb':'#ffefb1',7);hud()}}
function inPit(x){return obstacles.some(o=>o.type==='pit'&&x>=o.x+13&&x<=o.x+o.w-13)}
function award(){const distance=Math.max(0,Math.floor(meters)),bonus=Math.floor(distance/100)*12,raw=bonus+picked;
 if(DEV){devBest=Math.max(devBest,distance);try{sessionStorage.setItem('mathspeed-slime-dev-best',String(devBest))}catch{}return {distance,bonus,raw,earned:0,persisted:true,developer:true}}
 const p=read(),d=day(p),common=p.miniGameDaily;if(!Array.isArray(p.slimeRunIds))p.slimeRunIds=[];if(p.slimeRunIds.includes(runId))return{distance,bonus,raw,earned:0,persisted:true};const remain=Math.max(0,DAILY_CAP-(Math.floor(common.earned)||0)),earned=Math.min(remain,raw);p.coins=Math.max(0,Math.floor(Number(p.coins)||0))+earned;d.earned=(d.earned||0)+earned;common.earned=(common.earned||0)+earned;p.slimeBestMeters=Math.max(p.slimeBestMeters||0,distance);p.slimeTotalMeters=(p.slimeTotalMeters||0)+distance;p.slimeRunIds=[...p.slimeRunIds.slice(-29),runId];const saved=write(p);return{distance,bonus,raw,earned:saved?earned:0,persisted:saved}}
function end(reason){if(mode!=='playing'||finished)return;finished=true;mode='ended';musicOff();cancelAnimationFrame(raf);$('jump').disabled=true;$('pause').disabled=true;const r=award(),p=read(),d=day(p),again=DEV||d.plays<MAX_PLAYS;sfx('over');const desc=`${r.distance.toLocaleString('ja-JP')} m 到達！\nπ金貨：${picked}枚 ＋ 距離ボーナス：${r.bonus}枚`;
 const reward=DEV?'🧪 テスト報酬：加算なし（本来 '+r.raw+'枚）':r.persisted?'🪙 +'+r.earned+' マスコイン':'保存に失敗しました';const foot=DEV?'開発者の挑戦：無制限・自己ベストはテスト用':`自己ベスト：${p.slimeBestMeters||0} m ／ 今日の残り：${Math.max(0,MAX_PLAYS-d.plays)}回`;overlay(reason==='pit'?'ぽちゃん！おつかれさま':reason==='hp'?'ふにゃ〜！また挑戦しよう':'おさんぽ終了！',desc,reward,foot,again?'↻ もう一度あそぶ':'今日はここまで',!again)}
function pause(){if(mode!=='playing')return;mode='paused';musicOff();cancelAnimationFrame(raf);$('jump').disabled=true;$('pause').disabled=true;overlay('おさんぽ休憩中','タップでジャンプ、空中でもう一度押して2段ジャンプ！','現在 '+Math.floor(meters)+' m','挑戦回数は変更されません','▶ つづきをあそぶ')}
function resume(){mode='playing';lastTime=0;$('overlay').hidden=true;$('jump').disabled=false;$('pause').disabled=false;musicOn();raf=requestAnimationFrame(loop)}
$('start').addEventListener('click',()=>{if(mode==='paused')resume();else if(mode==='ready'||mode==='ended')begin()});$('pause').addEventListener('click',pause);$('sound').addEventListener('click',()=>{mute=!mute;setText('sound',mute?'🔇 音 OFF':'🔊 音 ON');if(mute)musicOff();else musicOn()});
for(const node of [canvas,$('jump')]){node.addEventListener('pointerdown',e=>{e.preventDefault();jump()},{passive:false});node.addEventListener('contextmenu',e=>e.preventDefault());node.addEventListener('selectstart',e=>e.preventDefault())}
window.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();if(!e.repeat)jump()}if(e.code==='Escape'&&mode==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
function update(dt){seconds+=dt;inv=Math.max(0,inv-dt);landSquash=Math.max(0,landSquash-dt);const speed=speedAt(meters);worldX+=speed*dt;meters=(worldX-260)/18;cam=Math.max(0,worldX-260);
 vy+=GRAVITY*dt;py+=vy*dt;
 if(!falling&&inPit(worldX)&&py>=G+3){falling=true;onGround=false;sfx('fall')}
 if(!falling&&!inPit(worldX)&&py>=G){if(!onGround&&vy>110){landSquash=.15;spark(worldX,G-8,'#d3eda0',4)}py=G;vy=0;onGround=true;jumps=0}
 else if(py<G-2){onGround=false}
 if(falling&&py>H+100){end('pit');return}
 if(!falling){const left=worldX-18,right=worldX+17,top=py-65,bottom=py-11;
 for(const o of obstacles){if(o.type==='pit'||inv>0)continue;const objTop=o.type==='bat'?o.y:o.y-o.h;if(right>o.x+11&&left<o.x+o.w-11&&bottom>objTop+9&&top<objTop+(o.type==='bat'?42:o.h-6)){hearts--;inv=1.3;vy=-305;onGround=false;sfx('hit');spark(worldX,py-35,'#ffe49f',16);if(hearts<=0){end('hp');return}break}}
 for(const c of coins){if(c.taken)continue;if(Math.abs(c.x-worldX)<40&&Math.abs(c.y-(py-42))<48){c.taken=true;picked++;sfx('coin');spark(c.x,c.y,'#ffdf6c',11)}}}
 for(const e of fxParts){e.age+=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy+=160*dt}fxParts=fxParts.filter(e=>e.age<e.ttl);
 if(obstacles.length>90)obstacles=obstacles.filter(o=>o.x+o.w>cam-100);if(coins.length>220)coins=coins.filter(c=>!c.taken&&c.x>cam-100);spawn();hud()}
function drawImage(im,x,y,w,h){if(im.complete&&im.naturalWidth>0)ctx.drawImage(im,Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function block(x,y,w,h,col){ctx.fillStyle=col;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h))}
function background(){const b=img.bg;if(b.complete&&b.naturalWidth){const scale=H/b.naturalHeight*1.36,bw=b.naturalWidth*scale,bh=b.naturalHeight*scale,maxShift=Math.max(0,bw-W),travel=(cam*.085)%(maxShift*2||1),shift=travel<maxShift?travel:2*maxShift-travel;ctx.drawImage(b,-Math.round(shift),-Math.round(bh-H)*.38,Math.round(bw),Math.round(bh))}else{const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#5cbbec');grad.addColorStop(.65,'#bbefca');grad.addColorStop(1,'#357e57');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H)}
const stage=meters<300?0:meters<650?1:meters<1200?2:3;
if(stage){ctx.fillStyle=stage===1?'#174b2c2b':stage===2?'#6d488050':'#12275595';ctx.fillRect(0,0,W,G)}
if(stage>=2){for(let i=0;i<9;i++){let x=i*143-Math.round(cam*.36)%143;const height=78+(i%4)*21,top=G-height;block(x,top,16,height,'#2939549c');block(x-6,top-15,28,21,'#c0b1c480');block(x-8,top-18,31,7,'#e3d6d477')}}
if(stage===3){for(let i=0;i<64;i++){const xx=(i*111+31)%W,yy=(i*67+19)%(G-50);const twinkle=Math.sin(seconds*2+i*2);block(xx,yy,twinkle>.3?3:2,twinkle>.3?3:2,'#fff4cd');}}
}
function ground(){const step=64,baseX=Math.floor(cam/step)*step;for(let i=-1;i<=Math.ceil(W/step)+1;i++){const wx=baseX+i*step;drawImage(img.ground,wx-cam,G-9,64,140)}
 for(const pit of obstacles){if(pit.type!=='pit')continue;const x=Math.round(pit.x-cam),w=pit.w;if(x>W+25||x+w<-25)continue;block(x-1,G-8,w+2,H-G+10,'#07172b');block(x+8,G+20,w-16,H-G-20,'#14294b');block(x-1,G-10,7,24,'#263c3e');block(x+w-5,G-10,7,24,'#263c3e');for(let i=0;i<6;i++){block(x+14+i*22,G+36+(i%3)*20,8,3,'#34436a')}}
 // Static decoration is world-anchored and never has a red danger marker.
 for(let n=Math.floor(cam/100)-2;n<Math.ceil((cam+W)/100)+2;n++){const wx=n*100+29,x=wx-cam,rand=randHash(n+22);if(inPit(wx)||x<-22||x>W+22)continue;const stem=G-18-(n%3)*4;block(x,stem,3,22,'#356c37');block(x-9,stem+6,10,5,'#43954a');block(x+3,stem+9,10,5,'#549f52');if(rand>.32){const color=rand>.65?'#f8e7f0':'#fbfbce';for(let a=0;a<5;a++){const theta=a*Math.PI*2/5;block(x+Math.cos(theta)*6-3,stem+Math.sin(theta)*6-3,6,6,color)}block(x-3,stem-3,6,6,'#ffc252')}else{block(x-2,stem-5,8,9,'#ffda7e');block(x-3,stem-7,9,4,'#fff1ae')}}}
function hazards(){for(const o of obstacles){const x=o.x-cam;if(x>W+130||x<-150)continue;if(o.type==='pit'){drawImage(img.warning,x-10,G-54,27,27);drawImage(img.warning,x+o.w-12,G-54,27,27);block(x,G-11,8,7,'#ea6a76');block(x+o.w-8,G-11,8,7,'#ea6a76');continue}if(o.type==='bat'){const yy=o.y+Math.sin(seconds*4+o.phase)*8;drawImage(img.bat,x,yy,80,58);drawImage(img.warning,x+26,yy-32,24,24)}else{drawImage(img[o.type],x,o.y-o.h,o.w,o.h);drawImage(img.warning,x+o.w/2-12,o.y-o.h-33,24,24)}}}
function drawCoins(){for(const c of coins){if(c.taken)continue;const x=c.x-cam;if(x<-45||x>W+45)continue;const scale=.86+.14*Math.abs(Math.sin(seconds*5+c.phase));const w=34*scale,y=c.y+Math.sin(seconds*3+c.phase)*4;drawImage(img.coin,x-w/2,y-17,w,34)}}
// A-design: a fully redrawn, pixel-unified slime with a consistent ground anchor.
// These visual transforms never modify collision, jump duration or speed.
function hero(){
 const x=worldX-cam,y=py-81;
 if(inv>0&&Math.floor(seconds*14)%2)return;
 const sprite=inv>0?'hero_hurt':onGround&&landSquash>0?'hero_land':onGround?'hero_idle':jumps>=2?'hero_double':vy>115?'hero_fall':'hero_jump';
 if(!falling){ctx.fillStyle='#132c3980';ctx.beginPath();ctx.ellipse(x,G+6,33*Math.max(.3,1-Math.max(0,G-py)/250),6,0,0,Math.PI*2);ctx.fill()}
 ctx.save();ctx.translate(Math.round(x),Math.round(y+42));
 if(falling)ctx.rotate(Math.min(1,(py-G)/100));
 else if(jumps===2)ctx.rotate(.07*Math.sin(seconds*13));
 if(onGround&&landSquash<=0){const wobble=Math.sin(seconds*8)*.015;ctx.scale(1+wobble,1-wobble)}
 else if(!onGround&&!falling)ctx.scale(.98,1.025);
 drawImage(img[sprite],-44,-42,88,90);ctx.restore()
}
function particles(){for(const p of fxParts){block(p.x-cam,p.y,p.size,p.size,p.color)}}
function render(){background();ground();drawCoins();hazards();hero();particles();if(mode==='playing'&&seconds<4){ctx.font='bold 18px sans-serif';ctx.fillStyle='#fffce9';ctx.shadowColor='#0c2946';ctx.shadowBlur=7;ctx.fillText('タップでジャンプ！ 空中で再タップ！',W*.23,H-24);ctx.shadowBlur=0}}
function loop(time){if(mode!=='playing')return;const dt=Math.min(.035,lastTime?(time-lastTime)/1000:.016);lastTime=time;frame++;update(dt);render();if(mode==='playing')raf=requestAnimationFrame(loop)}
if(DEV){$('attemptStat').classList.add('dev');setText('gameInfo','🛠 開発者テスト：挑戦回数は無制限。通常のコイン・ベスト記録には加算しません。\n危険物には赤い「！」、背景の花や木には当たり判定がありません。');}
hud();ready();render();
})();

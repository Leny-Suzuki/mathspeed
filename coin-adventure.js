(()=>{'use strict';
const $=id=>document.getElementById(id);const cv=$('game'),cx=cv.getContext('2d',{alpha:false});
const W=960,H=540,GROUND=410,PW=61,PH=78,END=6640,KEY='mathspeed-v4-profile',DAY_LIMIT=100;
const SPEED=246,GRAV=1760,JUMP=-700;let state='intro',frame=0,last=0,request=0,cam=0,avatar='s0',hero=null,life=3,jumpHeld=false,boostTime=0,buffer=0,coyote=0,invuln=0,falling=false,startedAt=0;
let player={x:112,y:GROUND-PH,vy:0},taken=0,kills=0,lights=0,coins=[],mobs=[],stars=[],dust=[],runId='';
let soundOn=true,audioContext=null,musicId=0,musicIndex=0,zoneBanner=0,priorZone=0;
const zones=[{x:0,name:'Ⅰ・風の草原',top:'#234d83',mid:'#6a9dbc',low:'#e7c496',mount:'#6c8ba4',forest:'#355c64',grass:'#78ac59',floor:'#36402f'}, {x:2100,name:'Ⅱ・古の森',top:'#172748',mid:'#4a6987',low:'#8eb4a8',mount:'#4a6b77',forest:'#224c4b',grass:'#6c9e63',floor:'#2d3b37'}, {x:4350,name:'Ⅲ・月影の遺跡',top:'#27234d',mid:'#745d85',low:'#dc9c89',mount:'#61516e',forest:'#433d5b',grass:'#8f9b80',floor:'#40404c'}];
const pits=[{x:895,w:107},{x:1865,w:113},{x:2650,w:113},{x:3600,w:127},{x:4640,w:118},{x:5570,w:139}];
const mobSpec=[{x:575,type:'slime'},{x:1315,type:'slime'},{x:2310,type:'bat'},{x:3150,type:'slime'},{x:4150,type:'bat'},{x:5205,type:'slime'},{x:6050,type:'bat'}];
const shards=[{x:1570,y:270},{x:3480,y:265},{x:6190,y:270}];
const coinSpots=[320,405,745,820,1000,1220,1430,1670,2020,2180,2460,2550,2800,2920,3400,3490,3740,3890,4420,4520,4800,5060,5310,5470,5760,5850,6020,6270,6480];
const coinImage=new Image();coinImage.src='./assets/mascoin.png';coinImage.onload=()=>draw();
const slimeImage=new Image();slimeImage.src='./assets/evil-slime.png';slimeImage.onload=()=>draw();
const $hero=$('portrait');$('foe').src='./assets/evil-slime.png';
function profile(){try{const p=JSON.parse(localStorage.getItem(KEY)||'{}');return p&&typeof p==='object'?p:{}}catch{return {}}}
function profileSave(p){try{localStorage.setItem(KEY,JSON.stringify(p));return true}catch{return false}}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function earnedToday(p=profile()){const d=p.coinAdventureDaily;return d&&d.date===today()?Math.max(0,Number(d.earned)||0):0}
function wallet(){const p=profile();$('wallet').textContent='🪙 '+Math.floor(Number(p.coins)||0)+' マスコイン';$('overlayCap').textContent='1回最大25枚 · 1日最大100枚（本日の残り '+Math.max(0,DAY_LIMIT-earnedToday(p))+'枚）／ 本編と所持金を共有'}
function avatarSrc(id){return './assets/avatars/'+id+'.'+(id.startsWith('g')?'png':'webp')}
function loadHero(){const p=profile();avatar=String(p.avatar||'s0');if(!/^(?:[se][0-9](?:_[12])?|g[0-5])$/.test(avatar))avatar='s0';const img=new Image();img.onload=()=>{hero=img;draw()};img.onerror=()=>{if(avatar!=='s0'){avatar='s0';loadHeroFallback()}else{hero=null;draw()}};img.src=avatarSrc(avatar);$hero.src=img.src;const labels=['剣士','魔法使い','弓使い','忍者','モンク','ナイト','ドラゴン使い','獣人','ロボット','錬金術師'];$('selected').textContent='🛡 装備：'+(avatar.startsWith('g')?'限定アバター':avatar.startsWith('e')?'進化した仲間':labels[Number(avatar[1])]||'冒険者')}
function loadHeroFallback(){const img=new Image();img.onload=()=>{hero=img;draw()};img.src=avatarSrc('s0');$hero.src=img.src}
function zoneAt(x){return x>=4350?2:x>=2100?1:0}
function gapAt(x){return pits.some(p=>x>p.x&&x<p.x+p.w)}
function valueReward(clear){const bonus=Math.min(10,Math.floor(taken/3)+Math.floor(kills/2)+lights);return clear?15+bonus:Math.min(5,Math.floor(taken/5)+Math.floor(kills/3))}
function setHud(){const x=player.x;const r=valueReward(false);$('zone').textContent=zones[zoneAt(x)].name;$('progress').style.width=Math.min(100,x/END*100)+'%';$('health').textContent='♥ '.repeat(Math.max(0,life))+'♡ '.repeat(Math.max(0,3-life));$('count').textContent='金貨 '+taken+' ／ 討伐 '+kills;$('mission').textContent='✦ 数の灯 '+lights+' / 3';$('hudReward').textContent='探索ボーナス '+Math.min(10,Math.floor(taken/3)+Math.floor(kills/2)+lights)+' / 10'}
function start(){if(state==='paused'){state='running';$('overlay').hidden=true;$('jump').disabled=false;last=0;startMusic();request=requestAnimationFrame(tick);return}cancelAnimationFrame(request);stopMusic();state='running';frame=0;last=0;cam=0;zoneBanner=1.8;priorZone=0;startedAt=performance.now();life=3;jumpHeld=false;boostTime=0;buffer=0;coyote=.12;invuln=0;falling=false;taken=0;kills=0;lights=0;coins=coinSpots.map((x,i)=>({x,y:GROUND-(i%4===1?113:i%4===3?77:62),hit:false}));mobs=mobSpec.map(m=>({...m,alive:true}));stars=shards.map(s=>({...s,hit:false}));dust=[];player={x:112,y:GROUND-PH,vy:0};runId='a107-'+Date.now()+'-'+Math.random().toString(36).slice(2);$('overlay').hidden=true;$('jump').disabled=false;setHud();startMusic();sfx('begin');request=requestAnimationFrame(tick)}
function pause(){if(state!=='running')return;state='paused';cancelAnimationFrame(request);stopMusic();$('jump').disabled=true;showOverlay('PAUSE · 旅の休息','⏸ 冒険を一時停止','画面を離れたため一時停止しました。途中から再開できます。','','▶ 冒険を再開')}
function showOverlay(kicker,title,msg,reward,button){$('overlayKicker').textContent=kicker;$('overlayTitle').textContent=title;$('overlayMessage').textContent=msg;$('overlayReward').textContent=reward;$('start').textContent=button;$('overlay').hidden=false;wallet()}
function finish(clear,reason){if(state!=='running')return;state=clear?'clear':'dead';cancelAnimationFrame(request);stopMusic();$('jump').disabled=true;const nominal=valueReward(clear),result=rewardWallet(nominal);const msg=clear?'古城の門にたどり着いた！ 数の灯 '+lights+'/3 を発見。\n王国の平和へ、また一歩近づいた。':reason==='fall'?'暗い谷へ落ちてしまった……。次は助走とジャンプのタイミングに気をつけよう。':'魔物に倒されてしまった……。次はジャンプで攻撃を避けよう。';showOverlay(clear?'CLEAR · 森の冒険 完了':'GAME OVER · 冒険の終わり',clear?'🏰 古城の門へ到着！':reason==='fall'?'🌑 谷へ落下！':'💥 力尽きてしまった',msg,result.ok?'🪙 +'+result.granted+' マスコイン獲得'+(result.granted<nominal?'（本日の上限に到達）':''):'⚠ 報酬を保存できませんでした', '↻ もう一度冒険');sfx(clear?'win':'lose')}
function rewardWallet(nominal){const p=profile(),records=Array.isArray(p.coinAdventureRuns)?p.coinAdventureRuns.slice(-60):[];if(records.includes(runId))return {ok:true,granted:0};const remaining=Math.max(0,DAY_LIMIT-earnedToday(p)),granted=Math.min(nominal,remaining),base=Math.max(0,Math.floor(Number(p.coins)||0));p.coins=base+granted;p.coinAdventureRuns=[...records,runId];p.coinAdventureDaily={date:today(),earned:earnedToday(p)+granted};if(granted&&state==='clear')p.coinAdventureBest=Math.max(Number(p.coinAdventureBest)||0,1);const ok=profileSave(p);return {ok,granted:ok?granted:0}}
const melody=[392,494,587,698,659,587,494,440,392,440,523,587,494,392,330,349,392,494,587,784,698,587,523,494,440,523,659,587,523,440,392,330];
function audio(){try{if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();return audioContext}catch{return null}}
function note(f,t=.12,vol=.017,type='triangle',delay=0){if(!soundOn)return;const a=audio();if(!a)return;const n=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,n);g.gain.setValueAtTime(.0001,n);g.gain.exponentialRampToValueAtTime(vol,n+.018);g.gain.exponentialRampToValueAtTime(.0001,n+t);o.connect(g);g.connect(a.destination);o.start(n);o.stop(n+t+.04)}
function sfx(k){const notes={jump:[440,660],coin:[760,1140],stomp:[220,146],hurt:[290,210],rune:[590,790,1180],begin:[392,494,659],win:[523,659,784,1047],lose:[440,360,240]};(notes[k]||[]).forEach((f,i)=>note(f,.14,.038,k==='hurt'?'sawtooth':'square',i*.092))}
function stopMusic(){if(musicId){clearInterval(musicId);musicId=0}}
function startMusic(){stopMusic();if(!soundOn||state!=='running')return;musicIndex=0;musicId=setInterval(()=>{if(state!=='running'||document.hidden)return;const i=musicIndex++%melody.length;note(melody[i],.18,.011,'triangle');if(i%4===0)note(melody[i]/2,.28,.008,'sine');if(i%8===4)note(130.81,.1,.006,'square')},260)}
$('sound').addEventListener('click',()=>{soundOn=!soundOn;$('sound').textContent=soundOn?'🔊 音声 ON':'🔇 音声 OFF';if(soundOn)startMusic();else stopMusic()});
function jumpDown(){if(state!=='running'||falling)return;jumpHeld=true;buffer=.13;if(player.y+PH>=GROUND-5&&!gapAt(player.x+PW/2)||coyote>0){performJump()}}
function performJump(){player.vy=JUMP;buffer=0;coyote=0;boostTime=.16;sfx('jump');dustBurst(player.x+PW/2,GROUND-6,'#e8deb2',10)}
function jumpUp(){jumpHeld=false;boostTime=0}
$('jump').addEventListener('pointerdown',e=>{e.preventDefault();jumpDown()});$('jump').addEventListener('pointerup',jumpUp);$('jump').addEventListener('pointercancel',jumpUp);cv.addEventListener('pointerdown',e=>{e.preventDefault();jumpDown()});cv.addEventListener('pointerup',jumpUp);cv.addEventListener('pointercancel',jumpUp);window.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();if(!e.repeat)jumpDown()}});window.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();jumpUp()}});$('start').addEventListener('click',start);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});window.addEventListener('storage',e=>{if(e.key===KEY){wallet();if(state==='intro')loadHero()}});
function tick(t){if(state!=='running')return;const dt=Math.min(.033,Math.max(.005,last?(t-last)/1000:.016));last=t;update(dt);draw();if(state==='running')request=requestAnimationFrame(tick)}
function update(dt){frame+=dt;zoneBanner=Math.max(0,zoneBanner-dt);invuln=Math.max(0,invuln-dt);buffer=Math.max(0,buffer-dt);coyote=Math.max(0,coyote-dt);player.x+=SPEED*dt;const center=player.x+PW*.5,wasY=player.y;const inPit=gapAt(center);
 const onGround=player.y+PH>=GROUND-.2&&!inPit&&!falling&&player.vy>=0;if(onGround){player.y=GROUND-PH;player.vy=0;coyote=.10}
 else{const gravity=jumpHeld&&boostTime>0&&player.vy<0?GRAV*.62:GRAV;player.vy+=gravity*dt;player.y+=player.vy*dt;boostTime=Math.max(0,boostTime-dt)}
 if(!falling&&player.y+PH>GROUND+20&&inPit){falling=true;jumpHeld=false;sfx('hurt')}
 if(!falling&&player.vy>=0&&player.y+PH>=GROUND&&!inPit&&wasY+PH<=GROUND+17){player.y=GROUND-PH;player.vy=0;coyote=.10;if(buffer>0)performJump()}
 if(falling&&player.y>H+65){finish(false,'fall');return}
 // Each pickup is a visual gold token. It counts toward a capped exploration bonus.
 for(const c of coins){if(!c.hit&&!falling&&Math.abs(c.x-center)<36&&Math.abs(c.y-(player.y+PH*.48))<48){c.hit=true;taken++;dustBurst(c.x,c.y,'#ffda67',12);sfx('coin')}}
 for(const s of stars){if(!s.hit&&!falling&&Math.abs(s.x-center)<39&&Math.abs(s.y-(player.y+PH*.48))<63){s.hit=true;lights++;dustBurst(s.x,s.y,'#70f8eb',22);sfx('rune')}}
 for(const m of mobs){if(!m.alive||falling)continue;const mx=m.x,my=m.type==='bat'?GROUND-151+Math.sin(frame*5+m.x)*14:GROUND-47;const mh=m.type==='bat'?40:46,mw=m.type==='bat'?60:62;const hit=Math.abs(center-mx)<(PW+mw)*.40&&player.y+PH>my-12&&player.y<my+mh-8;
  if(!hit)continue;if(player.vy>90&&wasY+PH<my+13&&m.type==='slime'){m.alive=false;kills++;player.vy=-460;boostTime=0;dustBurst(mx,my+18,'#c77aff',20);sfx('stomp')}else if(invuln===0){life--;invuln=1.4;player.vy=-260;dustBurst(center,player.y+PH/2,'#ff8296',12);sfx('hurt');if(life<=0){finish(false,'hit');return}}}
 for(const d of dust){d.x+=d.vx*dt;d.y+=d.vy*dt;d.vy+=280*dt;d.life-=dt}dust=dust.filter(d=>d.life>0).slice(-80);
 cam=Math.max(0,Math.min(END-W+180,player.x-200));const zNow=zoneAt(player.x);if(zNow!==priorZone){priorZone=zNow;zoneBanner=2.1;sfx('rune')}if(player.x>=END){finish(true);return}setHud();}
function dustBurst(x,y,col,n){for(let i=0;i<n;i++){const a=i/n*Math.PI*2;dust.push({x,y,vx:Math.cos(a)*(55+(i*13)%95),vy:Math.sin(a)*(55+(i*9)%75)-50,life:.55+(i%3)*.09,clr:col,size:i%3+2})}}
function fill(x,y,w,h,col){cx.fillStyle=col;cx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h))}
function poly(points,col){cx.fillStyle=col;cx.beginPath();points.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.fill()}
function ellipse(x,y,rx,ry,col){cx.fillStyle=col;cx.beginPath();cx.ellipse(x,y,rx,ry,0,0,Math.PI*2);cx.fill()}
function hash(n){let x=Math.imul(n|0,1664525)+1013904223;x^=x>>>15;return (x>>>0)/4294967296}
function sky(){const zone=zones[zoneAt(player.x)];const grad=cx.createLinearGradient(0,0,0,GROUND);grad.addColorStop(0,zone.top);grad.addColorStop(.64,zone.mid);grad.addColorStop(1,zone.low);cx.fillStyle=grad;cx.fillRect(0,0,W,H);
 // Stars and sun are ambient, stage-aware lighting.
 const z=zoneAt(player.x),moonX=z===2?750:790;ellipse(moonX,94,z===2?27:37,z===2?27:37,z===2?'#f5e5ce':'#fff0bf');cx.globalAlpha=.13;ellipse(moonX,94,67,67,'#ffe6ae');cx.globalAlpha=1;
 for(let i=0;i<50;i++){const sx=((i*187+31-cam*.065)%(W+160)+(W+160))%(W+160)-40,sy=17+hash(i*17)*205;const a=.1+Math.abs(Math.sin(frame*.9+i))*.42;cx.globalAlpha=a;fill(sx,sy,i%4===0?3:2,2,'#fff9d8')}cx.globalAlpha=1;
 for(let i=0;i<11;i++){const x=((i*209-cam*.13)%(W+420)+(W+420))%(W+420)-180,y=95+(i%4)*44;for(let k=0;k<5;k++)ellipse(x+k*22,y+(k%2)*2,25,11,'#eef5e966')}
 for(let layer=0;layer<2;layer++){const speed=layer===0?.14:.3,ybase=layer===0?365:392;for(let i=-1;i<9;i++){const x=i*195-(cam*speed)%195;poly([[x-120,H],[x-55,ybase-20],[x+10,ybase-100-hash(i+layer*200)*56],[x+52,ybase-53],[x+94,ybase-15],[x+230,H]],layer===0?zone.mount:zone.forest);if(layer===0){poly([[x-20,ybase-77],[x+10,ybase-100-hash(i+layer*200)*56],[x+39,ybase-75]],'#dae1e279')}}}
 // Silhouettes of towers, ancient pines and mossy trees.
 for(let i=-1;i<13;i++){const x=i*118-(cam*.47)%118,y=350+(i%4)*9;if((i+Math.floor(cam/118))%9===3){drawRuinsSilhouette(x,y,zone);continue}drawTree(x,y,zone,0)}
}
function drawRuinsSilhouette(x,y,z){fill(x-10,y-60,17,65,'#35415b');fill(x+32,y-95,24,100,'#35415b');fill(x+62,y-42,13,50,'#35415b');poly([[x+30,y-98],[x+44,y-120],[x+60,y-98]],'#35415b');fill(x+38,y-71,9,20,'#edb36c66')}
function drawTree(x,y,z,layer=1){
 const kind=zoneAt(player.x),f=hash(Math.round(x*2));cx.save();cx.globalAlpha=layer===0?.8:1;
 if(kind===2){
  // Ivy-covered columns and broken archways in the old kingdom.
  fill(x-12,y-99,25,111,'#4a5264');fill(x-18,y-103,36,9,'#8b8791');fill(x-20,y-10,39,14,'#717080');
  for(let j=0;j<5;j++){const xx=x-10+(j%2)*3;fill(xx,y-87+j*18,16,3,'#697187')}
  fill(x+10,y-99,4,87,'#547c6f');for(let j=0;j<9;j++){const yy=y-96+j*10,xx=x+11+(j%3-1)*7;fill(xx,yy,11,6,j%2?'#42675c':'#668775')}
  fill(x-12,y-122,28,5,'#cfbb8b');for(let j=0;j<4;j++)fill(x-7+j*8,y-118,2,7,'#decead');
  if(f>.52){ellipse(x-2,y-122,7,7,'#63d3dd77');ellipse(x-2,y-122,3,3,'#cfffe0')}
 } else if(kind===1){
  // Dense deciduous canopy, tangled branches and foliage texture.
  fill(x-7,y-90,17,130,'#2a3f3b');fill(x-12,y-43,6,50,'#3e5b4d');
  poly([[x-4,y-57],[x-47,y-105],[x-43,y-114],[x+1,y-78]],'#38564c');poly([[x+2,y-71],[x+41,y-130],[x+47,y-116],[x+9,y-56]],'#2c4f47');
  const cl=[[x-36,y-133,36,33],[x-9,y-161,36,34],[x+29,y-138,37,33],[x-6,y-116,50,37]];
  for(let i=0;i<cl.length;i++){const [px,py,rx,ry]=cl[i];ellipse(px,py,rx,ry,i%2?'#246650':'#1e584a');ellipse(px-8,py-7,rx*.77,ry*.62,i%2?'#3d8663':'#367959')}
  for(let i=0;i<35;i++){const xx=x-62+hash(i*117+Math.floor(x))*118,yy=y-189+hash(i*19+Math.floor(x))*100;const d=(xx-x)*(xx-x)/4600+(yy-(y-144))*(yy-(y-144))/2300;if(d<1){fill(xx,yy,i%3===0?5:3,i%4===0?4:3,i%5===0?'#96a978':i%3?'#4a976d':'#72af77')}}
 }else{
  // Pixel-shaded alpine spruce with imperfect branches, needles and twinkling highlights.
  fill(x-6,y-89,15,118,'#364f49');fill(x+1,y-75,4,101,'#63745b');
  for(let i=0;i<5;i++){const yy=y-37-i*25,w=43-i*6;poly([[x-w,yy+26],[x+1,yy-46],[x+w+5,yy+27],[x+12,yy+19],[x-9,yy+20]],i%2===0?'#225d56':'#2b7161');poly([[x-w*.72,yy+10],[x,yy-36],[x+8,yy+14]],i%2===0?'#4b9580':'#62a187')}
  for(let i=0;i<26;i++){const xx=x-35+hash(i*7+Math.floor(x))*70,yy=y-166+hash(i*17+Math.floor(x))*121;if(Math.abs(xx-x)<(y-yy)*.36+4){fill(xx,yy,i%4===0?4:3,2,i%5===0?'#b6be84':'#4c9176')}}
 }
 cx.restore();}
function drawCastle(){const x=END-cam+20;if(x<-200||x>W+250)return;fill(x-8,GROUND-206,174,206,'#4b5364');fill(x+3,GROUND-221,36,221,'#535a6a');fill(x+117,GROUND-243,36,243,'#51586a');poly([[x-2,GROUND-222],[x+21,GROUND-267],[x+44,GROUND-222]],'#8f5c65');poly([[x+110,GROUND-244],[x+134,GROUND-300],[x+157,GROUND-244]],'#835e76');for(let i=0;i<6;i++)fill(x+i*28,GROUND-207,16,19,'#657184');fill(x+64,GROUND-76,49,77,'#1a253d');poly([[x+64,GROUND-76],[x+88,GROUND-122],[x+113,GROUND-76]],'#1a253d');for(const dx of [15,129]){fill(x+dx,GROUND-168,10,20,'#e5bd7b')} }
function drawGround(){const zone=zones[zoneAt(player.x)];const first=Math.floor(cam/32)-1,last=Math.ceil((cam+W)/32)+2;for(let i=first;i<=last;i++){const wx=i*32,x=wx-cam;const middle=wx+16;if(gapAt(middle)){if(i>0&&i%4===0){fill(x,GROUND+160,27,2,'#607e81a0')}continue}
 fill(x,GROUND,33,H-GROUND,zone.floor);fill(x,GROUND,33,11,'#3e5640');fill(x,GROUND,33,5,zone.grass);fill(x,GROUND+11,33,6,'#627e4d');for(let n=0;n<6;n++){const py=GROUND+22+n*18+hash(i*33+n)*5,xx=x+hash(i*9+n)*27;fill(xx,py,3+n%2,2,n%3?'#706d59':'#263940')}
 const f=hash(i*7);if(f>.72){fill(x+8,GROUND-6,3,7,'#d6bb75');fill(x+11,GROUND-12,2,6,'#d6bb75');fill(x+11,GROUND-16,5,5,f>.87?'#ee9da0':'#f2daaa')}else if(f<.15){fill(x+13,GROUND-8,2,8,'#a4c69a');fill(x+18,GROUND-6,2,6,'#a4c69a')}}
 for(const pit of pits){const x=pit.x-cam;if(x>W+70||x+pit.w< -70)continue;fill(x,GROUND,Math.min(pit.w,W),H-GROUND,'#0c2036');fill(x-11,GROUND-7,11,20,'#5c6f5a');fill(x+pit.w,GROUND-7,11,20,'#5c6f5a');for(let j=0;j<7;j++){const yy=GROUND+23+j*26;fill(x+pit.w*.38,yy,2,4,'#cfddba45')}}
 // Runes in the last zone and gateways between chapters.
 for(const spec of [{x:2100,name:'Ⅱ'},{x:4350,name:'Ⅲ'}]){let x=spec.x-cam;if(x< -140||x>W+140)continue;fill(x-38,GROUND-154,25,154,'#62687b');fill(x+58,GROUND-154,25,154,'#62687b');fill(x-43,GROUND-166,131,18,'#8d8d9d');fill(x-32,GROUND-155,10,7,'#b7aa97');fill(x+67,GROUND-155,10,7,'#b7aa97');for(let i=0;i<5;i++){fill(x-18+i*17,GROUND-163,3,12,'#e1c77b')} }
 drawCastle();}
function drawCoin(c){const x=c.x-cam,y=c.y+Math.sin(frame*5+c.x)*4;if(x< -50||x>W+50)return;cx.save();cx.translate(x,y);const squash=.34+.66*Math.abs(Math.cos(frame*3.5+c.x*.02));cx.scale(squash,1);if(coinImage.complete&&coinImage.naturalWidth){cx.drawImage(coinImage,-18,-18,36,36)}else{ellipse(0,0,14,14,'#f1c55e');ellipse(0,0,10,10,'#ffe5a4');cx.fillStyle='#846125';cx.font='bold 14px serif';cx.fillText('π',-6,5)}cx.restore();}
function drawRunes(){for(const s of stars){if(s.hit)continue;const x=s.x-cam,y=s.y+Math.sin(frame*2+s.x)*4;if(x< -60||x>W+60)continue;cx.globalAlpha=.15;ellipse(x,y,31,35,'#62fff4');cx.globalAlpha=1;poly([[x,y-22],[x+16,y],[x,y+22],[x-16,y]],'#a7f8f2');poly([[x,y-17],[x+10,y],[x,y+17],[x-10,y]],'#357fb4');cx.strokeStyle='#e7fff3';cx.lineWidth=3;cx.beginPath();cx.moveTo(x-6,y-2);cx.lineTo(x,y-10);cx.lineTo(x+6,y-2);cx.stroke()}}
function bat(x,y){cx.save();cx.translate(x,y);const q=Math.sin(frame*10+x)*8;poly([[-8,-2],[-22,-19-q],[-30,-5-q],[-43,-12-q],[-35,11],[-13,8]],'#312247');poly([[8,-2],[22,-19-q],[30,-5-q],[43,-12-q],[35,11],[13,8]],'#312247');poly([[-8,-2],[-21,-13-q],[-25,7],[-12,4]],'#77537e');poly([[8,-2],[21,-13-q],[25,7],[12,4]],'#77537e');ellipse(0,0,17,17,'#342a55');poly([[-14,-9],[-7,-27],[-1,-11]],'#342a55');poly([[1,-11],[7,-27],[14,-9]],'#342a55');ellipse(-7,-2,3,4,'#ffe77f');ellipse(7,-2,3,4,'#ffe77f');cx.restore()}
function drawEnemy(m){if(!m.alive)return;const x=m.x-cam;if(x< -85||x>W+85)return;if(m.type==='bat'){bat(x,GROUND-155+Math.sin(frame*5+m.x)*14);return}const y=GROUND-47+Math.sin(frame*4+m.x)*3;ellipse(x,GROUND-2,28,5,'#162b30a0');cx.save();cx.translate(x,y+34);const squash=1+Math.sin(frame*5+m.x)*.06;cx.scale(1/squash,squash);if(slimeImage.complete&&slimeImage.naturalWidth)cx.drawImage(slimeImage,-39,-69,78,70);else{ellipse(0,-20,30,27,'#6f3f9a');ellipse(-10,-23,6,7,'#ffd57a');ellipse(10,-23,6,7,'#ffd57a');poly([[-8,-9],[0,0],[8,-9]],'#24142f')}cx.restore()}
function drawHero(){const x=player.x-cam,y=player.y;if(invuln>0&&Math.floor(invuln*14)%2)return;if(!falling&&y+PH<=GROUND+10)ellipse(x+PW/2,GROUND-5,29,6,'#14233988');cx.save();cx.translate(x+PW/2,y+PH/2);if(falling)cx.rotate(Math.min(1.4,(y+PH-GROUND)/72));else if(player.vy< -90)cx.rotate(-.08);else if(player.vy>100)cx.rotate(.11);else if(state==='running')cx.rotate(Math.sin(frame*11)*.012);if(hero&&hero.complete&&hero.naturalWidth){cx.drawImage(hero,-PW/2-4,-PH/2-6,PW+8,PH+12)}else{ellipse(0,-14,22,23,'#f3b27c');poly([[-21,-32],[-2,-52],[18,-34]],'#67443c');fill(-20,4,41,29,'#2b4f80');fill(-18,27,13,14,'#7a423e');fill(5,27,13,14,'#7a423e')}cx.restore()}
function drawAtmosphere(){for(let i=0;i<dust.length;i++){const d=dust[i],x=d.x-cam;if(x< -10||x>W+10)continue;cx.globalAlpha=Math.max(0,d.life/.8);fill(x,d.y,d.size,d.size,d.clr)}cx.globalAlpha=1;const z=zoneAt(player.x);if(z===1){for(let i=0;i<12;i++){const x=((i*123+hash(i)*50-cam*.7)%(W+140)+(W+140))%(W+140);const y=132+hash(i*21)*220;const a=.15+.22*(1+Math.sin(frame*3+i))/2;cx.globalAlpha=a;ellipse(x,y,3,3,'#b1ffd3')}cx.globalAlpha=1}if(z===2){for(let i=0;i<21;i++){const x=((i*73+hash(i)*20-cam*.6)%(W+80)+(W+80))%(W+80),y=79+hash(i*31)*250;cx.globalAlpha=.2+.2*Math.sin(i+frame);fill(x,y,3,3,'#e9c5a3')}cx.globalAlpha=1}}
function draw(){if(!cx)return;sky();drawGround();for(const c of coins)if(!c.hit)drawCoin(c);drawRunes();for(const m of mobs)drawEnemy(m);drawHero();drawAtmosphere();if(zoneBanner>0&&state==='running'){const fade=Math.min(1,zoneBanner*2,(2.1-zoneBanner)*3+1);cx.save();cx.globalAlpha=Math.max(.1,fade)*.88;fill(298,166,365,78,'#12243b');cx.strokeStyle='#dcb87e';cx.lineWidth=2;cx.strokeRect(298,166,365,78);cx.fillStyle='#ffe2a0';cx.textAlign='center';cx.font='900 26px system-ui';cx.fillText(zones[priorZone].name,480,216);cx.restore()}if(state==='intro'){cx.fillStyle='#14233a22';cx.fillRect(0,0,W,H)}}
wallet();loadHero();coins=coinSpots.map(x=>({x,y:GROUND-65,hit:false}));mobs=mobSpec.map(m=>({...m,alive:true}));stars=shards.map(s=>({...s,hit:false}));setHud();draw();
})();

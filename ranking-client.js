/* マスピード Spark無料版 全国ランキング：Firebase Realtime Database / Anonymous Auth */
(function(){'use strict';
 const GAMES={slime:{unit:'m',max:100000},tower:{unit:'階',max:1000}};
 let ready;
 function init(){if(ready)return ready;ready=(async()=>{
  if(!window.firebase||!window.MS_RANK_FIREBASE_CONFIG)throw Error('Firebaseの読み込みまたは設定がありません');
  const app=firebase.apps.length?firebase.app():firebase.initializeApp(window.MS_RANK_FIREBASE_CONFIG);
  const auth=firebase.auth(app);
  let user=auth.currentUser;
  if(!user)user=(await auth.signInAnonymously()).user;
  return {auth,db:firebase.database(app),uid:user.uid};
 })();return ready;}
 function node(g){if(!GAMES[g])throw Error('不明なゲーム');return 'leaderboards/'+g+'/scores';}
 function check(g,score){return GAMES[g]&&Number.isInteger(score)&&score>=0&&score<=GAMES[g].max;}
 async function top3(g){const {db}=await init();const snap=await db.ref(node(g)).orderByChild('score').limitToLast(3).once('value');
  const arr=[];snap.forEach(s=>{const score=s.child('score').val();if(check(g,score))arr.push({uid:s.key,score});});
  arr.sort((a,b)=>b.score-a.score||a.uid.localeCompare(b.uid));return arr;}
 async function myBest(g){const {db,uid}=await init();const snap=await db.ref(node(g)+'/'+uid+'/score').once('value');const score=snap.val();return check(g,score)?score:null;}
 async function submit(g,score){if(!check(g,score))throw Error('記録の形式が正しくありません');
  const {db,uid}=await init();const ref=db.ref(node(g)+'/'+uid);
  const result=await ref.transaction(current=>{
   if(current&&typeof current.score==='number'&&current.score>=score)return;
   return {score};
  },undefined,false);
  const rows=await top3(g);const index=rows.findIndex(x=>x.uid===uid);
  return {updated:result.committed,rank:index>=0?index+1:null,best:await myBest(g),top:rows.map(x=>x.score)};
 }
 window.MSRanking={init,top3,myBest,submit};
})();

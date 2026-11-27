/* 百鬼夜行 v11.3.4 — test trigger for the native 32px secret-base roaming sprite. */
(()=>{'use strict';
const byId=id=>document.getElementById(id);
function show(){const ctl=window.__secretBaseDev;
 if(!ctl?.catTest)return false;
 const ok=ctl.catTest('sune');
 const status=byId('hyakkiSuneTestStatus');
 if(status)status.textContent=ok?'✅ すねこすりがいつものねこと同じように室内を歩いているよ（報酬・抽選記録は変わらない）':'⚠ 空きマスがないため、登場できなかったよ';
 return ok;
}
function install(){if(new URLSearchParams(location.search).get('hyakki_test')!=='1')return;const anchor=document.querySelector('.cat-hint');if(!anchor||byId('hyakkiSuneTestButton'))return;
 const row=document.createElement('div');row.className='hyakki-sune-test-controls';
 row.innerHTML='<button type="button" id="hyakkiSuneTestButton">🧪 すねこすりを部屋に呼ぶ（歩行テスト）</button><span id="hyakkiSuneTestStatus">きせきねこと同じ確率・5,000コイン。テストでコインは増えません。</span>';
 anchor.after(row);byId('hyakkiSuneTestButton').onclick=show;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
window.MasHyakkiSuneTest={show,odds:()=>Number(window.__secretBaseDev?.miracleOdds?.()||0),active:()=>window.__secretBaseDev?.catDevStatus?.().type==='sune'};
})();

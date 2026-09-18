import {formatElapsed} from './settings.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function historyEntry(entity,seconds,dictionary){
  if(entity.type!=='word')return {seconds,type:entity.type,correct:false};
  return {seconds,type:'word',correct:entity.correct,target:{...entity.target},chosen:{...dictionary.find(w=>w.en===entity.word),en:entity.word}};
}
const pronunciation=ipa=>ipa?`<small class="history-ipa">[${escape(ipa)}]</small>`:'';
export function historyMarkup(entries){
  const rows=entries.slice().reverse().map(e=>{
    const status=e.correct?'Верно · +1':e.type==='word'?'Неверно · −1':'Столкновение · −1';
    const words=e.type==='word'?`<div class="history-pair"><div>${escape(e.target.ru)}${pronunciation(e.target.ruIPA)}</div><div>Правильно: <b>${escape(e.target.en)}</b>${pronunciation(e.target.enIPA)}</div></div>${!e.correct?`<div class="history-choice">Выбрано: <b>${escape(e.chosen.en)}</b>${pronunciation(e.chosen.enIPA)}</div>`:''}`:`<div>${e.type==='person'?'Встречный персонаж':'Препятствие на дорожке'}</div>`;
    return `<li><div class="history-meta"><b class="${e.correct?'good':'bad'}">${status}</b><time>${formatElapsed(e.seconds)}</time></div>${words}</li>`;
  }).join('');
  return `<section class="run-history" aria-label="История забега"><h2>История забега <span>${entries.length}</span></h2><div class="history-scroll" tabindex="0" role="region" aria-label="Слова и столкновения">${entries.length?`<ol>${rows}</ol>`:'<p class="history-empty">Здесь появятся собранные слова и столкновения.</p>'}</div></section>`;
}

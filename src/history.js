import {languages} from './languages.js';
import {formatElapsed} from './settings.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function historyEntry(entity,seconds,dictionary){
  if(entity.type!=='word')return {seconds,type:entity.type,correct:false};
  return {seconds,type:'word',correct:entity.correct,target:{...entity.target},sourceLanguage:entity.sourceLanguage||'ru',answerLanguage:entity.answerLanguage||'en',chosen:{...dictionary.find(w=>w[entity.answerLanguage||'en']===entity.word),[entity.answerLanguage||'en']:entity.word}};
}
const pronunciation=(ipa,language)=>ipa?`<a class="history-ipa" href="https://ipa-reader.com/?text=${escape(encodeURIComponent('['+ipa+']'))}&amp;voice=${encodeURIComponent(languages[language].ipaVoice)}" target="_blank" rel="noopener noreferrer" title="Послушать IPA Reader · откроется новая вкладка">[${escape(ipa)}]</a>`:'';
const play=(word,lang,enabled)=>` <button type="button" class="history-play" data-speak="${escape(word)}" data-lang="${lang}" aria-label="Произнести ${escape(word)}"${enabled?'':' disabled'}>▶</button>`;
export function historyMarkup(entries,speechEnabled=true){
  const rows=entries.slice().reverse().map(e=>{
    const source=e.sourceLanguage||'ru',answer=e.answerLanguage||'en';
    const status=e.correct?'Верно · +1':e.type==='word'?'Неверно · −1':'Столкновение · −1';
    const words=e.type==='word'?`<div class="history-pair"><div>${escape(e.target[source])}${play(e.target[source],languages[source].speech,speechEnabled)}${pronunciation(e.target[source+'IPA'],source)}</div><div>Правильно: <b>${escape(e.target[answer])}</b>${play(e.target[answer],languages[answer].speech,speechEnabled)}${pronunciation(e.target[answer+'IPA'],answer)}</div></div>${!e.correct?`<div class="history-choice">Выбрано: <b>${escape(e.chosen[answer])}</b>${play(e.chosen[answer],languages[answer].speech,speechEnabled)}${pronunciation(e.chosen[answer+'IPA'],answer)}</div>`:''}`:`<div>${e.type==='person'?'Встречный персонаж':'Препятствие на дорожке'}</div>`;
    return `<li><div class="history-meta"><b class="${e.correct?'good':'bad'}">${status}</b><time>${formatElapsed(e.seconds)}</time></div>${words}</li>`;
  }).join('');
  return `<section class="run-history" aria-label="История забега"><h2>История забега <span>${entries.length}</span></h2><small id="speech-status" role="status" aria-live="polite"></small><div class="history-scroll" tabindex="0" role="region" aria-label="Слова и столкновения">${entries.length?`<ol>${rows}</ol>`:'<p class="history-empty">Здесь появятся собранные слова и столкновения.</p>'}</div></section>`;
}

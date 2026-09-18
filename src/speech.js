// Speak words, not IPA notation: the device voice supplies the pronunciation.
export class Pronunciation {
  constructor(synth=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance){
    this.synth=synth;this.Utterance=Utterance;this.settings={};
  }
  get available(){return Boolean(this.synth&&this.Utterance);}
  voiceStatus(lang){
    if(!this.available)return 'Озвучивание не поддерживается';
    const voices=this.synth.getVoices();
    if(!voices.length)return 'Браузер пока не сообщил список голосов';
    const matching=voices.filter(v=>String(v.lang).replaceAll('_','-').toLowerCase().split('-')[0]===lang.toLowerCase().split('-')[0]);
    if(matching.some(v=>v.localService))return 'Доступен голос устройства';
    if(matching.length)return 'Доступен сетевой голос';
    return 'Голос не найден в списке браузера';
  }
  configure(settings){this.settings=settings;if(settings.muted||!settings.pronunciation||settings.speechVolume===0)this.stop();}
  stop(){
    clearTimeout(this.pending);this.pending=null;
    const active=this.current;this.current=null;
    if(this.available&&(active||this.synth.speaking||this.synth.pending))this.synth.cancel();
  }
  schedule(text){
    clearTimeout(this.pending);
    // Leave the collision/render callback before entering the native speech engine.
    this.pending=setTimeout(()=>{this.pending=null;this.speak(text);},0);
  }
  speak(text,lang='en-US',manual=false,onStatus=()=>{}){
    const s=this.settings;
    if(!this.available||s.muted||s.speechVolume===0||(!manual&&!s.pronunciation)||!text)return false;
    this.stop();
    const normalize=tag=>String(tag).replaceAll('_','-').toLowerCase();
    const matching=this.synth.getVoices().filter(v=>normalize(v.lang).split('-')[0]===normalize(lang).split('-')[0]);
    matching.sort((a,b)=>Number(b.localService)-Number(a.localService));
    // Try language-only selection last: the OS may expose voices lazily.
    const candidates=[...matching,null];
    const attempt=()=>{
      const voice=candidates.shift(),u=new this.Utterance(text);
      u.lang=voice?voice.lang.replaceAll('_','-'):lang;u.volume=s.speechVolume??.8;u.rate=.9;
      if(voice)u.voice=voice;
      this.current=u;
      u.onstart=()=>{if(this.current===u)onStatus('');};
      u.onend=()=>{if(this.current===u){this.current=null;onStatus('');}};
      u.onerror=event=>{
        if(this.current!==u)return;
        if(['canceled','interrupted'].includes(event.error)){this.current=null;return;}
        if(candidates.length&&['voice-unavailable','language-unavailable','synthesis-failed','network'].includes(event.error)){attempt();return;}
        this.current=null;
        onStatus(event.error==='not-allowed'?'Браузер запретил озвучивание. Нажмите ▶ ещё раз.':lang.startsWith('ru')?'Не удалось озвучить слово. Проверьте, установлен ли русский голос в настройках речи устройства.':'Не удалось озвучить слово. Проверьте голос и настройки речи устройства.');
      };
      try{if(this.synth.paused)this.synth.resume?.();this.synth.speak(u);return true;}
      catch{this.current=null;onStatus('Озвучивание недоступно в этом браузере.');return false;}
    };
    return attempt();
  }
}

export const languages={
 ru:{label:'Русский',speech:'ru-RU',ipaVoice:'Maxim'},
 en:{label:'Английский',speech:'en-US',ipaVoice:'Ivy'},
 uz:{label:'Узбекский (латиница)',speech:'uz-UZ',ipaVoice:'Filiz'}
};
export function languagePair(source='ru',answer='en'){
 if(!Object.hasOwn(languages,source))source='ru';
 if(!Object.hasOwn(languages,answer)||answer===source)answer=Object.keys(languages).find(id=>id!==source);
 return {sourceLanguage:source,answerLanguage:answer};
}

export const languages={
 ru:{label:'Русский',speech:'ru-RU'},
 en:{label:'Английский',speech:'en-US'}
};
export function languagePair(source='ru',answer='en'){
 if(!Object.hasOwn(languages,source))source='ru';
 if(!Object.hasOwn(languages,answer)||answer===source)answer=Object.keys(languages).find(id=>id!==source);
 return {sourceLanguage:source,answerLanguage:answer};
}

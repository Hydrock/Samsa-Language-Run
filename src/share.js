export const gameShareUrl='https://hydrock.github.io/Samsa-Language-Run/';
export function shareUrl(settings){
 if(!settings)return gameShareUrl;
 const url=new URL(gameShareUrl);
 url.searchParams.set('from',settings.sourceLanguage);
 url.searchParams.set('to',settings.answerLanguage);
 url.searchParams.set('map',settings.location);
 return url.href;
}
export function shareData(score,settings){
  return {title:'Samsa Run',text:`Мой результат в Samsa Run — ${Math.max(0,Math.floor(score))} очков! Беги за самсу и изучай языки. Попробуешь?`,url:shareUrl(settings)};
}
export async function shareGame(score,platform=navigator,settings){
  const data=shareData(score,settings);
  if(typeof platform.share==='function'){
    try{await platform.share(data);return 'shared';}
    catch(error){if(error.name==='AbortError')return 'cancelled';}
  }
  try{await platform.clipboard.writeText(data.url);return 'copied';}
  catch{return 'manual';}
}

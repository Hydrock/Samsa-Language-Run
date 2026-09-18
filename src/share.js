export const gameShareUrl='https://hydrock.github.io/Samsa-Language-Run/';
export function shareData(score){
  return {title:'Samsa Run',text:`Мой результат в Samsa Run — ${Math.max(0,Math.floor(score))} очков! Беги за самсу и изучай языки. Попробуешь?`,url:gameShareUrl};
}
export async function shareGame(score,platform=navigator){
  const data=shareData(score);
  if(typeof platform.share==='function'){
    try{await platform.share(data);return 'shared';}
    catch(error){if(error.name==='AbortError')return 'cancelled';}
  }
  try{await platform.clipboard.writeText(data.url);return 'copied';}
  catch{return 'manual';}
}

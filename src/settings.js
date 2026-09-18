import {languagePair,languages} from './languages.js';
let locationIds=['park','museum'],defaultLocation='museum';
export function configureLocations(ids,defaultId){locationIds=[...ids];defaultLocation=defaultId;}
export const gameModes = {
  easy: { label: 'Лёгкая', speed: 13, gap: .625, obstacleChance: .20 },
  normal: { label: 'Обычная', speed: 16.4, gap: .225, obstacleChance: .33 },
  hard: { label: 'Сложная', speed: 23, gap: .06, obstacleChance: .45 },
};
export function normalizeSettings(value = {}) {
  return {
    ...languagePair(value?.sourceLanguage,value?.answerLanguage),
    muted: value?.muted === true,
    music: value?.music !== false,
    pronunciation: value?.pronunciation === true,
    speechVolume: Number.isFinite(value?.speechVolume) ? Math.max(0,Math.min(1,value.speechVolume)) : .8,
    effectsVolume: Number.isFinite(value?.effectsVolume) ? Math.max(0,Math.min(1,value.effectsVolume)) : 1,
    musicVolume: Number.isFinite(value?.musicVolume) ? Math.max(0,Math.min(1,value.musicVolume)) : .3,
    autoMusic: value?.autoMusic === true,
    transcription: value?.transcription !== false,
    track: ['main', 'folk', 'morning', 'evening', 'silkroad'].includes(value?.track) ? value.track : 'folk',
    location: locationIds.includes(value?.location) ? value.location : defaultLocation,
    mode: Object.hasOwn(gameModes, value?.mode) ? value.mode : 'normal',
  };
}
export function collectsWord(horizontalDistance, jumpHeight) {
  return Math.abs(horizontalDistance) < 1.05 && jumpHeight < .8;
}
export function formatElapsed(seconds) {
  const total=Math.max(0,Math.floor(seconds));
  return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}

// URL overrides only known fields; conflicting language pairs leave the pair unchanged.
export function settingsFromQuery(current,search){
 const result={...current},params=new URLSearchParams(search);
 const from=params.getAll('from'),to=params.getAll('to'),map=params.getAll('map');
 const source=from.length===1&&Object.hasOwn(languages,from[0])?from[0]:current.sourceLanguage;
 const answer=to.length===1&&Object.hasOwn(languages,to[0])?to[0]:current.answerLanguage;
 if(source!==answer){result.sourceLanguage=source;result.answerLanguage=answer;}
 if(map.length===1&&locationIds.includes(map[0]))result.location=map[0];
 return result;
}

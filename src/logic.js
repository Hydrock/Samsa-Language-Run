import {vocabulary} from './vocabulary.js';
import {phonetics} from './phonetics.js';
export const dictionary=vocabulary.map(word=>({...word,...(phonetics[word.en]?{ruIPA:phonetics[word.en][0],enIPA:phonetics[word.en][1]}:{})}));
export const levelNames=['ПЕРВЫЕ СЛОВА','ЦВЕТА И ПРИЗНАКИ','ДЕЙСТВИЯ','МИР ВОКРУГ','ПОВСЕДНЕВНАЯ ЖИЗНЬ','УЧЁБА И РАБОТА','ТОЧНЫЕ ДЕЙСТВИЯ','ОПИСАНИЯ','МЫСЛИ И ЧУВСТВА','СЛОЖНЫЕ ПОНЯТИЯ'];
export function difficulty(score){return Math.min(10,1+Math.floor(Math.max(0,score)/5));}
const pools=Array.from({length:10},(_,i)=>dictionary.filter(w=>w.weight===i+1));
export function chooseWord(score,previous,random=Math.random){
  const level=difficulty(score);
  const weight=level>1&&random()<.25?level-1:level;
  const pool=pools[weight-1].filter(w=>w.en!==previous);
  return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
}
// After 2–4 decoys the next candidate is guaranteed correct. Earlier chance rises.
export function correctChance(misses){return misses>=4?1:0.22+misses*0.19;}
export function nextCandidate(target,misses,random=Math.random){const correct=random()<correctChance(misses);const pool=dictionary.filter(w=>w.en!==target.en&&w.weight<=target.weight);return {word:correct?target.en:pool[Math.floor(random()*pool.length)].en,correct,misses:correct?0:misses+1};}
export function updateScore(score,delta){const next=score+delta;return {score:next,gameOver:next<0};}

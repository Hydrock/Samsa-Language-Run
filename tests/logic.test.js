import {historyEntry,historyMarkup} from '../src/history.js';
import {obstacleAppearance,validateMaps,decorationSlots} from '../src/locations.js';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../src/maps/index.json',import.meta.url)));
const mapDefinitions=manifest.maps.map(file=>JSON.parse(readFileSync(new URL(`../src/maps/${file}`,import.meta.url))));
const mapById=Object.fromEntries(mapDefinitions.map(map=>[map.id,map]));
import test from 'node:test';import assert from 'node:assert/strict';
import {characterPose} from '../src/character.js';
test('running frames alternate with distance, stay frozen on pause and yield to jumps',()=>{
  const pose=(distance,state='playing',airborne=false)=>characterPose(state,'playing',0,1,airborne,distance);
  assert.equal(pose(0),'run-a');assert.equal(pose(1.59),'run-a');
  assert.equal(pose(1.6),'run-b');assert.equal(pose(3.2),'run-a');
  assert.equal(pose(2,'paused'),'run-b');assert.equal(pose(2,'settings'),'run-b');
  assert.equal(pose(2,'playing',true),'jump');
});
test('character faces back while running and celebrates before start',()=>{
  assert.equal(characterPose('intro','intro',0,1),'happy');
  assert.equal(characterPose('playing','intro',0,1),'run-a');
  assert.equal(characterPose('over','playing',.3,1),'sad');
});
test('lane changes choose the directional pose and then return to back view',()=>{
  assert.equal(characterPose('playing','playing',.3,-1),'left');
  assert.equal(characterPose('playing','playing',.3,1),'right');
  assert.equal(characterPose('playing','playing',0,-1),'run-a');
  assert.equal(characterPose('settings','intro',0,1),'happy');
  assert.equal(characterPose('settings','over',0,1),'sad');
});
import {dictionary,difficulty,chooseWord,correctChance,nextCandidate,updateScore} from '../src/logic.js';
import {gameModes,normalizeSettings,collectsWord,formatElapsed} from '../src/settings.js';
test('timer formats elapsed minutes and seconds without wrapping at an hour',()=>{
  assert.equal(formatElapsed(0),'00:00');assert.equal(formatElapsed(59.9),'00:59');
  assert.equal(formatElapsed(60),'01:00');assert.equal(formatElapsed(3601),'60:01');
});
test('every vocabulary entry includes pronunciations for both languages',()=>{
  for(const word of dictionary){assert.ok(word.ruIPA,word.ru);assert.ok(word.enIPA,word.en);}
  assert.equal(dictionary.find(w=>w.en==='cat').enIPA,'kæt');
});
test('transcription defaults on for new and existing saved preferences',()=>{
  assert.equal(normalizeSettings().transcription,true);
  assert.equal(normalizeSettings({mode:'hard'}).transcription,true);
  assert.equal(normalizeSettings({transcription:false}).transcription,false);
});
import {GameAudio} from '../src/audio.js';
test('jump pose lasts until landing and respects lane and terminal poses',()=>{
  assert.equal(characterPose('playing','intro',0,1,true),'jump');
  assert.equal(characterPose('playing','intro',0,1,false),'run-a');
  assert.equal(characterPose('playing','intro',.2,-1,true),'left');
  assert.equal(characterPose('paused','playing',0,1,true),'jump');
  assert.equal(characterPose('over','playing',0,1,true),'sad');
});
test('movement sounds are quiet effects and respect master mute without music',()=>{
  const audio=new GameAudio(),notes=[];
  audio.context={currentTime:0};audio.master={gain:{value:1}};
  audio.unlock=()=>{};audio.note=(...args)=>notes.push(args);
  audio.configure({muted:false,music:false,track:'morning'});
  audio.movement('jump');assert.equal(notes.length,2);
  audio.movement('lane');assert.equal(notes.length,3);
  assert.ok(notes.every(n=>n[3]<=.024&&n[5]===false));
  audio.configure({muted:true,music:false,track:'morning'});
  audio.movement('jump');audio.movement('lane');assert.equal(notes.length,3);
});
import {phaseAt} from '../src/atmosphere.js';
test('day cycle advances each minute, blends and loops back to morning',()=>{
  assert.deepEqual(phaseAt(0),{index:0,previous:3,blend:1});
  assert.equal(phaseAt(59.99).index,0);
  for(let i=1;i<=4;i++){
    assert.equal(phaseAt(i*60).index,i%4);
    assert.equal(phaseAt(i*60).blend,0);
    assert.equal(phaseAt(i*60+2.5).blend,.5);
    assert.equal(phaseAt(i*60+5).blend,1);
  }
  assert.equal(phaseAt(480).index,0);
});
test('music pauses, switches arrangements and mutes independently from effects',()=>{
  const audio=new GameAudio(),notes=[];
  audio.context={currentTime:0};
  audio.master={gain:{value:1}};
  audio.note=(...args)=>notes.push(args);
  audio.unlock=()=>{};
  try{
    audio.configure({muted:false,music:true,track:'morning'});
    assert.equal(audio.timer,null);
    audio.setPlaying(true);
    assert.ok(audio.timer);assert.equal(notes[0][0],72);
    audio.setPlaying(false);assert.equal(audio.timer,null);
    notes.length=0;
    audio.configure({muted:false,music:true,track:'evening'});
    audio.setPlaying(true);assert.equal(notes[0][0],69);
    audio.configure({muted:false,music:true,track:'silkroad'});
    assert.equal(notes.at(-4)[0],74);
    audio.configure({muted:false,music:false,track:'silkroad'});
    assert.equal(audio.timer,null);
    notes.length=0;audio.effect(true);assert.equal(notes.length,4);
    audio.configure({muted:true,music:true,track:'evening'});
    assert.equal(audio.master.gain.value,0);assert.equal(audio.timer,null);
    notes.length=0;audio.effect(false);assert.equal(notes.length,0);
  }finally{audio.setPlaying(false);}
});
test('jumped words are skipped and landings collect again',()=>{
  assert.equal(collectsWord(0,0),true);
  assert.equal(collectsWord(0,.79),true);
  assert.equal(collectsWord(0,.8),false);
  assert.equal(collectsWord(0,1.4),false);
  assert.equal(collectsWord(3.2,0),false);
  assert.equal(collectsWord(0,0),true);
});
test('harder modes increase speed, obstacles and expected word frequency',()=>{
  const modes=[gameModes.easy,gameModes.normal,gameModes.hard];
  for(let i=1;i<modes.length;i++){
    const a=modes[i-1],b=modes[i];
    assert.ok(b.speed>a.speed);assert.ok(b.obstacleChance>a.obstacleChance);assert.ok(b.gap<a.gap);
    const wordRate=m=>(1-m.obstacleChance)/(41/m.speed+m.gap);
    assert.ok(wordRate(b)>wordRate(a));
  }
});
test('settings survive serialization and invalid saved values use defaults',()=>{
  const preferences={musicVolume:.3,muted:true,music:false,autoMusic:true,track:'evening',mode:'hard',transcription:false,location:'museum'};
  assert.deepEqual(normalizeSettings(JSON.parse(JSON.stringify(preferences))),preferences);
  assert.deepEqual(normalizeSettings({track:'invalid',mode:'toString'}),normalizeSettings());
  assert.deepEqual(normalizeSettings(null),normalizeSettings());
});
test('difficulty follows current score, including a decrease',()=>{assert.equal(difficulty(0),1);assert.equal(difficulty(24),5);assert.equal(difficulty(7),2);assert.equal(difficulty(-1),1);});
test('dictionary is unique and easy words remain accessible',()=>{assert.equal(new Set(dictionary.map(w=>w.en)).size,dictionary.length);for(let i=0;i<100;i++){const w=chooseWord(0,'cat');assert.equal(w.weight,1);assert.notEqual(w.en,'cat');}});
test('correct translation becomes guaranteed after misses',()=>{const target=dictionary[0];let misses=0;for(let i=0;i<5;i++){const c=nextCandidate(target,misses,()=>.999);if(i<4){assert.equal(c.correct,false);assert.notEqual(c.word,target.en);}else{assert.equal(c.correct,true);assert.equal(c.word,'cat');}misses=c.misses;}assert.equal(misses,0);assert.ok(correctChance(2)>correctChance(1));});
test('zero is playable, negative ends run',()=>{assert.deepEqual(updateScore(1,-1),{score:0,gameOver:false});assert.deepEqual(updateScore(0,-1),{score:-1,gameOver:true});assert.deepEqual(updateScore(0,1),{score:1,gameOver:false});});

test('1000 distinct words cover all ten levels equally',()=>{
  assert.equal(dictionary.length,1000);
  for(let level=1;level<=10;level++)assert.equal(dictionary.filter(w=>w.weight===level).length,100);
  assert.equal(new Set(dictionary.map(w=>w.ru)).size,1000);
});
test('five points unlock each tier and losing points lowers it',()=>{
  for(let score=0;score<=55;score++)assert.equal(difficulty(score),Math.min(10,1+Math.floor(score/5)));
  assert.equal(difficulty(50),10);assert.equal(difficulty(40),9);assert.equal(difficulty(4),1);
  for(let score=0;score<=50;score+=5){
    const level=difficulty(score);
    for(const seed of [.1,.5,.99]){
      const word=chooseWord(score,null,()=>seed);
      assert.ok(word.weight<=level&&word.weight>=Math.max(1,level-1));
    }
  }
});

 test('locations preserve obstacle categories and old settings default to museum',()=>{
   assert.equal(normalizeSettings().location,'museum');
   assert.equal(normalizeSettings({location:'park'}).location,'park');
   assert.equal(normalizeSettings({location:'unknown'}).location,'museum');
   for(let i=0;i<5;i++){
     assert.ok(['guide','photographer','guard'].includes(obstacleAppearance(mapById.museum,'person',i).name));
     assert.ok(['rope','crate'].includes(obstacleAppearance(mapById.museum,'barrier',i).name));
   }
   assert.equal(obstacleAppearance(mapById.park,'person',0).name,'scooter');
 });

test('MP3 loads only when selected and playing, pauses and releases on switching',async()=>{
  const created=[];
  const audio=new GameAudio(()=>{
    const media={paused:true,currentTime:12,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;},removeAttribute(){this.src='';},load(){this.released=true;}};
    created.push(media);return media;
  });
  assert.equal(normalizeSettings().track,'main');
  audio.configure({track:'main',music:true,muted:false});
  assert.equal(created.length,0);
  audio.setPlaying(true);await Promise.resolve();
  const media=created[0];assert.equal(media.loop,true);assert.equal(media.preload,'none');
  assert.match(media.src,/main-theme.mp3$/);assert.equal(media.paused,false);
  audio.setPlaying(false);assert.equal(media.paused,true);assert.equal(media.currentTime,12);
  audio.setPlaying(true);assert.equal(created.length,1);
  audio.configure({track:'main',music:false,muted:false});assert.equal(media.paused,true);
  audio.configure({track:'main',music:true,muted:true});assert.equal(media.paused,true);
  audio.configure({track:'morning',music:true,muted:false});assert.equal(media.released,true);assert.equal(audio.media,null);
  audio.setPlaying(false);audio.configure({track:'main',music:true,muted:false});assert.equal(created.length,1);
});

test('history snapshots answers before target changes and displays both pronunciations',()=>{
 const target={ru:'Кошка',en:'cat',ruIPA:'kot',enIPA:'kat'};
 const entry=historyEntry({type:'word',correct:false,target,word:'dog'},65,[{en:'dog',enIPA:'dog-ipa'}]);
 target.en='changed';assert.equal(entry.target.en,'cat');
 const html=historyMarkup([entry]);
 for(const text of ['Неверно','Кошка','cat','dog','dog-ipa','kot','kat','01:05'])assert.ok(html.includes(text));
 const good=historyEntry({type:'word',correct:true,target:entry.target,word:'cat'},70,[]);
 assert.ok(historyMarkup([good]).includes('Верно · +1'));
 assert.ok(historyMarkup([historyEntry({type:'barrier'},80,[])]).includes('Препятствие'));
 assert.ok(historyMarkup([]).includes('Здесь появятся'));
 entry.target.ru='<script>';assert.ok(!historyMarkup([entry]).includes('<script>'));
});

test('automatic playlist advances lazily, wraps, and respects pause and repeat',()=>{
 const made=[];
 const audio=new GameAudio(()=>{const m={paused:true,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;},removeAttribute(){},load(){}};made.push(m);return m;});
 audio.configure({track:'main',music:true,muted:false,autoMusic:true});audio.setPlaying(true);
 assert.equal(made[0].loop,false);made[0].onended();assert.equal(audio.settings.track,'folk');
 assert.equal(made.length,2);assert.match(made[1].src,/folk.mp3$/);assert.equal(made[0].onended,null);
 audio.setPlaying(false);audio.nextTrack();assert.equal(audio.settings.track,'folk');
 audio.configure({...audio.settings,autoMusic:false});audio.setPlaying(true);assert.equal(made[1].loop,true);
 audio.nextTrack();assert.equal(audio.settings.track,'folk');
 audio.configure({...audio.settings,track:'silkroad',autoMusic:true});audio.nextTrack();assert.equal(audio.settings.track,'main');
 audio.setPlaying(false);assert.equal(normalizeSettings().autoMusic,false);
});
test('synthesized arrangements advance after four complete phrases',()=>{
 const audio=new GameAudio();audio.context={currentTime:0};audio.note=()=>{};
 audio.configure({track:'morning',music:true,muted:false,autoMusic:true});audio.setPlaying(true);
 try{audio.step=128;audio.nextTime=1;audio.context.currentTime=1.4;audio.schedule();assert.equal(audio.settings.track,'morning');
 audio.context.currentTime=1.6;audio.schedule();assert.equal(audio.settings.track,'evening');}finally{audio.setPlaying(false);}
});

test('JSON maps share density and obstacle counts with valid atlas references',()=>{
 assert.equal(validateMaps(manifest,mapDefinitions),mapDefinitions);
 const slots=decorationSlots(manifest.layout);
 assert.equal(slots.length,36);
 for(const side of [-1,1]){
  const row=slots.filter(s=>Math.sign(s.x)===side);
  assert.equal(row.length,18);assert.equal(new Set(row.map(s=>s.variant)).size,5);
  for(let i=1;i<row.length;i++)assert.equal(row[i-1].z-row[i].z,7);
 }
 for(const m of mapDefinitions){
  assert.equal(m.decor.length,5);assert.equal(m.obstacles.barrier.length,2);assert.equal(m.obstacles.person.length,3);
  for(const s of Object.values(m.sprites))assert.ok(readFileSync(new URL(`../src/assets/${s.file}`,import.meta.url)).length>0);
 }
 const broken=structuredClone(mapDefinitions);broken[0].decor.pop();assert.throws(()=>validateMaps(manifest,broken),/expected 5 decor/);
 const missing=structuredClone(mapDefinitions);missing[0].obstacles.person[0].sprite='missing';assert.throws(()=>validateMaps(manifest,missing),/sprite reference/);
 const added=structuredClone(mapDefinitions[0]);added.id='new-map';added.label='New map';
 assert.equal(validateMaps(manifest,[...mapDefinitions,added]).length,3);
});

test('music volume is bounded, persists, and leaves effect master gain unchanged',()=>{
 assert.equal(normalizeSettings().musicVolume,.3);
 assert.equal(normalizeSettings({musicVolume:0}).musicVolume,0);
 assert.equal(normalizeSettings({musicVolume:2}).musicVolume,1);
 assert.equal(normalizeSettings({musicVolume:-1}).musicVolume,0);
 assert.equal(normalizeSettings({musicVolume:'bad'}).musicVolume,.3);
 const audio=new GameAudio();audio.master={gain:{value:1}};audio.musicGain={gain:{value:1}};
 audio.media={volume:.3,pause(){}};
 audio.configure({track:'main',music:true,muted:false,musicVolume:.15});
 assert.equal(audio.media.volume,.15);assert.equal(audio.musicGain.gain.value,.5);assert.equal(audio.master.gain.value,1);
 audio.configure({...audio.settings,musicVolume:0});assert.equal(audio.media.volume,0);assert.equal(audio.musicGain.gain.value,0);assert.equal(audio.master.gain.value,1);
});

import {obstacleAppearance} from '../src/locations.js';
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
  const preferences={muted:true,music:false,track:'evening',mode:'hard',transcription:false,location:'museum'};
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
     assert.ok(['guide','photographer','guard'].includes(obstacleAppearance('museum','person',i).name));
     assert.ok(['rope','crate'].includes(obstacleAppearance('museum','barrier',i).name));
   }
   assert.equal(obstacleAppearance('park','person',0).name,'scooter');
 });

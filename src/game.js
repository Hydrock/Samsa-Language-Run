import {historyEntry,historyMarkup} from './history.js';
import * as T from '../vendor/three.module.js';
import {dictionary,chooseWord,nextCandidate,difficulty,updateScore,levelNames} from './logic.js';
import {GameAudio} from './audio.js';
import {gameModes,normalizeSettings,collectsWord,formatElapsed,configureLocations} from './settings.js';
import {loadMaps} from './map-scene.js';
import {obstacleAppearance} from './locations.js';
import {createAtmosphere} from './atmosphere.js';
import {characterPose} from './character.js';
const $=id=>document.getElementById(id);
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:false});}catch(e){$('overlay').innerHTML='<section class="intro"><h1>Нужен WebGL</h1><p>Включите аппаратное ускорение браузера и перезагрузите страницу.</p></section>';throw e;}
renderer.setClearColor(0xb9dedc);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;$('game').appendChild(renderer.domElement);
const scene=new T.Scene();scene.fog=new T.Fog(0xb9dedc,38,112);
const camera=new T.PerspectiveCamera(48,1,.1,180);camera.position.set(0,7.6,13);camera.lookAt(0,-2,-15);
const ambient=new T.HemisphereLight(0xfff7db,0x648663,2.3);scene.add(ambient);const sun=new T.DirectionalLight(0xffedcb,2.8);sun.position.set(-12,24,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-23,right:23,top:25,bottom:-30});sun.shadow.bias=-.001;scene.add(sun);
const mats=new Map();function material(color){if(!mats.has(color))mats.set(color,new T.MeshStandardMaterial({color,roughness:1}));return mats.get(color);}
function mesh(geometry,color,parent,x=0,y=0,z=0){const m=new T.Mesh(geometry,material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const box=(p,c,x,y,z,w,h,d)=>mesh(new T.BoxGeometry(w,h,d),c,p,x,y,z);
const maps=await loadMaps().catch(error=>{const message=document.createElement('p');message.textContent='Не удалось загрузить локации. Обновите страницу.';$('overlay').replaceChildren(message);throw error;});
configureLocations([...maps.locations.keys()],maps.manifest.default);
for(const location of maps.locations.values())scene.add(location.group);
$('setting-location').replaceChildren(...[...maps.locations.values()].map(({definition})=>new Option(definition.label,definition.id)));
let activeLocation;
function texture(draw,w=512,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
const characterTextures={};
try {
  await Promise.all(['run-a','run-b','side','happy','sad','jump'].map(async pose=>{
    const map=await new T.TextureLoader().loadAsync(new URL(`./assets/samsa-${pose}.png`,import.meta.url).href);
    map.colorSpace=T.SRGBColorSpace;characterTextures[pose]=map;
  }));
  characterTextures.right=characterTextures.side;
  characterTextures.left=characterTextures.side.clone();
  characterTextures.left.repeat.x=-1;characterTextures.left.offset.x=1;
  characterTextures.left.needsUpdate=true;
} catch(error) {
  $('overlay').innerHTML='<section class="intro"><h1>Самса задержалась</h1><p>Не удалось загрузить персонажа. Обновите страницу.</p></section>';
  throw error;
}
const player=new T.Group();scene.add(player);player.position.z=3;
const sprite=new T.Sprite(new T.SpriteMaterial({map:characterTextures.happy,alphaTest:.02}));
sprite.scale.set(2.4,2.4,1);sprite.center.set(.5,.07);player.add(sprite);
let lanePoseTime=0,laneDirection=1,shownPose='happy';
function updateCharacter(){
  const pose=characterPose(state,beforeSettings,lanePoseTime,laneDirection,jumpY>0||velocity>0,distance);
  if(pose!==shownPose){sprite.material.map=characterTextures[pose];shownPose=pose;}
  if(state==='intro'||state==='over'){sprite.material.rotation=0;player.position.y=0;}
}
const shadow=mesh(new T.CircleGeometry(.9,32),0x7e8b63,scene,0,.05,3);shadow.rotation.x=-Math.PI/2;shadow.scale.y=.55;
let runHistory=[];
let state='intro',score=0,best=0,peak=0,lane=1,jumpY=0,velocity=0,elapsed=0,gameTime=0,distance=0,spawnTimer=1,misses=0,target=chooseWord(0),entities=[],feedbackTime=0;
let settings=normalizeSettings();
try {
  best=Math.max(0,Number(localStorage.getItem('samsa-run-best'))||0);
  const saved=localStorage.getItem('samsa-run-settings');
  settings=normalizeSettings(saved?JSON.parse(saved):{muted:localStorage.getItem('samsa-run-muted')==='true'});
} catch {}
$('best').textContent=best;
const soundtrack=new GameAudio();
soundtrack.onTrackChange=track=>{
  settings.track=track;$('setting-track').value=track;
  try{localStorage.setItem('samsa-run-settings',JSON.stringify(settings));}catch{}
};
soundtrack.configure(settings);
const runSpeed=()=>gameModes[settings.mode].speed+Math.min(Math.max(score,0)*.12,4);
function sound(good){soundtrack.effect(good);}
function syncSound(){
  soundtrack.configure(settings);
}
function saveSettings(){
  try{localStorage.setItem('samsa-run-settings',JSON.stringify(settings));}catch{}
  syncSound();
}
syncSound();
const settingsDialog=$('settings-dialog');
let beforeSettings='intro';
function describeMode(){
  $('mode-description').textContent={easy:'Неспешный бег, больше времени на чтение, мало препятствий.',normal:'Средний темп, привычная частота слов и препятствий.',hard:'Быстрый бег, слова появляются чаще, больше препятствий.'}[settings.mode];
}
$('settings-button').onclick=()=>{
  if(settingsDialog.open)return;
  beforeSettings=state;state='settings';soundtrack.setPlaying(false);
  $('setting-sound').checked=!settings.muted;
  $('setting-music').checked=settings.music;
  $('setting-auto-music').checked=settings.autoMusic;
  $('setting-transcription').checked=settings.transcription;
  $('setting-track').value=settings.track;
  $('setting-volume').value=Math.round(settings.musicVolume*100);
  $('music-volume-value').textContent=`${Math.round(settings.musicVolume*100)}%`;
  $('setting-mode').value=settings.mode;
  $('setting-location').value=settings.location;
  $('settings-close').textContent=beforeSettings==='playing'?'Продолжить забег ↗':'Закрыть настройки';
  describeMode();settingsDialog.showModal();
};
$('setting-volume').oninput=()=>{
  settings=normalizeSettings({...settings,musicVolume:Number($('setting-volume').value)/100});
  $('music-volume-value').textContent=`${Math.round(settings.musicVolume*100)}%`;
  saveSettings();
};
for(const id of ['setting-sound','setting-music','setting-auto-music','setting-track','setting-mode','setting-transcription','setting-location']){
  $(id).onchange=()=>{
    soundtrack.unlock();
    const previousMode=settings.mode;
    const previousLocation=settings.location;
    const previousTranscription=settings.transcription;
    settings=normalizeSettings({musicVolume:Number($('setting-volume').value)/100,muted:!$('setting-sound').checked,music:$('setting-music').checked,autoMusic:$('setting-auto-music').checked,transcription:$('setting-transcription').checked,track:$('setting-track').value,mode:$('setting-mode').value,location:$('setting-location').value});
    if(settings.mode!==previousMode)spawnTimer=gameModes[settings.mode].gap;
    if(previousLocation!==settings.location)applyLocation();
    saveSettings();describeMode();refresh();
    if(previousTranscription!==settings.transcription)refreshWordLabels();
  };
}
settingsDialog.addEventListener('close',()=>{
  state=beforeSettings;
  if(state==='playing'&&document.hidden){state='paused';modal('Передохнём?','Твой забег на паузе.','Продолжить ↗');}
  soundtrack.setPlaying(state==='playing');
  $('settings-button').focus();
});
function refresh(){refreshTimer();$('target-ipa').textContent=target.ruIPA?`[${target.ruIPA}]`:'';$('target-ipa').hidden=!settings.transcription||!target.ruIPA;$('target').parentElement.style.setProperty('--word-scale',Math.min(1,9/target.ru.length));$('score').textContent=score;$('best').textContent=best;$('target').textContent=target.ru;$('level').textContent=`${String(difficulty(score)).padStart(2,'0')} / ${levelNames[difficulty(score)-1]}`;}
function disposeEntity(e){scene.remove(e.obj);e.obj.traverse(o=>{if(o.material?.userData.shared)return;if(o.geometry)o.geometry.dispose();if(o.material?.map){o.material.map.dispose();o.material.dispose();}});}
function clearEntities(){entities.forEach(disposeEntity);entities=[];}
function start(){runHistory=[];document.activeElement?.blur();clearEntities();state='playing';document.body.className='playing';score=0;peak=0;starTime=0;lanePoseTime=0;lane=1;jumpY=0;velocity=0;elapsed=0;gameTime=0;updateAtmosphere(0,activeLocation.definition.indoors);distance=0;spawnTimer=.7;misses=0;target=chooseWord(0);player.position.x=0;$('feedback').textContent='';feedbackTime=0;refresh();soundtrack.step=0;soundtrack.unlock();soundtrack.setPlaying(true);}
function modal(title,description,button){document.body.className=state==='over'?'paused game-over':'paused';$('overlay').innerHTML=`<section class="intro"><span class="eyebrow">SAMSA RUN · TOSHKENT</span><h1>${title}</h1><p>${description}</p>${historyMarkup(runHistory)}<button id="resume" class="primary">${button}</button><small class="fine">← → дорожки · Пробел / ↑ прыжок</small></section>`;$('resume').onclick=state==='over'?start:togglePause;$('resume').focus();}
function togglePause(){if(state==='playing'){state='paused';soundtrack.setPlaying(false);modal('Передохнём?','Самса набирается сил.<br>Твой забег продолжится с этого места.','Продолжить ↗');}else if(state==='paused'){state='playing';soundtrack.setPlaying(true);document.activeElement?.blur();document.body.className='playing';}}
$('start').onclick=start;$('pause').onclick=togglePause;document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')togglePause();});
function change(delta,reason){if(delta>0)starTime=1.4;const result=updateScore(score,delta);const previousLevel=difficulty(score);score=result.score;if(delta<0&&score>=0&&difficulty(score)<previousLevel){target=chooseWord(score,target.en);misses=0;}peak=Math.max(peak,score);if(peak>best){best=peak;try{localStorage.setItem('samsa-run-best',String(best));}catch{}}$('feedback').className=delta>0?'good':'bad';$('feedback').innerHTML=`${delta>0?'✦ +1 ✦':'−1'}<small>${reason}</small>`;feedbackTime=1.8;sound(delta>0);refresh();if(result.gameOver){state='over';entities.forEach(entity=>entity.obj.visible=false);lanePoseTime=0;starTime=0;jumpY=0;velocity=0;player.position.y=0;soundtrack.setPlaying(false);modal('Ещё один кружок? ',`Максимум за забег: <b>${peak}</b> · Рекорд: <b>${best}</b><br>${reason}<br><small>Счёт упал ниже нуля. Новые слова уже ждут!</small>`,'Бежать снова ↗');}}
function refreshTimer(){
  $('run-time').textContent=formatElapsed(gameTime);
  $('run-time').setAttribute('datetime',`PT${Math.floor(gameTime)}S`);
}
function label(word){
  const ipa=dictionary.find(entry=>entry.en===word)?.enIPA;
  const showIPA=settings.transcription&&ipa;
  const map=texture((c,w,h)=>{
    c.fillStyle='#fff9e8';c.strokeStyle='#d6a961';c.lineWidth=6;
    c.beginPath();c.roundRect(5,5,w-10,h-10,28);c.fill();c.stroke();
    const fontSize=word.length>11?41:word.length>8?49:64;
    c.textAlign='center';c.textBaseline='middle';c.fillStyle='#244b40';
    c.font=`bold ${fontSize}px Arial`;
    c.fillText(word,w/2,showIPA?76:h/2+2);
    if(showIPA){
      c.font=`${fontSize/2}px Arial`;
      c.fillStyle='#617667';c.fillText(`[${ipa}]`,w/2,144);
    }
  },512,showIPA?208:160);
  const s=new T.Sprite(new T.SpriteMaterial({map,depthTest:false,sizeAttenuation:false}));
  s.scale.set(.16,showIPA?.065:.05,1);s.position.y=.55;return s;
}
function refreshWordLabels(){
  for(const entity of entities){
    if(entity.type!=='word')continue;
    const old=entity.obj.children[0];entity.obj.remove(old);
    old.material.map.dispose();old.material.dispose();
    entity.obj.add(label(entity.word));
  }
}
function spawnWord(){const candidate=nextCandidate(target,misses);misses=candidate.misses;const obj=new T.Group();obj.add(label(candidate.word));obj.position.set((Math.floor(Math.random()*3)-1)*3.2,0,-36);scene.add(obj);entities.push({obj,type:'word',correct:candidate.correct,target:{...target},word:candidate.word});}
function obstacleSprite(entity){
  const {name,height}=obstacleAppearance(activeLocation.definition,entity.type,entity.variant);
  return activeLocation.sprite(name,height);
}
function applyLocation(){
  activeLocation=maps.locations.get(settings.location);
  const definition=activeLocation.definition,inside=definition.indoors;
  for(const location of maps.locations.values())location.group.visible=location===activeLocation;
  document.body.dataset.location=settings.location;
  document.body.dataset.indoors=String(inside);
  $('location-name').textContent=definition.title;
  const description=$('intro-description');
  if(description)description.textContent=definition.description;
  for(const entity of entities){
    if(entity.type==='word')continue;
    entity.obj.clear();entity.obj.add(obstacleSprite(entity));
  }
  updateAtmosphere(gameTime,inside);
}
function spawnObstacle(){
  const obj=new T.Group(),barrier=Math.random()<.45;
  const variant=Math.floor(Math.random()*activeLocation.definition.obstacles[barrier?'barrier':'person'].length);
  const entity={obj,type:barrier?'barrier':'person',variant,speed:barrier?0:variant===0?5:variant===1?1.4:2.4};
  obj.add(obstacleSprite(entity));
  obj.position.set((Math.floor(Math.random()*3)-1)*3.2,0,-36);scene.add(obj);entities.push(entity);
}
function move(d){if(state!=='playing')return;const next=Math.max(0,Math.min(2,lane+d));if(next!==lane){laneDirection=Math.sign(next-lane);lanePoseTime=.45;lane=next;soundtrack.movement('lane');}}function jump(){if(state==='playing'&&jumpY<=.001&&velocity<=0){velocity=7.6;soundtrack.movement('jump');}}
addEventListener('keydown',e=>{if(settingsDialog.open)return;if(['ArrowLeft','ArrowRight','ArrowUp','Space','Escape','KeyA','KeyD','KeyW'].includes(e.code)){if(state!=='playing'&&e.target instanceof HTMLButtonElement&&['Space'].includes(e.code))return;e.preventDefault();if(e.repeat)return;if(['ArrowLeft','KeyA'].includes(e.code))move(-1);if(['ArrowRight','KeyD'].includes(e.code))move(1);if(['ArrowUp','KeyW','Space'].includes(e.code))jump();if(e.code==='Escape')togglePause();}});
for(const [id,action] of [['left',()=>move(-1)],['right',()=>move(1)],['jump',jump]]){const button=$(id);button.addEventListener('pointerdown',e=>{e.preventDefault();action();});button.addEventListener('click',e=>{if(e.detail===0)action();});}let touchStart;renderer.domElement.addEventListener('pointerdown',e=>{renderer.domElement.setPointerCapture(e.pointerId);touchStart={x:e.clientX,y:e.clientY};});renderer.domElement.addEventListener('pointerup',e=>{if(!touchStart)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;touchStart=null;if(Math.max(Math.abs(dx),Math.abs(dy))<22)return;if(Math.abs(dx)>Math.abs(dy))move(Math.sign(dx));else if(dy<0)jump();});renderer.domElement.addEventListener('pointercancel',()=>touchStart=null);
function resize(){
  const {clientWidth:width,clientHeight:height}=$('game-shell');
  camera.aspect=width/height;camera.fov=width<700?60:48;camera.position.z=width<700?16:13;camera.updateProjectionMatrix();
  const portrait=height>width;
  renderer.setPixelRatio(Math.min(devicePixelRatio,2,(portrait?900:1280)/width,(portrait?1280:900)/height));
  renderer.setSize(width,height);
}
new ResizeObserver(resize).observe($('game-shell'));resize();
const updateAtmosphere=createAtmosphere(scene,renderer,sun,ambient,maps.materials,material(0xffe4a4));applyLocation();
const stars=new T.Group();scene.add(stars);let starTime=0;const starMap=texture(c=>{c.fillStyle='#ffdc63';c.font='bold 400px Arial';c.textAlign='center';c.fillText('✦',256,400);});for(let i=0;i<9;i++){const s=new T.Sprite(new T.SpriteMaterial({map:starMap,depthTest:false,transparent:true}));const a=i/9*Math.PI*2;s.position.set(Math.cos(a)*1.8,1.4+Math.sin(a)*1.5,.4);s.scale.setScalar(.45);stars.add(s);}stars.visible=false;let last=performance.now();function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;const running=state==='playing';if(running){elapsed+=dt;lanePoseTime=Math.max(0,lanePoseTime-dt);const speed=runSpeed();activeLocation.moving.forEach(g=>{g.position.z+=speed*dt;if(g.position.z>maps.manifest.layout.wrapZ)g.position.z-=maps.manifest.layout.rows*maps.manifest.layout.spacing;});sprite.material.rotation=0;}
if(running){gameTime+=dt;refreshTimer();updateAtmosphere(gameTime,activeLocation.definition.indoors);distance+=dt*(runSpeed());$('distance').textContent=`${Math.floor(distance)} м`;player.position.x=T.MathUtils.damp(player.position.x,(lane-1)*3.2,15,dt);if(jumpY>0||velocity>0){velocity-=19*dt;jumpY=Math.max(0,jumpY+velocity*dt);}player.position.y=jumpY;shadow.position.x=player.position.x;shadow.scale.setScalar(1-jumpY*.15);shadow.scale.y*=.55;if(entities.length===0)spawnTimer-=dt;if(spawnTimer<=0&&entities.length===0){if(Math.random()<gameModes[settings.mode].obstacleChance&&distance>28)spawnObstacle();else spawnWord();spawnTimer=gameModes[settings.mode].gap;}
for(let i=entities.length-1;i>=0;i--){const e=entities[i];e.obj.position.z+=(runSpeed()+(e.speed||0))*dt;if(e.obj.position.z>=2.8&&!e.checked){e.checked=true;if(Math.abs(e.obj.position.x-player.position.x)<1.05){if(e.type==='word'){if(!collectsWord(e.obj.position.x-player.position.x,jumpY))continue;runHistory.push(historyEntry(e,gameTime,dictionary));if(e.correct){change(1,`${e.target.ru} → ${e.target.en}`);target=chooseWord(score,target.en);misses=0;refresh();}else change(-1,`${e.target.ru} → ${e.target.en}`);}else if(e.type==='person'||jumpY<.8){runHistory.push(historyEntry(e,gameTime,dictionary));change(-1,e.type==='person'?activeLocation.definition.collisionHint:'Прыгай через барьеры');}}}if(e.obj.position.z>5){disposeEntity(e);entities.splice(i,1);}}
if(feedbackTime>0){feedbackTime-=dt;if(feedbackTime<=0)$('feedback').textContent='';}}
if(running&&starTime>0)starTime=Math.max(0,starTime-dt);stars.visible=starTime>0;stars.position.copy(player.position);stars.rotation.z=elapsed;stars.children.forEach((s,i)=>{s.material.opacity=Math.min(1,starTime*2);});updateCharacter();renderer.render(scene,camera);}refresh();requestAnimationFrame(frame);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(state==='playing')togglePause();$('overlay').innerHTML='<section class="intro"><h1>Графика отдыхает</h1><p>Перезагрузите страницу, чтобы восстановить WebGL.<br>Сохранённый рекорд останется.</p></section>';document.body.className='paused';});




export function validateMaps(manifest,maps){
  const fail=message=>{throw new Error(`Invalid map: ${message}`);};
  const l=manifest.layout;
  if(!l||!Number.isInteger(l.rows)||l.rows<5||!Number.isFinite(l.spacing)||l.spacing<=0||!Number.isFinite(l.sideX)||l.sideX<5||![l.startZ,l.wrapZ].every(Number.isFinite))fail('layout');
  if(!maps.length||new Set(maps.map(m=>m.id)).size!==maps.length||!maps.some(m=>m.id===manifest.default))fail('ids/default');
  for(const m of maps){
    if(!/^[a-z][a-z0-9-]*$/.test(m.id)||![m.label,m.title,m.description,m.collisionHint].every(v=>typeof v==='string')||typeof m.indoors!=='boolean')fail('metadata');
    if(m.decor?.length!==5||m.obstacles?.barrier?.length!==2||m.obstacles?.person?.length!==3)fail(`${m.id}: expected 5 decor, 2 barriers, 3 people`);
    for(const color of Object.values(m.colors||{}))if(!/^#[0-9a-f]{6}$/i.test(color))fail('color');
    if(!['ground','road','line'].every(k=>m.colors?.[k]))fail('palette');
    for(const s of Object.values(m.sprites||{})){
      if(!/^[a-zA-Z0-9_.-]+\.png$/.test(s.file)||s.reference?.length!==2||s.rect?.length!==4||![...s.reference,...s.rect].every(Number.isFinite))fail('sprite');
      const [x,y,w,h]=s.rect,[rw,rh]=s.reference;
      if(x<0||y<0||w<=0||h<=0||rw<=0||rh<=0||x+w>rw||y+h>rh)fail('sprite bounds');
    }
    const parts=p=>{
      if(!p||!/^#[0-9a-f]{6}$/i.test(p.color)||p.position?.length!==3||!p.position.every(Number.isFinite))fail('part');
      const shape=p.shape||'box';
      if(!['box','sphere','dome','cylinder','cone'].includes(shape))fail('shape');
      if(shape==='box'){if(p.size?.length!==3||!p.size.every(v=>Number.isFinite(v)&&v>0))fail('box');}
      else {
        if(!Number.isFinite(p.radius)||p.radius<=0)fail('radius');
        if(['cylinder','cone'].includes(shape)&&(!Number.isFinite(p.height)||p.height<=0))fail('height');
        if(p.radiusTop!==undefined&&(!Number.isFinite(p.radiusTop)||p.radiusTop<0))fail('radiusTop');
      }
      if(p.segments!==undefined&&(!Number.isInteger(p.segments)||p.segments<3||p.segments>32))fail('segments');
      if(p.scale&&(p.scale.length!==3||!p.scale.every(v=>Number.isFinite(v)&&v>0)))fail('scale');
      if(p.rotation&&(p.rotation.length!==3||!p.rotation.every(Number.isFinite)))fail('rotation');

    };
    for(const item of [...m.decor,...m.obstacles.barrier,...m.obstacles.person]){
      if(item.sprite){if(!m.sprites[item.sprite]||!(item.height>0))fail('sprite reference');}
      else if(item.parts?.length)item.parts.forEach(parts);else fail('empty item');
    }
    for(const item of [...m.obstacles.barrier,...m.obstacles.person])if(!item.sprite)fail('obstacles must be sprites');
    (m.environment||[]).forEach(parts);
  }
  return maps;
}
export function decorationSlots(layout){
  return Array.from({length:layout.rows},(_,i)=>[-1,1].map(side=>({x:side*layout.sideX,z:layout.startZ-i*layout.spacing,variant:(i+(side===1?2:0))%5}))).flat();
}
export function obstacleAppearance(map,type,variant){
  const item=map.obstacles[type][variant%map.obstacles[type].length];
  return {name:item.sprite,height:item.height};
}

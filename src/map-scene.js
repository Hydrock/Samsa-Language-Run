import * as T from '../vendor/three.module.js';
import {spriteTexture} from './sprite-texture.js';
import {validateMaps,decorationSlots} from './locations.js';

export async function loadMaps(){
  async function json(name){
    const response=await fetch(new URL(`./maps/${name}`,import.meta.url));
    if(!response.ok)throw new Error(`Map loading failed: ${name}`);
    return response.json();
  }
  const manifest=await json('index.json');
  const maps=validateMaps(manifest,await Promise.all(manifest.maps.map(json)));
  const images=new Map(),materials=new Map(),geometries=new Map(),spriteMaterials=[];
  const loader=new T.TextureLoader();
  function image(file){if(!images.has(file))images.set(file,loader.loadAsync(new URL(`./assets/${file}`,import.meta.url).href));return images.get(file);}
  function primitive(part,parent){
    const shape=part.shape||'box',segments=part.segments||16;
    const key=JSON.stringify([shape,part.size,part.radius,part.radiusTop,part.height,segments]);
    if(!geometries.has(key)){
      let geometry;
      if(shape==='sphere'||shape==='dome')geometry=new T.SphereGeometry(part.radius,segments,8,0,Math.PI*2,0,shape==='dome'?Math.PI/2:Math.PI);
      else if(shape==='cylinder')geometry=new T.CylinderGeometry(part.radiusTop??part.radius,part.radius,part.height,segments);
      else if(shape==='cone')geometry=new T.ConeGeometry(part.radius,part.height,segments);
      else geometry=new T.BoxGeometry(...part.size);
      geometries.set(key,geometry);
    }
    const mk=part.color+Boolean(part.emissive)+Boolean(part.flatShading);
    if(!materials.has(mk))materials.set(mk,new T.MeshStandardMaterial({color:part.color,roughness:.9,flatShading:Boolean(part.flatShading),emissive:part.emissive?part.color:0,emissiveIntensity:part.emissive?.6:0}));
    const mesh=new T.Mesh(geometries.get(key),materials.get(mk));mesh.position.set(...part.position);if(part.scale)mesh.scale.set(...part.scale);if(part.rotation)mesh.rotation.set(...part.rotation);mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  const locations=new Map();
  for(const definition of maps){
    const entries={};
    await Promise.all(Object.entries(definition.sprites).map(async([name,s])=>{
      const atlas=await image(s.file),[x,y,w,h]=s.rect,[rw,rh]=s.reference;
      const map=spriteTexture(atlas.image,x/rw*atlas.image.width,y/rh*atlas.image.height,w/rw*atlas.image.width,h/rh*atlas.image.height);
      const material=new T.SpriteMaterial({map,alphaTest:.05});material.userData.shared=true;spriteMaterials.push(material);
      entries[name]={material,ratio:w/h};
    }));
    const group=new T.Group(),moving=[];group.visible=false;
    const sprite=(name,height)=>{const e=entries[name],s=new T.Sprite(e.material);s.scale.set(height*e.ratio,height,1);s.center.set(.5,0);return s;};
    const box=(color,position,size)=>primitive({color,position,size},group);
    box(definition.colors.ground,[0,-.16,-48],[240,.3,240]);
    box(definition.colors.road,[0,.005,-48],[9.6,.02,145]);
    for(const x of [-4.85,-1.6,1.6,4.85])box(definition.colors.line,[x,.025,-48],[.075,.02,145]);
    for(const slot of decorationSlots(manifest.layout)){
      const g=new T.Group();g.position.set(slot.x,0,slot.z);group.add(g);moving.push(g);
      const d=definition.decor[slot.variant];
      if(d.sprite)g.add(sprite(d.sprite,d.height));else d.parts.forEach(p=>primitive(p,g));
    }
    for(let i=0;i<manifest.layout.rows;i++)moving.push(box(definition.colors.line,[0,.04,manifest.layout.startZ-i*manifest.layout.spacing],[9.5,.012,.035]));
    (definition.environment||[]).forEach(p=>primitive(p,group));
    locations.set(definition.id,{definition,group,moving,sprite});
  }
  return {manifest,locations,materials:spriteMaterials};
}

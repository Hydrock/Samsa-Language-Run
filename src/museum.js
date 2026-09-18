import * as T from '../vendor/three.module.js';

export async function loadMuseumArt(){
  const loader=new T.TextureLoader();
  const [exhibits,visitors]=await Promise.all(['museum-exhibits.png','museum-visitors.png'].map(name=>loader.loadAsync(new URL(`./assets/${name}`,import.meta.url).href)));
  const entries={};
  function add(name,atlas,rect){
    const [x,y,w,h]=rect,map=atlas.clone();map.colorSpace=T.SRGBColorSpace;
    map.repeat.set(w,h);map.offset.set(x,1-y-h);map.generateMipmaps=false;map.minFilter=T.LinearFilter;map.needsUpdate=true;
    const material=new T.SpriteMaterial({map,alphaTest:.08});material.userData.shared=true;
    entries[name]={material,ratio:w*atlas.image.width/(h*atlas.image.height)};
  }
  // Coordinates measured on a 2048 × 683 preview; normalize for the source atlas.
  const rect=(x,y,w,h)=>[x/2048,y/683,w/2048,h/683];
  for(const [name,x,y,w,h] of [
    ['ceramics',57,66,340,601],['suzani',493,34,380,605],
    ['column',916,9,247,658],['chapan',1247,35,356,632],['dutar',1702,5,255,662]
  ])add(name,exhibits,rect(x,y,w,h));
  for(const [name,x,y,w,h] of [
    ['guide',47,37,296,619],['photographer',417,39,316,617],
    ['guard',800,31,308,625],['rope',1172,343,403,313],['crate',1605,375,416,281]
  ])add(name,visitors,rect(x,y,w,h));
  return {materials:Object.values(entries).map(e=>e.material),sprite(name,height){
    const entry=entries[name],sprite=new T.Sprite(entry.material);
    sprite.scale.set(height*entry.ratio,height,1);sprite.center.set(.5,.013);return sprite;
  }};
}

export function createMuseum(art){
  const group=new T.Group(),moving=[];
  const colors=new Map();
  function box(color,x,y,z,w,h,d){
    if(!colors.has(color))colors.set(color,new T.MeshStandardMaterial({color,roughness:.88}));
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),colors.get(color));mesh.position.set(x,y,z);mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  box(0xd6c4aa,0,-.16,-48,35,.3,145);
  box(0xb28360,0,.005,-48,9.6,.02,145);
  for(const x of [-4.85,-1.6,1.6,4.85])box(0xe9c991,x,.025,-48,.075,.02,145);
  for(const x of [-11.5,11.5]){
    box(0xe9d9be,x,5,-48,.4,10,145);
    box(0x407c78,x-Math.sign(x)*.23,1.2,-48,.08,2.4,145);
    box(0xc59c61,x-Math.sign(x)*.28,2.45,-48,.1,.12,145);
  }
  box(0xe4d1b3,0,5,-115,24,10,.3);
  box(0xd1b891,0,10,-48,24,.2,145);
  const names=['ceramics','suzani','column','chapan','dutar'];
  for(let i=0;i<18;i++){
    const z=8-i*7;
    for(const side of [-1,1]){
      const display=new T.Group();display.position.set(side*7.5,0,z);group.add(display);
      const exhibit=art.sprite(names[(i+(side===1?2:0))%5],4.6);display.add(exhibit);moving.push(display);
    }
    const strip=box(0xceb292,0,.04,z,9.5,.012,.035);moving.push(strip);
    if(i%2===0){
      const beam=box(0xc4a47e,0,8.5,z,23,.22,.35);moving.push(beam);
      const light=new T.Mesh(new T.BoxGeometry(5,.05,.55),new T.MeshBasicMaterial({color:0xffe6b0}));light.position.set(0,8.35,z);group.add(light);moving.push(light);
    }
  }
  return {group,moving};
}

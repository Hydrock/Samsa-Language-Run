import * as T from '../vendor/three.module.js';
// Rectangles measured in the 2048 x 683 reference preview.
const parkRegions={
  scooter:[110,8,205,393],barrier:[28,425,402,246],cone:[494,432,228,237],
  tree:[794,389,262,285],cypress:[1530,343,148,330],bush:[1736,471,304,203]
};
export async function loadParkArt(){
  const loader=new T.TextureLoader();
  const [park,people,vegetation]=await Promise.all(['park-atlas.png','people-atlas.png','vegetation-thin.png'].map(name=>loader.loadAsync(new URL(`./assets/${name}`,import.meta.url).href)));
  const entries={};
  function region(name,atlas,rect,w,h){
    const [x,y,width,height]=rect,map=atlas.clone();
    map.colorSpace=T.SRGBColorSpace;map.repeat.set(width/w,height/h);map.offset.set(x/w,1-(y+height)/h);
    map.generateMipmaps=false;map.minFilter=T.LinearFilter;map.needsUpdate=true;
    const material=new T.SpriteMaterial({map,alphaTest:.05});material.userData.shared=true;
    entries[name]={material,ratio:width/height};
  }
  for(const [name,rect] of Object.entries(parkRegions))region(name,['tree','cypress','bush'].includes(name)?vegetation:park,rect,2048,683);
  const peopleRegions={cat:[40,540,322,340],elder:[422,260,327,620],reader:[792,288,336,590],phone:[1198,254,308,628]};
  for(const [name,rect] of Object.entries(peopleRegions))region(name,people,rect,1536,1024);
  return {materials:Object.values(entries).map(e=>e.material),sprite(name,height){
    const entry=entries[name],sprite=new T.Sprite(entry.material);
    sprite.scale.set(height*entry.ratio,height,1);sprite.center.set(.5,0);return sprite;
  }};
}

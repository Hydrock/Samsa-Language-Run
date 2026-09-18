import * as T from '../vendor/three.module.js';

export const dayPhases = [
  { name: 'УТРО', sky: 0xb9dedc, light: 0xffedcb, ground: 0x648663, power: 2.8, ambient: 2.3, tint: 0xffffff },
  { name: 'ДЕНЬ', sky: 0x8bcdeb, light: 0xfffaf0, ground: 0x77926a, power: 3.2, ambient: 2.5, tint: 0xffffff },
  { name: 'ВЕЧЕР', sky: 0xc49399, light: 0xffad70, ground: 0x645b7d, power: 1.7, ambient: 1.5, tint: 0xffc9a1 },
  { name: 'НОЧЬ', sky: 0x172b49, light: 0xaabfff, ground: 0x344664, power: .65, ambient: .85, tint: 0x8cabc9 },
];
export function phaseAt(seconds) {
  const time = Math.max(0, seconds);
  const index = Math.floor(time / 60) % 4;
  const transition = time < 60 ? 1 : Math.min(1, (time % 60) / 5);
  return { index, previous: (index + 3) % 4, blend: transition * transition * (3 - 2 * transition) };
}

export function createAtmosphere(scene, renderer, sun, ambient, treeMaterials, lampMaterial) {
  const palettes=dayPhases.map(p=>({...p,sky:new T.Color(p.sky),light:new T.Color(p.light),ground:new T.Color(p.ground),tint:new T.Color(p.tint)}));
  const sky = new T.Color(), light = new T.Color(), ground = new T.Color(), tint = new T.Color();
  const moon = new T.Mesh(new T.SphereGeometry(2.4,20,12),new T.MeshBasicMaterial({color:0xffedcb,transparent:true,fog:false}));
  moon.position.set(-24,23,-85);scene.add(moon);
  const positions=[];
  for(let i=0;i<75;i++) positions.push(Math.sin(i*17.13)*65,13+(i%13)*2.5,-85-(i%7)*3);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  const stars=new T.Points(geometry,new T.PointsMaterial({color:0xe7efff,size:.18,transparent:true,fog:false}));scene.add(stars);
  let lastPhase=-1;
  return seconds=>{
    const {index,previous,blend}=phaseAt(seconds),a=palettes[previous],b=palettes[index];
    sky.copy(a.sky).lerp(b.sky,blend);
    light.copy(a.light).lerp(b.light,blend);
    ground.copy(a.ground).lerp(b.ground,blend);
    tint.copy(a.tint).lerp(b.tint,blend);
    renderer.setClearColor(sky);scene.fog.color.copy(sky);
    sun.color.copy(light);sun.intensity=T.MathUtils.lerp(a.power,b.power,blend);
    ambient.color.copy(light);ambient.groundColor.copy(ground);ambient.intensity=T.MathUtils.lerp(a.ambient,b.ambient,blend);
    treeMaterials.forEach(material=>material.color.copy(tint));
    const night=T.MathUtils.lerp(previous===3?1:0,index===3?1:0,blend);
    moon.material.opacity=night;moon.visible=night>.001;
    stars.material.opacity=night;stars.visible=night>.001;
    lampMaterial.emissive.setHex(0xffc16b);lampMaterial.emissiveIntensity=night*2;
    if(lastPhase!==index){document.body.dataset.phase=String(index);document.getElementById('time-of-day').textContent=b.name;lastPhase=index;}
  };
}

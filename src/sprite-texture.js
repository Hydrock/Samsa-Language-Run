import * as T from '../vendor/three.module.js';

// Isolate atlas regions before generating mipmaps so nearby sprites never bleed in.
export function spriteTexture(image,x,y,width,height){
  const canvas=document.createElement('canvas');
  canvas.width=Math.ceil(width)+4;canvas.height=Math.ceil(height)+4;
  canvas.getContext('2d').drawImage(image,x,y,width,height,2,2,canvas.width-4,canvas.height-4);
  const map=new T.CanvasTexture(canvas);
  map.colorSpace=T.SRGBColorSpace;
  map.generateMipmaps=true;map.minFilter=T.LinearMipmapLinearFilter;
  map.magFilter=T.LinearFilter;
  map.repeat.set((canvas.width-4)/canvas.width,(canvas.height-4)/canvas.height);
  map.offset.set(2/canvas.width,2/canvas.height);
  return map;
}

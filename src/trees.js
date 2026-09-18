import * as T from '../vendor/three.module.js';
export function createTreeFactory(parent,moving,art) {
  return {materials:art.materials,add(x,z,i){
    const g=new T.Group();g.position.set(x,0,z);parent.add(g);
    const tall=i%3===2;
    g.add(art.sprite(tall?'cypress':'tree',tall?7:5.8));
    const bush=art.sprite('bush',1.25+(i%2)*.3);
    bush.position.set(Math.sign(x)*-1.2,0,1.5);g.add(bush);moving.push(g);
  }};
}

const collections={
  park:{barrier:[['barrier',1],['cone',1.15]],person:[['scooter',2.5],['elder',2.3],['reader',2.3],['phone',2.3],['cat',1.1]]},
  museum:{barrier:[['rope',1],['crate',1.15]],person:[['guide',2.3],['photographer',2.3],['guard',2.3]]}
};
export function obstacleAppearance(location,type,variant){
  const pool=(collections[location]||collections.park)[type];
  const [name,height]=pool[variant%pool.length];return {name,height};
}

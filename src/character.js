export function characterPose(state, previousState, laneTime, direction, airborne=false, distance=0) {
  const visibleState=state==='settings'?previousState:state;
  if(visibleState==='intro')return 'happy';
  if(visibleState==='over')return 'sad';
  if(laneTime>0)return direction<0?'left':'right';
  if(airborne)return 'jump';
  return Math.floor(distance/1.6)%2===0?'run-a':'run-b';
}

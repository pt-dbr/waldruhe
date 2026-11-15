export const IDLE_FRAMES={
 fox:[{file:'fox-blink',duration:.24,blink:true},{file:'fox-ear',duration:.7}],
 raccoon:[{file:'raccoon-blink',duration:.26,blink:true},{file:'raccoon-ear',duration:.8}],
 squirrel:[{file:'squirrel-tail',duration:2.4}],
 owl:[{file:'owl-head',duration:3.2}],
 deer:[{file:'deer-left-ear',duration:.85},{file:'deer-right-ear',duration:.9}]
};
// Foreground-time animation, intentionally asynchronous and never tied to noise.
export function createIdleMotion(random=Math.random){
 const actors=new Map();let clock=0,active=null,gapUntil=0,enabled=true;
 const delay=id=>id==='owl'?8+random()*9:4+random()*9;
 function clear(actor){actor.base.style.opacity='1';actor.overlay.style.opacity='0';actor.elapsed=0}
 function attach(id,base,overlay){detach(id);if(!IDLE_FRAMES[id])return;actors.set(id,{id,base,overlay,next:clock+2+delay(id),elapsed:0,frame:null})}
 function detach(id){const actor=actors.get(id);if(actor){clear(actor);if(active===actor)active=null;actors.delete(id)}}
 function configure(value){enabled=value;if(!enabled){for(const actor of actors.values())clear(actor);active=null}}
 function pause(){for(const actor of actors.values())clear(actor);active=null;for(const actor of actors.values())actor.next=clock+delay(actor.id)}
 function tick(dt){
  if(!enabled||!Number.isFinite(dt)||dt<=0)return;clock+=Math.min(dt,.25);
  if(active){
   const actor=active;actor.elapsed+=Math.min(dt,.25);const p=actor.elapsed/actor.frame.duration;
   if(p>=1){clear(actor);actor.next=clock+delay(actor.id);active=null;gapUntil=clock+1+random()*2;return}
   // A blink is a quick closed-eye frame. Other gestures ease out and back.
   const opacity=actor.frame.blink?(p>.2&&p<.8?1:0):Math.sin(Math.PI*p)**2;
   actor.overlay.style.opacity=String(opacity);actor.base.style.opacity=String(1-opacity);return;
  }
  if(clock<gapUntil)return;
  for(const actor of actors.values()){
   if(actor.next>clock)continue;
   const choices=IDLE_FRAMES[actor.id];actor.frame=choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
   actor.overlay.src=`assets/${actor.frame.file}.png`;actor.elapsed=0;active=actor;break;
  }
 }
 return {attach,detach,configure,pause,tick};
}

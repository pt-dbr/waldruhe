export const MAX_ANIMALS=10,UNICORN_WAIT=90,VISIT_DURATION=12,EXIT_TRANSITION=1.5;
export function createState(){return {count:0,arrival:0,magicWait:0,magic:null,departure:0,loudFor:0,band:'quiet',totalQuiet:0,stage:0,sparkle:false,visitElapsed:0,between:0}}
export function nextWait(s,cfg){return s.stage===0?UNICORN_WAIT:s.stage===1?cfg.dragonMinutes*60:s.stage===2?cfg.wizardMinutes*60:0}
export function resetMagic(s){s.stage=0;s.sparkle=false;s.magic=null;s.magicWait=0;s.visitElapsed=0;s.between=0}
// Earned stages: 0 before unicorn, 1 before dragon, 2 before wizard, 3 complete.
export function advance(s,level,seconds,cfg){
 if(!Number.isFinite(level)||!Number.isFinite(seconds)||seconds<=0)return s;
 let remaining=seconds;
 while(remaining>1e-8){
  const dt=Math.min(.05,remaining);remaining-=dt;
  s.band=level>=cfg.loud?'loud':level>=cfg.warn?'warn':'quiet';
  if(s.band!=='quiet'){
   s.arrival=0;resetMagic(s);
   if(s.band==='warn'){s.loudFor=0;s.departure=0}
   else{const previous=s.loudFor;s.loudFor+=dt;
    s.departure+=Math.max(0,s.loudFor-cfg.reaction)-Math.max(0,previous-cfg.reaction);
    if(s.departure+1e-8>=cfg.exitInterval){s.count=Math.max(0,s.count-1);s.departure=0}
   }continue;
  }
  s.totalQuiet+=dt;s.loudFor=0;s.departure=0;
  if(s.count<MAX_ANIMALS){resetMagic(s);s.arrival+=dt;if(s.arrival+1e-8>=cfg.animalInterval){s.count++;s.arrival=0}continue}
  if(s.magic){s.visitElapsed+=dt;if(s.visitElapsed+1e-8>=VISIT_DURATION){s.magic=null;s.visitElapsed=0;s.magicWait=0;s.between=EXIT_TRANSITION}continue}
  if(s.between>1e-8){s.between=Math.max(0,s.between-dt);continue}
  if(s.stage>=3)continue;
  s.magicWait+=dt;
  if(s.magicWait+1e-8>=nextWait(s,cfg)){s.magic=['unicorn','dragon','wizard'][s.stage];s.stage++;s.sparkle=true;s.magicWait=0;s.visitElapsed=0}
 }return s;
}

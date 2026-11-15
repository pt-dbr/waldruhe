// Scene-independent state machine: new scenes consume state and quietSeconds.
export function advance(s, level, dt, settings){
 const target=level>=settings.loud?'loud':level>=settings.warn?'warn':'quiet';
 const rank={quiet:0,warn:1,loud:2};
 if(target!==s.candidate){s.candidate=target;s.elapsed=0;}
 s.elapsed+=dt;
 const required=rank[target]>rank[s.state]?settings.delay:3;
 if(s.elapsed>=required)s.state=target;
 s.quietSeconds=target==='quiet'?s.quietSeconds+dt:0;
 s.animals=target==='quiet'?Math.min(6,Math.floor(s.quietSeconds/settings.animal)):Math.max(0,s.animals-dt*(target==='loud'?2:.5));
 return s;
}

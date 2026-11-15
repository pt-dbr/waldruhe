// Local arrival cues plus the user-supplied, unmodified wizard recording.
export function createSounds({block=()=>{},notify=()=>{}}={}){
 let context=null,master=null,enabled=true,volume=.2,wizardBuffer=null,loading=null,generation=0;const active=new Set();
 function loadWizard(){
  if(wizardBuffer)return Promise.resolve(wizardBuffer);
  if(!loading)loading=fetch('assets/magier_verzaubert.mp3').then(response=>{if(!response.ok)throw new Error('missing clip');return response.arrayBuffer()}).then(bytes=>context.decodeAudioData(bytes)).then(buffer=>wizardBuffer=buffer).catch(error=>{loading=null;throw error});
  return loading;
 }
 function configure(on,percent){enabled=on;volume=Math.max(0,Math.min(.5,percent/100));if(master)master.gain.value=volume*.45;if(!on)stop()}
 function unlock(){try{
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return Promise.resolve(false);
  if(!context||context.state==='closed'){context=new C();master=context.createGain();master.gain.value=volume*.45;master.connect(context.destination);wizardBuffer=null;loading=null}
  return context.resume().then(()=>loadWizard()).then(()=>true).catch(()=>{notify('Die Magieraufnahme konnte nicht geladen werden. Bitte assets/magier_verzaubert.mp3 auf GitHub prüfen.');return false});
 }catch{return Promise.resolve(false)}}
 function speakWizardFromTap(){
  if(!enabled){notify('Bitte Auftrittsklänge zuerst einschalten.');return false}
  return play('wizard');
 }
 function tone(frequency,at,duration,strength,type='sine'){
  const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;oscillator.frequency.value=frequency;
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(strength,at+.035);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  oscillator.connect(gain);gain.connect(master);active.add(oscillator);oscillator.onended=()=>{active.delete(oscillator);oscillator.disconnect();gain.disconnect()};oscillator.start(at);oscillator.stop(at+duration+.01);
 }
 function stop(){generation++;for(const node of active){try{node.stop()}catch{}}active.clear();if('speechSynthesis'in window)window.speechSynthesis.cancel()}
 function play(kind){
  if(!enabled)return false;
  if(kind==='wizard'){
   if(!wizardBuffer||!context||context.state!=='running'){
    const ticket=generation;unlock().then(ok=>{if(ok&&enabled&&ticket===generation)play('wizard')});return true;
   }
   const clip=context.createBufferSource(),gain=context.createGain();clip.buffer=wizardBuffer;gain.gain.value=volume;
   clip.connect(gain);gain.connect(context.destination);active.add(clip);
   block(Math.ceil(wizardBuffer.duration*1000)+900);
   clip.onended=()=>{active.delete(clip);clip.disconnect();gain.disconnect();block(800)};
   clip.start();return true;
  }
  if(!context||context.state!=='running'){notify('Bitte „Klang testen“ antippen, um Töne in Safari freizugeben.');return false}
  const t=context.currentTime+.02;
  if(kind==='unicorn'){
   // A one-second crystalline major-pentatonic shimmer with a soft decay.
   [1046.5,1318.51,1567.98,2093,2637.02,3135.96].forEach((f,i)=>{const start=t+i*.09;const duration=.98-i*.09;tone(f,start,duration,.22);tone(f*2,start,duration*.7,.035)});
   block(1450);
  }else if(kind==='dragon'){
   // Low, rounded harmonic fanfare, deliberately quieter than a notification.
   [[146.83,0],[220,.08],[293.66,.16],[440,.3]].forEach(([f,d])=>{tone(f,t+d,1.35-d,.24,'triangle');tone(f*2,t+d,1.25-d,.045)});
   block(1850);
  }else return false;
  return true;
 }
 return {configure,unlock,play,stop,speakWizardFromTap};
}

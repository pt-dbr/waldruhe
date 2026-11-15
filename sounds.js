// Small locally synthesized arrival cues; no audio downloads or recordings.
export function createSounds({block=()=>{},notify=()=>{}}={}){
 let context=null,master=null,enabled=true,volume=.2;const active=new Set();
 function configure(on,percent){enabled=on;volume=Math.max(0,Math.min(.5,percent/100));if(master)master.gain.value=volume*.45;if(!on)stop()}
 function unlock(){primeSpeech();try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return Promise.resolve(false);if(!context||context.state==='closed'){context=new C();master=context.createGain();master.gain.value=volume*.45;master.connect(context.destination)}return context.resume().then(()=>true).catch(()=>false)}catch{return Promise.resolve(false)}}
 function primeSpeech(){
  if(!enabled||!('speechSynthesis'in window))return;
  try{const primer=new SpeechSynthesisUtterance('.');primer.lang='de-DE';primer.volume=0;window.speechSynthesis.speak(primer)}catch{}
 }
 function speakWizardFromTap(){
  if(!enabled){notify('Bitte Auftrittsklänge zuerst einschalten.');return false}
  return play('wizard');
 }
 function tone(frequency,at,duration,strength,type='sine'){
  const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;oscillator.frequency.value=frequency;
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(strength,at+.035);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  oscillator.connect(gain);gain.connect(master);active.add(oscillator);oscillator.onended=()=>{active.delete(oscillator);oscillator.disconnect();gain.disconnect()};oscillator.start(at);oscillator.stop(at+duration+.01);
 }
 function stop(){for(const node of active){try{node.stop()}catch{}}active.clear();if('speechSynthesis'in window)window.speechSynthesis.cancel()}
 function play(kind){
  if(!enabled)return false;
  if(kind==='wizard'){
   if(!('speechSynthesis'in window)){notify('Die Sprachausgabe ist in diesem Browser nicht verfügbar.');return false}
   const utterance=new SpeechSynthesisUtterance('Verzaubert!');utterance.lang='de-DE';utterance.rate=.87;utterance.pitch=.85;utterance.volume=volume;
   const german=window.speechSynthesis.getVoices().find(v=>v.lang.startsWith('de'));if(german)utterance.voice=german;
   window.speechSynthesis.cancel();
   block(3000);utterance.onstart=()=>block(3000);utterance.onend=()=>block(800);
   utterance.onerror=()=>{block(800);notify('Bitte beim Magier auf „Verzaubert! abspielen“ tippen, um die Stimme in Safari freizugeben.')};
   window.speechSynthesis.speak(utterance);return true;
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

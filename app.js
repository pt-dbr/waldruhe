import {createIdleMotion, IDLE_FRAMES} from './idle-motion.js?v=13';
import {createSounds} from './sounds.js?v=13';
import {createState, advance, nextWait, VISIT_DURATION} from './engine.js?v=13';
const $=id=>document.getElementById(id);
const defaults={animalInterval:12,unicornMinutes:1.5,dragonMinutes:3,wizardMinutes:5,exitInterval:3,warn:45,loud:70,reaction:1.2,motion:true,effects:true,volume:20,dragonReward:'Eine Aufgabe weniger für Zuhause!',wizardReward:'Dein Lehrer/deine Lehrerin vergisst, dass sie dir Hausaufgaben geben wollte.'};
const cfg={...defaults};try{Object.assign(cfg,JSON.parse(localStorage.getItem('waldruhe-clearing-v4')||'{}'))}catch{}
const bounds={animalInterval:[3,120],unicornMinutes:[.5,30],dragonMinutes:[.5,30],wizardMinutes:[.5,30],exitInterval:[1,15],warn:[5,90],loud:[10,100],reaction:[.3,5]};
for(const [key,[low,high]] of Object.entries(bounds))cfg[key]=Number.isFinite(+cfg[key])?Math.min(high,Math.max(low,+cfg[key])):defaults[key];
cfg.loud=Math.max(cfg.warn+5,cfg.loud);cfg.motion=cfg.motion!==false;cfg.effects=cfg.effects!==false;cfg.volume=Number.isFinite(+cfg.volume)?Math.max(0,Math.min(50,+cfg.volume)):20;
const save=()=>{try{localStorage.setItem('waldruhe-clearing-v4',JSON.stringify(cfg))}catch{}};
let state=createState(),mode='idle',busy=false,epoch=0,stream=null,audio=null,source=null,analyser=null,samples=null,raf=0,last=0,smoothed=0;
let displayedCount=0,displayedMagic=null,magicNode=null,voiceTimer=0,voiceCooldown=0;
let displayedLoss=0,flashTimer=0;
const pendingRemoval=new Map();
const idleMotion=createIdleMotion();
const reducedMotion=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
function configureMotion(){
 idleMotion.configure(cfg.motion);document.body.classList.toggle('idle-enabled',cfg.motion);
 $('motionInfo').textContent=cfg.motion?'Sanfte Tiergesten sind aktiv – auch bei reduzierter Systembewegung.':'Tierbewegungen sind ausgeschaltet.';
}
reducedMotion?.addEventListener?.('change',configureMotion);
const arrivalSounds=createSounds({block:ms=>{voiceCooldown=Math.max(voiceCooldown,performance.now()+ms)},notify:message=>{$('notice').textContent=message}});
function configureSounds(){arrivalSounds.configure(cfg.effects,cfg.volume);$('volume').value=cfg.volume;$('volumeOut').textContent=cfg.volume+' %'}
$('volume').addEventListener('input',()=>{cfg.volume=+$('volume').value;configureSounds();save()});
for(const key of ['dragonReward','wizardReward']){
 cfg[key]=typeof cfg[key]==='string'?cfg[key].slice(0,240):defaults[key];
 $(key).value=cfg[key];
 $(key).addEventListener('input',()=>{cfg[key]=$(key).value.slice(0,240);save();if(state.magic)applyRewardText(state.magic)});
}
function applyRewardText(kind){
 $('storyText').textContent=kind==='dragon'?(state.visitRepeat?'Belohnung wurde schon erreicht.':cfg.dragonReward.trim()||defaults.dragonReward):magicInfo[kind].text;
 $('storyNote').textContent=state.visitRepeat&&kind==='wizard'?'Belohnung wurde schon erreicht.':cfg.wizardReward.trim()||defaults.wizardReward;
 $('storyNote').hidden=kind!=='wizard';
}
for(const kind of ['unicorn','dragon','wizard'])$('test-'+kind).addEventListener('click',async()=>{configureSounds();if(kind==='wizard'){arrivalSounds.speakWizardFromTap();return}await arrivalSounds.unlock();arrivalSounds.play(kind)});
const cast=[
 {id:'rabbit',name:'Kaninchen',x:31,y:55,size:12},
 {id:'robin',name:'Rotkehlchen',x:67,y:44,size:7,kind:'bird'},
 {id:'squirrel',name:'Eichhörnchen',x:12,y:63,size:13},
 {id:'hedgehog',name:'Igel',x:40,y:83,size:12},
 {id:'fox',name:'Fuchs',x:81,y:73,size:18},
 {id:'butterfly',name:'Schmetterling',x:43,y:35,size:9,kind:'butterfly'},
 {id:'deer',name:'Rehkitz',x:20,y:86,size:23},
 {id:'owl',name:'Eule',x:85,y:47,size:11,kind:'bird'},
 {id:'badger',name:'Dachs',x:65,y:87,size:17},
 {id:'raccoon',name:'Waschbär',x:89,y:91,size:17}
];
const magicInfo={
 unicorn:{name:'Das Einhorn',text:'Wo Ruhe wohnt, bleibt ein bisschen Magie.',assets:['unicorn','unicorn-rest']},
 dragon:{name:'Der Drache',text:'Eine Aufgabe weniger für Zuhause!',assets:['dragon','dragon-after']},
 wizard:{name:'Der Zauberer',text:'Verzaubert!',assets:['wizard']}
};
function settingsUI(){
 for(const key of Object.keys(bounds)){$(key).value=cfg[key];$(key+'Out').textContent=cfg[key]+(['warn','loud'].includes(key)?' / 100':['unicornMinutes','dragonMinutes','wizardMinutes'].includes(key)?' min':' s')}
 configureMotion();$('motion').checked=cfg.motion;$('voice').checked=cfg.effects;configureSounds();document.body.classList.toggle('no-motion',!cfg.motion);
 document.querySelector('.meter').style.background=`linear-gradient(90deg,#82aa75 0 ${cfg.warn}%,#d9bb68 ${cfg.warn}% ${cfg.loud}%,#c77b66 ${cfg.loud}% 100%)`;
}
for(const key of Object.keys(bounds))$(key).addEventListener('input',()=>{
 cfg[key]=+$(key).value;if(key==='warn')cfg.loud=Math.max(cfg.loud,cfg.warn+5);if(key==='loud')cfg.warn=Math.min(cfg.warn,cfg.loud-5);
 if(key==='animalInterval')state.arrival=0;if((key==='unicornMinutes'&&state.stage===0)||(key==='dragonMinutes'&&state.stage===1)||(key==='wizardMinutes'&&state.stage===2))state.magicWait=0;if(key==='exitInterval'||key==='reaction'){state.departure=0;state.loudFor=0}
 settingsUI();save();render();
});
$('test-motion').addEventListener('click',()=>{
 if(mode==='idle'){$('notice').textContent='Bitte zuerst Mikrofon oder Demo starten und einige Tiere erscheinen lassen.';return}
 cfg.motion=true;settingsUI();save();idleMotion.preview();$('notice').textContent='Die bereits anwesenden Tiere zeigen ihre kleinen Gesten jetzt nacheinander.';
});
$('wizardSpeak').addEventListener('click',()=>{arrivalSounds.speakWizardFromTap()});
$('motion').addEventListener('change',()=>{cfg.motion=$('motion').checked;settingsUI();save()});
$('voice').addEventListener('change',()=>{cfg.effects=$('voice').checked;save();configureSounds();if(!cfg.effects)cancelVoice();else arrivalSounds.unlock()});
function animateAnimal(index,visible){
 const data=cast[index];let node=document.getElementById('animal-'+data.id);
 clearTimeout(pendingRemoval.get(data.id));pendingRemoval.delete(data.id);
 if(visible){
   if(!node){node=document.createElement('div');node.id='animal-'+data.id;node.className='animal '+(data.kind||'');
     node.style.cssText=`--x:${data.x}%;--y:${data.y}%;--size:${data.size}%;--depth:${Math.round(data.y)};--entry:${data.x<50?'-240%':'240%'};--turn:${data.x<50?'-15%':'15%'};--phase:${-index*.7}s`;
     const image=document.createElement('img');image.src=`assets/${data.id}.png`;image.alt='';image.draggable=false;
     if(IDLE_FRAMES[data.id]){const shell=document.createElement('div');shell.className='actor idle-shell';image.className='idle-base';
       const overlay=document.createElement('img');overlay.className='idle-variant';overlay.alt='';overlay.draggable=false;overlay.src=`assets/${IDLE_FRAMES[data.id][0].file}.png`;
       shell.append(image,overlay);node.append(shell);idleMotion.attach(data.id,image,overlay);
     }else{image.className='actor';node.append(image)}$('inhabitants').append(node);
   }
   if(node.classList.contains('leaving')&&IDLE_FRAMES[data.id])idleMotion.attach(data.id,node.querySelector('.idle-base'),node.querySelector('.idle-variant'));
   node.classList.remove('leaving');node.classList.add('entering');
 }else if(node){idleMotion.detach(data.id);node.classList.remove('entering');node.classList.add('leaving');const leavingNode=node;pendingRemoval.set(data.id,setTimeout(()=>{leavingNode.remove();pendingRemoval.delete(data.id)},1600))}
}
function cancelVoice(){arrivalSounds.stop();const wasSpeaking='speechSynthesis'in window&&window.speechSynthesis.speaking;clearTimeout(voiceTimer);if('speechSynthesis'in window)window.speechSynthesis.cancel();voiceCooldown=wasSpeaking?performance.now()+700:0}
function playArrival(kind){
 if(!cfg.effects||mode==='idle')return;
 voiceTimer=setTimeout(()=>{if(cfg.effects&&state.magic===kind&&mode!=='idle')arrivalSounds.play(kind)},kind==='wizard'?2200:250);
}
function showMagic(kind){
 cancelVoice();if(magicNode){const old=magicNode;old.classList.add('leaving');setTimeout(()=>old.remove(),1450);magicNode=null}
 $('story').hidden=true;$('spell').classList.remove('casting');
 if(!kind)return;
 const info=magicInfo[kind],node=document.createElement('div');node.className='visitor '+kind+(state.visitRepeat?' repeat-visit':'');
 for(const [i,asset]of info.assets.entries()){const image=document.createElement('img');image.src=`assets/${asset}.png`;image.alt='';image.className=kind==='unicorn'?(i===0?'standing':'resting'):kind==='dragon'?'actor '+(i===0?'holding':'after-tear'):'actor';node.append(image)}
 const sparks=document.createElement('div');sparks.className='sparkles';for(let i=0;i<16;i++){const star=document.createElement('i');star.style.cssText=`--px:${15+(i*31)%75}%;--py:${15+(i*23)%70}%;--delay:${(i*.17).toFixed(2)}s`;sparks.append(star)}node.append(sparks);
 if(kind==='dragon'){const page=document.createElement('div');page.className='torn-page';node.append(page)}
 $('magicLayer').append(node);magicNode=node;
 setTimeout(()=>{if(magicNode!==node||state.magic!==kind)return;
   node.classList.add('settled');$('storyName').textContent=info.name;
   applyRewardText(kind);
   $('storyNote').hidden=kind!=='wizard';$('wizardSpeak').hidden=kind!=='wizard';
   $('story').hidden=false;if(kind==='wizard')$('spell').classList.add('casting');
 },kind==='unicorn'?3000:kind==='dragon'?3500:2200);
 playArrival(kind);
}
function timeLabel(seconds){const n=Math.max(0,Math.ceil(seconds));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0')}
function render(level){
 $('forest').classList.toggle('magical',state.sparkle);
 $('forest').classList.toggle('magic-warning',state.sparkle&&state.band!=='quiet');
 $('magicLoss').hidden=!state.lostNotice;
 if(state.lossSerial!==displayedLoss){
  if(state.lossSerial>displayedLoss){clearTimeout(flashTimer);$('redFlash').classList.add('flashing');flashTimer=setTimeout(()=>$('redFlash').classList.remove('flashing'),650)}
  displayedLoss=state.lossSerial;
 }
 if(!state.lostNotice){clearTimeout(flashTimer);$('redFlash').classList.remove('flashing')}
 $('rewardTrail').textContent=['Einhorn → Drache → Zauberer','✧ Einhorn besucht · Nächstes Ziel: Drache','✧ Drache besucht · Nächstes Ziel: Zauberer','✧ Alle drei Belohnungen erreicht'][state.stage];
 const earned=[state.rewards.dragon?'Drache':null,state.rewards.wizard?'Zauberer':null].filter(Boolean);
 if(earned.length)$('rewardTrail').textContent+=' · Belohnung gilt: '+earned.join(' & ');
 if(state.count!==displayedCount){for(let i=0;i<10;i++)if((i<state.count)!==(i<displayedCount))animateAnimal(i,i<state.count);displayedCount=state.count}
 if(state.magic!==displayedMagic){showMagic(state.magic);displayedMagic=state.magic}
 const active=mode!=='idle',band=state.band;$('mode').textContent=mode==='demo'?'DEMO · KEINE MESSUNG':mode==='mic'?'MIKROFON AKTIV':'MESSUNG PAUSIERT';
 $('status').textContent=active?({quiet:'● Ruhig',warn:'● Unruhig',loud:'● Laut'})[band]:'○ Nicht aktiv';
 $('level').textContent=active?Math.round(level??smoothed):'–';$('needle').style.left=Math.max(0,Math.min(100,level??smoothed))+'%';$('count').textContent=state.count;
 let title,subtitle;if(!active){title=state.count?'Die Lichtung macht eine Pause.':'Die Lichtung wartet auf euch.';subtitle='Startet das Mikrofon oder entdeckt den Demomodus.'}
 else if(band==='loud'){title=state.lostNotice?'Die magische Ruhe ist fort.':'Die Tiere suchen wieder Ruhe.';subtitle=state.lostNotice?'Erreichte Belohnungen gelten weiter. Der Weg beginnt wieder beim Einhorn.':'Etwas leiser – dann fühlen sie sich wieder sicher.'}
 else if(band==='warn'){title=state.sparkle?'Achtung – bewahrt eure magische Ruhe.':'Die Lichtung hält den Atem an.';subtitle=state.sparkle?'Die Magie bleibt. Die nächste Belohnungszeit pausiert, bis es wieder ruhig ist.':'Die Ruhezeit beginnt neu, sobald es wieder leise ist.'}
 else if(state.magic){title=state.magic==='unicorn'?'Die magische Ruhe hat begonnen.':'Eure Ruhe hat Besuch angelockt.';subtitle='Genießt euren magischen Moment.'}
 else if(state.stage===3){title='Eure Lichtung ist voller Magie.';subtitle='Alle drei Gäste waren da. Bewahrt gemeinsam eure magische Ruhe.'}
 else if(state.sparkle){title='Die magische Ruhe bleibt.';subtitle=state.stage===1?'Das Glitzern begleitet euch bis zum Drachen.':'Das Glitzern begleitet euch bis zum Zauberer.'}
 else if(state.count===10){title='Alle Tiere sind da. Jetzt zählt eure Ruhe.';subtitle='Nach '+timeLabel(cfg.unicornMinutes*60)+' Minuten durchgehender Ruhe kommt das Einhorn.'}
 else{title=state.count?'Die Lichtung wird lebendig.':'Ein ruhiger Anfang.';subtitle='Mit jeder ruhigen Phase traut sich ein weiteres Tier zu euch.'}
 $('title').textContent=title;$('subtitle').textContent=subtitle;
 const full=state.count===10,done=state.stage===3&&!state.magic;
 const interval=full?nextWait(state,cfg):cfg.animalInterval,elapsed=full?state.magicWait:state.arrival;
 $('progressLabel').textContent=state.magic?'Magischer Besuch':state.between>0?'Glitzernde Lichtung':done?'Magische Ruhe bewahren':full?['Einhorn in','Drache in','Zauberer in'][state.stage]:'Nächstes Tier in';
 $('progressBar').style.width=(state.magic?Math.min(100,state.visitElapsed/VISIT_DURATION*100):done?100:Math.min(100,elapsed/Math.max(1,interval)*100))+'%';
 $('countdown').textContent=!active?'–':state.magic?timeLabel(VISIT_DURATION-state.visitElapsed):state.between>0?'✧':done?'✧':band!=='quiet'?'Pause':timeLabel(interval-elapsed);
 $('start').textContent=mode==='mic'?'Messung pausieren':'Mikrofon starten';$('demo').textContent=mode==='demo'?'Demo pausieren':'Ohne Mikrofon ausprobieren';$('demoControls').hidden=mode!=='demo';
 $('forest').setAttribute('aria-label',`${state.count} von zehn Tieren auf der Waldlichtung${state.magic?', zu Besuch: '+magicInfo[state.magic].name:''}.`);
}
function stop(){
 idleMotion.pause();epoch++;cancelAnimationFrame(raf);raf=0;last=0;mode='idle';cancelVoice();
 if(stream){stream.getTracks().forEach(track=>{track.onended=null;track.stop()});stream=null}
 source?.disconnect();source=null;analyser=null;samples=null;if(audio){audio.close().catch(()=>{});audio=null}render();
}
function frame(t){
 if(mode==='idle')return;const dt=last?Math.min(.25,Math.max(0,(t-last)/1000)):0;last=t;
 const speaking=('speechSynthesis'in window&&window.speechSynthesis.speaking)||t<voiceCooldown;
 let value=smoothed;
 if(mode==='mic'){
   if(audio.state!=='running'){stop();$('notice').textContent='Messung unterbrochen. Bitte Mikrofon erneut starten.';return}
   if(!speaking){analyser.getFloatTimeDomainData(samples);let sum=0;for(const v of samples)sum+=v*v;
     const measured=Math.max(0,Math.min(100,100+20*Math.log10(Math.max(.000001,Math.sqrt(sum/samples.length)))));
     smoothed+=(measured-smoothed)*(1-Math.exp(-dt/.25));value=smoothed}
 }else value=+$('demoLevel').value;
 idleMotion.tick(dt);if(!speaking)advance(state,value,dt,cfg);render(value);raf=requestAnimationFrame(frame);
}
$('start').addEventListener('click',async()=>{
 if(busy)return;arrivalSounds.unlock();if(mode==='mic'){stop();return}stop();busy=true;$('start').disabled=true;$('demo').disabled=true;const ticket=epoch;let localStream=null,localAudio=null;
 try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('HTTPS');
   localAudio=new(window.AudioContext||window.webkitAudioContext)();await localAudio.resume();
   localStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
   if(ticket!==epoch){localStream.getTracks().forEach(t=>t.stop());await localAudio.close();return}
   stream=localStream;audio=localAudio;source=audio.createMediaStreamSource(stream);analyser=audio.createAnalyser();analyser.fftSize=2048;samples=new Float32Array(analyser.fftSize);source.connect(analyser);await audio.resume();
   if(ticket!==epoch)return;
   stream.getTracks()[0].onended=()=>{stop();$('notice').textContent='Mikrofonverbindung beendet. Bitte erneut starten.'};
   mode='mic';smoothed=0;last=0;voiceCooldown=0;$('notice').textContent='Mikrofon aktiv. Nur der Pegel wird lokal ausgewertet. Kein Ton wird gespeichert oder übertragen.';render();raf=requestAnimationFrame(frame);
 }catch(e){localStream?.getTracks().forEach(t=>t.stop());if(localAudio&&localAudio!==audio)localAudio.close().catch(()=>{});stop();
   $('notice').textContent=e.message==='HTTPS'?'Bitte die HTTPS-Adresse in Safari öffnen. Mikrofonzugriff ist hier nicht verfügbar.':e.name==='NotAllowedError'?'Bitte das Mikrofon in Safari für diese Website erlauben. Alternativ den Demomodus nutzen.':e.name==='NotFoundError'?'Kein Mikrofon gefunden. Der Demomodus funktioniert auch ohne.':'Mikrofon konnte nicht gestartet werden. Bitte Browser und Mikrofonfreigabe prüfen.';
 }finally{busy=false;$('start').disabled=false;$('demo').disabled=false}
});
$('demo').addEventListener('click',()=>{if(busy)return;arrivalSounds.unlock();const running=mode==='demo';stop();if(!running){mode='demo';last=0;voiceCooldown=0;$('notice').textContent='Demomodus: Der Regler ersetzt das Mikrofon. Die Zeitintervalle laufen wie eingestellt.';render();raf=requestAnimationFrame(frame)}});
$('demoLevel').addEventListener('input',()=>{$('demoValue').textContent=$('demoLevel').value});
$('reset').addEventListener('click',()=>{state=createState();cancelVoice();render();$('notice').textContent='Neue Runde: Die Lichtung beginnt wieder leer.'});
$('present').addEventListener('click',()=>document.body.classList.add('present'));
$('exitPresent').addEventListener('click',()=>document.body.classList.remove('present'));
$('forest').addEventListener('dblclick',()=>document.body.classList.remove('present'));
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('present')});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(mode!=='idle'||busy)){stop();$('notice').textContent='Beim Verlassen der Seite pausiert. Eure Tiere bleiben erhalten. Bitte Messung erneut starten.'}});window.addEventListener('pagehide',stop);
settingsUI();render();
// Preload the entire cast, including rare visitors, so reveals do not wait on downloads.
const assetNames=['clearing',...cast.map(a=>a.id),...Object.values(magicInfo).flatMap(a=>a.assets),...Object.values(IDLE_FRAMES).flatMap(list=>list.map(frame=>frame.file))];
let failures=0,loaded=0;$('start').disabled=true;$('demo').disabled=true;
$('notice').textContent='Die Lichtung und ihre Bewohner werden geladen …';
for(const name of assetNames){const image=new Image();
 image.onload=()=>{loaded++;if(loaded===assetNames.length){$('start').disabled=false;$('demo').disabled=false;$('notice').textContent='Alle Bewohner sind bereit. Ton bleibt auf diesem Gerät. Keine Aufnahme, kein Upload.'}};
 image.onerror=()=>{failures++;$('assetWarning').hidden=false;$('assetWarning').textContent='Ein Bild fehlt. Bitte prüfen, ob der komplette Ordner „assets“ auf GitHub hochgeladen wurde.';$('notice').textContent='Bilder unvollständig geladen. Nach dem vollständigen Hochladen bitte die Seite neu laden.'};
 image.src=`assets/${name}.png`;
}

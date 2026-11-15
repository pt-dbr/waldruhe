export const MAX_ANIMALS = 10;
export function pickMagic(random = Math.random) {
  const r = random();
  return r < .6 ? 'unicorn' : r < .9 ? 'dragon' : 'wizard';
}
export function createState() {
  return {count:0, arrival:0, magicWait:0, magic:null, departure:0, loudFor:0, band:'quiet', totalQuiet:0};
}
// All timers use active foreground time. Yellow interrupts quiet streaks;
// only sustained red removes inhabitants, one at each departure interval.
export function advance(s, level, seconds, cfg, random = Math.random) {
  if (!Number.isFinite(level) || !Number.isFinite(seconds) || seconds <= 0) return s;
  // Small deterministic steps preserve event order across slow frames.
  let remaining = seconds;
  while (remaining > 1e-8) {
    const dt = Math.min(.05, remaining); remaining -= dt;
    s.band = level >= cfg.loud ? 'loud' : level >= cfg.warn ? 'warn' : 'quiet';
    if (s.band === 'quiet') {
      s.totalQuiet += dt; s.loudFor = 0; s.departure = 0;
      if (s.count < MAX_ANIMALS) {
        s.magicWait = 0; s.arrival += dt;
        if (s.arrival + 1e-8 >= cfg.animalInterval) {
          s.count++; s.arrival = 0;
          // No earlier quiet time is credited to the magic countdown.
          if (s.count === MAX_ANIMALS) s.magicWait = 0;
        }
      } else if (!s.magic) {
        s.magicWait += dt;
        if (s.magicWait + 1e-8 >= cfg.magicInterval) {
          s.magic = pickMagic(random); s.magicWait = cfg.magicInterval;
        }
      }
    } else {
      s.arrival = 0; s.magicWait = 0;
      if (s.band === 'warn') {s.loudFor = 0; s.departure = 0;}
      else {
        s.loudFor += dt;
        if (s.loudFor + 1e-8 >= cfg.reaction) {
          // The special visitor leaves first, then normal animals sequentially.
          if (s.magic) {s.magic = null; s.departure = 0;}
          s.departure += dt;
          if (s.departure + 1e-8 >= cfg.exitInterval) {
            s.count = Math.max(0, s.count - 1); s.departure = 0;
          }
        }
      }
    }
  }
  return s;
}

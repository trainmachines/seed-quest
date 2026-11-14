let muted = true;
let ctx: AudioContext | null = null;

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem('seed-quest-sound', next ? 'off' : 'on');
  } catch {
    /* ignore */
  }
}

export function loadMutePreference(): void {
  try {
    muted = localStorage.getItem('seed-quest-sound') !== 'on';
  } catch {
    muted = true;
  }
}

function context(): AudioContext | null {
  if (muted) return null;
  const Ctx = window.AudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  return ctx;
}

export function playTone(kind: 'blip' | 'bad' | 'loot' | 'wire'): void {
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const notes = kind === 'wire' ? [523, 659, 784, 1046] : kind === 'loot' ? [660, 880] : kind === 'bad' ? [196, 164] : [440];
  notes.forEach((freq, index) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(audio.destination);
    const start = now + index * 0.07;
    osc.start(start);
    osc.stop(start + 0.08);
  });
}

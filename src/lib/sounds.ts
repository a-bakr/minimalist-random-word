let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export const playPopSound = () => {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const frequencies = [523.25, 587.33, 659.25, 783.99, 880.0];
  const freq = frequencies[Math.floor(Math.random() * frequencies.length)];

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
};

export const playBeepSound = () => {
  const ctx = getCtx();
  [440, 554].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const start = ctx.currentTime + i * 0.22;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gainNode.gain.setValueAtTime(0, start);
    gainNode.gain.linearRampToValueAtTime(0.2, start + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.6);
  });
};

export const getRandomColor = (isDark: boolean) =>
  `hsl(${Math.floor(Math.random() * 360)}, 70%, ${isDark ? 75 : 40}%)`;

export const fmtDuration = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

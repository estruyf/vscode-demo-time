// Synthesizes the 20s soundtrack (120 BPM, C major, C G Am F family) to work/audio.wav.
// Every hit sits on the 16th grid counted from 0, the same grid as the video's cuts and clicks.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SR = 44100, DUR = 20, N = SR * DUR;
const BEAT = 0.5, BAR = 2;
const L = new Float32Array(N), R = new Float32Array(N);
const padBus = new Float32Array(N), bassBus = new Float32Array(N), pluckL = new Float32Array(N), pluckR = new Float32Array(N);
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 7;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1; };
const TAU = Math.PI * 2;
const put = (bufL, bufR, i, v, pan = 0) => { if (i < 0 || i >= N) return; bufL[i] += v * (1 - pan) * 0.5 * 2 ** 0.5; bufR[i] += v * (1 + pan) * 0.5 * 2 ** 0.5; };

// ---------- harmony ----------
const CH = { Am: [57, 60, 64], F: [53, 57, 60, 64], C: [55, 60, 64], G: [55, 59, 62] };
const ROOT = { Am: 33, F: 41, C: 36, G: 31 };
// [start, end, chord]
const PROG = [[0, 2, 'Am'], [2, 4, 'F'], [4, 6, 'C'], [6, 8, 'G'], [8, 10, 'Am'], [10, 12, 'F'], [12, 14, 'C'], [14, 16, 'G'], [16, 17, 'F'], [17, 18, 'G'], [18, 20, 'C']];
const chordAt = (t) => PROG.find(([a, b]) => t >= a && t < b)[2];

// ---------- instruments ----------
function kick(t0, amp = 0.5) {
  const s0 = Math.round(t0 * SR); let ph = 0;
  for (let i = 0; i < SR * 0.45; i++) {
    const t = i / SR, f = 48 + 100 * Math.exp(-t * 32);
    ph += (TAU * f) / SR;
    const v = Math.sin(ph) * Math.exp(-t * 6.5) * amp + (i < 60 ? rnd() * 0.15 * (1 - i / 60) : 0);
    put(L, R, s0 + i, v);
  }
}
function clap(t0, amp = 0.28) {
  const s0 = Math.round(t0 * SR); let lp = 0, prev = 0;
  for (let i = 0; i < SR * 0.25; i++) {
    const t = i / SR;
    const env = (t < 0.03 ? Math.exp(-((t % 0.01) * 300)) : 0) * 0.7 + Math.exp(-t * 18);
    const n = rnd(); lp += 0.35 * (n - lp); const bp = lp - prev; prev = lp;
    put(L, R, s0 + i, bp * env * amp * 2.2, (i % 2 ? 0.1 : -0.1));
  }
}
function hat(t0, amp = 0.07, decay = 55, pan = 0.25) {
  const s0 = Math.round(t0 * SR); let prev = 0;
  for (let i = 0; i < SR * 0.08; i++) {
    const n = rnd(), hp = n - prev; prev = n;
    put(L, R, s0 + i, hp * Math.exp(-(i / SR) * decay) * amp, pan);
  }
}
function crash(t0, amp = 0.1, len = 1.6) {
  const s0 = Math.round(t0 * SR); let prev = 0;
  for (let i = 0; i < SR * len; i++) {
    const n = rnd(), hp = n - prev; prev = n;
    const t = i / SR;
    put(L, R, s0 + i, hp * Math.exp(-t * 2.8) * amp * Math.min(1, t * 400), i % 3 ? 0.35 : -0.35);
  }
}
function noiseSwell(t0, t1, amp = 0.07) {
  // A filtered noise swell that opens up and stops dead on t1 (a cut on the beat)
  const s0 = Math.round(t0 * SR), s1 = Math.round(t1 * SR); let lp = 0;
  for (let i = s0; i < s1; i++) {
    const p = (i - s0) / (s1 - s0);
    lp += (0.02 + 0.5 * p * p) * (rnd() - lp);
    put(L, R, i, lp * amp * p * p * 2.5, Math.sin(p * 6) * 0.5);
  }
}
function padChord(t0, t1, notes, bright = 1, amp = 0.05) {
  const s0 = Math.round(t0 * SR), s1 = Math.round(t1 * SR);
  for (const m of notes) for (const det of [-0.0045, 0.0045]) {
    const f = mtof(m) * (1 + det); const H = Math.max(2, Math.round(3 + 6 * bright));
    let ph = rnd() * TAU;
    for (let i = s0; i < Math.min(N, s1 + SR * 0.25); i++) {
      const t = (i - s0) / SR, len = (s1 - s0) / SR;
      const env = Math.min(1, t / 0.08) * (t > len ? Math.exp(-(t - len) * 14) : 1);
      ph += (TAU * f) / SR;
      let v = 0; for (let h = 1; h <= H; h++) v += Math.sin(ph * h) / (h * h * 0.6 + 0.4);
      padBus[i] += v * env * amp * (det < 0 ? 1 : 0.95);
      // a hint of stereo: the two detuned voices go left and right
      if (det < 0) L[i] += 0; // panned in the mix below
    }
  }
}
function bassNote(t0, len, m, amp = 0.32) {
  const s0 = Math.round(t0 * SR), f = mtof(m); let ph = 0;
  for (let i = 0; i < SR * (len + 0.05); i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.006) * (t < len ? Math.exp(-t * 2.5) : Math.exp(-len * 2.5) * Math.exp(-(t - len) * 60));
    ph += (TAU * f) / SR;
    const v = Math.tanh(1.6 * (Math.sin(ph) + 0.35 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph)));
    if (s0 + i < N) bassBus[s0 + i] += v * env * amp;
  }
}
function pluck(t0, m, amp = 0.09, pan = 0) {
  const s0 = Math.round(t0 * SR), f = mtof(m); let ph = 0;
  for (let i = 0; i < SR * 0.6; i++) {
    const t = i / SR, env = Math.min(1, t / 0.003) * Math.exp(-t * 9);
    ph += (TAU * f) / SR;
    const v = Math.sin(ph) + 0.25 * Math.sin(3 * ph) * Math.exp(-t * 20) + 0.1 * Math.sin(2 * ph);
    const k = s0 + i; if (k < N) { pluckL[k] += v * env * amp * (1 - pan); pluckR[k] += v * env * amp * (1 + pan); }
  }
}
function bell(t0, m, amp = 0.06, pan = 0) {
  const s0 = Math.round(t0 * SR), f = mtof(m);
  for (let i = 0; i < SR * 1.0; i++) {
    const t = i / SR, env = Math.min(1, t / 0.002) * Math.exp(-t * 5);
    const v = Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 2.0 * t) * Math.exp(-t * 9) + 0.12 * Math.sin(TAU * f * 3.01 * t) * Math.exp(-t * 14);
    put(L, R, s0 + i, v * env * amp, pan);
  }
}
function uiClick(t0, m = 88, amp = 0.05) {
  // A soft tick tuned to the key: a short sine blip plus a breath of noise
  const s0 = Math.round(t0 * SR), f = mtof(m); let lp = 0;
  for (let i = 0; i < SR * 0.06; i++) {
    const t = i / SR; lp += 0.3 * (rnd() - lp);
    const v = Math.sin(TAU * f * t) * Math.exp(-t * 90) * 0.8 + lp * Math.exp(-t * 300) * 0.6;
    put(L, R, s0 + i, v * amp, 0.15);
  }
}
function keyTick(t0, amp = 0.09) {
  const s0 = Math.round(t0 * SR); let lp = 0;
  for (let i = 0; i < SR * 0.05; i++) {
    const t = i / SR; lp += 0.5 * (rnd() - lp);
    put(L, R, s0 + i, (lp * Math.exp(-t * 220) + Math.sin(TAU * 220 * t) * Math.exp(-t * 120) * 0.5) * amp);
  }
}

// ---------- arrangement ----------
// Pads: dark and closed in the hook, opening up from the reveal
for (const [a, b, c] of PROG) {
  const bright = a < 2 ? 0.1 : a < 4 ? 0.5 : 1;
  padChord(a, b, CH[c], bright, a < 2 ? 0.06 : 0.065);
}
// Hook: quiet 16th hats, the cut and paste keys, a riser into the reveal
for (let t = 0; t < 2; t += 0.125) hat(t, t % 0.5 === 0.25 ? 0.07 : 0.035, 70);
keyTick(1.0); keyTick(1.5);
noiseSwell(1.0, 2.0, 0.07);

// Groove from the reveal to the outro hit
const kicks = [];
for (let t = 2; t < 18; t += BEAT) { kick(t); kicks.push(t); }
kick(18, 0.6); kicks.push(18);
for (let t = 2; t < 18; t += BAR) { clap(t + 0.5); clap(t + 1.5); }
for (let t = 2; t < 18; t += 0.25) {
  const off = Math.abs((t % 0.5) - 0.25) < 1e-6;
  hat(t, off ? 0.075 : 0.03, off ? 45 : 80, off ? 0.3 : -0.3);
}
// A clap roll into the slide menu section
[9.5, 9.625, 9.75, 9.875].forEach((t, i) => clap(t, 0.08 + i * 0.04));
crash(2, 0.12); crash(4, 0.08); crash(10, 0.06); crash(16, 0.1); crash(18, 0.12, 2);
noiseSwell(3.5, 4.0, 0.06); noiseSwell(15.5, 16.0, 0.06);

// Bass: 8ths on the root, an octave jump on the last 8th of each beat pair
for (let t = 2; t < 18; t += 0.25) {
  const c = chordAt(t), r = ROOT[c];
  const step = Math.round((t % 2) / 0.25);
  bassNote(t, 0.2, step % 4 === 3 ? r + 12 : r, step % 2 ? 0.13 : 0.17);
}
bassNote(18, 1.6, ROOT.C, 0.18);

// Pluck arpeggio from the window onwards, up and down through the chord
const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
for (let t = 4; t < 18; t += 0.25) {
  const notes = CH[chordAt(t)].map((m) => m + 12);
  const all = [...notes.slice(0, 3), notes[0] + 12];
  const step = Math.round((t % 2) / 0.25);
  pluck(t, all[ARP[step]], 0.1, step % 2 ? 0.35 : -0.35);
}
// The final chord, spread out
[[18, 72], [18.125, 76], [18.25, 79], [18.375, 84]].forEach(([t, m], i) => pluck(t, m, 0.11, (i % 2 ? 0.3 : -0.3)));

// UI sounds on the beat grid, matching the cursor
[5.5, 6.0, 11.0, 12.5, 14.0, 14.75].forEach((t) => uiClick(t, 88));
uiClick(7.5, 84);
bell(7.5, 79, 0.05, -0.2); bell(7.625, 84, 0.045, 0.2);      // drop: G5 -> C6
bell(12.625, 76, 0.04, -0.2); bell(12.75, 81, 0.04, 0.2);    // layout changed: E5 -> A5 (over F/C)
bell(14.875, 72, 0.04, 0);                                     // hidden: C5

// ---------- mix ----------
// Sidechain the pad and bass to the kick
const duck = new Float32Array(N).fill(1);
for (const k of kicks) {
  const s0 = Math.round(k * SR);
  for (let i = 0; i < SR * 0.3 && s0 + i < N; i++) duck[s0 + i] = Math.min(duck[s0 + i], 1 - 0.55 * Math.exp(-(i / SR) / 0.09));
}
// Pluck delay: a dotted 8th (0.375s), on the grid
const D = Math.round(0.375 * SR);
for (let i = D; i < N; i++) { pluckL[i] += pluckR[i - D] * 0.32; pluckR[i] += pluckL[i - D] * 0.32; }
// Pad gets a short stereo spread via a 13ms offset
const off = Math.round(0.013 * SR);
for (let i = 0; i < N; i++) {
  const p = padBus[i] * duck[i], pd = i >= off ? padBus[i - off] * duck[i] : 0;
  L[i] += p * 0.85 + pd * 0.15 + bassBus[i] * duck[i] + pluckL[i];
  R[i] += p * 0.15 + pd * 0.85 + bassBus[i] * duck[i] + pluckR[i];
}
// Soft clip, fade the tail, normalize
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR, fade = Math.min(1, t / 0.005) * (t > 19 ? Math.cos(((t - 19) / 1) * Math.PI / 2) : 1);
  L[i] = Math.tanh(L[i] * 1.1) * fade; R[i] = Math.tanh(R[i] * 1.1) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(clampS(L[i] * g) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(clampS(R[i] * g) * 32767), 46 + i * 4);
}
function clampS(v) { return Math.max(-1, Math.min(1, v)); }
writeFileSync(path.join(here, 'audio.wav'), buf);
console.log('audio.wav, peak before normalize', peak.toFixed(3));

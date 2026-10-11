// Generates the demo clips: 16-bit PCM mono WAV, 44.1 kHz. No dependencies.
// Run: node tools/make-demo-audio.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "audio", "demo");
mkdirSync(outDir, { recursive: true });

function tone(freq, seconds, vol = 0.4) {
  const n = Math.floor(SR * seconds);
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, i / (SR * 0.01), (n - i) / (SR * 0.05)); // de-click
    const s = Math.sin(2 * Math.PI * freq * t) * vol * env;
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  return data;
}

function wav(pcm) {
  const header = Buffer.alloc(44);
  const dataSize = pcm.length;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}

writeFileSync(join(outDir, "note-440.wav"), wav(tone(440, 1.5)));
writeFileSync(join(outDir, "note-523.wav"), wav(tone(523.25, 1.5)));
writeFileSync(
  join(outDir, "arpeggio.wav"),
  wav(Buffer.concat([tone(440, 0.5), tone(523.25, 0.5), tone(659.25, 0.5)]))
);
console.log("wrote 3 demo clips to audio/demo/");

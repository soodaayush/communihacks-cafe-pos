// Makes the app's sound effects with ElevenLabs Sound Effects and saves them in public/sounds.
// Run once:  npm run sounds        (needs ELEVENLABS_API_KEY with the Sound Effects permission)
// Skips files that already exist. Use --force to make them again (e.g. after changing a prompt).
// The files are committed, so teammates and the live app never need the key to play them.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.ELEVENLABS_BASE_URL ?? "https://api.elevenlabs.io";
const OUT = process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1]
  : join(process.cwd(), "public", "sounds");
const FORCE = process.argv.includes("--force");

// Short, soft and friendly: these play many times a day, next to people who can be sensitive to noise.
const SOUNDS: { name: string; seconds: number; prompt: string }[] = [
  {
    name: "add",
    seconds: 0.5,
    prompt: "A single soft, friendly wooden pop. Very short, gentle, a quiet app tap.",
  },
  {
    name: "remove",
    seconds: 0.5,
    prompt: "A soft, quiet low swoosh going down. Very short, subtle, gentle app sound.",
  },
  {
    name: "sale",
    seconds: 1.5,
    prompt:
      "A classic cash register cha-ching: a bright bell and a drawer. Short and pleasant, not loud.",
  },
  {
    name: "success",
    seconds: 1.2,
    prompt: "A gentle, warm two-note chime going up. Calm, happy and short.",
  },
  {
    name: "error",
    seconds: 0.8,
    prompt: "A soft, low, gentle double boop. Friendly and not harsh, short.",
  },
  {
    name: "listen",
    seconds: 0.5,
    prompt:
      "A soft rising two-note blip, like a microphone starting to listen. Very short and gentle.",
  },
];

async function main() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    console.error("ELEVENLABS_API_KEY is not set (put it in .env.local).");
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  for (const s of SOUNDS) {
    const file = join(OUT, `${s.name}.mp3`);
    if (existsSync(file) && !FORCE) {
      console.log(`- ${s.name}.mp3 already there`);
      continue;
    }
    const res = await fetch(`${BASE}/v1/sound-generation?output_format=mp3_44100_64`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text: s.prompt, duration_seconds: s.seconds, prompt_influence: 0.5 }),
    });
    if (!res.ok) {
      console.error(
        `x ${s.name}: ElevenLabs answered ${res.status}: ${(await res.text()).slice(0, 200)}`,
      );
      process.exitCode = 1;
      continue;
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    writeFileSync(file, bytes);
    console.log(`+ ${s.name}.mp3 (${bytes.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// OPTIONAL. The app already has built-in sounds. This makes ElevenLabs Sound Effects versions instead and
// saves them in public/sounds; once public/sounds/manifest.json exists the app plays these.
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
    prompt:
      "A single soft, friendly bubble pop that rises slightly. Very short, gentle, a quiet app tap.",
  },
  {
    name: "remove",
    seconds: 0.5,
    prompt: "A single soft bubble that sinks slightly. Very short, quiet and gentle.",
  },
  {
    name: "tap",
    seconds: 0.5,
    prompt: "A tiny, very soft, light tick, like a gentle button press. Extremely short and quiet.",
  },
  {
    name: "success",
    seconds: 1.2,
    prompt: "A gentle, warm two-note chime going up. Calm, happy and short.",
  },
  {
    name: "sale",
    seconds: 1.5,
    prompt:
      "A classic cash register cha-ching: a bright bell and a drawer. Short and pleasant, not loud.",
  },
  {
    name: "error",
    seconds: 0.8,
    prompt: "A soft, low, gentle double boop. Friendly and not harsh, short.",
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

// Tells the app which files exist. Delete public/sounds/manifest.json to go back to the built-in sounds.
function writeManifest() {
  const manifest: Record<string, string> = {};
  for (const s of SOUNDS)
    if (existsSync(join(OUT, `${s.name}.mp3`))) manifest[s.name] = `${s.name}.mp3`;
  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`manifest.json lists ${Object.keys(manifest).length} sounds`);
}

main()
  .then(writeManifest)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

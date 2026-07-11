#!/usr/bin/env node
// audio.mjs — the shared HyperFrames audio engine. ONE implementation of TTS +
// BGM + SFX for every video workflow (product-launch, general-video, pr-to-video,
// …). Workflows do NOT vendor a copy: they write a neutral `audio_request.json`
// (a tiny per-workflow adapter maps their storyboard/scenes into it) and call:
//
//   node <MEDIA_DIR>/scripts/audio.mjs --request ./audio_request.json --hyperframes . --out ./audio_meta.json
//
// TTS and BGM are produced by MCP tools the calling AGENT invokes directly —
// this script never talks to a provider itself. It ingests whatever the agent
// already generated on disk and computes the deterministic parts (duration,
// word timing, volume/meta assembly):
//
//   TTS : agent runs tts-mcp-server (generate_speech / generate_batch_speech)
//         → assets/voice/<id>.mp3 per line, THEN this script probes duration
//         and chains a Whisper transcribe pass for word timing (Edge TTS has
//         no native word timestamps).
//   BGM : agent runs freesound-music (search_freesound_music → pick a CC0
//         result → download_freesound_music) → assets/bgm/track.mp3, THEN
//         this script probes duration and folds it into audio_meta.
//   SFX : always resolved against the bundled 21-file library (no retrieval).
//
// ── audio_request.json (input) ────────────────────────────────────────────────
//   {
//     "lang": "en", "speed": 1.0,
//     "lines": [                   // one TTS unit each; id joins back to the caller's model
//       { "id": "01", "text": "...", "sfx": ["whoosh", "ui click"] }
//     ],
//     "bgm": { "mode": "retrieve", // retrieve|none (override: --bgm-mode / --no-bgm)
//              "query": "calm cinematic underscore" }   // mood, also used as the Freesound search hint
//   }
//
// ── audio_meta.json (output, id-keyed) ───────────────────────────────────────
//   { voices: [ { id, path, duration_s, words: [{id,text,start,end}] } ],
//     bgm: { path, volume, mode, query?, duration_s? } | null,
//     sfx: [ { id, name, file, source, offset_s, duration_s, volume } ],
//     total_duration_s }
//
// --only tts,bgm,sfx  runs a subset and MERGES into an existing --out (so a
// workflow can do TTS+BGM early, then SFX later once cues exist).
//
// IMPORTANT: run the TTS/BGM MCP calls (tts-mcp-server / freesound-music)
// BEFORE this script for any --only that includes tts/bgm — this script only
// ingests files that already exist; it does not synthesize or download.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ffprobeDuration, transcribeWav, withWordIds } from "./lib/tts.mjs";
import { ingestBgm, inferBgmQuery } from "./lib/bgm.mjs";
import { resolveSfx } from "./lib/sfx.mjs";
import { mapWithConcurrency } from "./lib/concurrency.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
};
const has = (name) => argv.includes(`--${name}`);
const die = (m) => {
  console.error(`✗ audio engine: ${m}`);
  process.exit(1);
};
const r3 = (x) => Number(x.toFixed(3));

// The transcribe pass (Whisper via `npx hyperframes transcribe`) spawns its own
// model load per line; unbounded parallelism across many lines can OOM a
// resource-constrained machine or fail cold-start races, the same failure mode
// this engine used to see fanning out concurrent TTS+transcribe calls. Bound it.
const transcribeConcurrency = Math.max(1, Number(process.env.HYPERFRAMES_TTS_CONCURRENCY) || 4);

const hyperframesDir = resolve(flag("hyperframes", "."));
const requestPath = resolve(flag("request", join(hyperframesDir, "audio_request.json")));
const outPath = resolve(flag("out", join(hyperframesDir, "audio_meta.json")));
const sfxLibDir = resolve(flag("sfx-lib", join(HERE, "..", "assets", "sfx")));
const onlyArg = flag("only", "tts,bgm,sfx");
const only = new Set(
  onlyArg
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);
const bgmModeOverride = flag("bgm-mode", null);
const noBgm = has("no-bgm");
const langOverride = flag("lang", null);

if (!existsSync(requestPath)) die(`audio_request.json not found at ${requestPath}`);
let request;
try {
  request = JSON.parse(readFileSync(requestPath, "utf8"));
} catch (e) {
  die(`audio_request.json parse: ${e.message}`);
}
const lines = Array.isArray(request.lines) ? request.lines : [];
const lang = langOverride || request.lang || "en";

// ── merge base: preserve sections not selected by --only ──────────────────────
const prev = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : {};
const anomalies = [];

// ── TTS (ingest agent-generated files) ────────────────────────────────────────
let voices = prev.voices ?? [];
if (only.has("tts") && lines.length) {
  console.error(`· tts: ingesting ${lines.length} line(s) from assets/voice/`);
  const ingestLine = async (line) => {
    const id = String(line.id);
    const text = String(line.text ?? "").trim();
    if (!text) {
      anomalies.push(`line ${id}: empty text — skipped`);
      return null;
    }
    const rel = `assets/voice/${id}.mp3`;
    const abs = join(hyperframesDir, rel);
    if (!existsSync(abs)) {
      anomalies.push(
        `line ${id}: ${rel} not found — generate it first via tts-mcp-server (generate_speech/generate_batch_speech)`,
      );
      return null;
    }
    const dur = ffprobeDuration(abs);
    if (!isFinite(dur) || dur <= 0) {
      anomalies.push(`line ${id}: bad voice duration — omitted`);
      return null;
    }
    const rawWords = await transcribeWav({ wavRel: rel, lang, hyperframesDir });
    return { id, path: rel, duration_s: r3(dur), words: withWordIds(rawWords) };
  };
  const results = await mapWithConcurrency(lines, transcribeConcurrency, ingestLine);
  voices = results.filter(Boolean);
  for (const v of voices)
    console.error(`  voice ${v.id}: ${v.path} (${v.duration_s}s, ${v.words.length} words)`);
}
const hasVoice = voices.length > 0;
const totalDuration = r3(voices.reduce((a, v) => a + (v.duration_s || 0), 0));

// ── BGM (ingest agent-downloaded track) ───────────────────────────────────────
let bgm = prev.bgm ?? null;
if (only.has("bgm")) {
  bgm = null;
  const explicitMode = bgmModeOverride || request.bgm?.mode || null;
  const mode = noBgm ? "none" : explicitMode || "retrieve";
  const query = inferBgmQuery({ userQuery: request.bgm?.query, blob: request.bgm?.query });

  if (mode === "none") {
    console.error(`· bgm: disabled`);
  } else {
    bgm = ingestBgm({ hyperframesDir, query, hasVoice });
    if (bgm) {
      console.error(`  bgm: ${bgm.path} (freesound, query "${query}")`);
    } else {
      anomalies.push(
        `bgm: assets/bgm/track.mp3 not found — search + download it first via freesound-music (search_freesound_music → download_freesound_music), or pass --no-bgm`,
      );
    }
  }
}

// ── SFX ─────────────────────────────────────────────────────────────────────
let sfx = prev.sfx ?? [];
if (only.has("sfx")) {
  const cues = lines.flatMap((l) =>
    (Array.isArray(l.sfx) ? l.sfx : [])
      .map((name) => ({ id: String(l.id), name: String(name).trim() }))
      .filter((c) => c.name),
  );
  const res = await resolveSfx({ cues, hyperframesDir, sfxLibDir });
  sfx = res.sfx;
  anomalies.push(...res.anomalies);
  console.error(`· sfx: ${sfx.length} cue(s) resolved (bundled library)`);
}

// ── write audio_meta.json ─────────────────────────────────────────────────────
const meta = {
  voices,
  bgm,
  sfx,
  total_duration_s: totalDuration,
};
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(meta, null, 2));

console.log(`✓ audio engine → ${outPath}`);
console.log(`  ran: ${[...only].join(",")}`);
console.log(
  `  voices: ${voices.length}  ·  bgm: ${bgm ? "freesound" : "none"}  ·  sfx: ${sfx.length}`,
);
console.log(`  total voice duration: ${totalDuration}s`);
if (anomalies.length) {
  console.log(`\nanomalies (non-fatal):`);
  for (const a of anomalies) console.log(`  - ${a}`);
}

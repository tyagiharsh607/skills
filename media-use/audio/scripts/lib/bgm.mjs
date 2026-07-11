// bgm.mjs — background music for the media audio engine. Retrieval-only: the
// calling agent searches Freesound via the `freesound-music` MCP tool
// (`search_freesound_music` → pick a CC0 result → `download_freesound_music`),
// writing `assets/bgm/track.mp3` BEFORE running audio.mjs. There is no
// generation path — Freesound is a library, not a generative model — so BGM is
// synchronous end to end; there is no detached/pending state to wait on.
//
// Missing/failed BGM never blocks a render.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { ffprobeDuration } from "./tts.mjs";

const r3 = (x) => Number(x.toFixed(3));

// Default BGM level. Under narration music is a bed that must stay under the
// voice — 0.12 linear ≈ -18 dB. A silent film (no voice) has no voice to duck
// beneath, so BGM sits forward at 0.9. Callers may override per composition.
export const BGM_BED_VOLUME = 0.12;
export const BGM_SILENT_VOLUME = 0.9;
export const bgmDefaultVolume = (hasVoice) => (hasVoice ? BGM_BED_VOLUME : BGM_SILENT_VOLUME);

// ── search-query inference ────────────────────────────────────────────────────
// Freesound's search is keyword-matched, not prompt-following, so this returns
// a short, concrete keyword phrase (NOT a generative-style prompt with BPM/
// scale directives). An explicit query wins; otherwise infer from an industry
// keyword match in the caller's blob (a storyboard's `music:` field, brief,
// etc.), falling back to a generic calm-corporate query.
export function inferBgmQuery({ blob = "", userQuery = "" } = {}) {
  if (userQuery) return userQuery;
  const b = String(blob).toLowerCase();
  if (/\b(crypto|nft|web3|defi|token|blockchain|exchange|wallet|dao)\b/.test(b))
    return "atmospheric electronic ambient synth";
  if (/\b(finance|fintech|bank|payment|invest|wealth|insurance|treasury)\b/.test(b))
    return "calm cinematic piano strings";
  if (/\b(creative|agency|design|studio|art|brand|marketing|content)\b/.test(b))
    return "playful electronic upbeat";
  return "uplifting corporate tech ambient";
}

// ── ingest an already-downloaded track ────────────────────────────────────────
// The agent has already run search_freesound_music + download_freesound_music
// and written the result to `assets/bgm/track.mp3` (or wherever `rel` points).
// This just measures it and folds it into audio_meta.bgm. Returns null if the
// file isn't there (BGM is optional; render proceeds without it).
export function ingestBgm({ hyperframesDir, rel = "assets/bgm/track.mp3", query, hasVoice }) {
  const abs = join(hyperframesDir, rel);
  if (!existsSync(abs)) return null;
  const dur = ffprobeDuration(abs);
  return {
    path: rel,
    volume: bgmDefaultVolume(hasVoice),
    query: query || null,
    mode: "freesound",
    duration_s: isFinite(dur) && dur > 0 ? r3(dur) : null,
  };
}

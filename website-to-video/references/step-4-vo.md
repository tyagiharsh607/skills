# Step 4: VO, Timing + Captions

## If Step 2 said "no narration"

Skip the TTS sections below. The storyboard already has beat durations planned based on pacing and rhythm — those become `data-start` and `data-duration` values directly in Step 5.

**Background music:** Ask the user before moving to Step 5:

> "Do you have a music track for this video? If not, I can search Freesound's free CC0 catalog for one, or you can share a reference track ('something like this') and I'll find something similar."

If the user provides a track: note the file path and BPM in the storyboard for Step 5 to wire into `index.html`. If they want one sourced: call `mcp__freesound-music__search_freesound_music` with a short concrete mood query, pick a CC0 result, then `mcp__freesound-music__download_freesound_music` it. If they skip music entirely, the video uses SFX only — confirm that's intentional.

Move to Step 5.

---

## Generate a test clip before full narration — calibrate timing first

Generate a 2-sentence test clip NOW using the script's opening lines. Measure the actual duration. TTS engines commonly compress scripts relative to a naive words-per-second estimate. If you discover the audio is significantly shorter or longer than expected, you'll need to revise the storyboard beat timings before investing time in full narration generation.

**Do this before committing to beat count and durations:**

```
# Quick test (2 sentences) via the MCP tool:
generate_speech(text: "First sentence. Second sentence.", voice: "en-US-AriaNeural", output_path: "/tmp/test-tts.mp3")
# Measure: seconds ÷ words × total script words = estimated full audio length
```

If the estimate puts your video at ±15% of the planned duration, proceed. If it's more than 15% off, recalibrate the script length first:

- **Audio TOO SHORT** (more than 15% under planned duration) → add strategic pauses. In `narration.txt`, insert blank lines between paragraphs (≈0.6s each) or `...` between sentences (≈0.4s each). Aim for the pauses to land at storyboard beat boundaries so the silence feels intentional, not dead air.
- **Audio TOO LONG** (more than 15% over planned duration) → identify the beat in your storyboard with the highest words-per-second density. Cut one supporting sentence from THAT beat's lines — preserve the lead sentence (the one that names the beat's idea). Re-measure with another test clip before committing to full generation.
- **Audio matches plan but beat boundaries drift** → adjust the storyboard durations to match the actual narration, not the other way around. The audio is the ground truth once narration is generated.

The script formula assumes constant words-per-second, but punctuation, dramatic pauses, and silence cues all stretch real audio. Always trust a measured test clip over the formula.

## Background music

**Always ask about background music** — even when narration is present:

> "Do you want background music under the narration? I can search Freesound's free CC0 catalog for a mood that fits, or you can share a reference track. Even a subtle ambient underscore makes pauses between sentences feel intentional rather than empty."

If they want music sourced: call `mcp__freesound-music__search_freesound_music` with a short concrete mood query, pick a CC0 result, then `mcp__freesound-music__download_freesound_music` it. Note the track in the storyboard for Step 5 to wire into `index.html`. No sign-in or credential needed — Freesound's CC0 catalog is free, no attribution required.

## TTS

Narration is generated via `tts-mcp-server` (Microsoft Edge TTS) — free, no API key, no sign-in.

Pick a voice before generating:

- `mcp__tts-mcp-server__get_popular_voices` — a curated shortlist by language/gender, good for picking quickly.
- `mcp__tts-mcp-server__list_available_voices` — the full catalog (hundreds of voices, many languages) if you want something specific.

## Audition voices

Audition at least 2 voices with the first sentence of `SCRIPT.md` before committing:

```
generate_speech(text: "<first sentence of SCRIPT.md>", voice: "en-US-AriaNeural", output_path: "/tmp/audition-1.mp3")
generate_speech(text: "<first sentence of SCRIPT.md>", voice: "en-US-GuyNeural", output_path: "/tmp/audition-2.mp3")
```

Pick the voice that sounds most natural and conversational for the content type. Listen for pacing — does it breathe between sentences? Does it sound like a person or a robot?

## Script length check

Before generating, verify the script makes sense for the video. Word count depends entirely on the creative direction. The storyboard's pacing and style determine how much narration the video needs.

The key check: are there stretches where NOTHING is happening — no narration AND no compelling visual movement? Those are dead spots that lose the viewer. Every second needs either spoken words or strong visual energy carrying it.

## Generate full narration

Generate the full script as `narration.mp3` in the project directory, via `mcp__tts-mcp-server__generate_speech` (single file) or `generate_batch_speech` (if splitting into per-scene segments).

**If any command hangs for more than 60 seconds — don't just wait.** The user is sitting there watching you do nothing. Escalation order:

1. **Try again** — the same call again (transient failures are common)
2. **Try a shorter test sentence first**, then scale back up
3. **Try a different tool for the same task** — if `hyperframes transcribe` hangs, run `whisper-cli` directly on the audio

Never sit idle for 10 minutes hoping a stuck process will finish.

**Pronunciation issues:** neural TTS engines commonly mispronounce product names, acronyms, and unusual tech terms. Always apply substitutions before generating a full narration — test the first 2 sentences and listen:

- `API` → `A P I` (spell it out)
- `UI` → `U I`, `SaaS` → `sass`, `DevOps` → `dev ops`
- Product names with unusual spelling: test the first sentence and listen for mispronunciations
- If a name sounds wrong: write it phonetically in `narration.txt` (e.g., `Vercel` → `Ver-sell`, `Supabase` → `Soopa-base`)
- **No SSML tags** — the MCP tool takes plain text; `<break time="1s"/>` will be spoken literally. Use blank lines or `...` for pauses in `narration.txt`

**Also save the exact spoken text** — with pronunciation substitutions applied (e.g., `API` → `A P I`, `$2T` → `two trillion` and etc.) — as `narration.txt` in the same directory. This is the string passed to TTS, distinct from `SCRIPT.md` which is the human-readable creative doc. Having `narration.txt` makes it trivial to regenerate the audio later with a different voice without re-deriving the substitutions. Name it exactly `narration.txt`.

## Transcribe for word-level timestamps

`tts-mcp-server` doesn't return word-level timestamps, so this is always required:

```bash
npx hyperframes transcribe narration.mp3
```

Produces `transcript.json` with `[{ text, start, end }]` for every word. These timestamps are the source of truth for all beat durations.

## Map timestamps to beats

Go through STORYBOARD.md beat by beat. For each beat:

1. Find the first word of that beat's VO cue in `transcript.json`
2. Find the last word of that beat's VO cue
3. Set `beat.start = firstWord.start`, `beat.end = lastWord.end`
4. Add 0.3-0.5s padding at the end for visual breathing room

Update STORYBOARD.md with real durations. Replace estimated times (e.g., "0:00-0:05") with actual timestamps as precise as possible (e.g., "0.00-3.21s").

Beat boundaries land on word onsets — hard cuts to the VO.

## Timing reconciliation — required before Step 5

After mapping all beats, compare real total audio duration against the storyboard's planned duration:

```
real_total = last_word.end + cta_hold (typically 2–3s)
planned_total = sum of all beat planned durations
delta = |real_total - planned_total|
```

**If delta > 15% of planned total — do not proceed to Step 5 without resolving it.** Common causes and fixes:

- **Audio shorter than planned:** TTS engines commonly generate compressed speech with minimal pauses. Proportionally scale all non-CTA beat durations down to match the real audio. Example: planned 30s, audio 19s — multiply each beat duration by 19/30 (excluding the CTA hold). Update STORYBOARD.md.
- **Audio much longer than planned (>30% over):** The script was too long for the intended duration. Trim the script (remove one beat's VO), regenerate audio, re-transcribe.
- **CTA beat timing:** The CTA beat should hold for 2–3 seconds after the last spoken word — not extend to fill empty time. `cta_start = last_word.end + 0.3s`, `cta_duration = 2.5s`. Hard cap. Dead silence after the CTA hold loses the viewer.

**Always tell the user** if you adjusted durations significantly from the storyboard plan. They approved a specific beat structure — if it changed, they need to know.

## Captions

After the narration is generated and transcribed, ask the user:

> **Would you like captions on the video?**
>
> - **Yes** — per-word captions synced to the narration. Great for social media (most viewers watch on mute) and accessibility.
> - **No** — narration audio only, no text overlay.

If yes, captions are built as a separate composition (`compositions/captions.html`) in Step 5. The `transcript.json` drives the timing — each word appears/highlights as it's spoken. Read [the captions reference](../../hyperframes/references/captions.md) for styling options (scale-pop, typewriter, fade+slide, etc.) and positioning rules.

## Save timing data for Step 5

Record the final beat timings (start, duration) so Step 5 (Build) can use them when building `index.html`. The storyboard now has real timestamps — these become `data-start` and `data-duration` values on each scene slot when the root composition is assembled in Step 5.

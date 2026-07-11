# Text To Speech

TTS is produced by the **`tts-mcp-server`** MCP tool (Microsoft Edge TTS) — the agent calls it directly; `audio.mjs` only ingests the resulting file. No API key or sign-in is needed.

## Generating one line

Call `mcp__tts-mcp-server__generate_speech` with the line's text, an explicit `voice`, and `output_path` set to `assets/voice/<id>.mp3` inside the project (`<id>` matches the line's `id` in `audio_request.json`):

```
generate_speech(
  text: "Welcome to HyperFrames",
  voice: "en-US-AriaNeural",
  output_path: "<project>/assets/voice/01.mp3",
)
```

## Generating a whole script at once

For multiple lines, prefer `mcp__tts-mcp-server__generate_batch_speech` in one call — pass every line's text + desired filename (`<id>.mp3`) and an `output_dir` pointed at `<project>/assets/voice/`:

```
generate_batch_speech(
  narrations: [
    { text: "...", filename: "01.mp3" },
    { text: "...", filename: "02.mp3" },
  ],
  output_dir: "<project>/assets/voice",
)
```

## After generation: ingest via the engine

Once the files exist, run the engine to probe duration and get word-level timing via Whisper (Edge TTS returns no native word timestamps):

```bash
node <MEDIA_DIR>/audio/scripts/audio.mjs --request ./audio_request.json --hyperframes . --out ./audio_meta.json --only tts
```

This chains `npx hyperframes transcribe` internally — no separate step needed. See `transcribe.md` for model/language details.

## Voice selection

- `mcp__tts-mcp-server__get_popular_voices` — a curated shortlist by language/gender, good for picking quickly.
- `mcp__tts-mcp-server__list_available_voices` — the full catalog (hundreds of voices across many languages) when you need something specific.

Popular defaults:

| Content type      | Voice                                   |
| ----------------- | ---------------------------------------- |
| Product demo      | `en-US-AriaNeural`, `en-US-JennyNeural`  |
| Tutorial / how-to | `en-US-GuyNeural`                        |
| Marketing / promo | `en-US-AriaNeural`                       |
| British English   | `en-GB-SoniaNeural`                      |

Pin a voice explicitly per project so tone stays consistent across scenes — don't let it drift line to line.

## Multilingual

`tts-mcp-server`'s voice catalog spans many languages (pass the matching locale-tagged voice, e.g. `es-ES-...`, `fr-FR-...`, `ja-JP-...` — check `list_available_voices` for exact names). After generation, match Whisper's `--model`/`--language` flags to the spoken language when running `transcribe` (auto-handled by `audio.mjs` via the request's `lang` field).

## Long scripts

Past a few paragraphs, split into per-line/per-scene segments and use `generate_batch_speech` rather than one giant `generate_speech` call — this also keeps each scene's audio file independently addressable for the captions/timing pipeline.

## Output shape reminder

`audio.mjs` writes each line's word timing in the same flat shape the captions pipeline expects:

```json
[
  { "id": "w0", "text": "Hi", "start": 0.0, "end": 0.21 },
  { "id": "w1", "text": "there", "start": 0.22, "end": 0.55 }
]
```

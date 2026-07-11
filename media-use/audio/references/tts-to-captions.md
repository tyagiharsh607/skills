# TTS → Captions

When no recorded voiceover exists, generate one via `tts-mcp-server` and obtain word-level caption timing via Whisper. There's a single path — Edge TTS voices don't return word timestamps, so every generated line chains a transcribe pass:

```
# 1. Agent generates the line's audio directly via the MCP tool:
generate_speech(text: "...", voice: "en-US-AriaNeural", output_path: "narration.mp3")
```

```bash
# 2. Whisper extracts precise word boundaries from the generated audio:
npx hyperframes transcribe narration.mp3 --model small.en
```

Match `--model` to the spoken language (`small.en` for English voices, `small --language <code>` otherwise). Caption timing then matches delivery without hand-tuning. Consume `transcript.json` via the caption references in `captions/`.

When going through the shared engine (`scripts/audio.mjs`), this chain happens automatically — generate each line's audio first via `tts-mcp-server`, then run the engine with `--only tts`; it probes duration and runs the Whisper pass for you, writing the flat `{ id, text, start, end }` word array straight into `audio_meta.json`.

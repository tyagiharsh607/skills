# Requirements & Caches

## Providers

Neither audio provider needs an account, API key, or sign-in flow — both are called directly as MCP tools by the agent:

| Capability | Provider                              | Requires                                   |
| ---------- | -------------------------------------- | -------------------------------------------- |
| TTS        | `tts-mcp-server` (Microsoft Edge TTS)  | Nothing — free, no key                        |
| BGM        | `freesound-music` (Freesound CC0 catalog) | Nothing — free, CC0 only, no attribution needed |
| SFX        | Bundled local library                  | Nothing — ships with the skill                |

## Model caches & system dependencies

Each command downloads its own model on first run and caches it under `~/.cache/hyperframes/`:

- **TTS (`tts-mcp-server`)** — no local model download; audio comes back as `.mp3` directly from the MCP tool, no `ffmpeg` transcode required for generation itself. `ffprobe`/`ffmpeg` on PATH is still needed for duration probing and any downstream format conversion in a composition.
- **BGM (`freesound-music`)** — no local model; downloads a finished `.mp3` from Freesound.
- **Transcribe** — Whisper model size depending on choice (75 MB – 3.1 GB) in `whisper/`. Bundles `whisper.cpp`. Always required for TTS word timing, since Edge TTS has no native word timestamps.
- **Remove-background** — `u2net_human_seg` (~168 MB ONNX) in `background-removal/models/`. Peak inference RAM ~1.5 GB.

Run `npx hyperframes doctor` if a command fails because of a missing dependency.

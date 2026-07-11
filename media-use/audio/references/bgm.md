# Background music (BGM)

One music bed per composition, sourced from Freesound's CC0 (public-domain) catalog via the **`freesound-music`** MCP tool — the agent searches and downloads directly; `audio.mjs` only ingests the resulting file. No API key or sign-in needed, and no attribution required (CC0 only).

There is no generation path — Freesound is a library, not a generative model — so this is retrieval-only and fully synchronous (no detached/pending state, no `wait-bgm` step).

## Driving it from the request

`audio_request.json` → `bgm: { mode?, query? }`:

- **`mode`** — `retrieve | none`. Omit for the default (`retrieve`).
- **`query`** — the mood/keyword hint, both for your Freesound search and recorded in the output meta (e.g. a storyboard's `music:` field, or a short phrase like `"calm cinematic underscore"`).

## Searching and downloading

1. **Search** with `mcp__freesound-music__search_freesound_music`, passing a concrete mood/genre query (Freesound is keyword-matched, not prompt-following — short, concrete phrases work best):

```
search_freesound_music(query: "calm cinematic piano", min_duration: 30, max_duration: 180, per_page: 10)
```

Use `mcp__freesound-music__get_popular_search_terms` if you want a starting list of terms known to return good results.

2. **Pick a result** — prefer a track whose duration comfortably covers the total voice duration (loop/trim in your composition if needed; Freesound doesn't generate to an exact target length).

3. **Download** with `mcp__freesound-music__download_freesound_music`, writing straight to the project's expected path:

```
download_freesound_music(sound_id: 123456, output_path: "<project>/assets/bgm/track.mp3")
```

4. **Ingest** — run the engine to probe duration and fold it into `audio_meta.bgm`:

```bash
node <MEDIA_DIR>/audio/scripts/audio.mjs --request ./audio_request.json --hyperframes . --out ./audio_meta.json --only bgm
```

Output shape:

```jsonc
{
  "path": "assets/bgm/track.mp3",
  "volume": 0.12,
  "mode": "freesound",
  "query": "calm cinematic piano",
  "duration_s": 42.0,
}
```

`volume` comes from the engine's `bgmDefaultVolume()`: `BGM_BED_VOLUME` (currently `0.12` ≈ -18 dB — a bed under the voice) under narration, `BGM_SILENT_VOLUME` (currently `0.9`) for a silent film (no voice). Tune those constants in `scripts/lib/bgm.mjs`, not call sites. An explicit `volume` in `audio_meta.json` always overrides this default.

## Query keyword guide

A short concrete phrase beats a generic one. Rough starting points by industry:

| Match in brief/blob                                        | Suggested query                       |
| ------------------------------------------------------------ | --------------------------------------- |
| `crypto / nft / web3 / defi / token / blockchain`             | `atmospheric electronic ambient synth`  |
| `finance / fintech / bank / payment / invest / wealth`       | `calm cinematic piano strings`          |
| `creative / agency / design / studio / art / brand`          | `playful electronic upbeat`             |
| _(default: SaaS / tech / platform)_                           | `uplifting corporate tech ambient`      |

`scripts/lib/bgm.mjs`'s `inferBgmQuery()` implements this same mapping — use it directly if you're wiring a workflow adapter, or just pick a concrete phrase yourself.

## Failure modes

| Failure                                       | Behavior                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| No good search result                         | Skip BGM — don't download a poor match just to have something.                                        |
| `assets/bgm/track.mp3` missing at ingest time | `bgm: null`, anomaly logged with a reminder to search+download first. Render proceeds without BGM.    |
| `mode: none` / `--no-bgm`                      | BGM disabled outright, no search/download attempted.                                                  |

BGM failure never blocks a render.

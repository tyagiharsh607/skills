# Sound effects (SFX)

Named sound effects, produced by the shared audio engine (`scripts/audio.mjs` → `scripts/lib/sfx.mjs`). Always resolved against the **bundled 21-file library** (`assets/sfx/` + `manifest.json`): match each cue name, copy the matched file into the project. Offline, deterministic, free — no MCP call, no network, no credential.

There is no `npx hyperframes sfx` command and no retrieval path. A cue that matches nothing is **skipped** (recorded as an anomaly); SFX never blocks a render.

## Cues — request → meta

Each line names the effects it wants: `lines[].sfx: ["whoosh", "ui click"]`. The engine flattens these into cues, resolves them against the bundled library, dedupes identical `(id, name)` pairs (the same effect named twice copies once), and writes `audio_meta.sfx[]`:

```jsonc
{
  "id": "3",                       // joins the cue to the caller's model (frame / scene / segment)
  "name": "whoosh",
  "file": "assets/sfx/whoosh.mp3", // copied, relative to project root
  "source": "local",
  "offset_s": 0,                   // delay from the line's start
  "duration_s": 0.57,
  "volume": 0.35                   // SFX sit UNDER voice + BGM
}
```

## Bundled library

21 curated files in `assets/sfx/`, indexed by `manifest.json` — `{ file, duration, description }` per key (e.g. `whoosh`, `pop`, `click`, `chime`, `riser`, `impact-bass-1`, `glitch-1`, `typing`, …). A cue name resolves by **manifest key, file basename, or slug**, so `whoosh`, `whoosh.mp3`, or `"ui click"` (→ slug) all match. Matched files are copied into the project's `assets/sfx/`; `duration_s` comes from the manifest, so timing is known **offline** — e.g. `riser` is 10.03s, so trigger it at `climax − 10.03s`. The manifest's `description` field carries placement hints per effect; read `assets/sfx/manifest.json` for the full set and usage.

Only cues matching one of the 21 bundled names resolve — the long tail (arbitrary named effects) isn't available; pick from the manifest's known set when naming a cue.

## Rules

- **Volume ~0.35.** SFX must sit under narration and BGM, not fight them.
- **No match → skip, don't fail.** A missing effect logs an anomaly and moves on; never a render blocker.
- **Bundled library only.** No retrieval, no generation — match a name against the 21-file manifest.
- **One asset per distinct name.** Reuse across lines is deduped to a single copy, many cues.

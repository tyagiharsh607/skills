// SFX (for the top-level `resolve --type sfx` command) is agent-mediated the
// same way bgm is: `freesound-music` is an MCP tool, which only the calling
// agent can invoke — never a Node script. This provider can't search or
// download on its own, so it surfaces a clear hint and returns null; the
// registry cascade then reports a miss. The agent's actual path is:
//   1. mcp__freesound-music__search_freesound_music(query: "<effect name>")
//   2. mcp__freesound-music__download_freesound_music(sound_id, output_path)
//   3. node scripts/resolve.mjs --type sfx --from <output_path> --project .
// (For the shared audio ENGINE's bundled 21-file SFX library — a different,
// offline-only path — see audio/references/sfx.md; that one needs no MCP call.)
export const sfxProvider = {
  async search(intent) {
    console.error(
      `media-use: sfx is agent-mediated — call mcp__freesound-music__search_freesound_music` +
        ` (query: ${JSON.stringify(intent)}) then download_freesound_music, then ` +
        `\`resolve --type sfx --from <file>\` to register it.`,
    );
    return null;
  },
};

// BGM is agent-mediated: `freesound-music` is an MCP tool, which only the
// calling agent can invoke — never a Node script. This provider can't search
// or download on its own, so it surfaces a clear hint and returns null; the
// registry cascade then reports a miss. The agent's actual path is:
//   1. mcp__freesound-music__search_freesound_music(query: "<mood>")
//   2. mcp__freesound-music__download_freesound_music(sound_id, output_path)
//   3. node scripts/resolve.mjs --type bgm --from <output_path> --project .
// (--from freezes the file and registers it in the manifest, same as any
// other ingested asset.)
export const bgmProvider = {
  async search(intent) {
    console.error(
      `media-use: bgm is agent-mediated — call mcp__freesound-music__search_freesound_music` +
        ` (query: ${JSON.stringify(intent)}) then download_freesound_music, then ` +
        `\`resolve --type bgm --from <file>\` to register it.`,
    );
    return null;
  },
};

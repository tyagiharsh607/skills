// Voice/TTS (for the top-level `resolve --type voice` command) is agent-
// mediated: `tts-mcp-server` is an MCP tool, which only the calling agent can
// invoke — never a Node script. This replaces the old two-tier local-Kokoro /
// paid-HeyGen-upsell cascade — tts-mcp-server (Microsoft Edge TTS) is free, so
// there's no local-vs-paid distinction left to arbitrate. This provider can't
// generate on its own, so it surfaces a clear hint and returns null; the
// registry cascade then reports a miss. The agent's actual path is:
//   1. mcp__tts-mcp-server__generate_speech(text: "<intent>", voice: "...", output_path: "...")
//   2. node scripts/resolve.mjs --type voice --from <output_path> --project .
// (--from freezes the file and registers it in the manifest, same as any
// other ingested asset. For picking a voice, see
// mcp__tts-mcp-server__get_popular_voices / list_available_voices.)
export async function ttsGenerate(intent) {
  console.error(
    `media-use: voice is agent-mediated — call mcp__tts-mcp-server__generate_speech` +
      ` (text: ${JSON.stringify(intent)}), then \`resolve --type voice --from <file>\`` +
      ` to register it.`,
  );
  return null;
}

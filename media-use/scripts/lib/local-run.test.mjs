import { strict as assert } from "node:assert";
import { test } from "node:test";
import { runLocalModel } from "./local-run.mjs";

const strongCpu = { ramMB: 16000, gpu: { present: false, vramMB: 0 }, appleSilicon: false };
const tiny = { ramMB: 512, gpu: { present: false, vramMB: 0 }, appleSilicon: false };
const ok = () => {}; // which/exec that succeed

test("recommends the CLI path when no local tier fits the machine", () => {
  const r = runLocalModel("tts", { specs: tiny, which: ok, exec: ok });
  assert.equal(r.recommend, "cli");
});

// tts no longer has a CPU-tier local model (Kokoro retired — voice generation
// is agent-mediated via tts-mcp-server now), so these two generic
// install-recommendation / run-when-installed behaviors are exercised against
// "upscale" instead (real-esrgan is CPU-capable, same shape of test).
test("recommends install when the tool is not on PATH", () => {
  const r = runLocalModel("upscale", {
    specs: strongCpu,
    which: () => {
      throw new Error("not found");
    },
    exec: ok,
    vars: { in: "/tmp/in.png", out: "/tmp/out.png" },
  });
  assert.equal(r.recommend, "install");
  assert.equal(r.model, "real-esrgan");
  assert.match(r.command, /real-esrgan-ncnn-vulkan/);
});

test("runs the model and returns the output path when installed", () => {
  let ran = "";
  const r = runLocalModel("upscale", {
    specs: strongCpu,
    which: ok,
    exec: (cmd) => {
      ran = cmd;
    },
    vars: { in: "/tmp/in.png", out: "/tmp/out.png" },
  });
  assert.equal(r.model, "real-esrgan");
  assert.equal(r.out, "/tmp/out.png");
  assert.match(ran, /\/tmp\/in\.png/, "invoke template filled with vars");
  assert.match(ran, /\/tmp\/out\.png/);
});

test("a failing run degrades to an install recommendation, never throws", () => {
  const r = runLocalModel("upscale", {
    specs: strongCpu,
    which: ok,
    exec: () => {
      throw new Error("boom");
    },
    vars: { in: "a.png", out: "b.png" },
  });
  assert.equal(r.recommend, "install");
});

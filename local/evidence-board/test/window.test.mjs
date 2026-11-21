// node --test test/   (`npm test` builds the view first)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHttpServer, loadView } from "../server.mjs";
import { CASE_WINDOW_TOOL, CASE_WINDOW_DESCRIPTION, SERVER_INSTRUCTIONS, readCaseWindow } from "../window.mjs";

const dir = mkdtempSync(join(tmpdir(), "dj-window-"));
const file = join(dir, "case-window.json");
const GOOD = {
  case_run: "2026-11-19",
  start: "2026-11-18T20:30:00Z",
  end: "2026-11-19T04:00:00Z",
  namespace: "kipsake-sleep-floor",
  target: "local",
  loaded_at: "2026-11-21T19:27:59Z",
};

let server;
let base;
before(async () => {
  server = createHttpServer(loadView(), file);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

let id = 0;
async function rpc(method, params) {
  const res = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
  });
  const text = await res.text();
  const line = text.split("\n").find((l) => l.startsWith("data:"));
  return JSON.parse(line ? line.slice(5) : text);
}
const call = () => rpc("tools/call", { name: CASE_WINDOW_TOOL, arguments: {} });

test("case_window is listed with no inputs, read-only, and a factual description", async () => {
  const { result } = await rpc("tools/list");
  const tool = result.tools.find((t) => t.name === CASE_WINDOW_TOOL);
  assert.ok(tool);
  assert.deepEqual(tool.inputSchema.properties ?? {}, {});
  assert.deepEqual(tool.inputSchema.required ?? [], []);
  assert.equal(tool.annotations.readOnlyHint, true);
  assert.equal(tool.annotations.idempotentHint, true);
  assert.equal(tool.annotations.openWorldHint, false);
  assert.equal(tool.description, CASE_WINDOW_DESCRIPTION);
  // Descriptive, not imperative: hosts treat commands in a tool description as injection.
  assert.doesNotMatch(tool.description, /\b(you must|always|never|do not call|your next)\b/i);
});

test("with the file present it returns the window as text and as structured content", async () => {
  writeFileSync(file, JSON.stringify(GOOD));
  const { result } = await call();
  assert.ok(!result.isError);
  const w = result.structuredContent;
  assert.deepEqual(JSON.parse(result.content[0].text), w);
  assert.equal(w.case_run, "2026-11-19");
  assert.equal(w.from, "2026-11-18T20:30:00Z");
  assert.equal(w.to, "2026-11-19T04:00:00Z");
  assert.equal(w.incident_at, "2026-11-19T03:02:00Z");
  assert.equal(w.namespace, "kipsake-sleep-floor");
  assert.equal(w.logql_selector, '{service_namespace="kipsake-sleep-floor"} | case_run="2026-11-19"');
  assert.equal(w.loaded_at, "2026-11-21T19:27:59Z");
  assert.match(w.note, /UTC/);
});

test("the LogQL selector is a service_namespace stream selector then a case_run structured-metadata filter, with no logfmt stage", () => {
  writeFileSync(file, JSON.stringify({ ...GOOD, case_run: "2026-12-03", namespace: "ns-x" }));
  const r = readCaseWindow(file);
  assert.ok(r.ok);
  assert.equal(r.window.logql_selector, '{service_namespace="ns-x"} | case_run="2026-12-03"');
  assert.ok(!r.window.logql_selector.includes("logfmt"));
});

test("the file is read on every call, so a later load shows up", async () => {
  writeFileSync(file, JSON.stringify({ ...GOOD, case_run: "2026-11-26", start: "2026-11-25T20:30:00Z", end: "2026-11-26T04:00:00Z" }));
  const { result } = await call();
  assert.equal(result.structuredContent.case_run, "2026-11-26");
  assert.equal(result.structuredContent.incident_at, "2026-11-26T03:02:00Z");
});

test("a missing file is an error that says the case isn't loaded yet", async () => {
  rmSync(file, { force: true });
  const { result } = await call();
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /isn't loaded yet/);
  assert.match(result.content[0].text, /docker compose logs loader/);
  assert.equal(result.structuredContent, undefined);
});

test("an empty file is treated as not loaded", async () => {
  writeFileSync(file, "  \n");
  const { result } = await call();
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /isn't loaded yet/);
});

test("a malformed file is an error that points the player at the gcx-token logs", async () => {
  for (const bad of ["{not json", "[]", "null", JSON.stringify({ case_run: "2026-11-19" }), JSON.stringify({ ...GOOD, start: "later" }), JSON.stringify({ ...GOOD, case_run: "yesterday" })]) {
    writeFileSync(file, bad);
    const { result } = await call();
    assert.equal(result.isError, true, bad);
    assert.match(result.content[0].text, /docker compose logs gcx-token/, bad);
  }
});

test("a file without a namespace falls back to the case's namespace", () => {
  const { namespace, ...rest } = GOOD;
  writeFileSync(file, JSON.stringify(rest));
  const r = readCaseWindow(file);
  assert.equal(r.ok, true);
  assert.equal(r.window.namespace, "kipsake-sleep-floor");
});

test("the server sends short instructions, with the rules that matter in the first 512 characters", async () => {
  const { result } = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } });
  assert.equal(result.instructions, SERVER_INSTRUCTIONS);
  assert.ok(SERVER_INSTRUCTIONS.length < 1000, `${SERVER_INSTRUCTIONS.length} characters`);
  const first = SERVER_INSTRUCTIONS.slice(0, 512);
  assert.match(first, /case_window/);
  assert.match(first, /telemetry/i);
});

test("the instructions carry the same key rules as AGENTS.md", () => {
  const agents = readFileSync(new URL("../../../AGENTS.md", import.meta.url), "utf8");
  // Each rule: a phrase in the instructions and the phrase in AGENTS.md it must agree with.
  const rules = [
    [/call case_window first/i, /call `case_window` first/i],
    [/only the telemetry/i, /use only the telemetry/i],
    [/ask what they found/i, /ask (?:what it says|them to pass it on)/i],
    [/most recent Thursday/i, /most recent Thursday/i],
    [/gcx --context dj-local/, /--context dj-local/],
  ];
  for (const [inInstructions, inAgents] of rules) {
    assert.match(SERVER_INSTRUCTIONS, inInstructions);
    assert.match(agents, inAgents);
  }
});

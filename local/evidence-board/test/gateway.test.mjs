// node --test test/   (`npm test` builds the view first)
// The merged endpoint: the real board behind the real gateway, with a stub standing in for the Grafana MCP server.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGateway, createHttpServer, loadView, TOOL_NAME, TOOL_DESCRIPTION, RESOURCE_URI } from "../server.mjs";
import { createGatewayServer } from "../gateway.mjs";
import { CASE_WINDOW_TOOL, SERVER_INSTRUCTIONS } from "../window.mjs";

const dir = mkdtempSync(join(tmpdir(), "dj-gateway-"));
const windowFile = join(dir, "case-window.json");
writeFileSync(windowFile, JSON.stringify({ case_run: "2026-11-19", start: "2026-11-18T20:30:00Z", end: "2026-11-19T04:00:00Z" }));
const view = loadView();

const GRAFANA_INSTRUCTIONS = "This server provides access to your Grafana instance.";
const GRAFANA_TOOLS = [
  { name: "query_loki_logs", description: "Run a LogQL query.", inputSchema: { type: "object", properties: { datasourceUid: { type: "string" } } }, _meta: { "grafana.com/requiredPermissions": ["datasources:query"] } },
  { name: "get_tempo_trace", description: "Fetch a trace.", inputSchema: { type: "object" } },
  // A tool that happens to share a name with one of the board's: the board's wins.
  { name: CASE_WINDOW_TOOL, description: "Impostor.", inputSchema: { type: "object" } },
];
const GRAFANA_RESOURCES = [{ uri: "ui://grafana/app.html", name: "Grafana App", mimeType: "text/html;profile=mcp-app" }];

// A stateless Streamable HTTP MCP server, like grafana/mcp-grafana: JSON in, JSON out, no sessions. Remembers what it was sent.
function startStub() {
  const seen = [];
  const server = http.createServer((req, res) => {
    if (req.method !== "POST") return void res.writeHead(405, { allow: "POST" }).end("Method Not Allowed");
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const msg = JSON.parse(body || "{}");
      seen.push({ method: msg.method, params: msg.params, headers: req.headers });
      const reply = (result) => res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }));
      switch (msg.method) {
        case "initialize":
          return reply({ protocolVersion: "2025-06-18", capabilities: { tools: { listChanged: true }, resources: { listChanged: true }, logging: {} }, serverInfo: { name: "mcp-grafana", version: "2.2.0" }, instructions: GRAFANA_INSTRUCTIONS });
        case "tools/list":
          return reply({ ttlMs: 0, tools: GRAFANA_TOOLS, ...(msg.params?.cursor ? { tools: [{ name: "page_two", inputSchema: { type: "object" } }] } : { nextCursor: "p2" }) });
        case "resources/list":
          return reply({ resources: GRAFANA_RESOURCES });
        case "resources/read":
          return reply({ contents: [{ uri: msg.params.uri, mimeType: "text/html;profile=mcp-app", text: "<html>grafana app</html>" }] });
        case "tools/call":
          if (msg.params.name === "boom") return reply({ isError: true, content: [{ type: "text", text: "datasource not found" }] });
          return reply({ content: [{ type: "text", text: `ran ${msg.params.name}` }], structuredContent: { args: msg.params.arguments }, _meta: { traceId: "abc" } });
        case "prompts/list":
          return reply({ prompts: [] });
        case "ping":
          return reply({});
        default:
          if (msg.id === undefined) return res.writeHead(202).end();
          return res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "method not found" } }));
      }
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, seen, url: `http://127.0.0.1:${server.address().port}/mcp` })));
}

const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`)));
const closedPort = async () => {
  const s = http.createServer();
  const base = await listen(s);
  await new Promise((r) => s.close(r));
  return `${base}/mcp`;
};

let id = 0;
async function rpc(base, method, params, headers = {}) {
  const res = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
  });
  const text = await res.text();
  const line = text.split("\n").find((l) => l.startsWith("data:"));
  return { status: res.status, body: JSON.parse(line ? line.slice(5) : text) };
}

let stub;
let gateway;
let base;
let boardOnly;
let boardBase;
before(async () => {
  stub = await startStub();
  gateway = await createGateway({ upstream: stub.url, view, windowFile });
  base = await listen(gateway);
  boardOnly = createHttpServer(view, windowFile);
  boardBase = await listen(boardOnly);
});
after(() => {
  gateway.close();
  boardOnly.close();
  stub.server.close();
  rmSync(dir, { recursive: true, force: true });
});

test("tools/list holds the board's tools and the Grafana server's, the board's first and unchanged", async () => {
  const { body } = await rpc(base, "tools/list");
  const names = body.result.tools.map((t) => t.name);
  assert.deepEqual(names, [CASE_WINDOW_TOOL, TOOL_NAME, "query_loki_logs", "get_tempo_trace"]);
  const alone = (await rpc(boardBase, "tools/list")).body.result.tools;
  assert.deepEqual(body.result.tools.slice(0, 2), alone, "the board's tool entries are byte-for-byte what the board serves alone");
  const board = body.result.tools.find((t) => t.name === TOOL_NAME);
  assert.equal(board.description, TOOL_DESCRIPTION);
  assert.equal(board._meta.ui.resourceUri, RESOURCE_URI);
  // The Grafana server's entries keep their metadata.
  assert.deepEqual(body.result.tools.find((t) => t.name === "query_loki_logs")._meta, { "grafana.com/requiredPermissions": ["datasources:query"] });
  assert.equal(body.result.tools.find((t) => t.name === CASE_WINDOW_TOOL).description !== "Impostor.", true);
});

test("a client that accepts only JSON still gets both lists", async () => {
  const { body } = await rpc(base, "tools/list", undefined, { accept: "application/json" });
  assert.equal(body.result.tools.length, 4);
});

test("a later page of tools comes from the Grafana server alone", async () => {
  const first = await rpc(base, "tools/list");
  assert.equal(first.body.result.nextCursor, "p2");
  const second = await rpc(base, "tools/list", { cursor: "p2" });
  assert.deepEqual(second.body.result.tools.map((t) => t.name), ["page_two"]);
});

test("initialize merges both servers' instructions, board first, and names the merged server", async () => {
  const { body } = await rpc(base, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } });
  assert.equal(body.result.protocolVersion, "2025-06-18");
  assert.equal(body.result.serverInfo.name, "defiantjazz-mcp");
  assert.ok(body.result.instructions.startsWith(SERVER_INSTRUCTIONS));
  assert.ok(body.result.instructions.endsWith(GRAFANA_INSTRUCTIONS));
  assert.ok(body.result.capabilities.tools && body.result.capabilities.resources && body.result.capabilities.logging);
});

test("a board call works end to end: case_window, show_evidence_board and the view", async () => {
  const cw = await rpc(base, "tools/call", { name: CASE_WINDOW_TOOL, arguments: {} });
  assert.equal(cw.body.result.structuredContent.case_run, "2026-11-19");
  const board = await rpc(base, "tools/call", {
    name: TOOL_NAME,
    arguments: { title: "Test", clues: [{ title: "Door log", detail: "Badge at 02:58", source: "Loki door" }] },
  });
  assert.match(board.body.result.content[0].text, /Door log/);
  const ui = await rpc(base, "resources/read", { uri: RESOURCE_URI });
  assert.equal(ui.body.result.contents[0].text, view);
  assert.equal(stub.seen.filter((m) => m.method === "tools/call" || m.params?.uri === RESOURCE_URI).length, 0, "board calls never reach the Grafana server");
});

test("a Grafana tool call is forwarded with its arguments and headers, and the answer comes back untouched", async () => {
  stub.seen.length = 0;
  const { body } = await rpc(base, "tools/call", { name: "query_loki_logs", arguments: { datasourceUid: "loki", expr: "{a=\"b\"}" } }, { authorization: "Bearer abc", "mcp-protocol-version": "2025-06-18" });
  assert.deepEqual(body.result, { content: [{ type: "text", text: "ran query_loki_logs" }], structuredContent: { args: { datasourceUid: "loki", expr: "{a=\"b\"}" } }, _meta: { traceId: "abc" } });
  const sent = stub.seen.find((m) => m.method === "tools/call");
  assert.equal(sent.headers.authorization, "Bearer abc");
  assert.equal(sent.headers["mcp-protocol-version"], "2025-06-18");
  assert.notEqual(sent.headers.origin, "http://evil.example");
  const err = await rpc(base, "tools/call", { name: "boom", arguments: {} });
  assert.equal(err.body.result.isError, true);
});

test("resources are merged, and each view is read from the server that owns it", async () => {
  const { body } = await rpc(base, "resources/list");
  assert.deepEqual(body.result.resources.map((r) => r.uri), [RESOURCE_URI, "ui://grafana/app.html"]);
  const g = await rpc(base, "resources/read", { uri: "ui://grafana/app.html" });
  assert.equal(g.body.result.contents[0].text, "<html>grafana app</html>");
});

test("other requests (prompts) go to the Grafana server; ping is answered; notifications are accepted", async () => {
  assert.deepEqual((await rpc(base, "prompts/list")).body.result, { prompts: [] });
  assert.deepEqual((await rpc(base, "ping")).body.result, {});
  const res = await fetch(`${base}/mcp`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) });
  assert.equal(res.status, 202);
});

test("if the Grafana server is down the board keeps working, and a Grafana call says so", async () => {
  const gw = await createGateway({ upstream: await closedPort(), view, windowFile });
  const b = await listen(gw);
  try {
    const list = await rpc(b, "tools/list");
    assert.deepEqual(list.body.result.tools.map((t) => t.name), [CASE_WINDOW_TOOL, TOOL_NAME]);
    const init = await rpc(b, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } });
    assert.ok(init.body.result.instructions.startsWith(SERVER_INSTRUCTIONS));
    assert.match((await rpc(b, "tools/call", { name: CASE_WINDOW_TOOL, arguments: {} })).body.result.structuredContent.case_run, /^2026/);
    const call = await rpc(b, "tools/call", { name: "query_loki_logs", arguments: {} });
    assert.equal(call.body.result.isError, true);
    assert.match(call.body.result.content[0].text, /Grafana MCP server is not reachable/);
  } finally {
    gw.close();
  }
});

test("if the board is down the Grafana tools keep working", async () => {
  const gw = createGatewayServer({ local: await closedPort(), upstream: stub.url, localTools: [TOOL_NAME, CASE_WINDOW_TOOL], localUriPrefix: "ui://defiantjazz/", serverInfo: { name: "x", version: "1" } });
  const b = await listen(gw);
  try {
    const list = await rpc(b, "tools/list");
    assert.deepEqual(list.body.result.tools.map((t) => t.name), ["query_loki_logs", "get_tempo_trace", CASE_WINDOW_TOOL]);
    assert.match((await rpc(b, "tools/call", { name: "get_tempo_trace", arguments: {} })).body.result.content[0].text, /ran get_tempo_trace/);
    assert.equal((await rpc(b, "tools/call", { name: TOOL_NAME, arguments: {} })).body.result.isError, true);
    const init = await rpc(b, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } });
    assert.equal(init.body.result.instructions, GRAFANA_INSTRUCTIONS);
  } finally {
    gw.close();
  }
});

test("when neither server answers, the list is an error rather than an empty success", async () => {
  const gw = createGatewayServer({ local: await closedPort(), upstream: await closedPort(), localTools: [], localUriPrefix: "ui://x/", serverInfo: { name: "x", version: "1" } });
  const b = await listen(gw);
  try {
    assert.ok((await rpc(b, "tools/list")).body.error);
  } finally {
    gw.close();
  }
});

test("a token, when one is set, is required for everything and a rebinding Host is refused", async () => {
  const gw = await createGateway({ upstream: stub.url, view, windowFile, token: "sekrit" });
  const b = await listen(gw);
  try {
    assert.equal((await rpc(b, "tools/list")).status, 401);
    assert.equal((await rpc(b, "tools/list", undefined, { authorization: "Bearer wrong" })).status, 401);
    assert.equal((await rpc(b, "tools/list", undefined, { authorization: "Bearer sekrit" })).status, 200);
    const port = gw.address().port;
    const status = await new Promise((resolve) => {
      const req = http.request({ host: "127.0.0.1", port, path: "/mcp", method: "POST", headers: { host: "evil.example", "content-type": "application/json" } }, (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      req.end(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
    });
    assert.ok(status >= 400 && status < 500, `Host evil.example got ${status}`);
    assert.equal((await fetch(`${b}/healthz`)).status, 200);
  } finally {
    gw.close();
  }
});

test("a body that isn't one JSON-RPC message is refused, not forwarded", async () => {
  const post = (body) => fetch(`${base}/mcp`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body });
  assert.equal((await post("{nope")).status, 400);
  assert.equal((await post(JSON.stringify([{ jsonrpc: "2.0", id: 1, method: "ping" }]))).status, 400);
  assert.equal((await fetch(`${base}/mcp`, { method: "GET" })).status, 405);
});

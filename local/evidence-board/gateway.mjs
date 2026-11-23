// The one MCP endpoint of the local stack: it serves the evidence board itself and forwards everything else to the
// Grafana MCP server, so a single install (one URL, http://localhost:8000/mcp) gives the agent both.
//
// It is a small JSON-RPC router in front of two stateless Streamable HTTP MCP servers:
//   - the board (this package's own server, on a private loopback port inside this process), which owns the tools
//     case_window and show_evidence_board and the ui://defiantjazz/ views;
//   - the Grafana MCP server (grafana/mcp-grafana, not ours to change), which owns everything else, including its own
//     tools and ui://grafana/ views.
// What it does per request:
//   initialize / tools/list / resources/list   ask both and merge the answers (the board's entries first);
//   tools/call                                 goes to whichever server owns the tool; resources/read to the one that owns the uri;
//   ping                                       answered here; notifications go to both; everything else goes to the Grafana server.
// A request that goes to one server is relayed untouched (status, headers, body, event streams), so tool results, MCP App
// metadata and error shapes are exactly what that server produced. If one server is down, the other keeps working: the
// merged lists just omit it, and a call that needs it says so.
// It adds no case knowledge, reads no files and makes no outbound requests beyond the two servers it is given.
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { timingSafeEqual } from "node:crypto";
import { localhostHostValidation, localhostOriginValidation } from "@modelcontextprotocol/node";

const MAX_BODY = 4 * 1024 * 1024;
const LIST_TIMEOUT_MS = 10_000;
const CALL_TIMEOUT_MS = 300_000;
// Request headers worth passing on. Host and Origin are checked here, once, and are not forwarded.
const FORWARD_HEADERS = ["authorization", "accept", "content-type", "mcp-protocol-version", "mcp-session-id", "last-event-id", "traceparent", "tracestate", "user-agent"];
const DROP_RESPONSE_HEADERS = new Set(["connection", "keep-alive", "transfer-encoding", "content-length", "content-encoding"]);

const rpcError = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error("too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// A JSON-RPC response from a backend: plain JSON, or a one-event stream (`data: {...}`).
function parseRpc(text) {
  const t = text.trim();
  if (t.startsWith("{")) return JSON.parse(t);
  const line = text.split("\n").find((l) => l.startsWith("data:"));
  if (!line) throw new Error("no JSON-RPC message in the response");
  return JSON.parse(line.slice(5));
}

const sameToken = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// local / upstream: base URLs of the two MCP endpoints (e.g. http://127.0.0.1:41000/mcp).
// localTools: names the board owns; localUriPrefix: the resource uris it owns.
export function createGatewayHandler({ local, upstream, localTools, localUriPrefix, serverInfo, token, fetchImpl = fetch }) {
  const ownTools = new Set(localTools);
  const validateHost = localhostHostValidation();
  const validateOrigin = localhostOriginValidation();

  const headersFor = (req) => {
    const h = {};
    for (const name of FORWARD_HEADERS) if (req.headers[name]) h[name] = req.headers[name];
    return h;
  };

  // One request to one backend. Resolves to a fetch Response, or to { down: message } if it could not be reached.
  async function send(url, headers, body, timeoutMs) {
    try {
      return await fetchImpl(url, { method: "POST", headers, body, signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      return { down: e?.cause?.code ?? e?.name ?? "unreachable" };
    }
  }

  // Ask a backend for a JSON-RPC result: { ok, result } or { ok: false, status, reason }.
  async function ask(url, headers, message, timeoutMs = LIST_TIMEOUT_MS) {
    const res = await send(url, headers, JSON.stringify(message), timeoutMs);
    if (res.down) return { ok: false, status: 502, reason: res.down };
    if (res.status === 401 || res.status === 403) return { ok: false, status: res.status, reason: "unauthorized" };
    try {
      const msg = parseRpc(await res.text());
      if (msg.error) return { ok: false, status: res.status, reason: msg.error.message ?? "error" };
      return { ok: true, result: msg.result ?? {} };
    } catch {
      return { ok: false, status: res.status, reason: `HTTP ${res.status}` };
    }
  }

  const json = (res, status, body) => {
    res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
  };

  // Relay one backend's answer untouched.
  async function relay(res, backendRes) {
    const headers = {};
    for (const [k, v] of backendRes.headers) if (!DROP_RESPONSE_HEADERS.has(k)) headers[k] = v;
    res.writeHead(backendRes.status, headers);
    if (!backendRes.body) return void res.end();
    const stream = Readable.fromWeb(backendRes.body);
    stream.on("error", () => res.destroy());
    res.on("close", () => stream.destroy());
    stream.pipe(res);
  }

  async function forward(req, res, url, rawBody, msg, timeoutMs, what) {
    const backendRes = await send(url, headersFor(req), rawBody, timeoutMs);
    if (backendRes.down) {
      const text = `${what} is not reachable right now (${backendRes.down}). The rest of the stack still works; ask the player to run \`docker compose ps -a\` in the stack's local/ folder.`;
      if (msg.method === "tools/call") return json(res, 200, { jsonrpc: "2.0", id: msg.id, result: { isError: true, content: [{ type: "text", text }] } });
      return json(res, 200, rpcError(msg.id, -32603, text));
    }
    return relay(res, backendRes);
  }

  // Merge the answers of both servers: the board's entries first, then the Grafana server's (minus any it shares a name with).
  async function merged(req, res, msg, mergeResults) {
    // Both servers are asked for a plain answer, whatever the client said it accepts.
    const headers = { ...headersFor(req), "content-type": "application/json", accept: "application/json, text/event-stream" };
    const [l, u] = await Promise.all([ask(local, headers, msg), ask(upstream, headers, msg)]);
    // A wrong or missing token is the client's to fix, whichever server noticed.
    const denied = [l, u].find((r) => !r.ok && (r.status === 401 || r.status === 403));
    if (denied) return json(res, denied.status, rpcError(msg.id, -32001, "Unauthorized"));
    if (!l.ok && !u.ok) return json(res, 200, rpcError(msg.id, -32603, `Neither MCP server answered (board: ${l.reason}; Grafana: ${u.reason}).`));
    return json(res, 200, { jsonrpc: "2.0", id: msg.id, result: mergeResults(l.ok ? l.result : null, u.ok ? u.result : null) });
  }

  const mergeInitialize = (l, u) => {
    const older = (a, b) => (a < b ? a : b);
    const instructions = [l?.instructions, u?.instructions].filter(Boolean).join("\n\n");
    return {
      ...(u ?? {}),
      ...(l ?? {}),
      protocolVersion: l && u ? older(l.protocolVersion, u.protocolVersion) : (l ?? u).protocolVersion,
      capabilities: {
        ...(u?.capabilities ?? {}),
        ...(l?.capabilities ?? {}),
        tools: { ...(u?.capabilities?.tools ?? {}), ...(l?.capabilities?.tools ?? {}) },
        resources: { ...(u?.capabilities?.resources ?? {}), ...(l?.capabilities?.resources ?? {}) },
      },
      serverInfo,
      ...(instructions ? { instructions } : {}),
    };
  };

  const mergeLists = (key, idKey) => (l, u) => {
    const own = l?.[key] ?? [];
    const taken = new Set(own.map((e) => e[idKey]));
    const rest = (u?.[key] ?? []).filter((e) => !taken.has(e[idKey]));
    // Everything else in the answer (cache hints) is the board's, over the Grafana server's; a next page is the Grafana server's.
    const { nextCursor, ...other } = { ...(u ?? {}), ...(l ?? {}) };
    return { ...other, [key]: [...own, ...rest], ...(u?.nextCursor ? { nextCursor: u.nextCursor } : {}) };
  };

  return async function handle(req, res) {
    if (req.url === "/healthz") return void res.writeHead(200, { "content-type": "text/plain" }).end("ok");
    if (!validateHost(req, res) || !validateOrigin(req, res)) return;
    if (token) {
      const given = /^Bearer (.+)$/i.exec(req.headers.authorization ?? "")?.[1] ?? "";
      if (!sameToken(given, token)) return void json(res, 401, rpcError(null, -32001, "Unauthorized"));
    }

    // Standalone event streams and session teardown only exist on the Grafana server.
    if (req.method !== "POST") {
      const backendRes = await fetchImpl(upstream, { method: req.method, headers: headersFor(req), signal: AbortSignal.timeout(CALL_TIMEOUT_MS) }).catch(() => null);
      if (!backendRes) return void res.writeHead(405, { allow: "POST" }).end();
      return relay(res, backendRes);
    }

    let raw;
    let msg;
    try {
      raw = await readBody(req);
      msg = JSON.parse(raw.toString("utf8"));
    } catch (e) {
      return void json(res, e.status ?? 400, rpcError(null, e.status ? -32600 : -32700, e.status ? "Request body too large" : "Parse error"));
    }
    if (!msg || typeof msg !== "object" || Array.isArray(msg) || typeof msg.method !== "string") {
      // Replies from the client (to a server request) and batches aren't something either server here asks for.
      return void json(res, 400, rpcError(msg?.id, -32600, "Send one JSON-RPC request or notification per POST."));
    }

    // Notifications (no id) are for both servers; neither answers with a body.
    if (msg.id === undefined || msg.id === null) {
      const headers = headersFor(req);
      await Promise.all([send(local, headers, raw, LIST_TIMEOUT_MS), send(upstream, headers, raw, LIST_TIMEOUT_MS)]);
      return void res.writeHead(202).end();
    }

    switch (msg.method) {
      case "ping":
        return void json(res, 200, { jsonrpc: "2.0", id: msg.id, result: {} });
      case "initialize":
        return void (await merged(req, res, msg, mergeInitialize));
      case "tools/list":
        // A later page comes from the Grafana server alone; the first page carries the board's tools too.
        if (msg.params?.cursor) break;
        return void (await merged(req, res, msg, mergeLists("tools", "name")));
      case "resources/list":
        if (msg.params?.cursor) break;
        return void (await merged(req, res, msg, mergeLists("resources", "uri")));
      case "tools/call":
        if (ownTools.has(msg.params?.name)) return void (await forward(req, res, local, raw, msg, CALL_TIMEOUT_MS, "The evidence board"));
        break;
      case "resources/read":
        if (String(msg.params?.uri ?? "").startsWith(localUriPrefix)) return void (await forward(req, res, local, raw, msg, CALL_TIMEOUT_MS, "The evidence board"));
        break;
      default:
        break;
    }
    return void (await forward(req, res, upstream, raw, msg, CALL_TIMEOUT_MS, "The Grafana MCP server"));
  };
}

export function createGatewayServer(options) {
  const handle = createGatewayHandler(options);
  return createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify(rpcError(null, -32603, "Internal error")));
    });
  });
}

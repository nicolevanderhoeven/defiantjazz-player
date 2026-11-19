// node --test test/   (after `node build.mjs`; `npm test` does both)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { boardInput, boardText, sortTimeline, portraitKey, sceneKey } from "../board.mjs";
import { createHttpServer, loadView, RESOURCE_URI, TOOL_NAME } from "../server.mjs";
import { renderBoard } from "../view/render.mjs";

let server;
let base;
before(async () => {
  server = createHttpServer(loadView());
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

let id = 0;
async function rpc(method, params, headers = {}) {
  const res = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
  });
  const text = await res.text();
  const line = text.split("\n").find((l) => l.startsWith("data:"));
  return { status: res.status, body: line ? JSON.parse(line.slice(5)) : text };
}

test("the one tool is listed with a schema and points at the board view", async () => {
  const { body } = await rpc("tools/list");
  assert.equal(body.result.tools.length, 1);
  const tool = body.result.tools[0];
  assert.equal(tool.name, TOOL_NAME);
  assert.equal(tool._meta.ui.resourceUri, RESOURCE_URI);
  assert.deepEqual(Object.keys(tool.inputSchema.properties).sort(), ["clues", "people", "questions", "scene", "timeline", "title"]);
  assert.equal(tool.annotations.readOnlyHint, true);
});

test("the board view is an MCP App resource that loads nothing from the network", async () => {
  const { body } = await rpc("resources/read", { uri: RESOURCE_URI });
  const [content] = body.result.contents;
  assert.equal(content.mimeType, "text/html;profile=mcp-app");
  assert.deepEqual(content._meta.ui.csp, { connectDomains: [], resourceDomains: [] });
  assert.doesNotMatch(content.text, /<script[^>]+src=|<link[^>]+href=|@import/i);
});

test("a host with no UI gets the findings as text, sorted by time", async () => {
  const { body } = await rpc("tools/call", {
    name: TOOL_NAME,
    arguments: {
      title: "Cocoa Hour",
      timeline: [
        { time: "03:02", event: "Power cut", source: "loki power" },
        { time: "02:30", event: "Cocoa served" },
      ],
      clues: [{ title: "Badge buffered", detail: "Uploaded late", confidence: "solid" }],
      people: [{ name: "Sam", role: "Night nurse" }],
      questions: ["Who was in Break Room 2?"],
    },
  });
  const text = body.result.content[0].text;
  assert.ok(!body.result.isError);
  assert.ok(text.indexOf("02:30") < text.indexOf("03:02"));
  for (const part of ["Cocoa Hour", "Power cut [loki power]", "Badge buffered (solid): Uploaded late", "Sam (Night nurse)", "Who was in Break Room 2?"]) {
    assert.ok(text.includes(part), part);
  }
});

test("an empty board says so and holds nothing but what it was given", () => {
  const text = boardText({});
  assert.match(text, /Timeline \(0\)\n- nothing yet/);
  assert.equal(text.match(/nothing yet/g).length, 4);
});

test("bad input is rejected, not drawn", async () => {
  const { body } = await rpc("tools/call", { name: TOOL_NAME, arguments: { clues: [{ title: "" }] } });
  assert.equal(body.result.isError, true);
  assert.throws(() => boardInput.parse({ clues: [{ title: "x", confidence: "certain" }] }));
  assert.throws(() => boardInput.parse({ timeline: Array.from({ length: 61 }, () => ({ time: "1", event: "e" })) }));
});

test("requests for another host name are refused", async () => {
  const res = await new Promise((resolve) => {
    import("node:http").then(({ request }) => {
      const r = request({ host: "127.0.0.1", port: server.address().port, path: "/mcp", method: "POST", headers: { host: "evil.example" } }, resolve);
      r.end("{}");
    });
  });
  assert.equal(res.statusCode, 403);
  res.resume();
});

test("timeline sort is stable for equal times", () => {
  const out = sortTimeline([{ time: "b", event: "1" }, { time: "a", event: "2" }, { time: "b", event: "3" }]);
  assert.deepEqual(out.map((e) => e.event), ["2", "1", "3"]);
});

const ART = { portraits: { agnes: "data:a", bertram: "data:b", clement: "data:c" }, scenes: { "break-room": "data:room" } };
function draw(input, art) {
  const dom = new JSDOM('<main id="b"></main>');
  const root = dom.window.document.getElementById("b");
  renderBoard(dom.window.document, root, input, art);
  return { dom, root };
}

test("agent text is never parsed as markup", () => {
  const evil = '<img src=x onerror="window.pwned=1"><script>window.pwned=1</script>';
  const { dom, root } = draw({
    title: evil,
    timeline: [{ time: evil, event: evil, source: evil }],
    clues: [{ title: evil, detail: evil, source: evil, confidence: "solid" }],
    people: [{ name: evil, role: evil, note: evil }],
    questions: [evil],
  });
  for (const tab of root.querySelectorAll(".tab")) {
    tab.click();
    for (const row of root.querySelectorAll(".list .row")) row.click();
  }
  assert.equal(root.querySelectorAll("img, script").length, 0);
  assert.equal(dom.window.pwned, undefined);
  assert.equal(root.querySelector("h1").textContent, evil);
});

test("tabs switch, rows expand, and choosing a person highlights what mentions them", () => {
  const { root } = draw({
    timeline: [
      { time: "02:00", event: "Sam badged in" },
      { time: "01:00", event: "Door opened" },
    ],
    clues: [{ title: "Quiet", detail: "Sam was quiet", source: "ring" }],
    people: [{ name: "Sam" }, { name: "Alex" }],
  });
  const tab = (name) => [...root.querySelectorAll(".tab")].find((t) => t.textContent.startsWith(name));
  assert.deepEqual([...root.querySelectorAll(".tl .text")].map((n) => n.textContent), ["Door opened", "Sam badged in"]);
  tab("Clues").click();
  const row = root.querySelector(".clue .row");
  assert.equal(root.querySelector(".more").hidden, true);
  row.click();
  assert.equal(root.querySelector(".more").hidden, false);
  assert.equal(row.getAttribute("aria-expanded"), "true");
  tab("People").click();
  [...root.querySelectorAll(".person .row")][0].click();
  tab("Timeline").click();
  assert.deepEqual([...root.querySelectorAll(".tl")].map((n) => n.className.replace("tl ", "")), ["dim", "hit"]);
  root.querySelector(".chip").click();
  assert.equal(root.querySelectorAll(".dim, .hit").length, 0);
});

test("choosing a person matches whole names only", () => {
  const { root } = draw({
    timeline: [{ time: "01:00", event: "Also late" }, { time: "02:00", event: "Al. left (Al's badge)" }],
    people: [{ name: "Al" }],
  });
  [...root.querySelectorAll(".tab")].find((t) => t.textContent.startsWith("People")).click();
  root.querySelector(".person .row").click();
  [...root.querySelectorAll(".tab")].find((t) => t.textContent.startsWith("Timeline")).click();
  assert.deepEqual([...root.querySelectorAll(".tl")].map((n) => n.className.replace("tl ", "")), ["dim", "hit"]);
});

test("empty sections say so", () => {
  const { root } = draw({});
  assert.match(root.textContent, /No timeline entries yet/);
});

const peopleTab = (root) => [...root.querySelectorAll(".tab")].find((t) => t.textContent.startsWith("People")).click();

test("portraits go by whole first name, any case; everyone else gets initials, never a guess", () => {
  assert.equal(portraitKey("Agnes"), "agnes");
  assert.equal(portraitKey("BERTRAM Smith"), "bertram");
  assert.equal(portraitKey("  clement, the caretaker"), "clement");
  for (const n of ["Agnesia", "Magnes", "Mr Agnes", "Bert", "", undefined]) assert.equal(portraitKey(n), null, String(n));
  const { root } = draw({ people: [{ name: "Agnes Okafor" }, { name: "bertram" }, { name: "Agnesia Lee" }, { name: "Sam" }] }, ART);
  peopleTab(root);
  const avatars = [...root.querySelectorAll(".person .avatar")];
  assert.deepEqual(avatars.map((a) => a.tagName), ["IMG", "IMG", "SPAN", "SPAN"]);
  assert.deepEqual(avatars.slice(0, 2).map((a) => [a.src, a.alt]), [["data:a", "Portrait of Agnes Okafor"], ["data:b", "Portrait of bertram"]]);
  assert.deepEqual(avatars.slice(2).map((a) => a.textContent), ["AL", "S"]);
  assert.ok(avatars[2].getAttribute("aria-hidden"));
});

test("a highlighted person's chip shows their small portrait, if they have one", () => {
  const { root } = draw({ people: [{ name: "Clement" }, { name: "Sam" }] }, ART);
  peopleTab(root);
  const [first, second] = root.querySelectorAll(".person .row");
  first.click();
  assert.equal(root.querySelector(".chip img.avatar.small").alt, "Portrait of Clement");
  root.querySelector(".chip").click();
  peopleTab(root);
  root.querySelectorAll(".person .row")[1].click();
  assert.equal(root.querySelector(".chip img"), null);
  assert.equal(root.querySelector(".chip").textContent, "Highlighting: Sam ✕");
});

test("the scene picture shows for a known scene and for nothing else", () => {
  const img = (input) => draw(input, ART).root.querySelector("header img.scene");
  assert.deepEqual([img({ scene: "break-room" }).src, img({ scene: "break-room" }).alt], ["data:room", "The Break Room"]);
  assert.equal(img({ scene: " Break-Room " }).alt, "The Break Room");
  for (const scene of [undefined, "", "attic", "toString", "__proto__", 7]) assert.equal(img({ scene }), null, String(scene));
  assert.equal(draw({ scene: "break-room" }, {}).root.querySelector("img"), null);
  assert.equal(sceneKey("break-room"), "break-room");
  assert.equal(sceneKey("constructor"), null);
});

test("the scene is an optional input, and the text fallback carries no image", () => {
  assert.equal(boardInput.parse({}).scene, undefined);
  assert.equal(boardInput.parse({ scene: "break-room" }).scene, "break-room");
  assert.equal(boardText({ scene: "break-room", people: [{ name: "Agnes" }] }), boardText({ people: [{ name: "Agnes" }] }));
  assert.doesNotMatch(boardText({ scene: "break-room" }), /data:|<img|break-room/i);
});

test("the built view holds the four pictures inline, loads nothing, and stays small", () => {
  const view = loadView();
  assert.equal(view.match(/data:image\/webp;base64,/g).length, 4);
  assert.doesNotMatch(view, /(?:src|href)=["']?(?:https?:)?\/\//i);
  // The pictures themselves stay small (shrunk copies of the web app's), and so does the whole file (the SDK is most of it).
  const art = ["portrait-agnes", "portrait-bertram", "portrait-clement", "scene-break-room"].map((n) => readFileSync(new URL(`../view/art/${n}.webp`, import.meta.url)).length);
  assert.ok(art.reduce((a, b) => a + b) < 48 * 1024, `pictures are ${art} bytes`);
  assert.ok(Buffer.byteLength(view) < 800 * 1024, `view is ${Buffer.byteLength(view)} bytes`);
});

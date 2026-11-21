// node --test test/   (after `node build.mjs`; `npm test` does both)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { boardInput, boardText, sortTimeline, portraitKey, sceneKey, sceneKeys, originOf, LANES } from "../board.mjs";
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

test("the board tool is listed with a schema and points at the board view", async () => {
  const { body } = await rpc("tools/list");
  assert.deepEqual(body.result.tools.map((t) => t.name).sort(), ["case_window", TOOL_NAME]);
  const tool = body.result.tools.find((t) => t.name === TOOL_NAME);
  assert.equal(tool.name, TOOL_NAME);
  assert.equal(tool._meta.ui.resourceUri, RESOURCE_URI);
  assert.deepEqual(Object.keys(tool.inputSchema.properties).sort(), ["clues", "people", "questions", "scene", "scenes", "timeline", "title"]);
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
  assert.ok(text.includes("FROM THE TELEMETRY"));
  for (const part of ["Cocoa Hour", "Power cut [loki power]", "Badge buffered (solid): Uploaded late", "Sam (Night nurse)", "Who was in Break Room 2?"]) {
    assert.ok(text.includes(part), part);
  }
});

test("an empty board says so and holds nothing but what it was given", () => {
  const text = boardText({});
  assert.match(text, /FROM THE TELEMETRY\n- Nothing from the telemetry yet\./);
  assert.match(text, /FROM YOUR LEADS\n- Nothing from your leads yet\./);
  assert.match(text, /Open questions \(0\)\n- nothing yet/);
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

const ART = {
  portraits: { agnes: "data:a", bertram: "data:b", clement: "data:c" },
  scenes: { "break-room": "data:room", "power-cut": "data:dark", "break-room-camera": "data:cam", flyer: "data:flyer" },
};
function draw(input, art) {
  const dom = new JSDOM('<main id="b"></main>');
  const root = dom.window.document.getElementById("b");
  renderBoard(dom.window.document, root, input, art);
  return { dom, root };
}
const classes = (nodes) => [...nodes].map((n) => [...n.classList].filter((c) => c === "hit" || c === "dim").join("") || "-");
const person = (root, name) => [...root.querySelectorAll(".person .row")].find((b) => b.textContent.includes(name));

const SAMPLE = {
  timeline: [
    { time: "02:00", event: "Sam badged in", source: "loki door" },
    { time: "01:00", event: "Door opened" },
    { time: "03:00", event: "Alex and Sam argued" },
  ],
  clues: [
    { title: "Quiet", detail: "Sam was quiet", source: "ring", confidence: "solid" },
    { title: "A lone badge", confidence: "unclear" },
    { title: "Alex's phone", detail: "Left behind" },
  ],
  people: [{ name: "Sam", role: "Night nurse", note: "Seen early." }, { name: "Alex" }, { name: "Pat" }],
  questions: ["Who has the key?", "Why so quiet?"],
};

test("the board pins everything it was given: a case label, photos, notes, cards, a sheet and sticky notes", () => {
  const { root } = draw({ ...SAMPLE, title: "Cocoa Hour", scene: "break-room" }, ART);
  assert.equal(root.querySelector("h1").textContent, "Cocoa Hour");
  assert.deepEqual([...root.querySelectorAll("h2")].map((h) => h.textContent), ["From the telemetry", "From your leads", "Open questions 2"]);
  assert.deepEqual([...root.querySelectorAll("h3")].map((h) => h.textContent), ["People 3", "Timeline 3", "Clues 3"]);
  // The timeline is sorted by time; every entry, clue, person and question is there once.
  assert.deepEqual([...root.querySelectorAll(".tl .text")].map((n) => n.textContent), ["Door opened", "Sam badged in", "Alex and Sam argued"]);
  assert.equal(root.querySelectorAll(".clue").length, 3);
  assert.equal(root.querySelectorAll(".person").length, 3);
  assert.deepEqual([...root.querySelectorAll(".q")].map((n) => n.textContent), ["? Who has the key?", "? Why so quiet?"].map((t) => t.replace(/^\? /, "")));
  // Every pinned thing has a pin; the stickies and the photo have none or tape.
  assert.equal(root.querySelectorAll(".person > .pin, .tl > .pin, .clue > .pin").length, 3 + 3 + 3);
  assert.equal(root.querySelectorAll(".snap > .tape").length, 1);
  assert.match(root.querySelector(".clue .badge").className, /solid/);
});

test("empty sections say so, and an empty board has no string and no status", () => {
  const { root } = draw({});
  const text = root.textContent;
  for (const t of ["Nothing from the telemetry yet.", "Nothing from your leads yet.", "No open questions."]) assert.ok(text.includes(t), t);
  assert.equal(root.querySelectorAll(".lane").length, 2);
  assert.equal(root.querySelectorAll("path").length, 0);
  assert.equal(root.querySelector(".status").hidden, true);
});

test("agent text is never parsed as markup", () => {
  const evil = '<img src=x onerror="window.pwned=1"><script>window.pwned=1</script>';
  const { dom, root } = draw({
    title: evil,
    timeline: [{ time: evil, event: evil, source: evil }],
    clues: [{ title: evil, detail: evil, source: evil, confidence: "solid" }],
    people: [{ name: evil, role: evil, note: evil }],
    questions: [evil],
  });
  for (const row of root.querySelectorAll(".tl .row, .clue .row, .person .row")) row.click();
  assert.equal(root.querySelectorAll("img, script").length, 0);
  assert.equal(dom.window.pwned, undefined);
  assert.equal(root.querySelector("h1").textContent, evil);
  assert.ok(root.textContent.includes(evil));
  // The name of a person with markup in it is matched as plain text, never as a pattern.
  const odd = draw({ timeline: [{ time: "1", event: "a(b" }, { time: "2", event: "x" }], people: [{ name: "a(b" }, { name: "(" }, { name: ".*" }] });
  odd.root.querySelectorAll(".person .row").forEach((b) => b.click());
});

test("clues and timeline entries open to show their detail and source, and stay open", () => {
  const { root } = draw(SAMPLE);
  const row = root.querySelector(".clue .row");
  const more = root.querySelector(".clue .more");
  assert.equal(more.hidden, true);
  assert.equal(row.getAttribute("aria-expanded"), "false");
  row.click();
  assert.equal(more.hidden, false);
  assert.equal(row.getAttribute("aria-expanded"), "true");
  assert.match(more.textContent, /Sam was quiet.*Source: ring/s);
  // Choosing a person redraws the string, not the board: the card stays open.
  person(root, "Sam").click();
  assert.equal(root.querySelector(".clue .more").hidden, false);
  row.click();
  assert.equal(more.hidden, true);
  // Nothing to open: nothing to press.
  const plain = [...root.querySelectorAll(".clue .row")][1];
  assert.equal(plain.disabled, true);
  const tl = root.querySelector(".tl .row");
  assert.equal(tl.disabled, true, "Door opened has no source");
  assert.equal([...root.querySelectorAll(".tl .row")][1].getAttribute("aria-expanded"), "false");
});

test("choosing a person highlights what mentions them, dims the rest, and lights their string", () => {
  const { root } = draw(SAMPLE);
  // Sam: two timeline entries and one clue (whole names only, any case); Alex: one entry, one clue.
  assert.deepEqual(classes(root.querySelectorAll(".tl")), ["-", "-", "-"]);
  person(root, "Sam").click();
  assert.deepEqual(classes(root.querySelectorAll(".tl")), ["dim", "hit", "hit"]);
  assert.deepEqual(classes(root.querySelectorAll(".clue")), ["hit", "dim", "dim"]);
  assert.deepEqual(classes(root.querySelectorAll(".person")), ["hit", "-", "-"]);
  assert.equal(person(root, "Sam").getAttribute("aria-pressed"), "true");
  const lit = [...root.querySelectorAll("path.pulled")];
  assert.equal(lit.length, 3);
  assert.ok(lit.every((p) => p.dataset.person === "Sam"));
  assert.equal(root.querySelectorAll("path.faint").length, 2);
  assert.match(root.querySelector(".status").textContent, /Highlighting: Sam ✕2 timeline entries and 1 clue mention them\./);
  // Choosing someone else moves the highlight; choosing the same person again, or the chip, or Escape, clears it.
  person(root, "Alex").click();
  assert.deepEqual(classes(root.querySelectorAll(".tl")), ["dim", "dim", "hit"]);
  person(root, "Alex").click();
  assert.equal(root.querySelectorAll(".hit, .dim").length, 0);
  person(root, "Sam").click();
  root.querySelector(".chip").click();
  assert.equal(root.querySelectorAll(".hit, .dim").length, 0);
  person(root, "Pat").click();
  assert.match(root.querySelector(".status").textContent, /Nothing on the board mentions them yet/);
  root.querySelector(".board").dispatchEvent(new (root.ownerDocument.defaultView.KeyboardEvent)("keydown", { key: "Escape", bubbles: true }));
  assert.equal(root.querySelectorAll(".hit, .dim").length, 0);
  assert.equal(root.querySelector(".status").textContent, "");
});

test("red string joins each person to what mentions them, and the same connections are written as text", () => {
  const { root } = draw(SAMPLE);
  const strings = [...root.querySelectorAll("svg.string path")].map((p) => `${p.dataset.person}>${p.dataset.to}`).sort();
  assert.deepEqual(strings, ["Alex>clue", "Alex>timeline", "Sam>clue", "Sam>timeline", "Sam>timeline"]);
  // The string is decoration: hidden from assistive technology and never focusable.
  for (const svg of root.querySelectorAll("svg.string")) assert.equal(svg.getAttribute("aria-hidden"), "true");
  assert.equal(root.querySelectorAll("svg button, svg a, svg [tabindex]").length, 0);
  // Text: on each card, and on each person.
  const links = (sel) => [...root.querySelectorAll(sel)].map((n) => n.textContent);
  assert.deepEqual(links(".tl .links:not([hidden])"), ["Mentions: Sam", "Mentions: Sam, Alex"]);
  assert.deepEqual(links(".clue .links:not([hidden])"), ["Mentions: Sam", "Mentions: Alex"]);
  assert.deepEqual(links(".person .links"), ["In 2 timeline entries and 1 clue", "In 1 timeline entry and 1 clue", "Not mentioned yet"]);
  // Every strand ends on a pin.
  assert.equal(root.querySelectorAll(".pin").length, 9);
});

test("choosing a person matches whole names only", () => {
  const { root } = draw({
    timeline: [{ time: "01:00", event: "Also late" }, { time: "02:00", event: "Al. left (Al's badge)" }],
    people: [{ name: "Al" }],
  });
  person(root, "Al").click();
  assert.deepEqual(classes(root.querySelectorAll(".tl")), ["dim", "hit"]);
  assert.equal(root.querySelectorAll("path").length, 1);
});

test("the board is built to be reached by keyboard and read by a screen reader", () => {
  const { root } = draw({ ...SAMPLE, scene: "break-room" }, ART);
  assert.equal(root.querySelector(".status").getAttribute("role"), "status");
  assert.ok(root.querySelector(".person .row").matches("button[type=button][aria-pressed]"));
  assert.ok(root.querySelector(".clue .row").matches("button[type=button][aria-expanded]"));
  assert.equal(root.querySelectorAll("section > h2").length, 3);
  assert.deepEqual([...root.querySelectorAll("section.lane")].map((s) => s.querySelector("h2").textContent), ["From the telemetry", "From your leads"]);
  assert.equal(root.querySelector("h1").tagName, "H1");
  // The picture's words are its alt text; the caption under it is not read twice.
  assert.equal(root.querySelector("figcaption").getAttribute("aria-hidden"), "true");
  assert.equal(root.querySelector(".snap img").alt, "The Break Room");
  assert.equal(root.querySelectorAll("li").length, 3 + 3 + 3 + 2);
  assert.ok([...root.querySelectorAll("ul")].every((u) => u.getAttribute("role") === "list"));
});

test("rendering again replaces the board and stops watching the old one", () => {
  const dom = new JSDOM('<main id="b"></main>');
  const root = dom.window.document.getElementById("b");
  const doc = dom.window.document;
  let watchers = 0;
  let disconnected = 0;
  dom.window.ResizeObserver = class {
    constructor() { watchers++; }
    observe() {}
    disconnect() { disconnected++; }
  };
  renderBoard(doc, root, SAMPLE);
  renderBoard(doc, root, { clues: [{ title: "Only this" }] });
  assert.equal(watchers, 2);
  assert.equal(disconnected, 1);
  assert.equal(root.querySelectorAll(".board").length, 1);
  assert.equal(root.querySelectorAll(".clue").length, 1);
  assert.equal(root.querySelectorAll(".tl, .person").length, 0);
});

test("the board works in a light host and a dark one, and at a narrow width", () => {
  const css = readFileSync(new URL("../view/style.css", import.meta.url), "utf8");
  assert.match(css, /:root\[data-theme="light"\]/);
  assert.match(css, /@media \(max-width: 420px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
  // No fonts, images or sheets from anywhere else.
  assert.doesNotMatch(css, /@import|url\(\s*["']?(?:https?:|\/|\.)/i);
});

const personRows = (root) => [...root.querySelectorAll(".person .row")];

test("portraits go by whole first name, any case; everyone else gets initials, never a guess", () => {
  assert.equal(portraitKey("Agnes"), "agnes");
  assert.equal(portraitKey("BERTRAM Smith"), "bertram");
  assert.equal(portraitKey("  clement, the caretaker"), "clement");
  for (const n of ["Agnesia", "Magnes", "Mr Agnes", "Bert", "", undefined]) assert.equal(portraitKey(n), null, String(n));
  const { root } = draw({ people: [{ name: "Agnes Okafor" }, { name: "bertram" }, { name: "Agnesia Lee" }, { name: "Sam" }] }, ART);
  const avatars = [...root.querySelectorAll(".person .avatar")];
  assert.deepEqual(avatars.map((a) => a.tagName), ["IMG", "IMG", "SPAN", "SPAN"]);
  assert.deepEqual(avatars.slice(0, 2).map((a) => [a.src, a.alt]), [["data:a", "Portrait of Agnes Okafor"], ["data:b", "Portrait of bertram"]]);
  assert.deepEqual(avatars.slice(2).map((a) => a.textContent), ["AL", "S"]);
  assert.ok(avatars[2].getAttribute("aria-hidden"));
  assert.equal(personRows(root).length, 4);
});

test("a highlighted person's chip shows their small portrait, if they have one", () => {
  const { root } = draw({ people: [{ name: "Clement" }, { name: "Sam" }] }, ART);
  const [first, second] = personRows(root);
  first.click();
  assert.equal(root.querySelector(".chip img.avatar.small").alt, "Portrait of Clement");
  root.querySelector(".chip").click();
  second.click();
  assert.equal(root.querySelector(".chip img"), null);
  assert.equal(root.querySelector(".chip").textContent, "Highlighting: Sam ✕");
});

test("pictures are pinned for known scenes, once each, and for nothing else", () => {
  const imgs = (input, art = ART) => [...draw(input, art).root.querySelectorAll("header .snap img")].map((i) => [i.src, i.alt]);
  assert.deepEqual(imgs({ scene: "break-room" }), [["data:room", "The Break Room"]]);
  assert.deepEqual(imgs({ scene: " Break-Room " }), [["data:room", "The Break Room"]]);
  assert.deepEqual(imgs({ scene: "break-room", scenes: ["power-cut", "break-room", "attic", "break-room-camera", "flyer"] }), [
    ["data:room", "The Break Room"],
    ["data:dark", "The power cut"],
    ["data:cam", "Break Room 2 security camera"],
    ["data:flyer", "The Kipsake flyer"],
  ]);
  for (const scene of [undefined, "", "attic", "toString", "__proto__", 7]) assert.deepEqual(imgs({ scene }), [], String(scene));
  assert.deepEqual(imgs({ scenes: "power-cut" }), []);
  assert.deepEqual(imgs({ scene: "break-room" }, {}), []);
  assert.equal(draw({ scene: "break-room" }, {}).root.querySelector("img"), null);
  assert.equal(sceneKey("break-room"), "break-room");
  assert.equal(sceneKey("constructor"), null);
  assert.deepEqual(sceneKeys({ scene: "flyer", scenes: ["flyer", "power-cut", "nope"] }), ["flyer", "power-cut"]);
});

test("the scenes are optional inputs, and the text fallback carries no image", () => {
  assert.equal(boardInput.parse({}).scene, undefined);
  assert.equal(boardInput.parse({}).scenes, undefined);
  assert.equal(boardInput.parse({ scene: "break-room" }).scene, "break-room");
  assert.deepEqual(boardInput.parse({ scenes: ["flyer"] }).scenes, ["flyer"]);
  assert.throws(() => boardInput.parse({ scenes: Array.from({ length: 7 }, () => "flyer") }));
  const plain = boardText({ people: [{ name: "Agnes" }] });
  assert.equal(boardText({ scene: "break-room", scenes: ["power-cut", "flyer"], people: [{ name: "Agnes" }] }), plain);
  assert.doesNotMatch(boardText({ scene: "break-room", scenes: ["power-cut"] }), /data:|<img|break-room|power-cut/i);
});

test("the built view holds its pictures inline, loads nothing, and stays small", () => {
  const view = loadView();
  const names = ["portrait-agnes", "portrait-bertram", "portrait-clement", "scene-break-room", "scene-power-cut", "scene-break-room-camera", "flyer-kipsake"];
  assert.equal(view.match(/data:image\/webp;base64,/g).length, names.length);
  assert.doesNotMatch(view, /(?:src|href)=["']?(?:https?:)?\/\//i);
  // The pictures themselves stay small (shrunk copies of the web app's), and so does the whole file (the SDK is most of it).
  const art = names.map((n) => readFileSync(new URL(`../view/art/${n}.webp`, import.meta.url)).length);
  assert.ok(art.reduce((a, b) => a + b) < 96 * 1024, `pictures are ${art} bytes`);
  assert.ok(Buffer.byteLength(view) < 800 * 1024, `view is ${Buffer.byteLength(view)} bytes`);
});

// ---- the two lanes

const MIXED = {
  timeline: [
    { time: "02:00", event: "Sam badged in", source: "loki door" },
    { time: "01:00", event: "Pat says Sam left early", origin: "lead" },
    { time: "03:00", event: "Door opened", origin: "telemetry" },
  ],
  clues: [
    { title: "Quiet ring", origin: "telemetry" },
    { title: "A note from Pat about Sam", detail: "Pat wrote it", source: "lead 4", origin: "lead" },
  ],
  people: [{ name: "Sam" }, { name: "Pat", role: "Visitor", origin: "lead" }],
};
const lane = (root, key) => root.querySelector(`.lane-${key}`);

test("the origin of an item is optional and defaults to the telemetry, so older calls still work", () => {
  const parsed = boardInput.parse({ timeline: [{ time: "1", event: "e" }], clues: [{ title: "c" }], people: [{ name: "p" }] });
  assert.deepEqual([parsed.timeline[0].origin, parsed.clues[0].origin, parsed.people[0].origin], ["telemetry", "telemetry", "telemetry"]);
  assert.equal(boardInput.parse({ clues: [{ title: "c", origin: "lead" }] }).clues[0].origin, "lead");
  assert.throws(() => boardInput.parse({ clues: [{ title: "c", origin: "rumour" }] }));
  assert.equal(originOf({}), "telemetry");
  assert.equal(originOf({ origin: "lead" }), "lead");
  assert.equal(originOf({ origin: "anything else" }), "telemetry");
  // An old call, with no origin anywhere, draws everything in the telemetry lane and leaves the leads lane empty.
  const { root } = draw(SAMPLE);
  assert.equal(lane(root, "telemetry").querySelectorAll(".tl, .clue, .person").length, 9);
  assert.equal(lane(root, "lead").querySelectorAll(".tl, .clue, .person").length, 0);
  assert.match(lane(root, "lead").textContent, /Nothing from your leads yet/);
});

test("the board has two labelled lanes and each item sits in the lane it came from, with a tag", () => {
  const { root } = draw(MIXED);
  const titles = (key, sel) => [...lane(root, key).querySelectorAll(sel)].map((n) => n.textContent);
  assert.equal(lane(root, "telemetry").querySelector("h2").textContent, LANES.telemetry.title);
  assert.equal(lane(root, "lead").querySelector("h2").textContent, "From your leads");
  assert.deepEqual(titles("telemetry", ".tl .text"), ["Sam badged in", "Door opened"]);
  assert.deepEqual(titles("lead", ".tl .text"), ["Pat says Sam left early"]);
  assert.deepEqual(titles("telemetry", ".clue .text"), ["Quiet ring"]);
  assert.deepEqual(titles("lead", ".clue .text"), ["A note from Pat about Sam"]);
  assert.deepEqual(titles("telemetry", ".person .text"), ["Sam"]);
  assert.deepEqual(titles("lead", ".person .text"), ["Pat"]);
  // Every item carries a small tag that names its lane, so the split does not rest on position alone.
  assert.deepEqual(titles("telemetry", ".from"), ["Telemetry", "Telemetry", "Telemetry", "Telemetry"]);
  assert.deepEqual(titles("lead", ".from"), ["Lead", "Lead", "Lead"]);
  assert.equal(root.querySelectorAll(".from").length, 2 + 2 + 3);
  assert.equal(root.querySelectorAll(".from-lead").length, 3);
  // The timeline in each lane stays sorted by time, and open questions sit below both lanes.
  assert.ok(lane(root, "lead").compareDocumentPosition(root.querySelector(".sec.questions")) & 4);
});

test("a lane with nothing in it says so, and the other lane is not affected", () => {
  const { root } = draw({ clues: [{ title: "Only a lead", origin: "lead" }] });
  assert.match(lane(root, "telemetry").textContent, /Nothing from the telemetry yet\./);
  assert.equal(lane(root, "lead").querySelectorAll(".clue").length, 1);
  assert.doesNotMatch(lane(root, "lead").textContent, /Nothing from your leads yet/);
});

test("red string crosses lanes, and the highlight and text connections follow it", () => {
  const { root } = draw(MIXED);
  // Sam (telemetry) is named in both lanes, and Pat (lead) is named in the lead lane: string runs between lanes either way.
  const strings = [...root.querySelectorAll("svg.string path")].map((p) => `${p.dataset.person}>${p.dataset.to}`).sort();
  assert.deepEqual(strings, ["Pat>clue", "Pat>timeline", "Sam>clue", "Sam>timeline", "Sam>timeline"]);
  person(root, "Sam").click();
  assert.deepEqual(classes(lane(root, "lead").querySelectorAll(".tl, .clue")), ["hit", "hit"]);
  assert.match(lane(root, "telemetry").querySelector(".person .links").textContent, /In 2 timeline entries and 1 clue/);
  // Mentions are written out on the card in the other lane.
  assert.match(lane(root, "lead").querySelector(".clue .links").textContent, /Mentions: Sam, Pat/);
  assert.match(root.querySelector(".status").textContent, /Highlighting: Sam/);
});

test("a person named in both lanes is one card, one pressed state and one string per target", () => {
  const { root } = draw({
    timeline: [{ time: "01:00", event: "Agnes badged in" }],
    clues: [{ title: "Agnes left a note", origin: "lead" }],
    people: [{ name: "Agnes", origin: "lead", note: "From the lead" }, { name: "agnes", role: "Cook" }],
  });
  assert.equal(root.querySelectorAll(".person").length, 1);
  assert.equal(lane(root, "telemetry").querySelectorAll(".person").length, 1);
  assert.equal(lane(root, "lead").querySelectorAll(".person").length, 0);
  const card = root.querySelector(".person");
  assert.match(card.textContent, /Cook/);
  assert.match(card.textContent, /From the lead/);
  assert.deepEqual([...root.querySelectorAll("svg.string path")].map((p) => p.dataset.to).sort(), ["clue", "timeline"]);
  person(root, "Agnes").click();
  assert.equal(root.querySelectorAll('.person button[aria-pressed="true"]').length, 1);
});

test("a board can show only the telemetry lane, for a page with no leads", () => {
  const dom = new JSDOM('<main id="b"></main>');
  const root = dom.window.document.getElementById("b");
  renderBoard(dom.window.document, root, MIXED, ART, { lanes: ["telemetry"] });
  assert.equal(root.querySelectorAll(".lane").length, 1);
  assert.equal(root.querySelector(".lanes").className, "lanes lanes-1");
  assert.equal(root.querySelectorAll(".from-lead").length, 0);
  assert.deepEqual([...root.querySelectorAll(".tl .text, .clue .text, .person .text")].map((n) => n.textContent).sort(), ["Door opened", "Quiet ring", "Sam", "Sam badged in"]);
  // Nothing from the dropped lane is mentioned, even as string.
  // Sam is named by the one remaining entry; Pat and the lead items are gone.
  assert.deepEqual([...root.querySelectorAll("svg.string path")].map((p) => p.dataset.person), ["Sam"]);
});

test("origin values from the agent are plain text, never markup", () => {
  const { root } = draw({ clues: [{ title: "x", origin: "lead" }], people: [{ name: "<b>Evil</b>", origin: "lead" }] });
  assert.equal(root.querySelectorAll("b").length, 0);
});

test("the text fallback groups by lane, and the default lane is the telemetry", () => {
  const text = boardText({ ...MIXED, questions: ["Who told Pat?"] });
  const telemetry = text.indexOf("FROM THE TELEMETRY");
  const leads = text.indexOf("FROM YOUR LEADS");
  const questions = text.indexOf("Open questions (1)");
  assert.ok(telemetry >= 0 && telemetry < leads && leads < questions);
  const inLane = (a, b) => text.slice(a, b);
  const t = inLane(telemetry, leads);
  const l = inLane(leads, questions);
  assert.ok(t.includes("Sam badged in [loki door]") && t.includes("Door opened") && t.includes("Quiet ring") && t.includes("- Sam"));
  assert.ok(!t.includes("Pat says Sam left early") && !t.includes("A note from Pat"));
  assert.ok(l.includes("Pat says Sam left early") && l.includes("A note from Pat about Sam (likely): Pat wrote it [lead 4]") && l.includes("- Pat (Visitor)"));
  assert.ok(!l.includes("Sam badged in") && !l.includes("Quiet ring"));
  // Each lane sorts its own timeline, and a lane with nothing says so.
  assert.ok(t.indexOf("02:00") < t.indexOf("03:00"));
  const onlyOld = boardText({ clues: [{ title: "c" }] });
  assert.match(onlyOld, /FROM THE TELEMETRY\nClues \(1\)\n- c \(likely\)/);
  assert.match(onlyOld, /FROM YOUR LEADS\n- Nothing from your leads yet\./);
});

test("the lanes are styled apart, tagged in both lane colours, and stack on narrow widths", () => {
  const css = readFileSync(new URL("../view/style.css", import.meta.url), "utf8");
  assert.match(css, /\.lane-lead\s*\{/);
  assert.match(css, /\.from-lead\s*\{/);
  assert.match(css, /@media \(min-width: 720px\)\s*\{\s*\.lanes\.lanes-2/);
});

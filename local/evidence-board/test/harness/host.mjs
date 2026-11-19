// A tiny MCP Apps host for looking at the board in a browser: it fetches the real view from the running server, puts it in a
// sandboxed iframe and sends it a sample tool call's arguments through the SDK's own AppBridge, as a chat app would.
// Run: node test/harness/serve.mjs  (needs the server: PORT=8001 node server.mjs), then open http://127.0.0.1:8099/
import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";

const params = new URLSearchParams(location.search);
const SAMPLE = {
  title: "Sample board (sample data)",
  scene: params.get("scene") ?? "break-room",
  scenes: (params.get("scenes") ?? "power-cut,break-room-camera,flyer").split(",").filter(Boolean),
  timeline: [
    { time: "03:02:00Z", event: "Sample event 1 involving Sample person A", source: "sample source" },
    { time: "02:45:10Z", event: "Sample event 2", source: "sample source" },
    { time: "03:07:00Z", event: "Sample event 3 near Sample person B", source: "sample source" },
    { time: "03:03:00Z", event: "Sample event 4 with Sample person A and Sample person C", source: "sample source" },
    { time: "02:58:00Z", event: "Sample lead event 1 about Sample person B", source: "the player's lead", origin: "lead" },
    { time: "03:10:00Z", event: "Sample lead event 2", source: "the player's lead", origin: "lead" },
  ],
  clues: [
    { title: "Sample clue 1", detail: "Sample detail.", source: "sample source", confidence: "solid" },
    { title: "Sample clue 2 about Sample person C", detail: "Sample detail.", source: "sample source", confidence: "likely" },
    { title: "Sample clue 3", confidence: "unclear" },
    { title: "Sample lead clue about Sample person A", detail: "Sample detail from a lead.", source: "the player's lead", confidence: "likely", origin: "lead" },
    { title: "Sample lead clue 2", confidence: "unclear", origin: "lead" },
  ],
  people: [
    { name: "Sample person A", role: "Sample role", note: "Sample note." },
    { name: "Sample person B", role: "Sample role" },
    { name: "Sample person C", role: "Sample role" },
    { name: "Sample person D", role: "Sample role", note: "No portrait, so initials." },
    { name: "Sample person E", role: "Named in a lead", note: "Sample note: only a lead mentions them.", origin: "lead" },
  ],
  questions: ["Sample question 1?", "Sample question 2?"],
};
if (params.get("many")) {
  for (let i = 0; i < 24; i++) {
    SAMPLE.timeline.push({ time: `03:${String(10 + i).padStart(2, "0")}:00Z`, event: `Sample event ${i + 1}${i % 3 === 0 ? " involving Sample person A" : i % 3 === 1 ? " near Sample person B" : ""}`, source: "loki sample" });
    SAMPLE.clues.push({ title: `Sample clue ${i + 1}${i % 4 === 0 ? " about Sample person C" : ""}`, detail: "A longer sample detail so the card has something to open.", confidence: ["solid", "likely", "unclear"][i % 3] });
  }
  for (const n of ["Dana", "Eli", "Fenn", "Gus", "Hana"]) SAMPLE.people.push({ name: n, role: "Sample person" });
}

const frame = document.getElementById("view");
const { result } = await (
  await fetch("/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "resources/read", params: { uri: "ui://defiantjazz/evidence-board.html" } }),
  }).then(async (r) => JSON.parse((await r.text()).split("\n").find((l) => l.startsWith("data:")).slice(5)))
);
const bridge = new AppBridge(null, { name: "harness-host", version: "1.0.0" }, { serverTools: {} }, {
  hostContext: { theme: params.get("theme") ?? "light", displayMode: "inline", platform: "web" },
});
bridge.oninitialized = () => {
  bridge.sendToolInput({ arguments: SAMPLE });
  document.title = "ready";
};
bridge.onsizechange = ({ height }) => {
  if (height) frame.style.height = `${height}px`;
};
frame.sandbox = "allow-scripts";
frame.srcdoc = result.contents[0].text;
await bridge.connect(new PostMessageTransport(frame.contentWindow, frame.contentWindow));

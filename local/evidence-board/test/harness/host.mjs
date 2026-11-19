// A tiny MCP Apps host for looking at the board in a browser: it fetches the real view from the running server, puts it in a
// sandboxed iframe and sends it a sample tool call's arguments through the SDK's own AppBridge, as a chat app would.
// Run: node test/harness/serve.mjs  (needs the server: PORT=8001 node server.mjs), then open http://127.0.0.1:8099/
import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";

const SAMPLE = {
  title: "Cocoa Hour power cut: Break Room 2 (sample data)",
  scene: new URLSearchParams(location.search).get("scene") ?? "break-room",
  timeline: [
    { time: "03:02:00Z", event: "Power cut starts on the Sleep Floor", source: "loki power" },
    { time: "02:45:10Z", event: "Cocoa Hour begins in Break Room 2", source: "loki door" },
    { time: "03:07:00Z", event: "Power restored after five minutes", source: "prometheus circuit_power_watts" },
    { time: "03:02:20Z", event: "Badge 3 uploads buffered readings late", source: "ingested_at" },
    { time: "03:03:00Z", event: "Agnes badges out of Break Room 2", source: "loki door" },
  ],
  clues: [
    { title: "Door reader silent during the outage", detail: "No door events between 03:02 and 03:07.", source: "loki door", confidence: "solid" },
    { title: "Buffered badge samples", detail: "Samples recorded in the dark arrive after power returns.", source: "buffered=true", confidence: "likely" },
    { title: "Badge 3 moved during the cut", confidence: "unclear" },
  ],
  people: [
    { name: "Agnes", role: "Sample person", note: "Sample note: Agnes appears in the sample timeline." },
    { name: "Bertram", role: "Sample person" },
    { name: "Clement", role: "Sample person" },
    { name: "Badge 5", role: "Night shift", note: "No portrait, so initials." },
  ],
  questions: ["Who was in Break Room 2 at 03:02?", "Why did the door reader go silent?"],
};

const frame = document.getElementById("view");
const { result } = await (
  await fetch("/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "resources/read", params: { uri: "ui://defiantjazz/evidence-board.html" } }),
  }).then(async (r) => JSON.parse((await r.text()).split("\n").find((l) => l.startsWith("data:")).slice(5)))
);
const bridge = new AppBridge(null, { name: "harness-host", version: "1.0.0" }, { serverTools: {} }, {
  hostContext: { theme: new URLSearchParams(location.search).get("theme") ?? "light", displayMode: "inline", platform: "web" },
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

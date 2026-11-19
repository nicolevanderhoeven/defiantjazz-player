// A tiny MCP Apps host for looking at the board in a browser: it fetches the real view from the running server, puts it in a
// sandboxed iframe and sends it a sample tool call's arguments through the SDK's own AppBridge, as a chat app would.
// Run: node test/harness/serve.mjs  (needs the server: PORT=8001 node server.mjs), then open http://127.0.0.1:8099/
import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";

const params = new URLSearchParams(location.search);
const SAMPLE = {
  title: "Cocoa Hour power cut: Break Room 2 (sample data)",
  scene: params.get("scene") ?? "break-room",
  scenes: (params.get("scenes") ?? "power-cut,break-room-camera,flyer").split(",").filter(Boolean),
  timeline: [
    { time: "03:02:00Z", event: "Power cut starts on the Sleep Floor", source: "loki power" },
    { time: "02:45:10Z", event: "Cocoa Hour begins in Break Room 2", source: "loki door" },
    { time: "03:07:00Z", event: "Power restored after five minutes", source: "prometheus circuit_power_watts" },
    { time: "03:02:20Z", event: "Badge 3 uploads buffered readings late", source: "ingested_at" },
    { time: "03:03:00Z", event: "Agnes badges out of Break Room 2", source: "loki door" },
    { time: "03:04:30Z", event: "Bertram's sleep band reports a raised heart rate", source: "prometheus band_heart_rate" },
    { time: "03:05:12Z", event: "Clement and Agnes seen together in the corridor", source: "tempo badge journey" },
    { time: "02:58:00Z", event: "Sample lead: Bertram says he left Break Room 2 early", source: "the player's lead", origin: "lead" },
    { time: "03:10:00Z", event: "Sample lead: Clement was told to check the fuse box", source: "the player's lead", origin: "lead" },
  ],
  clues: [
    { title: "Door reader silent during the outage", detail: "No door events between 03:02 and 03:07.", source: "loki door", confidence: "solid" },
    { title: "Buffered badge samples", detail: "Samples recorded in the dark arrive after power returns.", source: "buffered=true", confidence: "likely" },
    { title: "Badge 3 moved during the cut", confidence: "unclear" },
    { title: "Agnes's chat goes quiet at 03:01", detail: "Last message from Agnes before the power cut.", source: "loki chat", confidence: "likely" },
    { title: "Bertram's band and Clement's band disagree", detail: "Sample note: the two bands put them in different rooms.", confidence: "unclear" },
    { title: "Sample lead: Agnes kept a spare key", detail: "Sample detail from a lead the player opened in the web app.", source: "the player's lead", confidence: "likely", origin: "lead" },
    { title: "Sample lead: a note about the cocoa", confidence: "unclear", origin: "lead" },
  ],
  people: [
    { name: "Agnes", role: "Sample person", note: "Sample note: Agnes appears in the sample timeline." },
    { name: "Bertram", role: "Sample person" },
    { name: "Clement", role: "Sample person" },
    { name: "Badge 5", role: "Night shift", note: "No portrait, so initials." },
    { name: "Dr Sample", role: "Named in a lead", note: "Sample note: only the player's lead mentions them.", origin: "lead" },
  ],
  questions: ["Who was in Break Room 2 at 03:02?", "Why did the door reader go silent?", "Where was Badge 5 when the power came back?"],
};
if (params.get("many")) {
  for (let i = 0; i < 24; i++) {
    SAMPLE.timeline.push({ time: `03:${String(10 + i).padStart(2, "0")}:00Z`, event: `Sample event ${i + 1}${i % 3 === 0 ? " involving Agnes" : i % 3 === 1 ? " near Bertram" : ""}`, source: "loki sample" });
    SAMPLE.clues.push({ title: `Sample clue ${i + 1}${i % 4 === 0 ? " about Clement" : ""}`, detail: "A longer sample detail so the card has something to open.", confidence: ["solid", "likely", "unclear"][i % 3] });
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

// The evidence board's data model and its text rendering. The board shows only what the agent passes in: nothing here
// knows anything about the case.
import * as z from "zod/v4";

const short = (n) => z.string().trim().min(1).max(n);

// Where an item came from: the investigator's own queries (the default, so older calls still work) or the leads the
// player opened in the web app and told the investigator about. The board draws each in its own lane.
const originField = z
  .enum(["telemetry", "lead"])
  .default("telemetry")
  .describe("Where this came from: 'telemetry' (the default) for what you found by querying the data yourself, 'lead' for what the player told you or shared with you from the leads they opened. Never mark your own query results as 'lead'.");

export const boardInput = z.object({
  title: short(120).optional().describe("Board title. Defaults to 'Evidence board'."),
  scene: short(40)
    .optional()
    .describe("Optional picture pinned at the top of the board. Known: 'break-room', 'power-cut', 'break-room-camera', 'flyer'; anything else shows no picture."),
  scenes: z
    .array(short(40))
    .max(6)
    .optional()
    .describe("Optional extra pictures to pin on the board, from the same names as 'scene'. Unknown names are ignored."),
  timeline: z
    .array(
      z.object({
        time: short(40).describe("When it happened, as a timestamp or time of day, e.g. '03:02:11Z'."),
        event: short(400).describe("What happened, in one sentence."),
        source: short(120).optional().describe("Where you saw it: the query, data source or service."),
        origin: originField,
      }),
    )
    .max(60)
    .default([])
    .describe("What happened and when, in any order. The board sorts it by time."),
  clues: z
    .array(
      z.object({
        title: short(120),
        detail: short(600).optional(),
        source: short(120).optional().describe("The query, data source or service it came from."),
        confidence: z.enum(["solid", "likely", "unclear"]).default("likely").describe("How sure you are of this clue."),
        origin: originField,
      }),
    )
    .max(40)
    .default([])
    .describe("Clues found so far."),
  people: z
    .array(
      z.object({
        name: short(80),
        role: short(80).optional(),
        note: short(400).optional().describe("What you know about them so far, from the data only."),
        origin: originField,
      }),
    )
    .max(40)
    .default([])
    .describe("People involved so far."),
  questions: z.array(short(300)).max(30).default([]).describe("Open questions: what you can't tell yet and what you'd check next."),
});

export const BOARD_TITLE = "Evidence board";

// The two lanes of the board, in order. The view and the text fallback both group by these.
export const LANES = {
  telemetry: { title: "From the telemetry", tag: "Telemetry", sub: "What the investigator found by querying the data.", empty: "Nothing from the telemetry yet." },
  lead: { title: "From your leads", tag: "Lead", sub: "What you told the investigator from the leads you opened.", empty: "Nothing from your leads yet. Share a lead with the investigator and it will show up here." },
};
export const LANE_KEYS = Object.keys(LANES);
// Anything that is not 'lead' is telemetry, so older calls with no origin still draw.
export const originOf = (item) => (item?.origin === "lead" ? "lead" : "telemetry");

// The only artwork the board knows: which scene value goes with which picture (and its alt text), and which first names
// have a portrait. All of it is art the web app shows a player before an accusation. Nothing here says anything about the case.
export const SCENES = {
  "break-room": "The Break Room",
  "power-cut": "The power cut",
  "break-room-camera": "Break Room 2 security camera",
  flyer: "The Kipsake flyer",
};
export const PORTRAIT_NAMES = ["agnes", "bertram", "clement"];

// A person's portrait is picked by their whole first name, ignoring case ("Agnes Okafor" and "agnes" match "agnes";
// "Agnesia" does not). No match returns null: the board never guesses.
export function portraitKey(name) {
  const first = String(name ?? "").trim().split(/[\s,]+/)[0]?.toLowerCase();
  return PORTRAIT_NAMES.includes(first) ? first : null;
}

export const sceneKey = (scene) => (typeof scene === "string" && Object.hasOwn(SCENES, scene.trim().toLowerCase()) ? scene.trim().toLowerCase() : null);

// The pictures to pin, in order and without repeats: `scene` first, then `scenes`. Unknown names are skipped, never guessed.
export function sceneKeys(input) {
  const keys = [input?.scene, ...(Array.isArray(input?.scenes) ? input.scenes : [])].map(sceneKey).filter(Boolean);
  return [...new Set(keys)];
}

// Sort by the text of the time, which orders ISO timestamps and zero-padded times of day. Entries with equal times keep their order.
export function sortTimeline(timeline) {
  return timeline.map((e, i) => [e, i]).sort(([a, i], [b, j]) => (a.time < b.time ? -1 : a.time > b.time ? 1 : i - j)).map(([e]) => e);
}

// What a host with no UI shows the agent (and the player) instead of the board: the same two lanes, as text.
export function boardText(input) {
  const b = boardInput.parse(input);
  const out = [`${b.title ?? BOARD_TITLE}`, ""];
  for (const key of LANE_KEYS) {
    const mine = (items) => items.filter((x) => originOf(x) === key);
    const sections = [
      ["Timeline", sortTimeline(mine(b.timeline)).map((e) => `- ${e.time}  ${e.event}${e.source ? ` [${e.source}]` : ""}`)],
      ["Clues", mine(b.clues).map((c) => `- ${c.title} (${c.confidence})${c.detail ? `: ${c.detail}` : ""}${c.source ? ` [${c.source}]` : ""}`)],
      ["People", mine(b.people).map((p) => `- ${p.name}${p.role ? ` (${p.role})` : ""}${p.note ? `: ${p.note}` : ""}`)],
    ].filter(([, lines]) => lines.length);
    out.push(LANES[key].title.toUpperCase());
    if (!sections.length) out.push(`- ${LANES[key].empty}`, "");
    for (const [heading, lines] of sections) out.push(`${heading} (${lines.length})`, ...lines, "");
  }
  out.push(`Open questions (${b.questions.length})`, ...(b.questions.length ? b.questions.map((q) => `- ${q}`) : ["- nothing yet"]));
  return out.join("\n").trimEnd();
}

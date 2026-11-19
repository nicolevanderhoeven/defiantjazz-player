// The evidence board's data model and its text rendering. The board shows only what the agent passes in: nothing here
// knows anything about the case.
import * as z from "zod/v4";

const short = (n) => z.string().trim().min(1).max(n);

export const boardInput = z.object({
  title: short(120).optional().describe("Board title. Defaults to 'Evidence board'."),
  scene: short(40)
    .optional()
    .describe("Optional picture for the board's header. The only one known is 'break-room'; anything else shows no picture."),
  timeline: z
    .array(
      z.object({
        time: short(40).describe("When it happened, as a timestamp or time of day, e.g. '03:02:11Z'."),
        event: short(400).describe("What happened, in one sentence."),
        source: short(120).optional().describe("Where you saw it: the query, data source or service."),
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
      }),
    )
    .max(40)
    .default([])
    .describe("People involved so far."),
  questions: z.array(short(300)).max(30).default([]).describe("Open questions: what you can't tell yet and what you'd check next."),
});

export const BOARD_TITLE = "Evidence board";

// The only artwork the board knows: which scene value goes with which picture (and its alt text), and which first names
// have a portrait. Nothing here says anything about the case.
export const SCENES = { "break-room": "The Break Room" };
export const PORTRAIT_NAMES = ["agnes", "bertram", "clement"];

// A person's portrait is picked by their whole first name, ignoring case ("Agnes Okafor" and "agnes" match "agnes";
// "Agnesia" does not). No match returns null: the board never guesses.
export function portraitKey(name) {
  const first = String(name ?? "").trim().split(/[\s,]+/)[0]?.toLowerCase();
  return PORTRAIT_NAMES.includes(first) ? first : null;
}

export const sceneKey = (scene) => (typeof scene === "string" && Object.hasOwn(SCENES, scene.trim().toLowerCase()) ? scene.trim().toLowerCase() : null);

// Sort by the text of the time, which orders ISO timestamps and zero-padded times of day. Entries with equal times keep their order.
export function sortTimeline(timeline) {
  return timeline.map((e, i) => [e, i]).sort(([a, i], [b, j]) => (a.time < b.time ? -1 : a.time > b.time ? 1 : i - j)).map(([e]) => e);
}

// What a host with no UI shows the agent (and the player) instead of the board.
export function boardText(input) {
  const b = boardInput.parse(input);
  const out = [`${b.title ?? BOARD_TITLE}`, ""];
  const section = (heading, lines) => {
    out.push(`${heading} (${lines.length})`);
    out.push(...(lines.length ? lines : ["- nothing yet"]), "");
  };
  section(
    "Timeline",
    sortTimeline(b.timeline).map((e) => `- ${e.time}  ${e.event}${e.source ? ` [${e.source}]` : ""}`),
  );
  section(
    "Clues",
    b.clues.map((c) => `- ${c.title} (${c.confidence})${c.detail ? `: ${c.detail}` : ""}${c.source ? ` [${c.source}]` : ""}`),
  );
  section(
    "People",
    b.people.map((p) => `- ${p.name}${p.role ? ` (${p.role})` : ""}${p.note ? `: ${p.note}` : ""}`),
  );
  section("Open questions", b.questions.map((q) => `- ${q}`));
  return out.join("\n").trimEnd();
}

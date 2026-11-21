// The incident night's window, read from the file the loader leaves in the case-window volume.
// Everything here is the same range `docker compose logs gcx-token` prints; no story, no solution.
import { readFileSync } from "node:fs";

export const WINDOW_FILE = process.env.DJ_WINDOW_FILE ?? "/window/case-window.json";
export const CASE_WINDOW_TOOL = "case_window";
// The power goes out at 03:02 UTC on the incident night. It is public in AGENTS.md.
const INCIDENT_TIME = "03:02:00Z";

export const CASE_WINDOW_DESCRIPTION =
  "Returns the incident night's time window in UTC (from, to), its case_run label and the log selector for the loaded case. " +
  "The case is loaded with the incident on the most recent Thursday, so relative time ranges and guessed dates do not find it.";

const NOT_LOADED =
  "The case isn't loaded yet. It takes about 3 minutes after the stack starts; ask the player to run `docker compose logs loader` if this persists.";
const MALFORMED =
  "The case window file could not be read. Ask the player for the window from `docker compose logs gcx-token`.";

const isTime = (v) => typeof v === "string" && !Number.isNaN(Date.parse(v));

// Returns { ok: true, window } or { ok: false, message }.
export function readCaseWindow(path = WINDOW_FILE) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return { ok: false, message: NOT_LOADED };
  }
  if (!raw.trim()) return { ok: false, message: NOT_LOADED };
  let file;
  try {
    file = JSON.parse(raw);
  } catch {
    return { ok: false, message: MALFORMED };
  }
  if (!file || typeof file !== "object" || !isTime(file.start) || !isTime(file.end) || !/^\d{4}-\d{2}-\d{2}$/.test(String(file.case_run))) {
    return { ok: false, message: MALFORMED };
  }
  const namespace = typeof file.namespace === "string" && file.namespace ? file.namespace : "kipsake-sleep-floor";
  const window = {
    case_run: file.case_run,
    from: file.start,
    to: file.end,
    incident_at: `${file.case_run}T${INCIDENT_TIME}`,
    namespace,
    logql_selector: `{service_namespace="${namespace}"} | case_run="${file.case_run}"`,
    ...(typeof file.loaded_at === "string" ? { loaded_at: file.loaded_at } : {}),
    note: "All times are UTC. Use from/to (or case_run) for every query; relative ranges such as 'last 24h' will not find the incident.",
  };
  return { ok: true, window };
}

export function caseWindowResult(path = WINDOW_FILE) {
  const r = readCaseWindow(path);
  if (!r.ok) return { isError: true, content: [{ type: "text", text: r.message }] };
  return { content: [{ type: "text", text: JSON.stringify(r.window, null, 2) }], structuredContent: r.window };
}

// Sent to the agent when it connects. Short on purpose: the rules that matter come first (some hosts show only the
// first 512 characters), and the full rules stay in AGENTS.md.
export const SERVER_INSTRUCTIONS =
  "Defiant Jazz case. Call case_window first and use its from/to and case_run for every query; the case is loaded on the most recent Thursday, so relative ranges and guessed dates find nothing. " +
  "Use only the telemetry (Loki, Prometheus, Tempo, through the Grafana MCP server or gcx --context dj-local); do not open files from any checkout of the game's repository and do not search the web. " +
  "You cannot see the player's leads: ask what they found, and mark those items origin \"lead\" on the board. " +
  "Call show_evidence_board when you report, with where you saw each thing. Say what the data can't tell you. Full rules are in AGENTS.md if you can read it.";

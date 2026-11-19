// Draws the board into a document: a cork board with pinned photos, notes and index cards, and red string from each person
// to the timeline entries and clues that mention them. Every string from the agent goes in through textContent, never as
// markup, and the code never reads anything but its argument: the board shows exactly what it was given.
//
// The board is built once. Choosing a person only toggles classes and redraws the string, so what is expanded stays expanded.
// The string is decoration (aria-hidden); the same connections are written out as text on every card and in the status line.
import { sortTimeline, portraitKey, sceneKeys, SCENES, LANES, LANE_KEYS, originOf } from "../board.mjs";

const SVG = "http://www.w3.org/2000/svg";

const el = (doc, tag, className, text) => {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const svg = (doc, tag, attrs = {}) => {
  const node = doc.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
};

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const list = (items) => (items.length < 3 ? items.join(" and ") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);
// A small, fixed tilt per item (-2 to +2 degrees): the same board always hangs the same way.
const tilt = (i, k = 0) => `${(((i * 7 + k * 5) % 9) - 4) * 0.5}deg`;

const mentionsName = (text, name) =>
  !!name && new RegExp(`(?<![\\p{L}\\p{N}_])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_])`, "iu").test(text);

const cleanups = new WeakMap();

// art maps picture names to image URLs: { portraits: { agnes: url, ... }, scenes: { "break-room": url, ... } }.
// options.lanes says which lanes to draw, in order (default: both). A board of only ["telemetry"] drops items from other
// lanes, so a page that has no leads (a static, telemetry-only page) can reuse the same view.
export function renderBoard(doc, root, input, art = {}, options = {}) {
  cleanups.get(root)?.();
  const laneKeys = (options.lanes ?? LANE_KEYS).filter((k) => LANE_KEYS.includes(k));
  const inLanes = (items) => (items ?? []).filter((x) => laneKeys.includes(originOf(x)));
  const mergePeople = (items) => {
    const byName = new Map();
    for (const p of items ?? []) {
      const key = (p.name ?? "").trim().toLowerCase();
      const seen = byName.get(key);
      if (!seen) byName.set(key, { ...p });
      else {
        seen.role ||= p.role;
        seen.note ||= p.note;
        if (originOf(seen) !== "telemetry" && originOf(p) === "telemetry") seen.origin = p.origin;
      }
    }
    return inLanes([...byName.values()]);
  };
  const data = {
    title: input.title || "Evidence board",
    timeline: sortTimeline(inLanes(input.timeline)),
    clues: inLanes(input.clues),
    people: mergePeople(input.people),
    questions: input.questions ?? [],
  };
  const state = { person: null };
  root.replaceChildren();

  const timelineText = (e) => `${e.event} ${e.source ?? ""}`;
  const clueText = (c) => `${c.title} ${c.detail ?? ""} ${c.source ?? ""}`;
  // The people (by name, once each, in board order) that a piece of text mentions.
  const peopleIn = (text) => [...new Set(data.people.filter((p) => mentionsName(text, p.name)).map((p) => p.name))];

  const board = el(doc, "div", "board");
  const under = svg(doc, "svg", { class: "string under", "aria-hidden": "true", focusable: "false" });
  const over = svg(doc, "svg", { class: "string over", "aria-hidden": "true", focusable: "false" });
  const pin = (i) => {
    const p = el(doc, "span", `pin pin-${i % 4}`);
    p.setAttribute("aria-hidden", "true");
    return p;
  };

  // ---- the header: the case label, and the pictures pinned beside it
  const head = el(doc, "header", "board-head");
  const label = el(doc, "div", "label");
  label.append(el(doc, "p", "stamp", "Case file"), el(doc, "h1", "", data.title), el(doc, "p", "board-sub", "Only what the investigator has found so far."));
  head.append(label);
  const scenes = sceneKeys(input).filter((k) => art.scenes?.[k]);
  if (scenes.length) {
    const photos = el(doc, "div", "photos");
    scenes.forEach((key, i) => {
      const fig = el(doc, "figure", "snap");
      fig.style.setProperty("--rot", tilt(i, 3));
      const img = el(doc, "img", "scene");
      img.src = art.scenes[key];
      img.alt = SCENES[key];
      fig.append(el(doc, "span", "tape"), img, el(doc, "figcaption", "", SCENES[key]));
      fig.lastChild.setAttribute("aria-hidden", "true");
      photos.append(fig);
    });
    head.append(photos);
  }

  // ---- what you can do, and what is selected
  const status = el(doc, "div", "status");
  status.setAttribute("role", "status");

  // A person's portrait, or their initials when we have no portrait for them.
  function avatar(name, small) {
    const key = portraitKey(name);
    const cls = "avatar" + (small ? " small" : "");
    if (key && art.portraits?.[key]) {
      const img = el(doc, "img", cls);
      img.src = art.portraits[key];
      img.alt = `Portrait of ${name}`;
      return img;
    }
    if (small) return "";
    const initials = String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => Array.from(w)[0].toUpperCase()).join("");
    const span = el(doc, "span", cls + " placeholder", initials);
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  // A small label that says where an item came from, so the split is never only a matter of position.
  const fromTag = (item) => {
    const key = originOf(item);
    return el(doc, "span", `from from-${key}`, LANES[key].tag);
  };
  const ul = (cls) => {
    const node = el(doc, "ul", cls);
    node.setAttribute("role", "list");
    return node;
  };

  // The things a person can be connected to: { li, pin, names: [people it mentions] }.
  const targets = [];
  const links = (names) => {
    const p = el(doc, "p", "links", names.length ? `Mentions: ${names.join(", ")}` : "");
    p.hidden = !names.length;
    return p;
  };
  // A card or strip you can open: a button, and the rest folded under it. Nothing to fold: nothing to press.
  function foldable(li, button, detail) {
    button.type = "button";
    if (!detail.length) {
      button.disabled = true;
      return;
    }
    const more = el(doc, "div", "more");
    more.hidden = true;
    more.append(...detail);
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      more.hidden = !more.hidden;
      button.setAttribute("aria-expanded", String(!more.hidden));
      drawString();
    });
    li.append(more);
  }

  // A lane: a ribbon pinned across the top, then the people, timeline entries and clues from that source. A group with
  // nothing in this lane is left out; a lane with nothing at all says so.
  const personCards = [];
  const laneSection = (key) => {
    const lane = el(doc, "section", `lane lane-${key}`);
    const heading = el(doc, "h2", "ribbon", LANES[key].title);
    lane.append(heading, el(doc, "p", "lane-sub", LANES[key].sub));
    const sub = (cls, title, count) => {
      const sec = el(doc, "div", `sec ${cls}`);
      const h = el(doc, "h3", "tag", title + " ");
      h.append(el(doc, "span", "count", String(count)));
      sec.append(h);
      return sec;
    };
    const mine = (items) => items.filter((x) => originOf(x) === key);
    const lanePeople = mine(data.people);
    const laneTimeline = mine(data.timeline);
    const laneClues = mine(data.clues);
    if (!lanePeople.length && !laneTimeline.length && !laneClues.length) lane.append(el(doc, "p", "empty", LANES[key].empty));

    // people: pinned photos
    if (lanePeople.length) {
      const people = sub("people", "People", lanePeople.length);
      const grid = ul("polaroids");
      lanePeople.forEach((p, i) => {
        const li = el(doc, "li", "person");
        li.style.setProperty("--rot", tilt(i));
        const pick = el(doc, "button", "row");
        pick.type = "button";
        pick.setAttribute("aria-pressed", "false");
        const photo = el(doc, "span", "photo");
        photo.append(avatar(p.name));
        pick.append(photo, el(doc, "span", "text", p.name), el(doc, "span", "role", p.role ?? ""), fromTag(p));
        pick.addEventListener("click", () => {
          state.person = state.person === p.name ? null : p.name;
          apply();
        });
        const pn = pin(0);
        li.append(pn, pick);
        if (p.note) li.append(el(doc, "p", "note", p.note));
        const connections = el(doc, "p", "links");
        li.append(connections);
        grid.append(li);
        personCards.push({ person: p, li, pick, pin: pn, connections });
      });
      people.append(el(doc, "p", "hint", "Select a person to follow the red string to the timeline entries and clues that mention them."), grid);
      lane.append(people);
    }

    // timeline: one pinned sheet, a pin at each entry
    if (laneTimeline.length) {
      const timeline = sub("timeline", "Timeline", laneTimeline.length);
      const sheet = el(doc, "div", "sheet");
      const rows = ul("entries");
      laneTimeline.forEach((e, i) => {
        const li = el(doc, "li", "tl");
        const pn = pin(i + 1);
        const button = el(doc, "button", "row");
        button.append(el(doc, "span", "time", e.time), el(doc, "span", "text", e.event), fromTag(e));
        li.append(pn, button);
        foldable(li, button, e.source ? [el(doc, "p", "src", `Source: ${e.source}`)] : []);
        const names = peopleIn(timelineText(e));
        li.append(links(names));
        rows.append(li);
        targets.push({ li, pin: pn, names });
      });
      sheet.append(rows);
      timeline.append(sheet);
      lane.append(timeline);
    }

    // clues: pinned index cards
    if (laneClues.length) {
      const clues = sub("clues", "Clues", laneClues.length);
      const grid = ul("cards");
      laneClues.forEach((c, i) => {
        const li = el(doc, "li", "clue");
        li.style.setProperty("--rot", tilt(i, 1));
        const pn = pin(i + 2);
        const button = el(doc, "button", "row");
        const confidence = c.confidence ?? "likely";
        const top = el(doc, "span", "top");
        top.append(el(doc, "span", `badge ${confidence}`, confidence), fromTag(c));
        button.append(top, el(doc, "span", "text", c.title));
        li.append(pn, button);
        const detail = [];
        if (c.detail) detail.push(el(doc, "p", "", c.detail));
        if (c.source) detail.push(el(doc, "p", "src", `Source: ${c.source}`));
        foldable(li, button, detail);
        const names = peopleIn(clueText(c));
        li.append(links(names));
        grid.append(li);
        targets.push({ li, pin: pn, names });
      });
      clues.append(grid);
      lane.append(clues);
    }
    return lane;
  };

  const lanes = el(doc, "div", `lanes lanes-${laneKeys.length}`);
  lanes.append(...laneKeys.map(laneSection));

  // ---- open questions: sticky notes
  const questions = el(doc, "section", "sec questions");
  const qh = el(doc, "h2", "tag", "Open questions ");
  qh.append(el(doc, "span", "count", String(data.questions.length)));
  questions.append(qh);
  if (!data.questions.length) questions.append(el(doc, "p", "empty", "No open questions."));
  if (data.questions.length) {
    const notes = ul("stickies");
    data.questions.forEach((q, i) => {
      const li = el(doc, "li", `q sticky-${i % 4}`, q);
      li.style.setProperty("--rot", tilt(i, 2));
      notes.append(li);
    });
    questions.append(notes);
  }

  board.append(under, head, status, lanes, questions, over);
  root.append(board);

  // ---- who is connected to what, as text
  const connectedTo = (name) => ({
    tl: targets.filter((t) => t.li.classList.contains("tl") && t.names.includes(name)),
    clue: targets.filter((t) => t.li.classList.contains("clue") && t.names.includes(name)),
  });
  for (const card of personCards) {
    const { tl, clue } = connectedTo(card.person.name);
    const parts = [];
    if (tl.length) parts.push(plural(tl.length, "timeline entry", "timeline entries"));
    if (clue.length) parts.push(plural(clue.length, "clue", "clues"));
    card.connections.textContent = parts.length ? `In ${list(parts)}` : "Not mentioned yet";
  }

  // ---- the string
  const pathBetween = (a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const sag = Math.min(46, 8 + Math.hypot(dx, dy) * 0.12);
    return `M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${((a[0] + b[0]) / 2).toFixed(1)},${(((a[1] + b[1]) / 2) + sag).toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`;
  };
  function drawString() {
    under.replaceChildren();
    over.replaceChildren();
    const box = board.getBoundingClientRect();
    const at = (node) => {
      const r = node.getBoundingClientRect();
      return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
    };
    for (const card of personCards) {
      const from = at(card.pin);
      const mine = state.person === card.person.name;
      for (const t of targets) {
        if (!t.names.includes(card.person.name)) continue;
        const d = pathBetween(from, at(t.pin));
        const line = svg(doc, "path", { d, class: mine ? "line pulled" : state.person ? "line faint" : "line" });
        line.dataset.person = card.person.name;
        line.dataset.to = t.li.classList.contains("tl") ? "timeline" : "clue";
        (mine ? over : under).append(line);
      }
    }
  }

  // ---- selecting a person
  function apply() {
    const name = state.person;
    for (const card of personCards) {
      const on = card.person.name === name;
      card.li.classList.toggle("hit", on);
      card.pick.setAttribute("aria-pressed", String(on));
    }
    for (const t of targets) {
      const hit = !!name && t.names.includes(name);
      t.li.classList.toggle("hit", hit);
      t.li.classList.toggle("dim", !!name && !hit);
    }
    status.replaceChildren();
    status.hidden = !data.people.length;
    if (name) {
      const { tl, clue } = connectedTo(name);
      const clear = el(doc, "button", "chip");
      clear.type = "button";
      clear.append(avatar(name, true), `Highlighting: ${name} ✕`);
      clear.addEventListener("click", () => {
        state.person = null;
        apply();
      });
      const parts = [];
      if (tl.length) parts.push(plural(tl.length, "timeline entry", "timeline entries"));
      if (clue.length) parts.push(plural(clue.length, "clue", "clues"));
      status.append(clear, el(doc, "span", "summary", parts.length ? `${list(parts)} mention them.` : "Nothing on the board mentions them yet."));
    }
    drawString();
  }
  board.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.person) {
      state.person = null;
      apply();
    }
  });

  apply();

  // Images, fonts and a narrower chat pane all move the pins: draw the string again when the board changes size.
  const win = doc.defaultView;
  let stop = () => {};
  if (win?.ResizeObserver) {
    const watch = new win.ResizeObserver(() => drawString());
    watch.observe(board);
    stop = () => watch.disconnect();
  } else if (win) {
    win.addEventListener("resize", drawString);
    stop = () => win.removeEventListener("resize", drawString);
  }
  cleanups.set(root, stop);
}

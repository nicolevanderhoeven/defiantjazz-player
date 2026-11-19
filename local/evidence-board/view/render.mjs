// Draws the board into a document. Every string from the agent goes in through textContent, never as markup, and the
// code never reads anything but its argument: the board shows exactly what it was given.
import { sortTimeline, portraitKey, sceneKey, SCENES } from "../board.mjs";

const el = (doc, tag, className, text) => {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const TABS = [
  ["timeline", "Timeline"],
  ["clues", "Clues"],
  ["people", "People"],
  ["questions", "Open questions"],
];

// art maps picture names to image URLs: { portraits: { agnes: url, ... }, scenes: { "break-room": url } }.
export function renderBoard(doc, root, input, art = {}) {
  const data = {
    title: input.title || "Evidence board",
    timeline: sortTimeline(input.timeline ?? []),
    clues: input.clues ?? [],
    people: input.people ?? [],
    questions: input.questions ?? [],
  };
  const state = { tab: "timeline", person: null };
  root.replaceChildren();

  const mentions = (text, name) =>
    !!name && new RegExp(`(?<![\\p{L}\\p{N}_])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_])`, "iu").test(text);
  const timelineText = (e) => `${e.event} ${e.source ?? ""}`;
  const clueText = (c) => `${c.title} ${c.detail ?? ""} ${c.source ?? ""}`;

  const head = el(doc, "header", "board-head");
  const scene = sceneKey(input.scene);
  if (scene && art.scenes?.[scene]) {
    const img = el(doc, "img", "scene");
    img.src = art.scenes[scene];
    img.alt = SCENES[scene];
    head.append(img);
  }
  head.append(el(doc, "h1", "", data.title), el(doc, "p", "board-sub", "Only what the investigator has found so far."));
  const tabs = el(doc, "div", "tabs");
  tabs.setAttribute("role", "tablist");
  const panel = el(doc, "div", "panel");
  panel.setAttribute("role", "tabpanel");
  const filter = el(doc, "div", "filter");
  root.append(head, tabs, filter, panel);

  const counts = { timeline: data.timeline.length, clues: data.clues.length, people: data.people.length, questions: data.questions.length };

  function row(parent, cls, mark, pieces, detail) {
    const li = el(doc, "li", cls);
    const button = el(doc, "button", "row");
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.append(...pieces);
    li.append(button);
    if (detail.length) {
      const more = el(doc, "div", "more");
      more.hidden = true;
      more.append(...detail);
      li.append(more);
      button.addEventListener("click", () => {
        more.hidden = !more.hidden;
        button.setAttribute("aria-expanded", String(!more.hidden));
      });
    } else {
      button.disabled = true;
    }
    if (mark) li.classList.add(mark);
    parent.append(li);
  }

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

  function drawFilter() {
    filter.replaceChildren();
    filter.hidden = !state.person;
    if (!state.person) return;
    const clear = el(doc, "button", "chip");
    clear.append(avatar(state.person, true), `Highlighting: ${state.person} ✕`);
    clear.type = "button";
    clear.addEventListener("click", () => {
      state.person = null;
      draw();
    });
    filter.append(clear);
  }

  function drawPanel() {
    panel.replaceChildren();
    const list = el(doc, "ul", "list");
    const empty = (text) => panel.append(el(doc, "p", "empty", text));
    if (state.tab === "timeline") {
      if (!data.timeline.length) return empty("No timeline entries yet.");
      for (const e of data.timeline) {
        const hit = state.person && mentions(timelineText(e), state.person);
        row(list, "tl", hit ? "hit" : state.person ? "dim" : "", [el(doc, "span", "time", e.time), el(doc, "span", "text", e.event)], e.source ? [el(doc, "p", "src", `Source: ${e.source}`)] : []);
      }
    } else if (state.tab === "clues") {
      if (!data.clues.length) return empty("No clues yet.");
      for (const c of data.clues) {
        const hit = state.person && mentions(clueText(c), state.person);
        const detail = [];
        if (c.detail) detail.push(el(doc, "p", "", c.detail));
        if (c.source) detail.push(el(doc, "p", "src", `Source: ${c.source}`));
        row(list, "clue", hit ? "hit" : state.person ? "dim" : "", [el(doc, "span", `badge ${c.confidence ?? "likely"}`, c.confidence ?? "likely"), el(doc, "span", "text", c.title)], detail);
      }
    } else if (state.tab === "people") {
      if (!data.people.length) return empty("Nobody on the board yet.");
      for (const p of data.people) {
        const li = el(doc, "li", "person" + (state.person === p.name ? " hit" : ""));
        const pick = el(doc, "button", "row");
        pick.type = "button";
        pick.setAttribute("aria-pressed", String(state.person === p.name));
        pick.append(avatar(p.name), el(doc, "span", "text", p.name), el(doc, "span", "role", p.role ?? ""));
        pick.addEventListener("click", () => {
          state.person = state.person === p.name ? null : p.name;
          draw();
        });
        li.append(pick);
        if (p.note) li.append(el(doc, "p", "note", p.note));
        list.append(li);
      }
      panel.append(el(doc, "p", "hint", "Select a person to highlight their timeline entries and clues."));
    } else {
      if (!data.questions.length) return empty("No open questions.");
      for (const q of data.questions) list.append(el(doc, "li", "q", q));
    }
    panel.append(list);
  }

  function draw() {
    for (const b of tabs.children) {
      const on = b.dataset.tab === state.tab;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    }
    drawFilter();
    drawPanel();
  }

  for (const [id, label] of TABS) {
    const b = el(doc, "button", "tab");
    b.type = "button";
    b.dataset.tab = id;
    b.setAttribute("role", "tab");
    b.append(label + " ", el(doc, "span", "count", String(counts[id])));
    b.addEventListener("click", () => {
      state.tab = id;
      draw();
    });
    tabs.append(b);
  }
  draw();
}

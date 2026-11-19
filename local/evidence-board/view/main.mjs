import { App, applyDocumentTheme } from "@modelcontextprotocol/ext-apps";
import { renderBoard } from "./render.mjs";
import { art } from "./art.mjs";

const root = document.getElementById("board");
const app = new App({ name: "defiantjazz-evidence-board", version: "1.0.0" });

const show = (args) => renderBoard(document, root, args ?? {}, art);
app.ontoolinput = (params) => show(params.arguments);
app.onhostcontextchanged = (ctx) => {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
};
await app.connect();
const ctx = app.getHostContext();
if (ctx?.theme) applyDocumentTheme(ctx.theme);

// Bundles the view (the board's DOM code plus the MCP Apps SDK) and its styles into one self-contained HTML file,
// dist/view.html. The view loads nothing from the network.
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const here = (p) => new URL(p, import.meta.url);
const result = await build({
  entryPoints: [here("./view/main.mjs").pathname],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  write: false,
  legalComments: "none",
  // The board's few pictures (view/art/) are inlined as data: URIs: the view cannot fetch anything.
  loader: { ".webp": "dataurl" },
});
// "</script" inside the bundle would end the inline script early.
const script = result.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = readFileSync(here("./view/view.html"), "utf8")
  .replace("/*STYLE*/", () => readFileSync(here("./view/style.css"), "utf8"))
  .replace("/*SCRIPT*/", () => script);
mkdirSync(here("./dist/"), { recursive: true });
writeFileSync(here("./dist/view.html"), html);
console.log(`evidence-board: wrote dist/view.html (${html.length} bytes)`);

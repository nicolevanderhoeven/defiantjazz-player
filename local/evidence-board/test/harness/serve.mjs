import { build } from "esbuild";
import { createServer, request } from "node:http";
const here = (p) => new URL(p, import.meta.url).pathname;
const out = await build({ entryPoints: [here("./host.mjs")], bundle: true, format: "esm", write: false });
const js = out.outputFiles[0].text;
const upstream = Number(process.env.PORT ?? 8001);
const page = `<!doctype html><meta charset=utf-8><title>host</title><body style="margin:0;background:#888;padding:16px;max-width:640px"><iframe id=view style="width:100%;height:300px;border:0"></iframe><script type=module src=/host.js></script>`;
createServer((req, res) => {
  if (req.url === "/host.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(js);
  if (req.url.startsWith("/mcp")) {
    const p = request({ host: "127.0.0.1", port: upstream, path: "/mcp", method: req.method, headers: { ...req.headers, host: `localhost:${upstream}` } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    return void req.pipe(p);
  }
  res.writeHead(200, { "content-type": "text/html" }).end(page);
}).listen(8099, "127.0.0.1", () => console.log("harness on http://127.0.0.1:8099/"));

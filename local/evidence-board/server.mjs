// The Defiant Jazz evidence board: an MCP App (https://modelcontextprotocol.io/extensions/apps) for the local stack.
// One tool, show_evidence_board, takes what the investigating agent has found so far and draws it as an interactive case
// board in the chat. Hosts with no interactive views get the same findings as text. Streamable HTTP at /mcp.
import { createServer } from "node:http";
import * as z from "zod/v4";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler, localhostHostValidation, localhostOriginValidation } from "@modelcontextprotocol/node";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { boardInput, boardText, BOARD_TITLE } from "./board.mjs";
import { CASE_WINDOW_TOOL, CASE_WINDOW_DESCRIPTION, SERVER_INSTRUCTIONS, WINDOW_FILE, caseWindowResult } from "./window.mjs";

export const TOOL_NAME = "show_evidence_board";
export const RESOURCE_URI = "ui://defiantjazz/evidence-board.html";

export const TOOL_DESCRIPTION =
  "Draw the case board in the chat: a timeline, the clues found, the people involved and the open questions. " +
  "Pass only what you have actually found in the telemetry so far, with where you saw each thing; the board shows exactly " +
  "what you pass and knows nothing else about the case. Call it again with the fuller picture as the investigation goes on. " +
  "Never put a conclusion about who did it in it unless the data shows it: use open questions for guesses.";

export function loadView(path = fileURLToPath(new URL("./dist/view.html", import.meta.url))) {
  return readFileSync(path, "utf8");
}

export function createBoardServer(view = loadView(), windowFile = WINDOW_FILE) {
  const server = new McpServer({ name: "defiantjazz-evidence-board", version: "1.0.0" }, { instructions: SERVER_INSTRUCTIONS });

  server.registerTool(
    CASE_WINDOW_TOOL,
    {
      title: "Incident night window",
      description: CASE_WINDOW_DESCRIPTION,
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => caseWindowResult(windowFile),
  );

  registerAppTool(
    server,
    TOOL_NAME,
    {
      title: BOARD_TITLE,
      description: TOOL_DESCRIPTION,
      inputSchema: boardInput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: { ui: { resourceUri: RESOURCE_URI } },
    },
    async (args) => ({ content: [{ type: "text", text: boardText(args) }] }),
  );

  registerAppResource(
    server,
    "Evidence board",
    RESOURCE_URI,
    { description: "The interactive case board.", mimeType: RESOURCE_MIME_TYPE },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: RESOURCE_MIME_TYPE,
          text: view,
          // The view is one self-contained file: it loads nothing and talks to nobody but its host.
          _meta: { ui: { csp: { connectDomains: [], resourceDomains: [] } } },
        },
      ],
    }),
  );
  return server;
}

export function createHttpServer(view = loadView(), windowFile = WINDOW_FILE) {
  const handler = toNodeHandler(createMcpHandler(() => createBoardServer(view, windowFile)));
  const validateHost = localhostHostValidation();
  const validateOrigin = localhostOriginValidation();
  return createServer((req, res) => {
    if (req.url === "/healthz") {
      res.writeHead(200, { "content-type": "text/plain" }).end("ok");
      return;
    }
    if (!validateHost(req, res) || !validateOrigin(req, res)) return;
    void handler(req, res);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 8001);
  createHttpServer().listen(port, process.env.HOST ?? "0.0.0.0", () => {
    console.log(`evidence-board: MCP endpoint on http://localhost:${port}/mcp`);
  });
}

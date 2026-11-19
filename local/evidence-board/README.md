# Evidence board (MCP App)

A small MCP server for the local stack. Its one tool, `show_evidence_board`, takes the timeline, clues, people and open questions an investigating agent has found so far and draws them as an interactive board in the chat (an [MCP App](https://modelcontextprotocol.io/extensions/apps)). Hosts with no interactive views get the same findings as text. The board knows nothing about the case: it shows only what the agent passes in. The one thing it adds is artwork from the public web app: a person's portrait on the People tab when their first name is Agnes, Bertram or Clement (anyone else gets initials), and, when the agent passes `scene: "break-room"`, a Break Room picture in the header (no `scene`, or an unknown one, shows none). The pictures are shrunk copies in `view/art/`, inlined into the view; the text fallback carries no images.

- `server.mjs`: the MCP server (streamable HTTP, `/mcp`, port 8001), `board.mjs`: the input schema and the text fallback.
- `view/`: the board itself. `node build.mjs` bundles it with the MCP Apps SDK into one self-contained `dist/view.html`.
- `npm test`: builds, then tests the tool schema, text fallback, escaping of agent text and the view's interactions.
- To look at it in a browser with the SDK's own host bridge: `PORT=8001 node server.mjs`, then `node test/harness/serve.mjs` and open <http://127.0.0.1:8099/> (`?theme=dark` for a dark host). This uses sample data, not the case.

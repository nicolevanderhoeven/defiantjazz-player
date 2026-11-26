# The Defiant Jazz Incident: play it on your own machine

An observability murder mystery set on the Sleep Floor at Kipsake.

Kipsake rents your sleep: at night its Dreamers sleep in pods while their sleepwalking selves work the floor. During the Cocoa Hour, the floor's middle-of-the-night holiday party, the power goes out for five minutes. When it comes back, the night supervisor, Mr. Reginald Hale, is dead in the elevator. Kipsake recorded everything it could: badges, doors, chat, sleep rings, power, microphones, cameras, sleep bands and personnel records.

You work out who did it. The evidence is **telemetry** (logs, metrics and traces) loaded into a Grafana stack on your own machine, and you investigate it with your own AI agent. The story, the leads and the scoring are in the game's web page; this repository is the evidence and the stack that serves it.

This repository holds the stack and the case data, and nothing else: Loki, Prometheus, Tempo, Grafana and one MCP server that gives your agent both the Grafana tools and an evidence board (see [Evidence board](#evidence-board-mcp-app)), started together by Docker Compose, plus the telemetry and the loader that fills them. Nothing in it connects to Grafana Cloud, and it holds no story or solution. The game itself is at <https://nicolevanderhoeven.com/defiantjazz/>.

## What you need

- **Docker with Compose** (Docker Desktop, or Docker Engine with the Compose plugin). Nothing else: no Python.
- **Git**, to clone this repository.
- **An AI agent** that can query Grafana, such as [Claude Code](https://docs.claude.com/en/docs/claude-code), Cursor or [Codex](https://github.com/openai/codex), with its own account or API key. Step 2 explains the two ways to connect it, the Grafana MCP server or [`gcx`](https://gra.fan/gcxrepo), and helps you pick. No agent? You can still paste [`game/ai-evidence/case-bundle.md`](game/ai-evidence/case-bundle.md) into any chatbot and ask it questions.

## 1. Clone it and start the stack

```sh
git clone https://github.com/nicolevanderhoeven/defiantjazz-player.git
cd defiantjazz-player/local
./up.sh
```

`./up.sh` is the way to start the stack. If another program already uses port 3000 (Grafana) or 8000 (the MCP server), it picks a free port by itself, saves it in `local/.env` so the next run and your links stay the same, starts the stack, and prints the real addresses at the end: the Grafana URL, the MCP URL and your `gcx login` line. Use those addresses wherever this guide says `localhost:3000` or `localhost:8000`. (Advanced: plain `docker compose up -d` also works, but it does no port handling, so a taken port leaves the stack half started.)

The first start pulls the images and builds a small loader, then loads the case: about two minutes. `docker compose ps -a` shows the `loader` as `Exited (0)` once the case is in.

Grafana, where the evidence lives, is at <http://localhost:3000>. Anyone on your machine can look around without signing in; sign in as `admin` / `admin` to change things. Every port is bound to `127.0.0.1`, so nothing is reachable from your network.

## 2. Connect your AI agent: pick ONE route

The evidence is in three Grafana data sources: Loki (logs), Prometheus (metrics) and Tempo (traces). Your agent needs a way to query them. Pick one:

- **Route A: the Grafana MCP server.** MCP (Model Context Protocol) is a standard way to give an AI agent tools. The stack already runs a read-only Grafana MCP server, and you add it to your agent once. Pick this if your agent supports MCP, as Claude Code, Cursor and Codex do.
- **Route B: `gcx`.** `gcx` is the command line for Grafana. Your agent runs `gcx` commands in your terminal to query the data sources. Pick this if your agent can run shell commands and you'd rather not use MCP.

Both routes end by starting your agent in this repository's folder (the one you cloned), not a new empty folder. The repository's [`AGENTS.md`](AGENTS.md) (and `CLAUDE.md`, which points to it) holds your agent's instructions, and Claude Code, Codex, Cursor and many other agents read it by themselves, so there is nothing to copy or paste. The case's raw evidence is in this folder as plain files, so the instructions tell your agent not to open them, and Claude Code and Cursor are also set up to block it, so your agent has to query Grafana like an investigator.

The instructions tell your agent to use only the route you set up, and to run `gcx` with `--context dj-local` so it never reaches another Grafana you use.

Then follow one route's steps, running its commands from `local/` unless a step says otherwise.

**Route A: the Grafana MCP server**

1. Add the server to your agent. In Claude Code, run:

   ```sh
   claude mcp add --scope user --transport http grafana-local http://localhost:8000/mcp
   ```

   `--scope user` makes the server available from any folder, including this repository's. It needs no login or key. In another MCP agent, open its MCP settings and add an HTTP server (also called Streamable HTTP) at `http://localhost:8000/mcp`.

2. Check that the agent can reach the server. In Claude Code, run `claude mcp list`. Success is a line like `grafana-local: http://localhost:8000/mcp (HTTP) - ✔ Connected`. If it says it failed, refer to [If a step fails](#if-a-step-fails).

3. Print the time range of the incident night:

   ```sh
   docker compose logs --no-log-prefix gcx-token | grep 'The incident night'
   ```

   It prints a line like `The incident night (UTC): from 2026-11-11T20:30:00Z to 2026-11-12T04:00:00Z, case_run="2026-11-11".` The case happened in the past, so a relative time range finds nothing; your agent works out the night itself, and this line only confirms the stack loaded the case. If nothing prints, see the troubleshooting section below.

4. Start your agent in the folder you cloned (this repository), not a new empty folder:

   ```sh
   cd ..
   claude
   ```

   Keep your agent's auto-approve ("yolo" or `--force`) mode off, so reads of the evidence files stay blocked or ask you first. The block is protection in practice, not a guarantee.

   Use `codex` for Codex, or open the repository folder in Cursor. The first time, the agent may ask you to sign in. Then type `Start the Defiant Jazz case.` Your agent finds the incident night itself, so you don't need to give it the times. To check the connection, ask `Which data sources can you query?` It should name Loki, Prometheus and Tempo.

**Route B: `gcx`**

1. Check that `gcx` is installed by running `gcx --version`. If the command isn't found, install it. On macOS or Linux, run `brew install gcx`. For other systems or options, follow the install instructions in the [`gcx` repository](https://gra.fan/gcxrepo). Run `gcx --version` again to confirm.

2. Print the login line and the time range of the incident night:

   ```sh
   docker compose logs --no-log-prefix gcx-token
   ```

   It prints a line that starts `gcx login dj-local`, which contains a read-only token (a password that lets `gcx` read the data but not change it), and a line like `The incident night (UTC): from <start> to <end>, case_run="...".` The case happened in the past, so a relative time range finds nothing; your agent works out the night itself. The first run can take a minute while the stack finishes loading.

3. Run the whole `gcx login` line from step 2, then check that `gcx` can see the data sources:

   ```sh
   gcx datasources list
   ```

   Success is a table with three rows: `loki`, `prometheus` and `tempo`. If you get an error or an empty table, refer to [If a step fails](#if-a-step-fails). Logging in adds a `dj-local` entry to the `gcx` settings and switches to it. If you use `gcx` for other Grafana instances, switch back later with `gcx config use-context <your earlier name>`.

4. Start your agent in the folder you cloned (this repository), not a new empty folder:

   ```sh
   cd ..
   claude
   ```

   Keep your agent's auto-approve ("yolo" or `--force`) mode off, so reads of the evidence files stay blocked or ask you first. The block is protection in practice, not a guarantee.

   Use `codex` for Codex, or open the repository folder in Cursor. The first time, the agent may ask you to sign in. Then type `Start the Defiant Jazz case.` Your agent finds the incident night itself, so you don't need to give it the times. To check the connection, ask `Which data sources can you query?` It should name Loki, Prometheus and Tempo.

## 3. Play

Open the game in local mode: <https://nicolevanderhoeven.com/defiantjazz/?where=local>

It tells the story, gives you example questions to put to your agent, and scores your accusation. Your agent investigates in the stack you just started; the game's commands and its Grafana Explore link point at `localhost`, so they use your own copy of the case. It expects the default ports (3000 for Grafana, 8000 for the MCP server). The game's first screen repeats the connect commands from this section.

## 4. Stop

From the `local/` folder:

```sh
docker compose down      # stops the stack and keeps the case loaded
docker compose down -v   # also wipes the case and Grafana's data (the next `up` loads it again)
```

## Good to know

- **A port is already taken?** You don't need to do anything: `./up.sh` notices, picks a free port (for example 3300 for Grafana or 8300 for the MCP server), saves it in `local/.env` (a hidden file, which also holds the administrator password if you want to change it before the first start), and prints the addresses to use. Use them wherever the commands and the game page show `3000` or `8000`. The login line in Route B already uses your port. To go back to the defaults, delete the `DJ_*_PORT` lines from `local/.env`. Loki, Prometheus and Tempo aren't published, so they can't clash with anything; the optional `docker-compose.expose.yml` in `local/` publishes them if you want to reach them from your own machine.
- **Watch your agent investigate.** Every query your agent runs through the MCP server or `gcx` is recorded as a trace in the same local Tempo, so you can open Grafana and see what it asked. Set `DJ_MCP_TRACES=` and `DJ_GRAFANA_TRACES=` (empty) in `local/.env` to switch that off.
- **Loki is slow to see old lines** for about a minute after the case is first loaded. If a query finds nothing in a fresh stack, wait and retry.

### Evidence board (MCP App)

The MCP server your agent connects to (`http://localhost:8000/mcp`) is two servers behind one address: the Grafana MCP server and the **evidence board**, a small MCP App server. One install gives your agent both, so there is nothing extra to add. The evidence board has two tools. `case_window` returns the incident night's window (from, to and case_run, in UTC), so your agent doesn't have to work out the date. `show_evidence_board` takes what your agent has found so far (timeline entries, clues, people and open questions) and draws it as an investigator's cork board in the chat, in two lanes: **From the telemetry** (what the agent found by querying the data) and **From your leads** (what you told the agent from the leads you opened in the game, which it can't see unless you say). Pin-up cards, red string from each person to what mentions them, click a clue to open it, click a person to light up their string. The board shows only what the agent passes in. The board has no access to Grafana or to the case, except the incident night's window (a read-only file the loader leaves behind), and it never shows a solution. Your agent calls `case_window` first if it has it; otherwise it finds the night itself.

- **How it fits together:** the `mcp-gateway` service is the only MCP server published on your machine. It lists the Grafana tools and the board's tools together, sends each call to the server that owns the tool and passes the Grafana MCP server's answers (and its own views) on unchanged. The Grafana MCP server (`mcp-grafana`) now runs inside the stack's network and publishes no port. If one of the two is down the other keeps working: the tool list just omits it and a call that needs it says so. The gateway's code is in `local/evidence-board/` (`gateway.mjs`).
- **Endpoint:** `http://localhost:8000/mcp` (streamable HTTP), reachable only from this machine. Port `8000`; if something else uses it, `./up.sh` picks a free one (saved as `DJ_MCP_PORT` in `local/.env`) and prints the address. The first `./up.sh` builds the gateway, which takes a minute.
- **Cursor** (2.6 or later, which supports [MCP Apps](https://cursor.com/changelog/2-6)): the game's "Add to Cursor" button installs this one server, so the board is there already. Or add it by hand in `.cursor/mcp.json`:

  ```json
  {"mcpServers": {"grafana-local": {"url": "http://localhost:8000/mcp"}}}
  ```

  Then ask your agent to "put what you've found on the evidence board". The board appears in the chat. Cursor 3.10.20 to 3.11.x had a bug that stopped MCP Apps from rendering; use 3.12 or later.
- **Claude Code and other agents:** the same server, for example `claude mcp add --scope user --transport http grafana-local http://localhost:8000/mcp`. Any client that supports MCP Apps renders the board the same way. A client that doesn't (a terminal chat, for one) just shows the same findings as text.
- **If you added the board separately before** (a second server called `defiantjazz-board` at `http://localhost:8001/mcp`), remove it from your agent's MCP settings: port 8001 is no longer published, and the board's tools now arrive through the one server. A leftover `DJ_BOARD_PORT` line in `local/.env` does nothing.
- **Agent instructions:** [`AGENTS.md`](AGENTS.md) tells your agent the tools exist, and the server sends a short version of the rules when the agent connects (Claude Code, Cursor and Codex use it; Claude Desktop does not). Call `case_window` first if you have it; otherwise find the night as `AGENTS.md` describes.
- **Tests:** `cd local/evidence-board && npm install && npm test`. See its [README](local/evidence-board/README.md) for the browser test harness.

### If a step fails

- **`docker compose up -d` says `address already in use`, or `port is already allocated`.** You started the stack without `./up.sh`, which does no port handling, and some of it didn't start. Run `./up.sh` in `local/`: it picks free ports and starts everything. Nothing else needs cleaning up.
- **A command prints nothing, or says it's waiting.** On a first start it can wait up to a few minutes for the loader, which fills the stack with the case. If it prints nothing, run `docker compose ps -a` until `loader` shows `Exited (0)`, then run the command again.
- **`claude mcp list` doesn't show `✔ Connected`.** Run `docker compose ps` and check that `mcp-grafana` is `Up`. If it isn't, run `./up.sh`. If you changed a port, add the server again with your port.
- **`gcx datasources list` fails or shows no rows.** Run the `gcx login` line from step 2 again, and check that Grafana opens at <http://localhost:3000>.

## What's in this repository

| Folder | What it holds |
|---|---|
| `local/` | The Docker Compose stack: Loki, Prometheus, Tempo, Grafana (with its data sources and a starting dashboard), the MCP server (the Grafana MCP server and the evidence board MCP App behind one gateway, `local/evidence-board/`) and the `gcx` token helper. `up.sh` starts it and picks free ports if the defaults are taken. |
| `telemetry/` | The case's evidence: door and badge events, chat, system logs, metrics and records. |
| `loader/` | The small loader that puts the telemetry into the stack. |
| `AGENTS.md`, `CLAUDE.md` | The instructions your AI agent starts from (`CLAUDE.md` points to `AGENTS.md`). Also `.cursorignore` and `.claude/settings.json`, which keep Cursor (`telemetry/`, `game/`, `loader/` and `local/`) and Claude Code (`telemetry/`, `game/` and `loader/`) from reading the raw evidence files. |
| `agent-kit/` | A copy of `AGENTS.md`. A test keeps the two the same. |
| `game/ai-evidence/` | The case file for pasting into a chatbot. |

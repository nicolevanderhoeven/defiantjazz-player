# The Defiant Jazz Incident: play it on your own machine

An observability murder mystery set on the Sleep Floor at Kipsake.

Kipsake rents your sleep: at night its Dreamers sleep in pods while their sleepwalking selves work the floor. During the Cocoa Hour, the floor's middle-of-the-night holiday party, the power goes out for five minutes. When it comes back, the night supervisor, Mr. Reginald Hale, is dead in the elevator. Kipsake recorded everything it could: badges, doors, chat, sleep rings, power, microphones, cameras, sleep bands and personnel records.

You work out who did it. The evidence is **telemetry** (logs, metrics and traces) loaded into a Grafana stack on your own machine, and you investigate it with your own AI agent. The story, the leads and the scoring are in the game's web page; this repository is the evidence and the stack that serves it.

This repository holds the stack and the case data, and nothing else: Loki, Prometheus, Tempo, Grafana and the Grafana MCP server, started together by Docker Compose, plus the telemetry and the loader that fills them. Nothing in it connects to Grafana Cloud, and it holds no story or solution. The game itself is at <https://nicolevanderhoeven.com/defiantjazz/>.

## Quickest start: Open in Codespaces

No Docker or `gcx` on your machine? Run everything in the cloud with a GitHub Codespace, a ready-made development machine in your browser.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/nicolevanderhoeven/defiantjazz-player)

1. Click the badge (or open <https://codespaces.new/nicolevanderhoeven/defiantjazz-player>), sign in to GitHub, and choose **Create codespace**. Keep the default 2-core machine.
2. Wait about three minutes. The Codespace starts the stack, loads the case and logs `gcx` in for you. A terminal opened before the case has loaded says so and prints the welcome note there as soon as it is ready. Type `dj-help` in the terminal any time to show the note again.
3. In that terminal, go to your agent's folder, which already holds its instructions: `cd ~/dj-agent`.
4. Install your own AI agent (see [Bring your own agent](#bring-your-own-agent) below), start it there. Either let it run `gcx` commands (already logged in), or add the Grafana MCP server first.
5. To see the evidence yourself, open the **Ports** tab in the Codespace and click the link beside **Grafana** (port 3000). Ports 3000 and 8000 are private to your account.

### Bring your own agent

The Codespace has no AI agent installed, so you choose which one to use and nobody's plan or allowance is used unless you decide it. The terminal's welcome note prints the same commands: run one agent's install line in the Codespace terminal, then start the agent in `~/dj-agent`. (Node.js is in the Codespace so the `npm` lines work.) You are responsible for any costs of using your own agent.

- **Claude Code** (needs a Claude subscription or API key). Install: `curl -fsSL https://claude.ai/install.sh | bash`. Add the MCP server with `claude mcp add --scope user --transport http grafana-local http://localhost:8000/mcp`, or let it run `gcx`. Docs: <https://code.claude.com/docs/en/setup>
- **Codex** (needs a ChatGPT plan or API key). Install: `npm install -g @openai/codex`. It can run `gcx` as is; for MCP, see its [docs](https://developers.openai.com/codex).
- **Copilot CLI** (needs a GitHub Copilot plan, including Free). Install: `npm install -g @github/copilot`. A Codespace has no keychain, so first let Copilot keep your login in its settings file: `mkdir -p ~/.copilot && echo '{"storeTokenPlaintext": true}' > ~/.copilot/settings.json`. Then run `cd ~/dj-agent && copilot`, type `/login` and follow the prompts. To use the Grafana MCP server, run `copilot mcp add --transport http grafana-local http://localhost:8000/mcp`; for `gcx`, nothing more. This path was tested in a Codespace on 2026-11-13. Docs: <https://docs.github.com/en/copilot/how-tos/copilot-cli>
- **Any other agent** that speaks MCP: add an HTTP (Streamable HTTP) server at `http://localhost:8000/mcp` in its MCP settings. Any agent that can run shell commands can use `gcx`, which is already logged in.

**Cost:** a Codespace is billed to your GitHub account. Personal accounts include 120 free core-hours a month (60 hours on the 2-core machine), and an investigation takes an hour or two. Accounts that belong to an organization may not have free hours. A stopped Codespace still uses storage, so delete it from <https://github.com/codespaces> when you've finished.

The rest of this page is the route on your own machine. The game's setup screen and its `localhost` links assume that route, so in a Codespace use the Ports tab link for Grafana.

## What you need

- **Docker with Compose** (Docker Desktop, or Docker Engine with the Compose plugin). Nothing else: no Python.
- **Git**, to clone this repository.
- **An AI agent** that can query Grafana, such as [Claude Code](https://docs.claude.com/en/docs/claude-code), Cursor or [Codex](https://github.com/openai/codex), with its own account or API key. Step 2 explains the two ways to connect it, the Grafana MCP server or [`gcx`](https://gra.fan/gcxrepo), and helps you pick. No agent? You can still paste [`game/ai-evidence/case-bundle.md`](game/ai-evidence/case-bundle.md) into any chatbot and ask it questions.

## 1. Clone it and start the stack

```sh
git clone https://github.com/nicolevanderhoeven/defiantjazz-player.git
cd defiantjazz-player/local
docker compose up -d
```

The first start pulls the images and builds a small loader, then loads the case: about two minutes. `docker compose ps -a` shows the `loader` as `Exited (0)` once the case is in.

Grafana, where the evidence lives, is at <http://localhost:3000>. Anyone on your machine can look around without signing in; sign in as `admin` / `admin` to change things. Every port is bound to `127.0.0.1`, so nothing is reachable from your network.

## 2. Connect your AI agent: pick ONE route

The evidence is in three Grafana data sources: Loki (logs), Prometheus (metrics) and Tempo (traces). Your agent needs a way to query them. Pick one:

- **Route A: the Grafana MCP server.** MCP (Model Context Protocol) is a standard way to give an AI agent tools. The stack already runs a read-only Grafana MCP server, and you add it to your agent once. Pick this if your agent supports MCP, as Claude Code, Cursor and Codex do.
- **Route B: `gcx`.** `gcx` is the command line for Grafana. Your agent runs `gcx` commands in your terminal to query the data sources. Pick this if your agent can run shell commands and you'd rather not use MCP.

Both routes end by starting your agent in a new empty folder, so it works from the telemetry and not from this repository's files. Make that folder first, from the `local/` folder you're in. It goes next to the repository folder and holds only your agent's instructions ([`agent-kit/AGENTS.md`](agent-kit/AGENTS.md)), saved as `CLAUDE.md`, the file Claude Code reads. Use `AGENTS.md` instead for Codex and many other agents:

```sh
mkdir -p ../../dj-agent
cp ../agent-kit/AGENTS.md ../../dj-agent/CLAUDE.md
```

The instructions tell your agent to use only the route you set up, and to run `gcx` with `--context dj-local` so it never reaches another Grafana you use.

Then follow one route's steps, running its commands from `local/` unless a step says otherwise.

**Route A: the Grafana MCP server**

1. Add the server to your agent. In Claude Code, run:

   ```sh
   claude mcp add --scope user --transport http grafana-local http://localhost:8000/mcp
   ```

   `--scope user` makes the server available from any folder, including your agent's folder. It needs no login or key. In another MCP agent, open its MCP settings and add an HTTP server (also called Streamable HTTP) at `http://localhost:8000/mcp`.

2. Check that the agent can reach the server. In Claude Code, run `claude mcp list`. Success is a line like `grafana-local: http://localhost:8000/mcp (HTTP) - ✔ Connected`. If it says it failed, refer to [If a step fails](#if-a-step-fails).

3. Print the time range of the incident night:

   ```sh
   docker compose logs --no-log-prefix gcx-token | grep 'The incident night'
   ```

   It prints a line like `The incident night (UTC): from 2026-11-11T20:30:00Z to 2026-11-12T04:00:00Z, case_run="2026-11-11".` Note the two times. The case happened in the past, so your agent needs them to search the right hours. If nothing prints, see the troubleshooting section below.

4. Start your agent in its folder:

   ```sh
   cd ../../dj-agent
   claude
   ```

   Use `codex` for Codex, or open the folder in Cursor. The first time, the agent may ask you to sign in. Then give it the two times from step 3, for example: `The incident night ran from <start> to <end>.` To check the connection, ask `Which data sources can you query?` It should name Loki, Prometheus and Tempo.

**Route B: `gcx`**

1. Check that `gcx` is installed by running `gcx --version`. If the command isn't found, install it. On macOS or Linux, run `brew install gcx`. For other systems or options, follow the install instructions in the [`gcx` repository](https://gra.fan/gcxrepo). Run `gcx --version` again to confirm.

2. Print the login line and the time range of the incident night:

   ```sh
   docker compose logs --no-log-prefix gcx-token
   ```

   It prints a line that starts `gcx login dj-local`, which contains a read-only token (a password that lets `gcx` read the data but not change it), and a line like `The incident night (UTC): from <start> to <end>, case_run="...".`, with two times. Note the times. The case happened in the past, so your agent needs them to search the right hours. The first run can take a minute while the stack finishes loading.

3. Run the whole `gcx login` line from step 2, then check that `gcx` can see the data sources:

   ```sh
   gcx datasources list
   ```

   Success is a table with three rows: `loki`, `prometheus` and `tempo`. If you get an error or an empty table, refer to [If a step fails](#if-a-step-fails). Logging in adds a `dj-local` entry to the `gcx` settings and switches to it. If you use `gcx` for other Grafana instances, switch back later with `gcx config use-context <your earlier name>`.

4. Start your agent in its folder:

   ```sh
   cd ../../dj-agent
   claude
   ```

   Use `codex` for Codex, or open the folder in Cursor. The first time, the agent may ask you to sign in. Then give it the two times from step 2, for example: `The incident night ran from <start> to <end>.` To check the connection, ask `Which data sources can you query?` It should name Loki, Prometheus and Tempo.

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

- **A port is already taken?** In `local/`, copy `.env.example` to `.env` (a hidden file) if you don't have one yet. In that one `.env` file, set a line for each port you want to change, for example `DJ_GRAFANA_PORT=3300` or `DJ_MCP_PORT=8300`. The same file also holds the administrator password, if you want to change it before the first start. Then run `docker compose up -d` again. Use your port wherever the commands and the game page show `3000` or `8000`. The login line in Route B already uses it.
- **Watch your agent investigate.** Every query your agent runs through the MCP server or `gcx` is recorded as a trace in the same local Tempo, so you can open Grafana and see what it asked. Set `DJ_MCP_TRACES=` and `DJ_GRAFANA_TRACES=` (empty) in `local/.env` to switch that off.
- **Loki is slow to see old lines** for about a minute after the case is first loaded. If a query finds nothing in a fresh stack, wait and retry.

### If a step fails

- **A command prints nothing, or says it's waiting.** On a first start it can wait up to a few minutes for the loader, which fills the stack with the case. If it prints nothing, run `docker compose ps -a` until `loader` shows `Exited (0)`, then run the command again.
- **`claude mcp list` doesn't show `✔ Connected`.** Run `docker compose ps` and check that `mcp-grafana` is `Up`. If it isn't, run `docker compose up -d`. If you changed a port, add the server again with your port.
- **`gcx datasources list` fails or shows no rows.** Run the `gcx login` line from step 2 again, and check that Grafana opens at <http://localhost:3000>.

## What's in this repository

| Folder | What it holds |
|---|---|
| `local/` | The Docker Compose stack: Loki, Prometheus, Tempo, Grafana (with its data sources and a starting dashboard), the Grafana MCP server and the `gcx` token helper. |
| `telemetry/` | The case's evidence: door and badge events, chat, system logs, metrics and records. |
| `loader/` | The small loader that puts the telemetry into the stack. |
| `agent-kit/` | The instructions your AI agent starts from. |
| `game/ai-evidence/` | The case file for pasting into a chatbot. |

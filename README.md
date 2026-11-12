# The Defiant Jazz Incident: play it on your own machine

An observability murder mystery set on the Sleep Floor at Kipsake.

Kipsake rents your sleep: at night its Dreamers sleep in pods while their sleepwalking selves work the floor. During the Cocoa Hour, the floor's middle-of-the-night holiday party, the power goes out for five minutes. When it comes back, the night supervisor, Mr. Reginald Hale, is dead in the elevator. Kipsake recorded everything it could: badges, doors, chat, sleep rings, power, microphones, cameras, sleep bands and personnel records.

You work out who did it. The evidence is **telemetry** (logs, metrics and traces) loaded into a Grafana stack on your own machine, and you investigate it with your own AI agent. The story, the leads and the scoring are in the game's web page; this repository is the evidence and the stack that serves it.

This repository holds the stack and the case data, and nothing else: Loki, Prometheus, Tempo, Grafana and the Grafana MCP server, started together by Docker Compose, plus the telemetry and the loader that fills them. Nothing in it connects to Grafana Cloud, and it holds no story or solution. The game itself is at <https://nicolevanderhoeven.com/defiantjazz/>.

## What you need

- **Docker with Compose** (Docker Desktop, or Docker Engine with the Compose plugin). Nothing else: no Python.
- **Git**, to clone this repository.
- **An AI agent** that can query Grafana, such as [Claude Code](https://docs.claude.com/en/docs/claude-code), Cursor or [Codex](https://github.com/openai/codex), with its own account or API key. It connects either through the Grafana MCP server (which the stack runs for you) or through [`gcx`](https://gra.fan/gcxrepo), Grafana's command line. No agent? You can still paste [`game/ai-evidence/case-bundle.md`](game/ai-evidence/case-bundle.md) into any chatbot and ask it questions.

## 1. Clone it and start the stack

```sh
git clone https://github.com/nicolevanderhoeven/defiantjazz-player.git
cd defiantjazz-player/local
docker compose up -d
```

The first start pulls the images and builds a small loader, then loads the case: about two minutes. `docker compose ps -a` shows the `loader` as `Exited (0)` once the case is in.

Grafana, where the evidence lives, is at <http://localhost:3000>. Anyone on your machine can look around without signing in; sign in as `admin` / `admin` to change things. Every port is bound to `127.0.0.1`, so nothing is reachable from your network.

## 2. Connect your AI agent: pick ONE route

Run one route's steps from the `local/` folder you're in. Each route gives your agent its instructions ([`agent-kit/AGENTS.md`](agent-kit/AGENTS.md)) in a new empty folder next to the repository. Save the file as `CLAUDE.md` for Claude Code, or `AGENTS.md` for Codex and many other agents.

**Route A: the Grafana MCP server** (Claude Code, Cursor, Codex and other agents that use MCP):

1. Add the server to your agent. In Claude Code, run:

   ```sh
   claude mcp add --scope user --transport http grafana-local http://localhost:8000/mcp
   ```

   In any other MCP agent, add an HTTP (streamable-http) server at `http://localhost:8000/mcp`.

2. Make an empty folder for your agent and give it its instructions, so it starts with only its own instructions. Use `AGENTS.md` instead of `CLAUDE.md` for Codex:

   ```sh
   mkdir ../../dj-agent
   cp ../agent-kit/AGENTS.md ../../dj-agent/CLAUDE.md
   ```

3. Print the time range of the incident night, which you'll give your agent so it searches the right hours. The case happened in the past, not now. From the `local/` folder, run:

   ```sh
   docker compose logs loader | grep 'Incident night'
   ```

4. Start your agent in that folder, then tell it the incident night's time range from step 3:

   ```sh
   cd ../../dj-agent
   claude
   ```

**Route B: `gcx`** (a command line, for an agent in a terminal):

1. Print your login and the night of the incident. From the `local/` folder, run the command below. It prints two things: a `gcx login` line with a read-only token, which you'll run in step 2, and the time range of the incident night, which you'll give your agent so it searches the right hours. The case happened in the past, not now.

   ```sh
   docker compose logs gcx-token
   ```

2. Log `gcx` in with the token from step 1, and check that it can see the data sources (`loki`, `prometheus` and `tempo`):

   ```sh
   gcx login dj-local --yes --server http://localhost:3000 --token <the token from step 1>
   gcx datasources list
   ```

3. Make an empty folder for your agent and give it its instructions, so it starts with only its own instructions. Use `AGENTS.md` instead of `CLAUDE.md` for Codex:

   ```sh
   mkdir ../../dj-agent
   cp ../agent-kit/AGENTS.md ../../dj-agent/CLAUDE.md
   ```

4. Start your agent in that folder, then tell it the incident night's time range from step 1:

   ```sh
   cd ../../dj-agent
   claude
   ```

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

- **A port is already taken?** Copy `local/.env.example` to `local/.env` and set `DJ_GRAFANA_PORT` or `DJ_MCP_PORT`. The game page and the commands above assume the defaults, so use your port wherever they show `3000` or `8000`. If you change the admin password in that file, do it before the first start.
- **Watch your agent investigate.** Every query your agent runs through the MCP server or `gcx` is recorded as a trace in the same local Tempo, so you can open Grafana and see what it asked. Set `DJ_MCP_TRACES=` and `DJ_GRAFANA_TRACES=` (empty) in `local/.env` to switch that off.
- **Loki is slow to see old lines** for about a minute after the case is first loaded. If a query finds nothing in a fresh stack, wait and retry.
- **The data's times are UTC.** The case is loaded with the incident on the most recent Thursday, so give your agent the incident night's time range (the commands above print it) rather than "the last 24 hours".

## What's in this repository

| Folder | What it holds |
|---|---|
| `local/` | The Docker Compose stack: Loki, Prometheus, Tempo, Grafana (with its data sources and a starting dashboard), the Grafana MCP server and the `gcx` token helper. |
| `telemetry/` | The case's evidence: door and badge events, chat, system logs, metrics and records. |
| `loader/` | The small loader that puts the telemetry into the stack, shifted so the incident falls on the latest Thursday. |
| `agent-kit/` | The instructions your AI agent starts from. |
| `game/ai-evidence/` | The case file for pasting into a chatbot. |

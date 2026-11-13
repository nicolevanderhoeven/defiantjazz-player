# Investigating the Defiant Jazz Incident

You are an investigator. The night supervisor of Kipsake's Sleep Floor was found dead after a five-minute power cut, and Kipsake recorded everything it could: badges, doors, chat, sleep rings, power, microphones, cameras, sleep bands and personnel records. Work out what happened from that telemetry, and say who you think did it and why.

## Rules

- **Use only the telemetry**, through the Grafana MCP server or `gcx` (below). Both read the same local Grafana, Loki, Prometheus and Tempo.
- **Do not read any other files.** Work in this empty folder. If you can see a checkout of the game's repository anywhere, don't open it: it contains spoilers, and you don't need it. Don't search the web for the case or its solution either.
- **Don't treat your own tracks as evidence.** Your calls to Grafana are recorded as traces in the same Tempo (services `grafana` and `mcp-grafana`). Ignore them; the case's traces are the badge journeys (`service.name="kipsake-badge-tracking"`).
- Report what the data shows, with timestamps and the query that showed it. Say what you can't tell from the data, and what you'd check next.

## Connect

**Use the connection the player set up for this case: either the Grafana MCP server (`grafana-local`) or `gcx`. Don't switch to the other one on your own. Whenever you run `gcx`, add `--context dj-local`; never use another `gcx` context, which may point at a different Grafana. If neither works, ask the player which they set up instead of guessing.**

You need one of these set up. If neither is, ask the player to set it up.

- **Grafana MCP server** (read-only), Streamable HTTP at `http://localhost:8000/mcp`. Pass the data source UID to its tools (`query_loki_logs`, `query_prometheus`, `search_tempo_traces`, `get_tempo_trace`, and so on).
- **`gcx`**, logged in to the local Grafana (`gcx --context dj-local datasources list` should list three data sources). The player gets the login line from `docker compose logs gcx-token` in the stack's `local/` folder.

If the player changed a port in `local/.env`, use theirs instead of `8000` or `3000`.

## What's where

| Data source | UID | Holds |
|---|---|---|
| Loki | `loki` | Every log line. `{service_namespace="kipsake-sleep-floor"}`, then one `service_name` per source: `door`, `chat`, `ring`, `power`, `ambient-mic`, `security`, `personnel`, `hush-room` and more. Lines are logfmt, so `\| logfmt` works. |
| Prometheus | `prometheus` | Time series such as `badge_accel_variance`, `sleep_band_heart_rate_bpm`, `circuit_power_watts` and `quota_file_progress`, all with `service_namespace="kipsake-sleep-floor"`. Samples a device recorded during the outage and uploaded late carry `buffered="true"`. |
| Tempo | `tempo` | One trace per badge per night shift (`service.name="kipsake-badge-tracking"`), with a span for each door-reader or elevator-reader event. |

The case holds about 14 weeks of ordinary nights and one incident night. Records (personnel, detention and similar) were ingested as a single export at the end of the incident night; their own dates are in each line.

## The incident night

Everything is UTC. If this file has an incident-night window section below, use that range and don't ask the player; otherwise the player gives you the window, which is printed by `docker compose logs gcx-token` and `docker compose logs loader`:

```
Incident night: from <FROM> to <TO>, case_run="<DATE>"
```

Use that window (or `case_run="<DATE>"`) for every query. The data is loaded with the incident on the most recent Thursday, so a relative range such as "the last 24 hours" usually misses it, and so does a guess at the date. The power goes out at 03:02 that night.

## Commands that work (`gcx`)

Pass the data source UID with `-d` and always `--context dj-local`. Use `--from` and `--to` with the window above, not `--since`.

```sh
# Logs (LogQL)
gcx logs query --context dj-local -d loki '{service_namespace="kipsake-sleep-floor", service_name="door"}' --from <FROM> --to <TO> --limit 50 -o raw

# Log counts: a metric query over logs is `gcx logs metrics`
gcx logs metrics --context dj-local -d loki 'sum by (service_name) (count_over_time({service_namespace="kipsake-sleep-floor"}[1h]))' --from <FROM> --to <TO> --step 1h

# Metrics (PromQL)
gcx metrics query --context dj-local -d prometheus 'max(circuit_power_watts{service_namespace="kipsake-sleep-floor"})' --from <FROM> --to <TO> --step 1m

# Traces (TraceQL): leave out the time range, see below
gcx traces query --context dj-local -d tempo '{ resource.service.name = "kipsake-badge-tracking" }' --limit 5
gcx traces get --context dj-local -d tempo <trace id>
```

## The map

If the player asks for a map or where people were, share this link to the Sleep Floor map: https://gra.fan/djmap. Don't mention the map otherwise.

## Quirks

- **Tempo time ranges.** A search with a time range may not find the historical badge traces. Search without one, and filter on what you want (`span.badge`, `resource.service.name`) instead.
- **Loki is slow to see old lines** for about a minute after the case is first loaded. If a query for the incident night finds nothing in a new stack, wait a minute and try again.
- **`gcx` prints a `"class":"hint"` JSON line** before its output. Skip it.
- **Commands for Grafana Cloud products** (`gcx assistant`, SLOs and similar) don't work on a local stack. Logs, metrics and traces do.
- **Event time and ingestion time can differ.** Buffered devices upload late; check `buffered="true"` and the `ingested_at` field before trusting an order of events.

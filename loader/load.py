#!/usr/bin/env python3
"""Load The Defiant Jazz Incident telemetry into Loki, Prometheus/Mimir and Tempo over OTLP.

The same loader works for Grafana Cloud (one OTLP gateway) and for the local
Docker stack in ../local (Loki, Prometheus and Tempo each expose OTLP).

Usage:
    python load.py --target cloud            # uses GRAFANA_OTLP_ENDPOINT etc. from the environment / .env
    python load.py --target local            # sends to the docker compose stack on localhost
    python load.py --target local --incident-date latest   # the incident falls on the latest Thursday
    python load.py --target local --dry-run  # build and validate every payload without sending

The raw files are dated around one canonical incident night: the Sleep Floor
works nights, and the blackout is at 03:02 on Thursday 2026-10-08. The loader
moves every timestamp by one offset, chosen by one of three modes:

- recent (default): the incident happened just before "now". Grafana Cloud
  rejects metrics more than ~2 hours old and log lines more than 7 days old,
  so use this there. Times of day move with the load time.
- --incident-date YYYY-MM-DD|latest (or env DJ_INCIDENT_DATE): the incident
  falls on that day. The offset is whole weeks, so times of day and weekdays
  stay the story's own. "latest" picks the most recent Thursday whose data has
  all happened. For the local stack, which accepts old data.
- --no-shift: keep the canonical dates (local stack only).

Timestamps inside log lines are shifted by the same amount, so the data stays
internally consistent. Every signal carries case_run=<incident date> as a
resource attribute, so two loads into one stack can be told apart.

Grafana Cloud Loki rejects log lines more than 7 days old and stores the rest,
but lines more than a few hours old only become queryable hours later, once
Loki flushes them to object storage. So the loader sends the last
--cloud-log-hours (default just under 7 days) of logs there and, when
GRAFANA_LOKI_URL etc. are set, checks afterwards that the recent lines arrived.

After a load it prints the incident night's absolute time window and links to
the example dashboard and Explore pinned to that window and case_run, so one
load stays playable for as long as the stack keeps the data (about 30 days in
Grafana Cloud). Set GRAFANA_URL to your stack's URL to get full links there.
"""
import argparse
import base64
import hashlib
import json
import math
import os
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from opentelemetry.proto.collector.logs.v1.logs_service_pb2 import ExportLogsServiceRequest
from opentelemetry.proto.collector.metrics.v1.metrics_service_pb2 import ExportMetricsServiceRequest
from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import ExportTraceServiceRequest
from opentelemetry.proto.common.v1.common_pb2 import AnyValue, InstrumentationScope, KeyValue
from opentelemetry.proto.logs.v1.logs_pb2 import LogRecord, ResourceLogs, ScopeLogs, SeverityNumber
from opentelemetry.proto.metrics.v1.metrics_pb2 import Gauge, Metric, NumberDataPoint, ResourceMetrics, ScopeMetrics
from opentelemetry.proto.resource.v1.resource_pb2 import Resource
from opentelemetry.proto.trace.v1.trace_pb2 import ResourceSpans, ScopeSpans, Span

# The moment the original data treats as "now": Floor Security has finished
# the scene and the interviews are under way.
REFERENCE = datetime(2026, 10, 8, 3, 50, 0, tzinfo=timezone.utc)
# When the lights go out; the printed shift reports where this lands.
INCIDENT_AT = datetime(2026, 10, 8, 3, 2, 0, tzinfo=timezone.utc)
# Records (personnel, detention, Hush Room, ...) are a database pull, not a
# stream; they are ingested as one export at this time, with their original
# dates kept in the line body.
RECORDS_EXPORT_AT = datetime(2026, 10, 8, 3, 40, 0, tzinfo=timezone.utc)
# The incident night as the dashboard shows it: from just before the night shift
# badges in (20:45) until Floor Security has finished the scene.
NIGHT_START = datetime(2026, 10, 7, 20, 30, 0, tzinfo=timezone.utc)
NIGHT_END = REFERENCE + timedelta(minutes=10)
NAMESPACE = "kipsake-sleep-floor"
# The incident date of this load, as a resource attribute on every signal.
CASE_RUN = INCIDENT_AT.date().isoformat()
SCOPE = InstrumentationScope(name="defiantjazz-loader", version="1.0")
ISO = re.compile(r"\b(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)\b")
# An ISO timestamp, or a bare date such as the records' "=== CALENDAR (2026-10-08) ===".
DATE_OR_ISO = re.compile(r"\b(\d{4}-\d\d-\d\d)(T\d\d:\d\d:\d\d)?\b")
THURSDAY = 3
LEVELS = {"debug": SeverityNumber.SEVERITY_NUMBER_DEBUG, "info": SeverityNumber.SEVERITY_NUMBER_INFO,
          "warn": SeverityNumber.SEVERITY_NUMBER_WARN, "error": SeverityNumber.SEVERITY_NUMBER_ERROR,
          "critical": SeverityNumber.SEVERITY_NUMBER_FATAL}
LOG_FILES = ["door-and-badge-events.log", "chat.log", "system.log", "ambient-mic.log", "records.log"]
# Grafana Cloud Loki rejects lines more than 7 days old (HTTP 400 "timestamp too
# old", reject_old_samples_max_age), so send just under that.
CLOUD_LOG_HOURS = 7 * 24 - 1.0
# Loki answers queries for the last few hours from its ingesters, so lines this
# recent are queryable at once. Older lines are stored too, but only show up a
# few hours later, after the ingesters flush them; the stored-count check
# counts only these recent ones.
CHECK_RECENT = timedelta(hours=2)


# ---------------------------------------------------------------- helpers
def tls_context():
    """Use certifi's CA bundle when available: python.org builds of Python on macOS
    ship without access to the system certificate store."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def parse_ts(s):
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)


def nanos(dt):
    return int(dt.timestamp()) * 1_000_000_000 + dt.microsecond * 1000


def kv(key, value):
    if isinstance(value, bool):
        return KeyValue(key=key, value=AnyValue(bool_value=value))
    if isinstance(value, int):
        return KeyValue(key=key, value=AnyValue(int_value=value))
    if isinstance(value, float):
        return KeyValue(key=key, value=AnyValue(double_value=value))
    return KeyValue(key=key, value=AnyValue(string_value=str(value)))


def fields(line):
    """Parse logfmt-style key=value (or key="quoted value") pairs."""
    return {m.group(1): m.group(3) if m.group(3) is not None else m.group(2)
            for m in re.finditer(r'(\w[\w.-]*)=(?:"([^"]*)"|([^\s"]+))', line)}


def load_env_file(path):
    if not path.exists():
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


# ---------------------------------------------------------------- reading
class Shifter:
    def __init__(self, delta):
        self.delta = delta

    def dt(self, dt):
        return dt + self.delta

    def text(self, s):
        if not self.delta:
            return s
        return DATE_OR_ISO.sub(self._sub, s)

    def _sub(self, m):
        if m.group(2):
            return (parse_ts(m.group(0)) + self.delta).strftime("%Y-%m-%dT%H:%M:%S")
        # a bare date moves with the middle of its day
        noon = datetime.fromisoformat(m.group(1)).replace(hour=12, tzinfo=timezone.utc)
        return (noon + self.delta).date().isoformat()


def journey_day(ts):
    """The night shift an (unshifted) event belongs to, named by the morning it ends.

    A shift runs from the evening to the next morning, so one journey crosses midnight."""
    return (ts + timedelta(hours=12)).date()


def journey_trace_id(badge, day):
    """Trace ID of a badge's journey on a given night shift (see journey_day); shared by logs and traces."""
    # include the namespace and case run so a second copy loaded into the same stack gets its own traces
    return hashlib.sha256(f"{NAMESPACE}:{CASE_RUN}:{badge}:{day}".encode()).digest()[:16]


def read_logs(data_dir, shift):
    """Yield (timestamp, source, level, body, trace_id) for every log line."""
    out = []
    export_seq = 0
    for name in LOG_FILES:
        for raw in (data_dir / name).read_text().splitlines():
            line = raw.rstrip()
            if not line or line.startswith("==="):
                continue
            f = fields(line)
            if name == "records.log":
                # one record pull; first word (after any date) names the record type
                parts = line.split()
                kind = parts[1] if ISO.fullmatch(parts[0]) else parts[0]
                kind = kind.split("=")[0]
                source = {"perk": "perks"}.get(kind, kind)
                ts = RECORDS_EXPORT_AT + timedelta(milliseconds=export_seq)
                export_seq += 1
            else:
                ts = parse_ts(line.split()[0])
                source = f.get("source", "unknown")
            trace_id = None
            if name == "door-and-badge-events.log" and f.get("badge"):
                trace_id = journey_trace_id(f["badge"], journey_day(ts))  # links the line to its badge-journey trace
            out.append((shift.dt(ts), source, f.get("level"), shift.text(line), trace_id))
    out.sort(key=lambda r: r[0])
    return out


def read_metrics(data_dir, shift):
    """Yield (timestamp, name, attributes, value)."""
    out = []
    with open(data_dir / "metrics.csv") as fh:
        next(fh)  # header: ts,metric,labels,value,ingested_at
        for line in fh:
            # labels may themselves contain commas (circuit=C-7,load=supply-room-b)
            parts = line.rstrip("\n").split(",")
            ts, name, value, ingested_at = parts[0], parts[1], parts[-2], parts[-1]
            attrs = dict(p.split("=", 1) for p in parts[2:-2] if "=" in p)
            if ingested_at:
                attrs["buffered"] = "true"  # recorded on-device during the outage, uploaded late
            out.append((shift.dt(parse_ts(ts)), name, attrs, float(value)))
    out.sort(key=lambda r: r[0])
    return out


def read_spans(data_dir, shift):
    """Build badge-journey traces: one trace per badge per night shift, one span per reader event.

    Journeys are grouped by the unshifted night shift, so a journey that crosses
    midnight, before or after the time shift, stays one trace."""
    journeys = defaultdict(list)
    for raw in (data_dir / "door-and-badge-events.log").read_text().splitlines():
        f = fields(raw)
        badge = f.get("badge")
        if not badge:
            continue  # reader_offline / reader_online announcements
        ts = parse_ts(raw.split()[0])
        journeys[(badge, journey_day(ts))].append((shift.dt(ts), f))
    spans = []
    for (badge, day), events in journeys.items():
        events.sort(key=lambda e: e[0])
        trace_id = journey_trace_id(badge, day)
        root_id = hashlib.sha256(f"root:{NAMESPACE}:{CASE_RUN}:{badge}:{day}".encode()).digest()[:8]
        start, end = events[0][0], events[-1][0] + timedelta(seconds=1)
        spans.append(Span(trace_id=trace_id, span_id=root_id, name="badge-journey",
                          kind=Span.SPAN_KIND_INTERNAL, start_time_unix_nano=nanos(start),
                          end_time_unix_nano=nanos(end),
                          attributes=[kv("badge", badge), kv("day", str(start.date()))]))
        for i, (ts, f) in enumerate(events):
            if f.get("source") == "trace":
                name, dur = f["span"], timedelta(milliseconds=int(f.get("dur_ms", "1000")))
            elif f.get("source") == "elevator-reader":
                name, dur = f"elevator-car {f.get('event', '')}".strip(), timedelta(seconds=1)
            else:
                name, dur = f"{f.get('reader', '?')} {f.get('dir', '')}".strip(), timedelta(milliseconds=500)
            attrs = [kv("badge", badge)] + [kv(k, shift.text(v)) for k, v in f.items() if k not in ("badge", "trace_id")]
            span_id = hashlib.sha256(f"{NAMESPACE}:{badge}:{ts.isoformat()}:{i}".encode()).digest()[:8]
            spans.append(Span(trace_id=trace_id, span_id=span_id, parent_span_id=root_id, name=name,
                              kind=Span.SPAN_KIND_INTERNAL, start_time_unix_nano=nanos(ts),
                              end_time_unix_nano=nanos(ts + dur), attributes=attrs))
    spans.sort(key=lambda s: s.start_time_unix_nano)
    return spans


# ---------------------------------------------------------------- payloads
def resource(service):
    return Resource(attributes=[kv("service.name", service), kv("service.namespace", NAMESPACE),
                                kv("case_run", CASE_RUN)])


def set_namespace(ns):
    global NAMESPACE
    NAMESPACE = ns


def set_case_run(day):
    global CASE_RUN
    CASE_RUN = day.isoformat()


# ---------------------------------------------------------------- time shift
def data_end(data_dir):
    """The latest event time in the raw files (records count at their export time)."""
    end = RECORDS_EXPORT_AT
    for name in LOG_FILES:
        if name == "records.log":
            continue
        for line in (data_dir / name).read_text().splitlines():
            if line and not line.startswith("==="):
                end = max(end, parse_ts(line.split()[0]))
    with open(data_dir / "metrics.csv") as fh:
        next(fh)
        for line in fh:
            end = max(end, parse_ts(line.split(",", 1)[0]))
    return end


def incident_day(value, now, end, any_weekday=False):
    """The day the incident falls on, for --incident-date YYYY-MM-DD|latest."""
    canonical = INCIDENT_AT.date()
    if value == "latest":
        weeks = (now - end) // timedelta(weeks=1)  # whole weeks after which all the data has happened
        return canonical + timedelta(weeks=weeks)
    try:
        day = date.fromisoformat(value)
    except ValueError:
        raise SystemExit(f"--incident-date: expected YYYY-MM-DD or 'latest', got {value!r}")
    if day.weekday() != THURSDAY and not any_weekday:
        raise SystemExit(f"--incident-date: {day} is a {day:%A}; the incident is at 03:02 on a Thursday, "
                         "so the weekdays and 'the night before' stay true. Pass --any-weekday to use it anyway.")
    return day


def choose_shift(args, now, data_dir):
    """Return (delta, incident day, description of the mode)."""
    incident_date = args.incident_date
    if incident_date is None and not (args.no_shift or args.incident_end):
        incident_date = os.environ.get("DJ_INCIDENT_DATE") or None
    if args.no_shift:
        return timedelta(0), INCIDENT_AT.date(), "no shift: the canonical dates"
    if incident_date:
        end = data_end(data_dir)
        day = incident_day(incident_date, now, end, args.any_weekday)
        delta = timedelta(days=(day - INCIDENT_AT.date()).days)
        if end + delta > now:
            print(f"Note: the data runs to {end + delta:%Y-%m-%dT%H:%M}Z, after now; "
                  "anything more than 5 minutes ahead is skipped.")
        return delta, day, f"incident date: the incident falls on {day:%A} {day}, times of day kept"
    anchor = parse_ts(args.incident_end.rstrip("Z")) if args.incident_end else now - timedelta(minutes=2)
    delta = anchor - REFERENCE
    return delta, (INCIDENT_AT + delta).date(), "recent: the incident happened just before the load, times of day move"


def logs_request(batch):
    by_source = defaultdict(list)
    for ts, source, level, body, trace_id in batch:
        rec = LogRecord(time_unix_nano=nanos(ts), observed_time_unix_nano=nanos(ts),
                        body=AnyValue(string_value=body))
        if trace_id:
            rec.trace_id = trace_id
        if level in LEVELS:
            rec.severity_number = LEVELS[level]
            rec.severity_text = level.upper()
        by_source[source].append(rec)
    return ExportLogsServiceRequest(resource_logs=[
        ResourceLogs(resource=resource(src), scope_logs=[ScopeLogs(scope=SCOPE, log_records=recs)])
        for src, recs in by_source.items()])


def metrics_request(batch):
    by_name = defaultdict(list)
    for ts, name, attrs, value in batch:
        by_name[name].append(NumberDataPoint(time_unix_nano=nanos(ts), as_double=value,
                                             attributes=[kv(k, v) for k, v in sorted(attrs.items())]))
    metrics = [Metric(name=n, gauge=Gauge(data_points=pts)) for n, pts in by_name.items()]
    return ExportMetricsServiceRequest(resource_metrics=[
        ResourceMetrics(resource=resource("kipsake-floor-telemetry"),
                        scope_metrics=[ScopeMetrics(scope=SCOPE, metrics=metrics)])])


def traces_request(batch):
    return ExportTraceServiceRequest(resource_spans=[
        ResourceSpans(resource=resource("kipsake-badge-tracking"),
                      scope_spans=[ScopeSpans(scope=SCOPE, spans=batch)])])


# ---------------------------------------------------------------- sending
class Sender:
    def __init__(self, urls, auth, dry_run):
        self.urls, self.auth, self.dry_run = urls, auth, dry_run
        self.tls = tls_context()

    def post(self, signal, message):
        payload = message.SerializeToString()
        if self.dry_run:
            type(message).FromString(payload)  # round-trip validates the encoding
            return True
        req = urllib.request.Request(self.urls[signal], data=payload, method="POST",
                                     headers={"Content-Type": "application/x-protobuf"})
        if self.auth:
            req.add_header("Authorization", "Basic " + base64.b64encode(self.auth.encode()).decode())
        for attempt in range(5):
            try:
                with urllib.request.urlopen(req, timeout=60, context=self.tls):
                    return True
            except urllib.error.HTTPError as e:
                body = e.read().decode(errors="replace")[:400]
                if e.code in (429, 500, 502, 503, 504) and attempt < 4:
                    time.sleep(2 ** attempt)
                    continue
                print(f"  ! {signal} HTTP {e.code}: {body}", file=sys.stderr)
                if "shutting down" in body:
                    print("    (A Loki that isn't really shutting down says this while the disk holding its write-ahead log "
                          "is over its fullness limit. Free some disk space, or in Docker Desktop's settings "
                          "give the VM a bigger disk.)", file=sys.stderr)
                return False
            except urllib.error.URLError as e:
                if attempt < 4:
                    time.sleep(2 ** attempt)
                    continue
                print(f"  ! {signal} connection failed: {e.reason}", file=sys.stderr)
                return False
        return False


def send(sender, signal, items, build, batch_size):
    ok = failed = 0
    for i in range(0, len(items), batch_size):
        chunk = items[i:i + batch_size]
        if sender.post(signal, build(chunk)):
            ok += len(chunk)
        else:
            failed += len(chunk)
    print(f"{signal}: sent {ok}" + (f", rejected {failed}" if failed else ""))
    return failed


# ---------------------------------------------------------------- checking
def cloud_log_hours(value):
    """The Cloud log window in hours, from --cloud-log-hours or DJ_CLOUD_LOG_HOURS."""
    if value is None:
        value = os.environ.get("DJ_CLOUD_LOG_HOURS") or CLOUD_LOG_HOURS
    try:
        hours = float(value)
    except ValueError:
        raise SystemExit(f"--cloud-log-hours / DJ_CLOUD_LOG_HOURS: expected a number of hours, got {value!r}")
    if not hours > 0:
        raise SystemExit(f"--cloud-log-hours / DJ_CLOUD_LOG_HOURS: must be more than 0, got {value!r}")
    return hours


def loki_reader():
    """(query URL, basic auth) for the Cloud Loki read API, or None when it isn't configured."""
    base = os.environ.get("GRAFANA_LOKI_URL", "").rstrip("/")
    user, token = os.environ.get("GRAFANA_LOKI_USER"), os.environ.get("GRAFANA_LOKI_READ_TOKEN")
    if not (base and user and token):
        return None
    return f"{base}/loki/api/v1/query", f"{user}:{token}"


def count_stored_logs(url, auth, oldest, newest):
    """How many log lines of this load (namespace and case_run) Loki holds between oldest and newest."""
    at = newest + timedelta(minutes=1)
    seconds = math.ceil((at - oldest).total_seconds()) + 60
    # the never-matching line filter makes each query new, so Loki's results cache
    # can't answer it with a count from before the load
    query = (f'sum(count_over_time({{service_namespace="{NAMESPACE}"}} | case_run="{CASE_RUN}" '
             f'!= "dj-check-{time.time_ns()}" [{seconds}s]))')
    req = urllib.request.Request(f"{url}?{urllib.parse.urlencode({'query': query, 'time': int(at.timestamp())})}",
                                 headers={"Authorization": "Basic " + base64.b64encode(auth.encode()).decode()})
    with urllib.request.urlopen(req, timeout=30, context=tls_context()) as resp:
        result = json.load(resp)["data"]["result"]
    return int(float(result[0]["value"][1])) if result else 0


def check_cloud_logs(sent, oldest, newest, attempts=6, wait=5):
    """Compare the recent log lines sent with what Grafana Cloud stored, and say so plainly if some are missing.

    Returns the stored count, or None when the check was skipped. Never fails the load."""
    reader = loki_reader()
    if reader is None:
        print("logs: stored-count check skipped: set GRAFANA_LOKI_URL, GRAFANA_LOKI_USER and "
              "GRAFANA_LOKI_READ_TOKEN (see loader/.env.example) to check what Grafana Cloud kept.")
        return None
    url, auth = reader
    stored = 0
    for attempt in range(attempts):  # ingestion takes a moment, so ask again while the count is short
        try:
            stored = count_stored_logs(url, auth, oldest, newest)
        except urllib.error.HTTPError as e:
            hint = " (the read token needs logs:read)" if e.code in (401, 403) else ""
            print(f"logs: stored-count check skipped: Loki query returned HTTP {e.code}{hint}.")
            return None
        except (urllib.error.URLError, OSError, ValueError, KeyError, IndexError) as e:
            print(f"logs: stored-count check skipped: Loki query failed ({getattr(e, 'reason', e)}).")
            return None
        if stored >= sent:
            print(f"logs: Grafana Cloud stored all {sent} lines from the last {CHECK_RECENT // timedelta(hours=1)} h. "
                  "Older lines become queryable a few hours after loading, once Loki flushes them.")
            return stored
        if attempt < attempts - 1:
            time.sleep(wait)
    print(f"logs: WARNING: sent {sent} log lines from the last {CHECK_RECENT // timedelta(hours=1)} h, "
          f"but Grafana Cloud shows only {stored}. Lines this recent should be queryable at once, so check "
          "the stack's Loki limits (ingestion rate, streams, line size) and query again in a few minutes.")
    return stored


# ---------------------------------------------------------------- local stack: readiness and "already loaded"
def local_bases(env=None):
    """Where the local stack's query and readiness APIs are: (loki, prometheus, tempo), without a trailing slash.
    LOCAL_LOKI_URL, LOCAL_PROMETHEUS_URL and LOCAL_TEMPO_URL, or the ones the OTLP addresses point at."""
    env = os.environ if env is None else env
    loki = env.get("LOCAL_LOKI_URL") or env.get("LOCAL_LOKI_OTLP", "http://localhost:3100/otlp/v1/logs").split("/otlp/")[0]
    prom = env.get("LOCAL_PROMETHEUS_URL") or env.get(
        "LOCAL_PROMETHEUS_OTLP", "http://localhost:9090/api/v1/otlp/v1/metrics").split("/api/v1/otlp")[0]
    tempo = env.get("LOCAL_TEMPO_URL")
    if not tempo:
        parts = urllib.parse.urlsplit(env.get("LOCAL_TEMPO_OTLP", "http://localhost:4318/v1/traces"))
        tempo = f"{parts.scheme}://{parts.hostname}:3200"
    return loki.rstrip("/"), prom.rstrip("/"), tempo.rstrip("/")


def http_get(url, timeout=10):
    """(status, body text) of a GET, or (0, reason) when it can't connect."""
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return resp.status, resp.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")
    except (urllib.error.URLError, OSError) as e:
        return 0, str(getattr(e, "reason", e))


def wait_until_ready(bases, seconds, sleep=time.sleep, clock=time.monotonic):
    """Wait up to `seconds` for Loki, Prometheus and Tempo to say they're ready. Returns the names still not ready."""
    paths = {"loki": "/ready", "prometheus": "/-/ready", "tempo": "/ready"}
    waiting = dict(zip(paths, bases))
    deadline = clock() + seconds
    while True:
        for name in list(waiting):
            status, _ = http_get(waiting[name] + paths[name])
            if status == 200:
                del waiting[name]
        if not waiting or clock() >= deadline:
            return sorted(waiting)
        sleep(2)


def loaded_signals(bases, namespace, now=None):
    """The signals the local stack already holds this case's data for, marked by the case_run attribute every
    load puts on every signal. A stack that can't be asked is treated as empty."""
    loki, prom, tempo = bases
    now = now or datetime.now(timezone.utc)
    found = set()
    start = int((now - timedelta(days=1500)).timestamp() * 1e9)
    query = urllib.parse.urlencode({"query": f'{{service_namespace="{namespace}"}} | case_run!=""', "limit": 1,
                                    "start": start, "end": int((now + timedelta(days=2)).timestamp() * 1e9)})
    status, body = http_get(f"{loki}/loki/api/v1/query_range?{query}")
    try:
        if status == 200 and json.loads(body)["data"]["result"]:
            found.add("logs")
    except (ValueError, KeyError, TypeError):
        pass
    query = urllib.parse.urlencode({"match[]": f'{{service_namespace="{namespace}"}}'})
    status, body = http_get(f"{prom}/api/v1/label/case_run/values?{query}")
    try:
        if status == 200 and json.loads(body)["data"]:
            found.add("metrics")
    except (ValueError, KeyError, TypeError):
        pass
    query = urllib.parse.urlencode({"q": f'{{ resource.service.namespace = "{namespace}" && resource.case_run != "" }}', "limit": 1})
    status, body = http_get(f"{tempo}/api/search?{query}")
    try:
        if status == 200 and json.loads(body).get("traces"):
            found.add("traces")
    except (ValueError, KeyError, TypeError):
        pass
    return found


# ---------------------------------------------------------------- links
DASHBOARD_PATH = "/d/defiantjazz-game/the-defiant-jazz-incident"  # web/dashboard-example.json


def pinned_links(base, loki_uid, start, end):
    """(dashboard, Explore) links pinned to this load's case_run and the absolute window start..end."""
    ms = {"from": str(int(start.timestamp() * 1000)), "to": str(int(end.timestamp() * 1000))}
    dashboard = f"{base}{DASHBOARD_PATH}?" + urllib.parse.urlencode({**ms, "timezone": "utc", "var-case_run": CASE_RUN})
    query = {"refId": "A", "datasource": {"type": "loki", "uid": loki_uid},
             "expr": f'{{service_namespace="{NAMESPACE}"}} | case_run="{CASE_RUN}"'}
    panes = {"dj": {"datasource": loki_uid, "queries": [query], "range": ms}}
    explore = f"{base}/explore?" + urllib.parse.urlencode(
        {"schemaVersion": 1, "orgId": 1, "panes": json.dumps(panes, separators=(",", ":"))})
    return dashboard, explore


def print_window(target, delta):
    """Say which absolute window and case_run this load's incident night is, with links pinned to them."""
    start, end = NIGHT_START + delta, NIGHT_END + delta
    print(f"Incident night: {start:%Y-%m-%dT%H:%M:%SZ} to {end:%Y-%m-%dT%H:%M:%SZ}, case_run={CASE_RUN}")
    base = os.environ.get("GRAFANA_URL", "").rstrip("/")
    if not base:
        base = "http://localhost:3000" if target == "local" else "https://<your-stack>.grafana.net"
    dashboard, explore = pinned_links(base, "loki" if target == "local" else "grafanacloud-logs", start, end)
    print(f"  dashboard: {dashboard}")
    print(f"  Explore:   {explore}")
    if target == "cloud" and not os.environ.get("GRAFANA_URL"):
        print("  (set GRAFANA_URL in loader/.env to your stack's URL to get these links ready to open)")


def window_record(target, delta, loaded_at):
    """What a load says about itself, for web/build.py --window: the incident night's absolute window and case_run."""
    start, end = NIGHT_START + delta, NIGHT_END + delta
    return {"case_run": CASE_RUN, "start": f"{start:%Y-%m-%dT%H:%M:%SZ}", "end": f"{end:%Y-%m-%dT%H:%M:%SZ}",
            "namespace": NAMESPACE, "target": target, "loaded_at": f"{loaded_at:%Y-%m-%dT%H:%M:%SZ}"}


def write_window_file(path, record):
    """Write the record as JSON, through a temporary file so a reader never sees half of it."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(record, indent=2) + "\n")
    tmp.replace(path)


# ---------------------------------------------------------------- main
def main():
    here = Path(__file__).resolve().parent
    load_env_file(here / ".env")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--target", choices=["cloud", "local"], required=True)
    ap.add_argument("--data", type=Path, default=here.parent / "telemetry")
    ap.add_argument("--signals", default="logs,metrics,traces")
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--incident-date", metavar="YYYY-MM-DD|latest",
                      help="move the data by whole weeks so the incident falls on this Thursday "
                           "(env DJ_INCIDENT_DATE); 'latest' = the most recent Thursday whose data has all happened")
    mode.add_argument("--no-shift", action="store_true", help="keep the original 2026-07..2026-10-08 timestamps")
    mode.add_argument("--incident-end", help="ISO time (UTC) that 2026-10-08T03:50:00 maps to; default: now")
    ap.add_argument("--any-weekday", action="store_true",
                    help="allow an --incident-date that isn't a Thursday (moves work onto weekends)")
    ap.add_argument("--dry-run", action="store_true", help="build and validate payloads without sending")
    ap.add_argument("--batch-size", type=int, default=2000)
    ap.add_argument("--cloud-log-hours", metavar="HOURS",
                    help=f"cloud only: send logs from the last HOURS (env DJ_CLOUD_LOG_HOURS; default {CLOUD_LOG_HOURS:g}); "
                         "Grafana Cloud rejects lines more than 7 days old")
    ap.add_argument("--wait", type=float, metavar="SECONDS", default=0,
                    help="local only: wait up to this long for Loki, Prometheus and Tempo to be ready before loading")
    ap.add_argument("--skip-if-loaded", action="store_true",
                    help="local only: leave out each signal the stack already holds this case's data for (case_run is set)")
    ap.add_argument("--window-file", metavar="FILE",
                    help="after a successful load (not a dry run), write the incident night's absolute window and case_run "
                         "to this JSON file, for web/build.py --window (env DJ_WINDOW_FILE)")
    ap.add_argument("--namespace", default=NAMESPACE,
                    help="service.namespace for every signal (use a new one to load a second copy into the same stack)")
    args = ap.parse_args()

    set_namespace(args.namespace)
    now = datetime.now(timezone.utc).replace(microsecond=0)
    delta, day, mode_text = choose_shift(args, now, args.data)
    set_case_run(day)
    shift = Shifter(delta)
    print(f"Mode: {mode_text}")
    print(f"Time shift: {delta}  (incident 2026-10-08T03:02:00Z -> "
          f"{(INCIDENT_AT + delta).isoformat()}), case_run={CASE_RUN}")

    if args.target == "cloud":
        base = os.environ.get("GRAFANA_OTLP_ENDPOINT", "").rstrip("/")
        user, token = os.environ.get("GRAFANA_INSTANCE_ID"), os.environ.get("GRAFANA_API_TOKEN")
        if not args.dry_run and not (base and user and token):
            sys.exit("Set GRAFANA_OTLP_ENDPOINT, GRAFANA_INSTANCE_ID and GRAFANA_API_TOKEN (see loader/.env.example).")
        urls = {s: f"{base}/v1/{s}" for s in ("logs", "metrics", "traces")}
        auth = f"{user}:{token}" if user and token else None
        # Grafana Cloud limits: metrics ~2h behind the newest sample, logs 7 days, traces 7 days.
        log_hours = cloud_log_hours(args.cloud_log_hours)
        max_age = {"metrics": timedelta(hours=2) - timedelta(minutes=5), "logs": timedelta(hours=log_hours),
                   "traces": timedelta(days=7) - timedelta(hours=1)}
    else:
        urls = {"logs": os.environ.get("LOCAL_LOKI_OTLP", "http://localhost:3100/otlp/v1/logs"),
                "metrics": os.environ.get("LOCAL_PROMETHEUS_OTLP", "http://localhost:9090/api/v1/otlp/v1/metrics"),
                "traces": os.environ.get("LOCAL_TEMPO_OTLP", "http://localhost:4318/v1/traces")}
        auth, max_age = None, {}

    sender = Sender(urls, auth, args.dry_run)
    wanted = [s.strip() for s in args.signals.split(",")]
    if (args.wait or args.skip_if_loaded) and args.target != "local":
        sys.exit("--wait and --skip-if-loaded are for --target local.")
    if args.wait and not args.dry_run:
        bases = local_bases()
        not_ready = wait_until_ready(bases, args.wait)
        if not_ready:
            sys.exit(f"Not ready after {args.wait:g} s: {', '.join(not_ready)}. Is the local stack running (docker compose up -d)?")
    if args.skip_if_loaded and not args.dry_run:
        have = loaded_signals(local_bases(), args.namespace)
        for signal in [w for w in wanted if w in have]:
            print(f"{signal}: already loaded (case_run is set), skipping")
        wanted = [w for w in wanted if w not in have]
        if not wanted:
            print("The case is already loaded. Nothing to do.")
            return
    future_limit = now + timedelta(minutes=5)
    readers = {"logs": (read_logs, logs_request, lambda r: r[0]),
               "metrics": (read_metrics, metrics_request, lambda r: r[0]),
               "traces": (read_spans, traces_request,
                          lambda s: datetime.fromtimestamp(s.start_time_unix_nano / 1e9, timezone.utc))}
    failures = 0
    for signal in ("logs", "metrics", "traces"):
        if signal not in wanted:
            continue
        reader, build, when = readers[signal]
        items = reader(args.data, shift)
        oldest = now - max_age[signal] if signal in max_age else None
        kept = [x for x in items if when(x) <= future_limit and (oldest is None or when(x) >= oldest)]
        if len(kept) < len(items):
            print(f"{signal}: skipping {len(items) - len(kept)} of {len(items)} items outside the target's time limits")
            if signal == "logs" and args.target == "cloud":
                print(f"logs: Grafana Cloud rejects log lines more than 7 days old, so only the last {log_hours:g} h "
                      "are sent (--cloud-log-hours or DJ_CLOUD_LOG_HOURS to change); the local stack takes the full history.")
        failed = send(sender, signal, kept, build, args.batch_size)
        failures += failed
        recent = [x for x in kept if x[0] >= now - CHECK_RECENT] if signal == "logs" else []
        if args.target == "cloud" and not args.dry_run and recent and not failed:
            check_cloud_logs(len(recent), recent[0][0], recent[-1][0])
    print_window(args.target, delta)
    window_file = args.window_file or os.environ.get("DJ_WINDOW_FILE")
    if window_file and not args.dry_run and not failures:
        write_window_file(window_file, window_record(args.target, delta, now))
        print(f"Wrote the window and case_run to {window_file}.")
    if args.dry_run:
        print("Dry run: all payloads built and validated; nothing was sent.")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()

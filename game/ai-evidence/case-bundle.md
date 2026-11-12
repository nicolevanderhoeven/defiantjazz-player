# Incident File SF-1008

KIPSAKE · SLEEP FLOOR · OFFICE OF FLOOR SECURITY

**Subject:** Death of Mr. Reginald Hale, Night Supervisor (awake staff)
**When:** the last night in these files

## Summary

The Cocoa Hour is the Sleep Floor's end-of-year holiday party, a quiet party with cocoa from the urn, in the middle of the night shift. It began at 03:00 in Break Room 2 and was attended by all three Deep Sleep Operations (DSO) clerks and Mr. Hale.

At approximately 03:02 the Sleep Floor lost main power. Power was restored at 03:07. At 03:07 Mr. Hale was found dead in the elevator car, which was held at the Sleep Floor. The doors were open.

Floor Security has named three persons of interest, all from DSO:

- **Agnes**
- **Bertram**
- **Clement**

## About the telemetry

- Most floor systems stopped reporting during the outage.
- Some devices record to a local buffer and uploaded their records after power was restored: employee badges, the elevator controller, ambient compliance microphones, break room seat sensors, sleep bands and the emergency speaker controller. These records carry both an event time (`ts`) and an ingestion time (`ingested_at`).
- Some buffered devices lost clock sync during the outage. Where that happened, the record says so.
- The investigator's interviews with the clerks are not part of this telemetry export.

## Files

| File | Contents |
|---|---|
| 02-badge-and-door-events.md | Door readers and badge journeys, the two weeks up to the incident |
| 03-chat.md | Floor chat, the two weeks up to the incident |
| 04-metrics.md | Selected time series (CSV) |
| 05-system-logs.md | Sleep rings, power, outlets, floor events, seat sensors, emergency speakers, elevator, cameras, security, medical |
| 06-ambient-mic-transcripts.md | Ambient-microphone transcripts, 03:02 to 03:10 (buffered during the outage, live after it) |
| 07-records.md | Personnel, detention, Hush Room notes, supervisor feedback, perks, keystroke drafts, calendar, Cocoa Hour seats and festive wear, procedure revisions |

## Task

Using only these files, determine who killed Mr. Hale.


---

# Badge and Door Events (2026-09-23 to 2026-10-08)

Door-reader events for the elevator lobby, the DSO office, break rooms, Supply Room B and the supervisor's office, plus incident-night trace spans. `elevator-reader` is the badge proximity reader inside the elevator car, which runs on the elevator UPS.

```text
2026-09-23T20:40:11 source=door reader=elevator-lobby badge=hale dir=in
2026-09-23T20:54:12 source=door reader=supervisor-office badge=hale dir=in
2026-09-23T21:00:26 source=door reader=elevator-lobby badge=agnes dir=in
2026-09-23T21:01:14 source=door reader=dso-office badge=agnes dir=in
2026-09-23T21:02:02 source=door reader=elevator-lobby badge=bertram dir=in
2026-09-23T21:02:28 source=door reader=dso-office badge=bertram dir=in
2026-09-23T21:03:27 source=door reader=elevator-lobby badge=clement dir=in
2026-09-23T21:04:24 source=door reader=dso-office badge=clement dir=in
2026-09-24T00:03:26 source=door reader=break-room-1 badge=bertram dir=in
2026-09-24T00:07:41 source=door reader=break-room-1 badge=clement dir=in
2026-09-24T00:23:13 source=door reader=break-room-1 badge=agnes dir=in
2026-09-24T05:00:41 source=door reader=elevator-lobby badge=agnes dir=out
2026-09-24T05:01:12 source=door reader=elevator-lobby badge=bertram dir=out
2026-09-24T05:05:42 source=door reader=elevator-lobby badge=clement dir=out
2026-09-24T20:43:49 source=door reader=elevator-lobby badge=hale dir=in
2026-09-24T20:51:21 source=door reader=supervisor-office badge=hale dir=in
2026-09-24T20:57:15 source=door reader=elevator-lobby badge=bertram dir=in
2026-09-24T20:58:09 source=door reader=dso-office badge=bertram dir=in
2026-09-24T20:58:47 source=door reader=elevator-lobby badge=agnes dir=in
2026-09-24T20:59:12 source=door reader=elevator-lobby badge=clement dir=in
2026-09-24T20:59:23 source=door reader=dso-office badge=agnes dir=in
2026-09-24T20:59:54 source=door reader=dso-office badge=clement dir=in
2026-09-24T22:26:31 source=door reader=supply-room-b badge=bertram dir=in
2026-09-24T23:31:24 source=door reader=supervisor-office badge=bertram dir=in
2026-09-25T00:02:46 source=door reader=break-room-1 badge=bertram dir=in
2026-09-25T00:07:20 source=door reader=break-room-1 badge=clement dir=in
2026-09-25T00:15:10 source=door reader=break-room-1 badge=agnes dir=in
2026-09-25T05:01:15 source=door reader=elevator-lobby badge=clement dir=out
2026-09-25T05:01:57 source=door reader=elevator-lobby badge=bertram dir=out
2026-09-25T05:04:08 source=door reader=elevator-lobby badge=agnes dir=out
2026-09-27T20:45:48 source=door reader=supervisor-office badge=hale dir=in
2026-09-27T20:46:06 source=door reader=elevator-lobby badge=hale dir=in
2026-09-27T20:58:33 source=door reader=elevator-lobby badge=bertram dir=in
2026-09-27T20:58:45 source=door reader=elevator-lobby badge=clement dir=in
2026-09-27T20:59:14 source=door reader=dso-office badge=bertram dir=in
2026-09-27T20:59:31 source=door reader=dso-office badge=clement dir=in
2026-09-27T21:03:55 source=door reader=elevator-lobby badge=agnes dir=in
2026-09-27T21:04:21 source=door reader=dso-office badge=agnes dir=in
2026-09-28T00:08:41 source=door reader=break-room-1 badge=bertram dir=in
2026-09-28T00:24:56 source=door reader=break-room-1 badge=clement dir=in
2026-09-28T00:29:57 source=door reader=break-room-1 badge=agnes dir=in
2026-09-28T01:39:51 source=door reader=supply-room-b badge=bertram dir=in
2026-09-28T02:25:47 source=door reader=supply-room-b badge=bertram dir=in
2026-09-28T05:03:32 source=door reader=elevator-lobby badge=clement dir=out
2026-09-28T05:03:50 source=door reader=elevator-lobby badge=agnes dir=out
2026-09-28T05:04:48 source=door reader=elevator-lobby badge=bertram dir=out
2026-09-28T20:41:55 source=door reader=elevator-lobby badge=hale dir=in
2026-09-28T20:46:44 source=door reader=supervisor-office badge=hale dir=in
2026-09-28T20:57:52 source=door reader=elevator-lobby badge=bertram dir=in
2026-09-28T20:58:43 source=door reader=dso-office badge=bertram dir=in
2026-09-28T20:59:56 source=door reader=elevator-lobby badge=clement dir=in
2026-09-28T21:00:15 source=door reader=elevator-lobby badge=agnes dir=in
2026-09-28T21:00:30 source=door reader=dso-office badge=clement dir=in
2026-09-28T21:00:44 source=door reader=dso-office badge=agnes dir=in
2026-09-29T00:18:56 source=door reader=break-room-1 badge=bertram dir=in
2026-09-29T00:20:25 source=door reader=break-room-1 badge=agnes dir=in
2026-09-29T00:36:42 source=door reader=break-room-1 badge=clement dir=in
2026-09-29T01:55:05 source=door reader=supply-room-b badge=bertram dir=in
2026-09-29T02:29:11 source=door reader=supply-room-b badge=bertram dir=in
2026-09-29T05:00:21 source=door reader=elevator-lobby badge=clement dir=out
2026-09-29T05:00:30 source=door reader=elevator-lobby badge=agnes dir=out
2026-09-29T05:04:11 source=door reader=elevator-lobby badge=bertram dir=out
2026-09-29T20:42:51 source=door reader=elevator-lobby badge=hale dir=in
2026-09-29T20:50:21 source=door reader=supervisor-office badge=hale dir=in
2026-09-29T20:56:27 source=door reader=elevator-lobby badge=bertram dir=in
2026-09-29T20:57:19 source=door reader=dso-office badge=bertram dir=in
2026-09-29T20:58:15 source=door reader=elevator-lobby badge=agnes dir=in
2026-09-29T20:58:37 source=door reader=dso-office badge=agnes dir=in
2026-09-29T20:58:57 source=door reader=elevator-lobby badge=clement dir=in
2026-09-29T20:59:32 source=door reader=dso-office badge=clement dir=in
2026-09-29T22:12:52 source=door reader=supply-room-b badge=bertram dir=in
2026-09-29T22:25:19 source=door reader=supply-room-b badge=clement dir=in
2026-09-30T00:05:49 source=door reader=break-room-1 badge=agnes dir=in
2026-09-30T00:10:44 source=door reader=break-room-1 badge=bertram dir=in
2026-09-30T00:25:31 source=door reader=supervisor-office badge=bertram dir=in
2026-09-30T00:35:26 source=door reader=break-room-1 badge=clement dir=in
2026-09-30T01:44:57 source=door reader=elevator-lobby badge=agnes dir=in
2026-09-30T05:01:13 source=door reader=elevator-lobby badge=agnes dir=out
2026-09-30T05:01:24 source=door reader=elevator-lobby badge=clement dir=out
2026-09-30T05:05:24 source=door reader=elevator-lobby badge=bertram dir=out
2026-09-30T20:40:51 source=door reader=elevator-lobby badge=hale dir=in
2026-09-30T20:50:50 source=door reader=supervisor-office badge=hale dir=in
2026-09-30T20:59:15 source=door reader=elevator-lobby badge=bertram dir=in
2026-09-30T20:59:42 source=door reader=elevator-lobby badge=clement dir=in
2026-09-30T20:59:48 source=door reader=dso-office badge=bertram dir=in
2026-09-30T21:00:36 source=door reader=dso-office badge=clement dir=in
2026-09-30T21:01:40 source=door reader=elevator-lobby badge=agnes dir=in
2026-09-30T21:02:35 source=door reader=dso-office badge=agnes dir=in
2026-09-30T23:45:17 source=door reader=supply-room-b badge=bertram dir=in
2026-10-01T00:09:37 source=door reader=break-room-1 badge=bertram dir=in
2026-10-01T00:09:47 source=door reader=break-room-1 badge=agnes dir=in
2026-10-01T00:12:03 source=door reader=elevator-lobby badge=agnes dir=in
2026-10-01T00:38:17 source=door reader=break-room-1 badge=clement dir=in
2026-10-01T02:29:58 source=door reader=elevator-lobby badge=agnes dir=in
2026-10-01T05:00:07 source=door reader=elevator-lobby badge=agnes dir=out
2026-10-01T05:02:15 source=door reader=elevator-lobby badge=clement dir=out
2026-10-01T05:02:49 source=door reader=elevator-lobby badge=bertram dir=out
2026-10-01T20:47:40 source=door reader=supervisor-office badge=hale dir=in
2026-10-01T20:48:08 source=door reader=elevator-lobby badge=hale dir=in
2026-10-01T20:57:15 source=door reader=elevator-lobby badge=agnes dir=in
2026-10-01T20:57:42 source=door reader=elevator-lobby badge=clement dir=in
2026-10-01T20:58:00 source=door reader=dso-office badge=agnes dir=in
2026-10-01T20:58:19 source=door reader=dso-office badge=clement dir=in
2026-10-01T20:59:48 source=door reader=elevator-lobby badge=bertram dir=in
2026-10-01T21:00:47 source=door reader=dso-office badge=bertram dir=in
2026-10-01T22:23:34 source=door reader=elevator-lobby badge=agnes dir=in
2026-10-02T00:16:06 source=door reader=break-room-1 badge=clement dir=in
2026-10-02T00:26:55 source=door reader=break-room-1 badge=agnes dir=in
2026-10-02T00:31:43 source=door reader=break-room-1 badge=bertram dir=in
2026-10-02T00:46:44 source=door reader=supply-room-b badge=bertram dir=in
2026-10-02T01:23:45 source=door reader=supply-room-b badge=bertram dir=in
2026-10-02T05:00:06 source=door reader=elevator-lobby badge=agnes dir=out
2026-10-02T05:00:49 source=door reader=elevator-lobby badge=bertram dir=out
2026-10-02T05:02:09 source=door reader=elevator-lobby badge=clement dir=out
2026-10-04T20:45:54 source=door reader=supervisor-office badge=hale dir=in
2026-10-04T20:45:56 source=door reader=elevator-lobby badge=hale dir=in
2026-10-04T21:00:27 source=door reader=elevator-lobby badge=agnes dir=in
2026-10-04T21:01:08 source=door reader=dso-office badge=agnes dir=in
2026-10-04T21:03:53 source=door reader=elevator-lobby badge=bertram dir=in
2026-10-04T21:04:00 source=door reader=elevator-lobby badge=clement dir=in
2026-10-04T21:04:22 source=door reader=dso-office badge=bertram dir=in
2026-10-04T21:04:26 source=door reader=dso-office badge=clement dir=in
2026-10-04T22:14:22 source=door reader=supply-room-b badge=agnes dir=in
2026-10-04T23:12:02 source=door reader=supervisor-office badge=bertram dir=in
2026-10-05T00:00:37 source=door reader=break-room-1 badge=agnes dir=in
2026-10-05T00:06:17 source=door reader=break-room-1 badge=bertram dir=in
2026-10-05T00:29:42 source=door reader=break-room-1 badge=clement dir=in
2026-10-05T00:36:48 source=door reader=elevator-lobby badge=agnes dir=in
2026-10-05T01:32:42 source=door reader=supply-room-b badge=bertram dir=in
2026-10-05T01:51:17 source=door reader=elevator-lobby badge=agnes dir=in
2026-10-05T05:00:03 source=door reader=elevator-lobby badge=bertram dir=out
2026-10-05T05:04:20 source=door reader=elevator-lobby badge=agnes dir=out
2026-10-05T05:05:07 source=door reader=elevator-lobby badge=clement dir=out
2026-10-05T20:41:49 source=door reader=elevator-lobby badge=hale dir=in
2026-10-05T20:51:54 source=door reader=supervisor-office badge=hale dir=in
2026-10-05T20:57:32 source=door reader=elevator-lobby badge=agnes dir=in
2026-10-05T20:58:03 source=door reader=dso-office badge=agnes dir=in
2026-10-05T20:58:06 source=door reader=elevator-lobby badge=clement dir=in
2026-10-05T20:58:19 source=door reader=elevator-lobby badge=bertram dir=in
2026-10-05T20:58:46 source=door reader=dso-office badge=clement dir=in
2026-10-05T20:59:17 source=door reader=dso-office badge=bertram dir=in
2026-10-05T21:47:51 source=door reader=supply-room-b badge=clement dir=in
2026-10-05T22:47:53 source=door reader=supply-room-b badge=bertram dir=in
2026-10-05T23:20:46 source=door reader=supervisor-office badge=bertram dir=in
2026-10-06T00:01:45 source=door reader=break-room-1 badge=clement dir=in
2026-10-06T00:18:44 source=door reader=break-room-1 badge=agnes dir=in
2026-10-06T00:26:07 source=door reader=break-room-1 badge=bertram dir=in
2026-10-06T00:44:04 source=door reader=elevator-lobby badge=agnes dir=in
2026-10-06T01:13:44 source=door reader=supply-room-b badge=clement dir=in
2026-10-06T05:02:55 source=door reader=elevator-lobby badge=agnes dir=out
2026-10-06T05:03:48 source=door reader=elevator-lobby badge=bertram dir=out
2026-10-06T05:04:44 source=door reader=elevator-lobby badge=clement dir=out
2026-10-06T20:48:08 source=door reader=supervisor-office badge=hale dir=in
2026-10-06T20:48:44 source=door reader=elevator-lobby badge=hale dir=in
2026-10-06T20:58:23 source=door reader=elevator-lobby badge=clement dir=in
2026-10-06T20:58:34 source=door reader=elevator-lobby badge=bertram dir=in
2026-10-06T20:58:56 source=door reader=dso-office badge=bertram dir=in
2026-10-06T20:59:01 source=door reader=dso-office badge=clement dir=in
2026-10-06T21:02:47 source=door reader=elevator-lobby badge=agnes dir=in
2026-10-06T21:03:10 source=door reader=dso-office badge=agnes dir=in
2026-10-06T22:03:22 source=door reader=supply-room-b badge=clement dir=in
2026-10-06T22:05:18 source=door reader=supply-room-b badge=bertram dir=in
2026-10-06T23:10:46 source=door reader=supply-room-b badge=bertram dir=in
2026-10-07T00:17:29 source=door reader=break-room-1 badge=clement dir=in
2026-10-07T00:34:13 source=door reader=break-room-1 badge=bertram dir=in
2026-10-07T00:35:02 source=door reader=break-room-1 badge=agnes dir=in
2026-10-07T01:41:09 source=door reader=supply-room-b badge=agnes dir=in
2026-10-07T02:24:32 source=door reader=elevator-lobby badge=agnes dir=in
2026-10-07T03:14:13 source=door reader=elevator-lobby badge=agnes dir=in
2026-10-07T05:01:10 source=door reader=elevator-lobby badge=clement dir=out
2026-10-07T05:02:16 source=door reader=elevator-lobby badge=bertram dir=out
2026-10-07T05:03:12 source=door reader=elevator-lobby badge=agnes dir=out
2026-10-07T20:41:02 source=door reader=elevator-lobby badge=hale dir=in
2026-10-07T20:48:35 source=door reader=supervisor-office badge=hale dir=in
2026-10-07T20:56:00 source=door reader=elevator-lobby badge=clement dir=in
2026-10-07T20:56:25 source=door reader=elevator-lobby badge=agnes dir=in
2026-10-07T20:56:26 source=door reader=dso-office badge=clement dir=in
2026-10-07T20:57:16 source=door reader=dso-office badge=agnes dir=in
2026-10-07T20:58:06 source=door reader=elevator-lobby badge=bertram dir=in
2026-10-07T20:58:58 source=door reader=dso-office badge=bertram dir=in
2026-10-07T21:14:40 source=door reader=supervisor-office badge=bertram dir=in
2026-10-07T21:31:02 source=door reader=supervisor-office badge=bertram dir=out
2026-10-07T21:38:28 source=door reader=supply-room-b badge=bertram dir=in
2026-10-07T23:46:17 source=door reader=supply-room-b badge=bertram dir=in
2026-10-08T00:00:43 source=door reader=break-room-1 badge=agnes dir=in
2026-10-08T00:01:13 source=door reader=break-room-1 badge=clement dir=in
2026-10-08T00:25:34 source=door reader=elevator-lobby badge=agnes dir=in
2026-10-08T00:35:34 source=door reader=break-room-1 badge=bertram dir=in
2026-10-08T02:59:20 source=door reader=break-room-2 badge=agnes dir=in
2026-10-08T02:59:24 source=door reader=break-room-2 badge=bertram dir=in
2026-10-08T02:59:31 source=door reader=break-room-2 badge=clement dir=in
2026-10-08T02:59:58 source=door reader=break-room-2 badge=hale dir=in
2026-10-08T03:01:12 source=door reader=break-room-2 badge=hale dir=out
2026-10-08T03:01:22 source=trace span=corridor-e badge=hale trace_id=7f3a91 dur_ms=6100
2026-10-08T03:01:28 source=door reader=elevator-lobby badge=hale dir=in
2026-10-08T03:01:30 source=elevator-reader badge=hale event=badge_in_car clock=ok
2026-10-08T03:01:40 source=door reader=break-room-2 badge=bertram dir=out
2026-10-08T03:01:45 source=door reader=supply-room-b badge=bertram dir=in
2026-10-08T03:02:00 source=door reader=* event=reader_offline reason=main_power_lost
2026-10-08T03:05:30 source=elevator-reader badge=agnes event=badge_in_car clock=LOST est_error_s=±120 ts_basis=uptime ingested_at=2026-10-08T03:07:41
2026-10-08T03:07:00 source=door reader=* event=reader_online
```


---

# Floor Chat (2026-09-23 to 2026-10-08)

Floor chat messages. Direct messages show `to=<badge>`; channel messages show `to=#channel`.

```text
2026-09-23T22:42:02 source=chat from=bertram to=#deep-sleep-operations msg="printer's jammed again. it's always jammed."
2026-09-24T00:26:44 source=chat from=hale to=bertram msg="Bertram, see me at 21:15."
2026-09-24T00:56:27 source=chat from=bertram to=clement msg="you're the worst"
2026-09-24T01:12:27 source=chat from=clement to=#deep-sleep-operations msg="4 minutes to break"
2026-09-24T01:17:29 source=chat from=agnes to=#deep-sleep-operations msg="the numbers in file 62 are fuzzy tonight"
2026-09-24T02:29:13 source=chat from=bertram to=#deep-sleep-operations msg="who keeps moving my pencil cup"
2026-09-24T03:11:52 source=chat from=agnes to=#deep-sleep-operations msg="who keeps moving my pencil cup"
2026-09-24T04:02:42 source=chat from=bertram to=#deep-sleep-operations msg="anyone have a spare eye mask"
2026-09-24T21:31:50 source=chat from=agnes to=#deep-sleep-operations msg="who drew the eagle on the whiteboard"
2026-09-24T21:51:31 source=chat from=bertram to=#deep-sleep-operations msg="who drew the eagle on the whiteboard"
2026-09-24T22:46:43 source=chat from=clement to=#deep-sleep-operations msg="rest well"
2026-09-25T00:01:15 source=chat from=clement to=#deep-sleep-operations msg="lunch?"
2026-09-25T00:34:58 source=chat from=agnes to=bertram msg="Bertram, nice work on 31"
2026-09-25T01:37:26 source=chat from=bertram to=agnes msg="ha. thanks."
2026-09-25T01:50:29 source=chat from=clement to=#deep-sleep-operations msg="I've been counting the same column for an hour"
2026-09-25T02:02:46 source=chat from=agnes to=#deep-sleep-operations msg="rest well"
2026-09-27T21:16:00 source=chat from=clement to=#deep-sleep-operations msg="my chair squeaks. it didn't used to squeak."
2026-09-27T22:20:48 source=chat from=agnes to=#deep-sleep-operations msg="who keeps moving my pencil cup"
2026-09-27T23:14:41 source=chat from=agnes to=#deep-sleep-operations msg="who drew the eagle on the whiteboard"
2026-09-28T02:45:07 source=chat from=bertram to=#deep-sleep-operations msg="who keeps moving my pencil cup"
2026-09-28T03:33:07 source=chat from=clement to=#deep-sleep-operations msg="the numbers in file 21 are fuzzy tonight"
2026-09-28T03:34:09 source=chat from=agnes to=#deep-sleep-operations msg="lunch?"
2026-09-28T22:17:49 source=chat from=bertram to=agnes msg="one day I'll get you back"
2026-09-28T22:51:27 source=chat from=bertram to=#deep-sleep-operations msg="is it cocoa day or is that next week"
2026-09-28T23:00:04 source=chat from=clement to=#deep-sleep-operations msg="lunch?"
2026-09-28T23:28:39 source=chat from=clement to=#deep-sleep-operations msg="is it cocoa day or is that next week"
2026-09-29T00:25:55 source=chat from=bertram to=#deep-sleep-operations msg="who drew the eagle on the whiteboard"
2026-09-29T02:52:58 source=chat from=agnes to=#deep-sleep-operations msg="lunch?"
2026-09-29T03:18:16 source=chat from=clement to=bertram msg="Bertram where did you go, you missed the pancake bar"
2026-09-29T03:53:51 source=chat from=clement to=#deep-sleep-operations msg="who drew the eagle on the whiteboard"
2026-09-29T21:48:25 source=chat from=clement to=#deep-sleep-operations msg="my chair squeaks. it didn't used to squeak."
2026-09-29T21:59:22 source=chat from=bertram to=#deep-sleep-operations msg="is it cocoa day or is that next week"
2026-09-30T01:03:46 source=chat from=clement to=#deep-sleep-operations msg="I've been counting the same column for an hour"
2026-09-30T01:32:32 source=chat from=agnes to=#deep-sleep-operations msg="Bertram, did you finish 51?"
2026-09-30T02:22:17 source=chat from=clement to=#deep-sleep-operations msg="who keeps moving my pencil cup"
2026-09-30T03:21:35 source=chat from=agnes to=bertram msg="Bertram, are you coming to lunch?"
2026-09-30T04:35:04 source=chat from=bertram to=#deep-sleep-operations msg="is it cocoa day or is that next week"
2026-09-30T22:31:43 source=chat from=clement to=bertram msg="Bertram you left your mug on my desk"
2026-10-01T00:42:08 source=chat from=bertram to=#deep-sleep-operations msg="almost at quota, keep going everyone"
2026-10-01T01:50:26 source=chat from=bertram to=#deep-sleep-operations msg="I've been counting the same column for an hour"
2026-10-01T02:27:38 source=chat from=bertram to=#deep-sleep-operations msg="who drew the eagle on the whiteboard"
2026-10-01T03:00:51 source=chat from=clement to=#deep-sleep-operations msg="is it cocoa day or is that next week"
2026-10-01T03:51:57 source=chat from=clement to=#deep-sleep-operations msg="4 minutes to break"
2026-10-01T04:10:24 source=chat from=agnes to=#deep-sleep-operations msg="who drew the eagle on the whiteboard"
2026-10-01T21:24:53 source=chat from=clement to=#deep-sleep-operations msg="the numbers in file 21 are fuzzy tonight"
2026-10-01T22:30:17 source=chat from=bertram to=#deep-sleep-operations msg="who keeps moving my pencil cup"
2026-10-01T23:12:55 source=chat from=agnes to=#deep-sleep-operations msg="lunch?"
2026-10-01T23:23:39 source=chat from=clement to=#deep-sleep-operations msg="the numbers in file 65 are fuzzy tonight"
2026-10-02T02:23:07 source=chat from=agnes to=bertram msg="Bertram, can you pass me the ruler"
2026-10-02T02:53:29 source=chat from=agnes to=#deep-sleep-operations msg="my chair squeaks. it didn't used to squeak."
2026-10-02T04:08:32 source=chat from=agnes to=#deep-sleep-operations msg="lunch?"
2026-10-04T21:18:00 source=chat from=agnes to=#deep-sleep-operations msg="who keeps moving my pencil cup"
2026-10-04T21:44:55 source=chat from=clement to=#deep-sleep-operations msg="my chair squeaks. it didn't used to squeak."
2026-10-04T22:00:06 source=chat from=clement to=#deep-sleep-operations msg="anyone have a spare eye mask"
2026-10-05T00:54:44 source=chat from=clement to=#deep-sleep-operations msg="anyone have a spare eye mask"
2026-10-05T02:03:52 source=chat from=agnes to=#deep-sleep-operations msg="is it cocoa day or is that next week"
2026-10-05T02:54:15 source=chat from=clement to=#deep-sleep-operations msg="almost at quota, keep going everyone"
2026-10-05T21:37:22 source=chat from=bertram to=#deep-sleep-operations msg="is it cocoa day or is that next week"
2026-10-05T23:48:24 source=chat from=bertram to=#deep-sleep-operations msg="who keeps moving my pencil cup"
2026-10-06T00:55:45 source=chat from=bertram to=agnes msg="shh"
2026-10-06T02:09:29 source=chat from=clement to=#deep-sleep-operations msg="Agnes, did you finish 97?"
2026-10-06T02:43:10 source=chat from=bertram to=#deep-sleep-operations msg="who keeps moving my pencil cup"
2026-10-06T02:52:45 source=chat from=bertram to=#deep-sleep-operations msg="the numbers in file 72 are fuzzy tonight"
2026-10-06T03:54:52 source=chat from=clement to=#deep-sleep-operations msg="I've been counting the same column for an hour"
2026-10-06T21:32:39 source=chat from=bertram to=#deep-sleep-operations msg="Clement, did you finish 31?"
2026-10-07T00:49:50 source=chat from=agnes to=#deep-sleep-operations msg="my chair squeaks. it didn't used to squeak."
2026-10-07T01:23:57 source=chat from=bertram to=#deep-sleep-operations msg="anyone have a spare eye mask"
2026-10-07T01:34:20 source=chat from=bertram to=agnes msg="one day I'll get you back"
2026-10-07T02:52:32 source=chat from=bertram to=#deep-sleep-operations msg="anyone have a spare eye mask"
2026-10-07T03:39:30 source=chat from=bertram to=#deep-sleep-operations msg="is it cocoa day or is that next week"
2026-10-07T04:03:28 source=chat from=clement to=#deep-sleep-operations msg="4 minutes to break"
2026-10-07T21:40:17 source=chat from=bertram to=#deep-sleep-operations msg="fyi Mr. H says he'll be stepping out during the Cocoa Hour tonight. something at the elevator"
2026-10-07T21:40:18 source=chat from=bertram to=#deep-sleep-operations msg="Clement, did you finish 6?"
2026-10-07T21:40:52 source=chat from=agnes to=#deep-sleep-operations msg="the elevator? why the elevator"
2026-10-07T21:41:30 source=chat from=bertram to=#deep-sleep-operations msg="dunno. ask him"
2026-10-07T21:42:05 source=chat from=agnes to=#deep-sleep-operations msg="never mind. it doesn't matter"
2026-10-07T22:45:26 source=chat from=bertram to=#deep-sleep-operations msg="the numbers in file 11 are fuzzy tonight"
2026-10-07T23:02:25 source=chat from=clement to=#deep-sleep-operations msg="my chair squeaks. it didn't used to squeak."
2026-10-08T00:19:54 source=chat from=agnes to=#deep-sleep-operations msg="who keeps moving my pencil cup"
2026-10-08T00:30:55 source=chat from=clement to=#deep-sleep-operations msg="Agnes, did you finish 48?"
2026-10-08T00:49:11 source=chat from=bertram to=#deep-sleep-operations msg="rest well"
2026-10-08T01:52:44 source=chat from=bertram to=#deep-sleep-operations msg="we're SO close. who's still open?"
2026-10-08T01:53:10 source=chat from=agnes to=#deep-sleep-operations msg="still going on mine"
2026-10-08T02:31:55 source=chat from=agnes to=#deep-sleep-operations msg="almost almost almost"
2026-10-08T02:58:13 source=chat from=clement to=#deep-sleep-operations msg="Done."
2026-10-08T02:58:20 source=chat from=agnes to=#deep-sleep-operations msg="DEFIANT JAZZ"
2026-10-08T03:00:02 source=chat from=hale to=#deep-sleep-operations msg="Congratulations, Deep Sleep Operations. Break Room 2. Sweet dreams, Dreamers."
```


---

# Selected Metrics (CSV)

Selected time series. A non-empty `ingested_at` means the sample was buffered on the device and uploaded late.

```csv
ts,metric,labels,value,ingested_at
2026-10-08T01:00:00,quota_file_progress,employee=agnes,0.88,
2026-10-08T01:00:00,quota_file_progress,employee=bertram,0.88,
2026-10-08T01:00:00,quota_file_progress,employee=clement,0.9,
2026-10-08T01:05:00,quota_file_progress,employee=agnes,0.885,
2026-10-08T01:05:00,quota_file_progress,employee=bertram,0.885,
2026-10-08T01:05:00,quota_file_progress,employee=clement,0.904,
2026-10-08T01:10:00,quota_file_progress,employee=agnes,0.89,
2026-10-08T01:10:00,quota_file_progress,employee=bertram,0.89,
2026-10-08T01:10:00,quota_file_progress,employee=clement,0.908,
2026-10-08T01:15:00,quota_file_progress,employee=agnes,0.895,
2026-10-08T01:15:00,quota_file_progress,employee=bertram,0.895,
2026-10-08T01:15:00,quota_file_progress,employee=clement,0.912,
2026-10-08T01:20:00,quota_file_progress,employee=agnes,0.9,
2026-10-08T01:20:00,quota_file_progress,employee=bertram,0.9,
2026-10-08T01:20:00,quota_file_progress,employee=clement,0.916,
2026-10-08T01:25:00,quota_file_progress,employee=agnes,0.905,
2026-10-08T01:25:00,quota_file_progress,employee=bertram,0.905,
2026-10-08T01:25:00,quota_file_progress,employee=clement,0.92,
2026-10-08T01:30:00,quota_file_progress,employee=agnes,0.91,
2026-10-08T01:30:00,quota_file_progress,employee=bertram,0.91,
2026-10-08T01:30:00,quota_file_progress,employee=clement,0.924,
2026-10-08T01:35:00,quota_file_progress,employee=agnes,0.915,
2026-10-08T01:35:00,quota_file_progress,employee=bertram,0.915,
2026-10-08T01:35:00,quota_file_progress,employee=clement,0.928,
2026-10-08T01:40:00,quota_file_progress,employee=agnes,0.92,
2026-10-08T01:40:00,quota_file_progress,employee=bertram,0.92,
2026-10-08T01:40:00,quota_file_progress,employee=clement,0.932,
2026-10-08T01:45:00,quota_file_progress,employee=agnes,0.925,
2026-10-08T01:45:00,quota_file_progress,employee=bertram,0.925,
2026-10-08T01:45:00,quota_file_progress,employee=clement,0.936,
2026-10-08T01:50:00,quota_file_progress,employee=agnes,0.93,
2026-10-08T01:50:00,quota_file_progress,employee=bertram,0.93,
2026-10-08T01:50:00,quota_file_progress,employee=clement,0.941,
2026-10-08T01:55:00,quota_file_progress,employee=agnes,0.935,
2026-10-08T01:55:00,quota_file_progress,employee=bertram,0.935,
2026-10-08T01:55:00,quota_file_progress,employee=clement,0.945,
2026-10-08T02:00:00,quota_file_progress,employee=agnes,0.94,
2026-10-08T02:00:00,quota_file_progress,employee=bertram,0.94,
2026-10-08T02:00:00,quota_file_progress,employee=clement,0.949,
2026-10-08T02:05:00,quota_file_progress,employee=agnes,0.945,
2026-10-08T02:05:00,quota_file_progress,employee=bertram,0.945,
2026-10-08T02:05:00,quota_file_progress,employee=clement,0.953,
2026-10-08T02:10:00,quota_file_progress,employee=agnes,0.95,
2026-10-08T02:10:00,quota_file_progress,employee=bertram,0.95,
2026-10-08T02:10:00,quota_file_progress,employee=clement,0.957,
2026-10-08T02:15:00,quota_file_progress,employee=agnes,0.955,
2026-10-08T02:15:00,quota_file_progress,employee=bertram,0.955,
2026-10-08T02:15:00,quota_file_progress,employee=clement,0.961,
2026-10-08T02:20:00,quota_file_progress,employee=agnes,0.96,
2026-10-08T02:20:00,quota_file_progress,employee=bertram,0.96,
2026-10-08T02:20:00,quota_file_progress,employee=clement,0.965,
2026-10-08T02:25:00,quota_file_progress,employee=agnes,0.965,
2026-10-08T02:25:00,quota_file_progress,employee=bertram,1.0,
2026-10-08T02:25:00,quota_file_progress,employee=clement,0.969,
2026-10-08T02:30:00,quota_file_progress,employee=agnes,0.97,
2026-10-08T02:30:00,quota_file_progress,employee=bertram,1.0,
2026-10-08T02:30:00,quota_file_progress,employee=clement,0.973,
2026-10-08T02:35:00,quota_file_progress,employee=agnes,0.975,
2026-10-08T02:35:00,quota_file_progress,employee=bertram,1.0,
2026-10-08T02:35:00,quota_file_progress,employee=clement,0.977,
2026-10-08T02:40:00,quota_file_progress,employee=agnes,0.98,
2026-10-08T02:40:00,quota_file_progress,employee=bertram,1.0,
2026-10-08T02:40:00,quota_file_progress,employee=clement,0.981,
2026-10-08T02:45:00,quota_file_progress,employee=agnes,0.985,
2026-10-08T02:45:00,quota_file_progress,employee=bertram,1.0,
2026-10-08T02:45:00,quota_file_progress,employee=clement,0.985,
2026-10-08T02:50:00,quota_file_progress,employee=agnes,1.0,
2026-10-08T02:50:00,quota_file_progress,employee=bertram,1.0,
2026-10-08T02:50:00,quota_file_progress,employee=clement,0.989,
2026-10-08T02:55:00,quota_file_progress,employee=agnes,1.0,
2026-10-08T02:55:00,quota_file_progress,employee=bertram,1.0,
2026-10-08T02:55:00,quota_file_progress,employee=clement,0.993,
2026-10-08T02:58:12,quota_file_progress,employee=clement,1.0,
2026-10-08T02:21:40,quota_file_progress,employee=bertram,1.0,
2026-10-08T02:46:05,quota_file_progress,employee=agnes,1.0,
2026-10-08T02:58:12,department_quota_ratio,dept=deep-sleep-operations,1.0,
2026-10-08T02:55:00,circuit_power_watts,circuit=C-7,load=supply-room-b,121,
2026-10-08T02:55:00,circuit_power_watts,circuit=C-7,load=break-room-2,145,
2026-10-08T02:55:10,circuit_power_watts,circuit=C-7,load=supply-room-b,115,
2026-10-08T02:55:10,circuit_power_watts,circuit=C-7,load=break-room-2,136,
2026-10-08T02:55:20,circuit_power_watts,circuit=C-7,load=supply-room-b,112,
2026-10-08T02:55:20,circuit_power_watts,circuit=C-7,load=break-room-2,142,
2026-10-08T02:55:30,circuit_power_watts,circuit=C-7,load=supply-room-b,108,
2026-10-08T02:55:30,circuit_power_watts,circuit=C-7,load=break-room-2,138,
2026-10-08T02:55:40,circuit_power_watts,circuit=C-7,load=supply-room-b,121,
2026-10-08T02:55:40,circuit_power_watts,circuit=C-7,load=break-room-2,138,
2026-10-08T02:55:50,circuit_power_watts,circuit=C-7,load=supply-room-b,123,
2026-10-08T02:55:50,circuit_power_watts,circuit=C-7,load=break-room-2,140,
2026-10-08T02:56:00,circuit_power_watts,circuit=C-7,load=supply-room-b,108,
2026-10-08T02:56:00,circuit_power_watts,circuit=C-7,load=break-room-2,139,
2026-10-08T02:56:10,circuit_power_watts,circuit=C-7,load=supply-room-b,116,
2026-10-08T02:56:10,circuit_power_watts,circuit=C-7,load=break-room-2,140,
2026-10-08T02:56:20,circuit_power_watts,circuit=C-7,load=supply-room-b,117,
2026-10-08T02:56:20,circuit_power_watts,circuit=C-7,load=break-room-2,141,
2026-10-08T02:56:30,circuit_power_watts,circuit=C-7,load=supply-room-b,118,
2026-10-08T02:56:30,circuit_power_watts,circuit=C-7,load=break-room-2,144,
2026-10-08T02:56:40,circuit_power_watts,circuit=C-7,load=supply-room-b,119,
2026-10-08T02:56:40,circuit_power_watts,circuit=C-7,load=break-room-2,144,
2026-10-08T02:56:50,circuit_power_watts,circuit=C-7,load=supply-room-b,109,
2026-10-08T02:56:50,circuit_power_watts,circuit=C-7,load=break-room-2,143,
2026-10-08T02:57:00,circuit_power_watts,circuit=C-7,load=supply-room-b,116,
2026-10-08T02:57:00,circuit_power_watts,circuit=C-7,load=break-room-2,139,
2026-10-08T02:57:10,circuit_power_watts,circuit=C-7,load=supply-room-b,108,
2026-10-08T02:57:10,circuit_power_watts,circuit=C-7,load=break-room-2,138,
2026-10-08T02:57:20,circuit_power_watts,circuit=C-7,load=supply-room-b,111,
2026-10-08T02:57:20,circuit_power_watts,circuit=C-7,load=break-room-2,144,
2026-10-08T02:57:30,circuit_power_watts,circuit=C-7,load=supply-room-b,110,
2026-10-08T02:57:30,circuit_power_watts,circuit=C-7,load=break-room-2,144,
2026-10-08T02:57:40,circuit_power_watts,circuit=C-7,load=supply-room-b,122,
2026-10-08T02:57:40,circuit_power_watts,circuit=C-7,load=break-room-2,138,
2026-10-08T02:57:50,circuit_power_watts,circuit=C-7,load=supply-room-b,121,
2026-10-08T02:57:50,circuit_power_watts,circuit=C-7,load=break-room-2,144,
2026-10-08T02:58:00,circuit_power_watts,circuit=C-7,load=supply-room-b,116,
2026-10-08T02:58:00,circuit_power_watts,circuit=C-7,load=break-room-2,145,
2026-10-08T02:58:10,circuit_power_watts,circuit=C-7,load=supply-room-b,119,
2026-10-08T02:58:10,circuit_power_watts,circuit=C-7,load=break-room-2,137,
2026-10-08T02:58:20,circuit_power_watts,circuit=C-7,load=supply-room-b,123,
2026-10-08T02:58:20,circuit_power_watts,circuit=C-7,load=break-room-2,138,
2026-10-08T02:58:30,circuit_power_watts,circuit=C-7,load=supply-room-b,123,
2026-10-08T02:58:30,circuit_power_watts,circuit=C-7,load=break-room-2,135,
2026-10-08T02:58:40,circuit_power_watts,circuit=C-7,load=supply-room-b,120,
2026-10-08T02:58:40,circuit_power_watts,circuit=C-7,load=break-room-2,136,
2026-10-08T02:58:50,circuit_power_watts,circuit=C-7,load=supply-room-b,122,
2026-10-08T02:58:50,circuit_power_watts,circuit=C-7,load=break-room-2,137,
2026-10-08T02:59:00,circuit_power_watts,circuit=C-7,load=supply-room-b,121,
2026-10-08T02:59:00,circuit_power_watts,circuit=C-7,load=break-room-2,136,
2026-10-08T02:59:10,circuit_power_watts,circuit=C-7,load=supply-room-b,112,
2026-10-08T02:59:10,circuit_power_watts,circuit=C-7,load=break-room-2,140,
2026-10-08T02:59:20,circuit_power_watts,circuit=C-7,load=supply-room-b,116,
2026-10-08T02:59:20,circuit_power_watts,circuit=C-7,load=break-room-2,137,
2026-10-08T02:59:30,circuit_power_watts,circuit=C-7,load=supply-room-b,119,
2026-10-08T02:59:30,circuit_power_watts,circuit=C-7,load=break-room-2,145,
2026-10-08T02:59:40,circuit_power_watts,circuit=C-7,load=supply-room-b,122,
2026-10-08T02:59:40,circuit_power_watts,circuit=C-7,load=break-room-2,144,
2026-10-08T02:59:50,circuit_power_watts,circuit=C-7,load=supply-room-b,110,
2026-10-08T02:59:50,circuit_power_watts,circuit=C-7,load=break-room-2,138,
2026-10-08T03:00:00,circuit_power_watts,circuit=C-7,load=supply-room-b,118,
2026-10-08T03:00:00,circuit_power_watts,circuit=C-7,load=break-room-2,2890,
2026-10-08T03:00:10,circuit_power_watts,circuit=C-7,load=supply-room-b,110,
2026-10-08T03:00:10,circuit_power_watts,circuit=C-7,load=break-room-2,2827,
2026-10-08T03:00:20,circuit_power_watts,circuit=C-7,load=supply-room-b,120,
2026-10-08T03:00:20,circuit_power_watts,circuit=C-7,load=break-room-2,2874,
2026-10-08T03:00:30,circuit_power_watts,circuit=C-7,load=supply-room-b,121,
2026-10-08T03:00:30,circuit_power_watts,circuit=C-7,load=break-room-2,2842,
2026-10-08T03:00:40,circuit_power_watts,circuit=C-7,load=supply-room-b,107,
2026-10-08T03:00:40,circuit_power_watts,circuit=C-7,load=break-room-2,2872,
2026-10-08T03:00:50,circuit_power_watts,circuit=C-7,load=supply-room-b,108,
2026-10-08T03:00:50,circuit_power_watts,circuit=C-7,load=break-room-2,2802,
2026-10-08T03:01:00,circuit_power_watts,circuit=C-7,load=supply-room-b,109,
2026-10-08T03:01:00,circuit_power_watts,circuit=C-7,load=break-room-2,2843,
2026-10-08T03:01:10,circuit_power_watts,circuit=C-7,load=supply-room-b,115,
2026-10-08T03:01:10,circuit_power_watts,circuit=C-7,load=break-room-2,2907,
2026-10-08T03:01:20,circuit_power_watts,circuit=C-7,load=supply-room-b,112,
2026-10-08T03:01:20,circuit_power_watts,circuit=C-7,load=break-room-2,2831,
2026-10-08T03:01:30,circuit_power_watts,circuit=C-7,load=supply-room-b,119,
2026-10-08T03:01:30,circuit_power_watts,circuit=C-7,load=break-room-2,2824,
2026-10-08T03:01:40,circuit_power_watts,circuit=C-7,load=supply-room-b,121,
2026-10-08T03:01:40,circuit_power_watts,circuit=C-7,load=break-room-2,2843,
2026-10-08T03:01:50,circuit_power_watts,circuit=C-7,load=supply-room-b,114,
2026-10-08T03:01:50,circuit_power_watts,circuit=C-7,load=break-room-2,2866,
2026-10-08T03:01:58,circuit_power_watts,circuit=C-7,load=supply-room-b,1518,
2026-10-08T03:01:59,circuit_power_watts,circuit=C-7,load=supply-room-b,1522,
2026-10-08T03:02:00,floor_power_up,floor=sleep,0,
2026-10-08T03:07:00,floor_power_up,floor=sleep,1,
2026-10-08T02:59:30,badge_accel_variance,employee=agnes,0.125,
2026-10-08T02:59:30,badge_accel_variance,employee=bertram,0.346,
2026-10-08T02:59:30,badge_accel_variance,employee=clement,0.115,
2026-10-08T02:59:40,badge_accel_variance,employee=agnes,0.161,
2026-10-08T02:59:40,badge_accel_variance,employee=bertram,0.099,
2026-10-08T02:59:40,badge_accel_variance,employee=clement,0.371,
2026-10-08T02:59:50,badge_accel_variance,employee=agnes,0.343,
2026-10-08T02:59:50,badge_accel_variance,employee=bertram,0.234,
2026-10-08T02:59:50,badge_accel_variance,employee=clement,0.155,
2026-10-08T03:00:00,badge_accel_variance,employee=agnes,0.522,
2026-10-08T03:00:00,badge_accel_variance,employee=bertram,0.644,
2026-10-08T03:00:00,badge_accel_variance,employee=clement,0.391,
2026-10-08T03:00:10,badge_accel_variance,employee=agnes,0.321,
2026-10-08T03:00:10,badge_accel_variance,employee=bertram,0.506,
2026-10-08T03:00:10,badge_accel_variance,employee=clement,0.671,
2026-10-08T03:00:20,badge_accel_variance,employee=agnes,0.342,
2026-10-08T03:00:20,badge_accel_variance,employee=bertram,0.419,
2026-10-08T03:00:20,badge_accel_variance,employee=clement,0.391,
2026-10-08T03:00:30,badge_accel_variance,employee=agnes,0.485,
2026-10-08T03:00:30,badge_accel_variance,employee=bertram,0.592,
2026-10-08T03:00:30,badge_accel_variance,employee=clement,0.463,
2026-10-08T03:00:40,badge_accel_variance,employee=agnes,0.311,
2026-10-08T03:00:40,badge_accel_variance,employee=bertram,0.445,
2026-10-08T03:00:40,badge_accel_variance,employee=clement,0.602,
2026-10-08T03:00:50,badge_accel_variance,employee=agnes,0.356,
2026-10-08T03:00:50,badge_accel_variance,employee=bertram,0.389,
2026-10-08T03:00:50,badge_accel_variance,employee=clement,0.656,
2026-10-08T03:01:00,badge_accel_variance,employee=agnes,0.541,
2026-10-08T03:01:00,badge_accel_variance,employee=bertram,0.322,
2026-10-08T03:01:00,badge_accel_variance,employee=clement,0.514,
2026-10-08T03:01:10,badge_accel_variance,employee=agnes,0.352,
2026-10-08T03:01:10,badge_accel_variance,employee=bertram,0.622,
2026-10-08T03:01:10,badge_accel_variance,employee=clement,0.384,
2026-10-08T03:01:20,badge_accel_variance,employee=agnes,0.484,
2026-10-08T03:01:20,badge_accel_variance,employee=bertram,0.569,
2026-10-08T03:01:20,badge_accel_variance,employee=clement,0.317,
2026-10-08T03:01:30,badge_accel_variance,employee=agnes,0.367,
2026-10-08T03:01:30,badge_accel_variance,employee=bertram,0.428,
2026-10-08T03:01:30,badge_accel_variance,employee=clement,0.384,
2026-10-08T03:01:40,badge_accel_variance,employee=agnes,0.417,
2026-10-08T03:01:40,badge_accel_variance,employee=bertram,0.411,
2026-10-08T03:01:40,badge_accel_variance,employee=clement,0.331,
2026-10-08T03:01:50,badge_accel_variance,employee=agnes,0.589,
2026-10-08T03:01:50,badge_accel_variance,employee=bertram,0.401,
2026-10-08T03:01:50,badge_accel_variance,employee=clement,0.32,
2026-10-08T03:02:00,badge_accel_variance,employee=agnes,2.446,2026-10-08T03:07:41
2026-10-08T03:02:00,badge_accel_variance,employee=bertram,2.534,2026-10-08T03:07:41
2026-10-08T03:02:00,badge_accel_variance,employee=clement,3.449,2026-10-08T03:07:41
2026-10-08T03:02:10,badge_accel_variance,employee=agnes,3.522,2026-10-08T03:07:41
2026-10-08T03:02:10,badge_accel_variance,employee=bertram,3.102,2026-10-08T03:07:41
2026-10-08T03:02:10,badge_accel_variance,employee=clement,2.484,2026-10-08T03:07:41
2026-10-08T03:02:20,badge_accel_variance,employee=agnes,3.035,2026-10-08T03:07:41
2026-10-08T03:02:20,badge_accel_variance,employee=bertram,1.949,2026-10-08T03:07:41
2026-10-08T03:02:20,badge_accel_variance,employee=clement,2.037,2026-10-08T03:07:41
2026-10-08T03:02:30,badge_accel_variance,employee=agnes,3.474,2026-10-08T03:07:41
2026-10-08T03:02:30,badge_accel_variance,employee=bertram,3.391,2026-10-08T03:07:41
2026-10-08T03:02:30,badge_accel_variance,employee=clement,2.407,2026-10-08T03:07:41
2026-10-08T03:02:40,badge_accel_variance,employee=agnes,2.5,2026-10-08T03:07:41
2026-10-08T03:02:40,badge_accel_variance,employee=bertram,3.033,2026-10-08T03:07:41
2026-10-08T03:02:40,badge_accel_variance,employee=clement,3.084,2026-10-08T03:07:41
2026-10-08T03:02:50,badge_accel_variance,employee=agnes,3.68,2026-10-08T03:07:41
2026-10-08T03:02:50,badge_accel_variance,employee=bertram,0.123,2026-10-08T03:07:41
2026-10-08T03:02:50,badge_accel_variance,employee=clement,2.803,2026-10-08T03:07:41
2026-10-08T03:03:00,badge_accel_variance,employee=agnes,1.365,2026-10-08T03:07:41
2026-10-08T03:03:00,badge_accel_variance,employee=bertram,0.127,2026-10-08T03:07:41
2026-10-08T03:03:00,badge_accel_variance,employee=clement,0.054,2026-10-08T03:07:41
2026-10-08T03:03:10,badge_accel_variance,employee=agnes,3.141,2026-10-08T03:07:41
2026-10-08T03:03:10,badge_accel_variance,employee=bertram,0.195,2026-10-08T03:07:41
2026-10-08T03:03:10,badge_accel_variance,employee=clement,0.106,2026-10-08T03:07:41
2026-10-08T03:03:20,badge_accel_variance,employee=agnes,1.633,2026-10-08T03:07:41
2026-10-08T03:03:20,badge_accel_variance,employee=bertram,0.065,2026-10-08T03:07:41
2026-10-08T03:03:20,badge_accel_variance,employee=clement,0.166,2026-10-08T03:07:41
2026-10-08T03:03:30,badge_accel_variance,employee=agnes,2.633,2026-10-08T03:07:41
2026-10-08T03:03:30,badge_accel_variance,employee=bertram,3.187,2026-10-08T03:07:41
2026-10-08T03:03:30,badge_accel_variance,employee=clement,0.227,2026-10-08T03:07:41
2026-10-08T03:03:40,badge_accel_variance,employee=agnes,1.209,2026-10-08T03:07:41
2026-10-08T03:03:40,badge_accel_variance,employee=bertram,0.229,2026-10-08T03:07:41
2026-10-08T03:03:40,badge_accel_variance,employee=clement,0.167,2026-10-08T03:07:41
2026-10-08T03:03:50,badge_accel_variance,employee=agnes,3.7,2026-10-08T03:07:41
2026-10-08T03:03:50,badge_accel_variance,employee=bertram,0.057,2026-10-08T03:07:41
2026-10-08T03:03:50,badge_accel_variance,employee=clement,0.183,2026-10-08T03:07:41
2026-10-08T03:04:00,badge_accel_variance,employee=agnes,0.996,2026-10-08T03:07:41
2026-10-08T03:04:00,badge_accel_variance,employee=bertram,0.083,2026-10-08T03:07:41
2026-10-08T03:04:00,badge_accel_variance,employee=clement,0.06,2026-10-08T03:07:41
2026-10-08T03:04:10,badge_accel_variance,employee=agnes,2.833,2026-10-08T03:07:41
2026-10-08T03:04:10,badge_accel_variance,employee=bertram,0.178,2026-10-08T03:07:41
2026-10-08T03:04:10,badge_accel_variance,employee=clement,0.132,2026-10-08T03:07:41
2026-10-08T03:04:20,badge_accel_variance,employee=agnes,1.273,2026-10-08T03:07:41
2026-10-08T03:04:20,badge_accel_variance,employee=bertram,0.229,2026-10-08T03:07:41
2026-10-08T03:04:20,badge_accel_variance,employee=clement,0.199,2026-10-08T03:07:41
2026-10-08T03:04:30,badge_accel_variance,employee=agnes,2.801,2026-10-08T03:07:41
2026-10-08T03:04:30,badge_accel_variance,employee=bertram,0.108,2026-10-08T03:07:41
2026-10-08T03:04:30,badge_accel_variance,employee=clement,0.234,2026-10-08T03:07:41
2026-10-08T03:04:40,badge_accel_variance,employee=agnes,3.505,2026-10-08T03:07:41
2026-10-08T03:04:40,badge_accel_variance,employee=bertram,0.056,2026-10-08T03:07:41
2026-10-08T03:04:40,badge_accel_variance,employee=clement,0.136,2026-10-08T03:07:41
2026-10-08T03:04:50,badge_accel_variance,employee=agnes,1.135,2026-10-08T03:07:41
2026-10-08T03:04:50,badge_accel_variance,employee=bertram,0.146,2026-10-08T03:07:41
2026-10-08T03:04:50,badge_accel_variance,employee=clement,0.083,2026-10-08T03:07:41
2026-10-08T03:05:00,badge_accel_variance,employee=agnes,3.295,2026-10-08T03:07:41
2026-10-08T03:05:00,badge_accel_variance,employee=bertram,0.116,2026-10-08T03:07:41
2026-10-08T03:05:00,badge_accel_variance,employee=clement,0.12,2026-10-08T03:07:41
2026-10-08T03:05:10,badge_accel_variance,employee=agnes,0.943,2026-10-08T03:07:41
2026-10-08T03:05:10,badge_accel_variance,employee=bertram,0.233,2026-10-08T03:07:41
2026-10-08T03:05:10,badge_accel_variance,employee=clement,0.147,2026-10-08T03:07:41
2026-10-08T03:05:20,badge_accel_variance,employee=agnes,1.657,2026-10-08T03:07:41
2026-10-08T03:05:20,badge_accel_variance,employee=bertram,0.118,2026-10-08T03:07:41
2026-10-08T03:05:20,badge_accel_variance,employee=clement,0.076,2026-10-08T03:07:41
2026-10-08T03:05:30,badge_accel_variance,employee=agnes,1.764,2026-10-08T03:07:41
2026-10-08T03:05:30,badge_accel_variance,employee=bertram,0.148,2026-10-08T03:07:41
2026-10-08T03:05:30,badge_accel_variance,employee=clement,0.071,2026-10-08T03:07:41
2026-10-08T03:05:40,badge_accel_variance,employee=agnes,2.1,2026-10-08T03:07:41
2026-10-08T03:05:40,badge_accel_variance,employee=bertram,0.227,2026-10-08T03:07:41
2026-10-08T03:05:40,badge_accel_variance,employee=clement,0.062,2026-10-08T03:07:41
2026-10-08T03:05:50,badge_accel_variance,employee=agnes,1.461,2026-10-08T03:07:41
2026-10-08T03:05:50,badge_accel_variance,employee=bertram,0.238,2026-10-08T03:07:41
2026-10-08T03:05:50,badge_accel_variance,employee=clement,0.553,2026-10-08T03:07:41
2026-10-08T03:06:00,badge_accel_variance,employee=agnes,1.516,2026-10-08T03:07:41
2026-10-08T03:06:00,badge_accel_variance,employee=bertram,0.143,2026-10-08T03:07:41
2026-10-08T03:06:00,badge_accel_variance,employee=clement,0.476,2026-10-08T03:07:41
2026-10-08T03:06:10,badge_accel_variance,employee=agnes,3.464,2026-10-08T03:07:41
2026-10-08T03:06:10,badge_accel_variance,employee=bertram,0.149,2026-10-08T03:07:41
2026-10-08T03:06:10,badge_accel_variance,employee=clement,0.661,2026-10-08T03:07:41
2026-10-08T03:06:20,badge_accel_variance,employee=agnes,2.062,2026-10-08T03:07:41
2026-10-08T03:06:20,badge_accel_variance,employee=bertram,0.07,2026-10-08T03:07:41
2026-10-08T03:06:20,badge_accel_variance,employee=clement,0.307,2026-10-08T03:07:41
2026-10-08T03:06:30,badge_accel_variance,employee=agnes,3.322,2026-10-08T03:07:41
2026-10-08T03:06:30,badge_accel_variance,employee=bertram,0.211,2026-10-08T03:07:41
2026-10-08T03:06:30,badge_accel_variance,employee=clement,0.479,2026-10-08T03:07:41
2026-10-08T03:06:40,badge_accel_variance,employee=agnes,2.139,2026-10-08T03:07:41
2026-10-08T03:06:40,badge_accel_variance,employee=bertram,0.162,2026-10-08T03:07:41
2026-10-08T03:06:40,badge_accel_variance,employee=clement,0.559,2026-10-08T03:07:41
2026-10-08T03:06:50,badge_accel_variance,employee=agnes,2.221,2026-10-08T03:07:41
2026-10-08T03:06:50,badge_accel_variance,employee=bertram,0.16,2026-10-08T03:07:41
2026-10-08T03:06:50,badge_accel_variance,employee=clement,0.335,2026-10-08T03:07:41
2026-10-08T03:07:00,badge_accel_variance,employee=agnes,0.331,
2026-10-08T03:07:00,badge_accel_variance,employee=bertram,0.105,
2026-10-08T03:07:00,badge_accel_variance,employee=clement,0.344,
2026-10-08T03:07:10,badge_accel_variance,employee=agnes,0.119,
2026-10-08T03:07:10,badge_accel_variance,employee=bertram,0.189,
2026-10-08T03:07:10,badge_accel_variance,employee=clement,0.774,
2026-10-08T03:07:20,badge_accel_variance,employee=agnes,0.177,
2026-10-08T03:07:20,badge_accel_variance,employee=bertram,0.055,
2026-10-08T03:07:20,badge_accel_variance,employee=clement,0.725,
2026-10-08T03:07:30,badge_accel_variance,employee=agnes,0.052,
2026-10-08T03:07:30,badge_accel_variance,employee=bertram,0.388,
2026-10-08T03:07:30,badge_accel_variance,employee=clement,0.769,
2026-10-08T03:07:40,badge_accel_variance,employee=agnes,0.124,
2026-10-08T03:07:40,badge_accel_variance,employee=bertram,0.312,
2026-10-08T03:07:40,badge_accel_variance,employee=clement,0.325,
2026-10-08T03:07:50,badge_accel_variance,employee=agnes,0.068,
2026-10-08T03:07:50,badge_accel_variance,employee=bertram,0.26,
2026-10-08T03:07:50,badge_accel_variance,employee=clement,0.521,
2026-10-08T03:08:00,badge_accel_variance,employee=agnes,0.345,
2026-10-08T03:08:00,badge_accel_variance,employee=bertram,0.376,
2026-10-08T03:08:00,badge_accel_variance,employee=clement,0.764,
2026-10-08T03:08:10,badge_accel_variance,employee=agnes,0.36,
2026-10-08T03:08:10,badge_accel_variance,employee=bertram,0.333,
2026-10-08T03:08:10,badge_accel_variance,employee=clement,0.665,
2026-10-08T03:08:20,badge_accel_variance,employee=agnes,0.143,
2026-10-08T03:08:20,badge_accel_variance,employee=bertram,0.251,
2026-10-08T03:08:20,badge_accel_variance,employee=clement,0.606,
2026-10-08T03:08:30,badge_accel_variance,employee=agnes,0.157,
2026-10-08T03:08:30,badge_accel_variance,employee=bertram,0.291,
2026-10-08T03:08:30,badge_accel_variance,employee=clement,0.681,
2026-10-08T03:08:40,badge_accel_variance,employee=agnes,0.317,
2026-10-08T03:08:40,badge_accel_variance,employee=bertram,0.202,
2026-10-08T03:08:40,badge_accel_variance,employee=clement,0.677,
2026-10-08T03:08:50,badge_accel_variance,employee=agnes,0.208,
2026-10-08T03:08:50,badge_accel_variance,employee=bertram,0.18,
2026-10-08T03:08:50,badge_accel_variance,employee=clement,0.586,
2026-10-08T03:09:00,badge_accel_variance,employee=agnes,0.169,
2026-10-08T03:09:00,badge_accel_variance,employee=bertram,0.076,
2026-10-08T03:09:00,badge_accel_variance,employee=clement,0.448,
2026-10-08T03:09:10,badge_accel_variance,employee=agnes,0.379,
2026-10-08T03:09:10,badge_accel_variance,employee=bertram,0.152,
2026-10-08T03:09:10,badge_accel_variance,employee=clement,0.373,
2026-10-08T03:09:20,badge_accel_variance,employee=agnes,0.229,
2026-10-08T03:09:20,badge_accel_variance,employee=bertram,0.258,
2026-10-08T03:09:20,badge_accel_variance,employee=clement,0.567,
2026-10-08T03:03:30,badge_accel_peak_g,employee=bertram,3.6,2026-10-08T03:07:41
2026-10-08T03:03:56,badge_accel_peak_g,employee=agnes,2.9,2026-10-08T03:07:41
2026-10-08T03:00:00,sleep_band_heart_rate_bpm,employee=hale,81,
2026-10-08T03:00:05,sleep_band_heart_rate_bpm,employee=hale,77,
2026-10-08T03:00:10,sleep_band_heart_rate_bpm,employee=hale,76,
2026-10-08T03:00:15,sleep_band_heart_rate_bpm,employee=hale,82,
2026-10-08T03:00:20,sleep_band_heart_rate_bpm,employee=hale,80,
2026-10-08T03:00:25,sleep_band_heart_rate_bpm,employee=hale,75,
2026-10-08T03:00:30,sleep_band_heart_rate_bpm,employee=hale,76,
2026-10-08T03:00:35,sleep_band_heart_rate_bpm,employee=hale,84,
2026-10-08T03:00:40,sleep_band_heart_rate_bpm,employee=hale,74,
2026-10-08T03:00:45,sleep_band_heart_rate_bpm,employee=hale,80,
2026-10-08T03:00:50,sleep_band_heart_rate_bpm,employee=hale,80,
2026-10-08T03:00:55,sleep_band_heart_rate_bpm,employee=hale,82,
2026-10-08T03:01:00,sleep_band_heart_rate_bpm,employee=hale,74,
2026-10-08T03:01:05,sleep_band_heart_rate_bpm,employee=hale,76,
2026-10-08T03:01:10,sleep_band_heart_rate_bpm,employee=hale,83,
2026-10-08T03:01:15,sleep_band_heart_rate_bpm,employee=hale,76,
2026-10-08T03:01:20,sleep_band_heart_rate_bpm,employee=hale,76,
2026-10-08T03:01:25,sleep_band_heart_rate_bpm,employee=hale,86,
2026-10-08T03:01:30,sleep_band_heart_rate_bpm,employee=hale,78,
2026-10-08T03:01:35,sleep_band_heart_rate_bpm,employee=hale,83,
2026-10-08T03:01:40,sleep_band_heart_rate_bpm,employee=hale,85,
2026-10-08T03:01:45,sleep_band_heart_rate_bpm,employee=hale,83,
2026-10-08T03:01:50,sleep_band_heart_rate_bpm,employee=hale,81,
2026-10-08T03:01:55,sleep_band_heart_rate_bpm,employee=hale,81,
2026-10-08T03:02:00,sleep_band_heart_rate_bpm,employee=hale,80,2026-10-08T03:07:41
2026-10-08T03:02:05,sleep_band_heart_rate_bpm,employee=hale,86,2026-10-08T03:07:41
2026-10-08T03:02:10,sleep_band_heart_rate_bpm,employee=hale,83,2026-10-08T03:07:41
2026-10-08T03:02:15,sleep_band_heart_rate_bpm,employee=hale,84,2026-10-08T03:07:41
2026-10-08T03:02:20,sleep_band_heart_rate_bpm,employee=hale,78,2026-10-08T03:07:41
2026-10-08T03:02:25,sleep_band_heart_rate_bpm,employee=hale,83,2026-10-08T03:07:41
2026-10-08T03:02:30,sleep_band_heart_rate_bpm,employee=hale,78,2026-10-08T03:07:41
2026-10-08T03:02:35,sleep_band_heart_rate_bpm,employee=hale,86,2026-10-08T03:07:41
2026-10-08T03:02:40,sleep_band_heart_rate_bpm,employee=hale,74,2026-10-08T03:07:41
2026-10-08T03:02:45,sleep_band_heart_rate_bpm,employee=hale,84,2026-10-08T03:07:41
2026-10-08T03:02:50,sleep_band_heart_rate_bpm,employee=hale,85,2026-10-08T03:07:41
2026-10-08T03:02:55,sleep_band_heart_rate_bpm,employee=hale,86,2026-10-08T03:07:41
2026-10-08T03:03:00,sleep_band_heart_rate_bpm,employee=hale,77,2026-10-08T03:07:41
2026-10-08T03:03:05,sleep_band_heart_rate_bpm,employee=hale,77,2026-10-08T03:07:41
2026-10-08T03:03:10,sleep_band_heart_rate_bpm,employee=hale,79,2026-10-08T03:07:41
2026-10-08T03:03:15,sleep_band_heart_rate_bpm,employee=hale,79,2026-10-08T03:07:41
2026-10-08T03:03:20,sleep_band_heart_rate_bpm,employee=hale,83,2026-10-08T03:07:41
2026-10-08T03:03:25,sleep_band_heart_rate_bpm,employee=hale,76,2026-10-08T03:07:41
2026-10-08T03:03:30,sleep_band_heart_rate_bpm,employee=hale,82,2026-10-08T03:07:41
2026-10-08T03:03:35,sleep_band_heart_rate_bpm,employee=hale,82,2026-10-08T03:07:41
2026-10-08T03:03:40,sleep_band_heart_rate_bpm,employee=hale,86,2026-10-08T03:07:41
2026-10-08T03:03:45,sleep_band_heart_rate_bpm,employee=hale,119,2026-10-08T03:07:41
2026-10-08T03:03:50,sleep_band_heart_rate_bpm,employee=hale,108,2026-10-08T03:07:41
2026-10-08T03:03:55,sleep_band_heart_rate_bpm,employee=hale,120,2026-10-08T03:07:41
2026-10-08T03:04:00,sleep_band_heart_rate_bpm,employee=hale,123,2026-10-08T03:07:41
2026-10-08T03:04:05,sleep_band_heart_rate_bpm,employee=hale,155,2026-10-08T03:07:41
2026-10-08T03:04:10,sleep_band_heart_rate_bpm,employee=hale,157,2026-10-08T03:07:41
2026-10-08T03:04:15,sleep_band_heart_rate_bpm,employee=hale,142,2026-10-08T03:07:41
2026-10-08T03:04:20,sleep_band_heart_rate_bpm,employee=hale,146,2026-10-08T03:07:41
2026-10-08T03:04:25,sleep_band_heart_rate_bpm,employee=hale,59,2026-10-08T03:07:41
2026-10-08T03:04:30,sleep_band_heart_rate_bpm,employee=hale,54,2026-10-08T03:07:41
2026-10-08T03:04:35,sleep_band_heart_rate_bpm,employee=hale,54,2026-10-08T03:07:41
2026-10-08T03:04:40,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:04:45,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:04:50,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:04:55,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:05:00,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:05:05,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:05:10,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:05:15,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:05:20,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:05:25,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:05:30,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:05:35,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:05:40,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:05:45,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:05:50,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:05:55,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:06:00,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:06:05,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:06:10,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:06:15,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:06:20,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:06:25,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:06:30,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:06:35,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:06:40,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:06:45,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:06:50,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:06:55,sleep_band_heart_rate_bpm,employee=hale,0,2026-10-08T03:07:41
2026-10-08T03:00:00,elevator_car_occupied,car=1,0,
2026-10-08T03:00:15,elevator_car_occupied,car=1,0,
2026-10-08T03:00:30,elevator_car_occupied,car=1,0,
2026-10-08T03:00:45,elevator_car_occupied,car=1,0,
2026-10-08T03:01:00,elevator_car_occupied,car=1,0,
2026-10-08T03:01:15,elevator_car_occupied,car=1,0,
2026-10-08T03:01:30,elevator_car_occupied,car=1,1,
2026-10-08T03:01:45,elevator_car_occupied,car=1,1,
2026-10-08T03:02:00,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:02:15,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:02:30,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:02:45,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:03:00,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:03:15,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:03:30,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:03:45,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:04:00,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:04:15,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:04:30,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:04:45,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:05:00,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:05:15,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:05:30,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:05:45,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:06:00,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:06:15,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:06:30,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-10-08T03:06:45,elevator_car_occupied,car=1,1,2026-10-08T03:07:41
2026-09-24T05:00:00,sleep_ring_lock_min,employee=agnes,0.861,
2026-09-24T05:00:00,sleep_ring_lock_min,employee=bertram,0.982,
2026-09-24T05:00:00,sleep_ring_lock_min,employee=clement,0.927,
2026-09-25T05:00:00,sleep_ring_lock_min,employee=agnes,0.863,
2026-09-25T05:00:00,sleep_ring_lock_min,employee=bertram,0.965,
2026-09-25T05:00:00,sleep_ring_lock_min,employee=clement,0.911,
2026-09-28T05:00:00,sleep_ring_lock_min,employee=agnes,0.858,
2026-09-28T05:00:00,sleep_ring_lock_min,employee=bertram,0.993,
2026-09-28T05:00:00,sleep_ring_lock_min,employee=clement,0.903,
2026-09-29T05:00:00,sleep_ring_lock_min,employee=agnes,0.905,
2026-09-29T05:00:00,sleep_ring_lock_min,employee=bertram,0.988,
2026-09-29T05:00:00,sleep_ring_lock_min,employee=clement,0.925,
2026-09-30T05:00:00,sleep_ring_lock_min,employee=agnes,0.873,
2026-09-30T05:00:00,sleep_ring_lock_min,employee=bertram,0.98,
2026-09-30T05:00:00,sleep_ring_lock_min,employee=clement,0.917,
2026-10-01T05:00:00,sleep_ring_lock_min,employee=agnes,0.902,
2026-10-01T05:00:00,sleep_ring_lock_min,employee=bertram,0.964,
2026-10-01T05:00:00,sleep_ring_lock_min,employee=clement,0.901,
2026-10-02T05:00:00,sleep_ring_lock_min,employee=agnes,0.865,
2026-10-02T05:00:00,sleep_ring_lock_min,employee=bertram,0.966,
2026-10-02T05:00:00,sleep_ring_lock_min,employee=clement,0.911,
2026-10-05T05:00:00,sleep_ring_lock_min,employee=agnes,0.839,
2026-10-05T05:00:00,sleep_ring_lock_min,employee=bertram,0.974,
2026-10-05T05:00:00,sleep_ring_lock_min,employee=clement,0.912,
2026-10-06T05:00:00,sleep_ring_lock_min,employee=agnes,0.875,
2026-10-06T05:00:00,sleep_ring_lock_min,employee=bertram,0.978,
2026-10-06T05:00:00,sleep_ring_lock_min,employee=clement,0.91,
2026-10-07T05:00:00,sleep_ring_lock_min,employee=agnes,0.884,
2026-10-07T05:00:00,sleep_ring_lock_min,employee=bertram,0.962,
2026-10-07T05:00:00,sleep_ring_lock_min,employee=clement,0.914,
2026-10-08T05:00:00,sleep_ring_lock_min,employee=agnes,0.856,
2026-10-08T05:00:00,sleep_ring_lock_min,employee=bertram,0.982,
2026-10-08T05:00:00,sleep_ring_lock_min,employee=clement,0.918,
```


---

# System Logs

Logs from the sleep rings, floor power, smart outlets, the floor events calendar, the Break Room 2 seat sensors, the emergency speaker controller, the elevator controller, camera analytics, Floor Security and the medical office. A non-empty `ingested_at` means the record was buffered and uploaded late.

```text
2026-09-24T00:36:55 source=ring employee=agnes level=info msg="ring lock nominal"
2026-09-24T02:53:20 source=ring employee=agnes level=warn msg="lock drift (0.08), self-corrected"
2026-09-24T03:28:01 source=ring employee=clement level=info msg="ring lock nominal"
2026-09-24T04:04:19 source=ring employee=agnes level=info msg="ring lock nominal"
2026-09-24T23:02:07 source=ring employee=clement level=info msg="ring lock nominal"
2026-09-24T23:21:05 source=ring employee=agnes level=info msg="ring lock nominal"
2026-09-25T00:38:40 source=ring employee=bertram level=warn msg="lock drift (0.02), self-corrected"
2026-09-25T04:07:45 source=ring employee=agnes level=info msg="ring lock nominal"
2026-09-27T23:06:50 source=ring employee=agnes level=info msg="ring lock nominal"
2026-09-28T00:21:31 source=ring employee=bertram level=info msg="ring lock nominal"
2026-09-28T01:23:39 source=ring employee=clement level=info msg="ring lock nominal"
2026-09-28T02:31:26 source=printer device=dso-printer-1 level=error msg="paper jam tray 2"
2026-09-28T22:04:24 source=ring employee=agnes level=info msg="ring lock nominal"
2026-09-29T00:40:33 source=ring employee=clement level=info msg="ring lock nominal"
2026-09-29T00:44:50 source=printer device=dso-printer-1 level=error msg="paper jam tray 2"
2026-09-29T02:22:25 source=ring employee=agnes level=info msg="ring lock nominal"
2026-09-29T02:26:04 source=ring employee=agnes level=warn msg="lock drift (0.12), self-corrected"
2026-09-30T00:05:27 source=ring employee=agnes level=info msg="ring lock nominal"
2026-09-30T02:49:27 source=ring employee=clement level=info msg="ring lock nominal"
2026-09-30T03:35:02 source=ring employee=clement level=warn msg="lock drift (0.08), self-corrected"
2026-09-30T04:46:59 source=ring employee=bertram level=info msg="ring lock nominal"
2026-09-30T21:43:02 source=ring employee=clement level=info msg="ring lock nominal"
2026-09-30T22:35:44 source=ring employee=bertram level=warn msg="lock drift (0.02), self-corrected"
2026-09-30T23:23:33 source=ring employee=clement level=info msg="ring lock nominal"
2026-10-01T04:57:21 source=ring employee=agnes level=info msg="ring lock nominal"
2026-10-01T22:39:19 source=ring employee=bertram level=info msg="ring lock nominal"
2026-10-01T22:58:13 source=ring employee=agnes level=info msg="ring lock nominal"
2026-10-01T23:23:19 source=ring employee=agnes level=warn msg="lock drift (0.07), self-corrected"
2026-10-02T00:54:55 source=ring employee=clement level=info msg="ring lock nominal"
2026-10-02T02:00:42 source=printer device=dso-printer-1 level=error msg="paper jam tray 2"
2026-10-04T21:57:20 source=ring employee=clement level=info msg="ring lock nominal"
2026-10-05T00:50:55 source=ring employee=bertram level=warn msg="lock drift (0.02), self-corrected"
2026-10-05T01:21:04 source=ring employee=clement level=info msg="ring lock nominal"
2026-10-05T02:20:43 source=ring employee=agnes level=warn msg="lock drift (0.09), self-corrected"
2026-10-05T02:55:57 source=ring employee=clement level=info msg="ring lock nominal"
2026-10-05T21:13:35 source=ring employee=bertram level=info msg="ring lock nominal"
2026-10-05T21:57:18 source=ring employee=clement level=warn msg="lock drift (0.06), self-corrected"
2026-10-06T01:05:58 source=ring employee=bertram level=info msg="ring lock nominal"
2026-10-06T03:59:53 source=ring employee=agnes level=info msg="ring lock nominal"
2026-10-06T22:16:54 source=ring employee=clement level=warn msg="lock drift (0.10), self-corrected"
2026-10-06T23:40:34 source=ring employee=agnes level=info msg="ring lock nominal"
2026-10-06T23:42:16 source=emergency-speakers level=warn msg="fail-safe calming track changed: 'Brahms' Lullaby' -> 'Defiant Jazz'" console=hush-room-audio session=agnes
2026-10-07T00:06:40 source=ring employee=agnes level=info msg="ring lock nominal"
2026-10-07T03:03:15 source=printer device=dso-printer-1 level=error msg="paper jam tray 2"
2026-10-07T03:28:49 source=ring employee=agnes level=info msg="ring lock nominal"
2026-10-07T21:28:47 source=ring employee=bertram level=info msg="ring lock nominal"
2026-10-07T23:06:35 source=ring employee=agnes level=warn msg="lock drift (0.10), self-corrected"
2026-10-07T23:29:03 source=ring employee=agnes level=info msg="ring lock nominal"
2026-10-08T02:20:20 source=ring employee=clement level=warn msg="lock drift (0.09), self-corrected"
2026-10-08T02:58:12 source=floor-events level=info msg="Holiday party tonight: the end-of-year Cocoa Hour" room=break-room-2
2026-10-08T02:59:41 source=seat-sensor room=break-room-2 seat=2 state=occupied
2026-10-08T02:59:47 source=seat-sensor room=break-room-2 seat=3 state=occupied
2026-10-08T02:59:56 source=seat-sensor room=break-room-2 seat=4 state=occupied
2026-10-08T03:00:00 source=floor-events level=info msg="Cocoa Hour started" room=break-room-2
2026-10-08T03:00:09 source=seat-sensor room=break-room-2 seat=1 state=occupied
2026-10-08T03:00:31 source=printer device=dso-printer-1 level=error msg="paper jam tray 2"
2026-10-08T03:00:52 source=seat-sensor room=break-room-2 seat=4 state=vacant
2026-10-08T03:00:58 source=seat-sensor room=break-room-2 seat=1 state=vacant
2026-10-08T03:01:27 source=seat-sensor room=break-room-2 seat=3 state=vacant
2026-10-08T03:01:30 source=elevator level=info msg="door open" car=1 floor=SF
2026-10-08T03:01:34 source=elevator level=info msg="door close" car=1 floor=SF
2026-10-08T03:01:36 source=elevator level=info msg="car held at floor, doors held open (supervisor key: hale)" car=1 floor=SF
2026-10-08T03:01:58 source=outlet outlet=SR-B-03 room=supply-room-b level=warn msg="unregistered appliance detected: resistive heating load ~1400W"
2026-10-08T03:02:00 source=power level=critical msg="floor main breaker trip: overload on circuit C-7 (break-room-2 cocoa urn and lights, supply-room-b)"
2026-10-08T03:02:00 source=power level=info msg="emergency bus engaged: elevator UPS, emergency speakers, Hush Room audio, ambient compliance mics, emergency lighting"
2026-10-08T03:02:00 source=camera level=warn msg="all cameras offline (mains)"
2026-10-08T03:02:00 source=emergency-speakers level=warn msg="mains lost: fail-safe engaged on all floor speakers. Playing calming track: 'Defiant Jazz'" power=emergency-bus ingested_at=2026-10-08T03:07:41
2026-10-08T03:02:00 source=ring employee=agnes level=critical msg="MUSIC DETECTED (not lullaby): sleepwalk released, wearer waking"
2026-10-08T03:02:00 source=ring employee=bertram level=critical msg="MUSIC DETECTED (not lullaby): sleepwalk released, wearer waking"
2026-10-08T03:02:00 source=ring employee=clement level=critical msg="MUSIC DETECTED (not lullaby): sleepwalk released, wearer waking"
2026-10-08T03:02:00 source=elevator level=warn msg="main power lost, UPS engaged, car held at SF" car=1 ingested_at=2026-10-08T03:07:41
2026-10-08T03:02:14 source=seat-sensor room=break-room-2 seat=2 state=vacant ingested_at=2026-10-08T03:07:41
2026-10-08T03:04:01 source=elevator level=warn msg="emergency phone off hook: auto-dial to Floor Security desk unanswered (desk on mains); call ended after 5s" car=1 ingested_at=2026-10-08T03:07:41
2026-10-08T03:06:50 source=seat-sensor room=break-room-2 seat=4 state=occupied ingested_at=2026-10-08T03:07:41
2026-10-08T03:07:00 source=power level=info msg="main power restored"
2026-10-08T03:07:00 source=emergency-speakers level=info msg="mains restored: fail-safe released, floor speakers silent"
2026-10-08T03:07:00 source=ring employee=agnes level=info msg="music stopped: sleepwalker re-engaged"
2026-10-08T03:07:00 source=ring employee=bertram level=info msg="music stopped: sleepwalker re-engaged"
2026-10-08T03:07:00 source=ring employee=clement level=info msg="music stopped: sleepwalker re-engaged"
2026-10-08T03:07:01 source=camera cam=elevator-car-1 level=info msg="analytics: person (badge agnes) kneeling beside prone person; holding elongated object (cable-like)"
2026-10-08T03:07:02 source=seat-sensor room=break-room-2 seat=4 state=vacant ingested_at=2026-10-08T03:07:41
2026-10-08T03:07:03 source=camera cam=break-room-2 level=info msg="analytics: person (badge clement) seated on floor near speaker"
2026-10-08T03:07:04 source=camera cam=corridor-e level=info msg="analytics: person (badge bertram) seated against wall, holding shoulder"
2026-10-08T03:07:05 source=camera cam=supply-room-b level=info msg="analytics: no persons; small appliance on shelf, steam"
2026-10-08T03:09:12 source=security msg="elevator lobby: car doors held open; one deceased (hale), one employee present (agnes)"
2026-10-08T03:12:30 source=security msg="cause of death consistent with ligature strangulation"
2026-10-08T03:13:05 source=security msg="weapon recovered: grey patch cable, 2m, standard Kipsake stock (kept in Supply Room B and in the DSO office cable drawer); recovered from agnes's hands"
2026-10-08T03:14:40 source=security msg="item recovered from hale's jacket: folded handwritten note. Text: 'If you are reading this, you are me. They are lying to you about this place. Don't trust them.' Handwriting matches agnes's form signatures."
2026-10-08T03:15:10 source=security msg="elevator emergency phone panel: cover loose; 3 further folded notes inside (same hand)"
2026-10-08T03:18:00 source=security msg="supply-room-b: unregistered waffle iron on shelf, plugged into SR-B-03. Confiscated."
2026-10-08T03:35:20 source=medical employee=bertram msg="contusion, right shoulder, consistent with blunt collision. Employee unaware of injury until examined."
2026-10-08T03:38:40 source=medical employee=agnes msg="abrasions on both palms consistent with gripping a cable; bruising on right wrist consistent with being gripped"
2026-10-08T03:53:13 source=ring employee=agnes level=info msg="ring lock nominal"
```


---

# Ambient Compliance Microphone Transcripts (03:02 to 03:10)

Kipsake ambient compliance microphones run on the emergency bus. They transcribe speech locally when it can be heard over background audio. There's no speaker identification. Records from the outage (03:02 to 03:07) were buffered and uploaded after power was restored. From 03:07 the mics are back on mains and transcribe live, with synced clocks. This export runs to 03:10.

```text
2026-10-08T03:01:10 source=ambient-mic zone=hush-room speaker=unknown confidence=0.77 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:01:39 source=ambient-mic zone=break-room-2 speaker=unknown confidence=0.81 clock=LOST est_error_s=±90 ts_basis=uptime text="Where am I? Where's my car?" ingested_at=2026-10-08T03:07:41
2026-10-08T03:01:40 source=ambient-mic zone=hush-room speaker=unknown confidence=0.61 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:01:49 source=ambient-mic zone=break-room-2 speaker=unknown confidence=0.54 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:02:01 source=ambient-mic zone=break-room-2 speaker=unknown confidence=0.87 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:02:01 source=ambient-mic zone=break-room-2 speaker=unknown confidence=0.81 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:02:11 source=ambient-mic zone=hush-room speaker=unknown confidence=0.82 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:02:12 source=ambient-mic zone=break-room-2 speaker=unknown confidence=0.56 clock=LOST est_error_s=±90 ts_basis=uptime text="Hello? HELLO?" ingested_at=2026-10-08T03:07:41
2026-10-08T03:02:13 source=ambient-mic zone=break-room-2 speaker=unknown confidence=0.36 clock=LOST est_error_s=±90 ts_basis=uptime text="Is this a hospital?" ingested_at=2026-10-08T03:07:41
2026-10-08T03:02:22 source=ambient-mic zone=break-room-2 speaker=unknown confidence=0.70 clock=LOST est_error_s=±90 ts_basis=uptime text="[crying]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:02:24 source=ambient-mic zone=break-room-2 speaker=unknown confidence=0.45 clock=LOST est_error_s=±90 ts_basis=uptime text="This is a dream. This is a dream." ingested_at=2026-10-08T03:07:41
2026-10-08T03:02:27 source=ambient-mic zone=break-room-2 speaker=unknown confidence=0.45 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:02:36 source=ambient-mic zone=dso-office speaker=unknown confidence=0.83 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:02:42 source=ambient-mic zone=elevator-lobby speaker=unknown confidence=0.81 clock=LOST est_error_s=±90 ts_basis=uptime text="[two voices] You can't be here. / Don't touch me! Let go! My name is Peggy!" ingested_at=2026-10-08T03:07:41
2026-10-08T03:02:50 source=ambient-mic zone=dso-office speaker=unknown confidence=0.54 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:03:09 source=ambient-mic zone=hush-room speaker=unknown confidence=0.65 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:03:10 source=ambient-mic zone=corridor-e speaker=unknown confidence=0.35 clock=LOST est_error_s=±90 ts_basis=uptime text="Okay. Okay okay okay." ingested_at=2026-10-08T03:07:41
2026-10-08T03:03:11 source=ambient-mic zone=corridor-e speaker=unknown confidence=0.65 clock=LOST est_error_s=±90 ts_basis=uptime text="This is a dream. This is a dream." ingested_at=2026-10-08T03:07:41
2026-10-08T03:03:21 source=ambient-mic zone=corridor-e speaker=unknown confidence=0.49 clock=LOST est_error_s=±90 ts_basis=uptime text="Is anyone there" ingested_at=2026-10-08T03:07:41
2026-10-08T03:03:22 source=ambient-mic zone=hush-room speaker=unknown confidence=0.59 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:03:35 source=ambient-mic zone=hush-room speaker=unknown confidence=0.87 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:03:36 source=ambient-mic zone=break-room-2 speaker=unknown confidence=0.37 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:03:38 source=ambient-mic zone=corridor-e speaker=unknown confidence=0.66 clock=LOST est_error_s=±90 ts_basis=uptime text="There's a light, there's a light over there" ingested_at=2026-10-08T03:07:41
2026-10-08T03:03:38 source=ambient-mic zone=elevator-lobby speaker=unknown confidence=0.84 clock=LOST est_error_s=±90 ts_basis=uptime text="[screaming]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:03:39 source=ambient-mic zone=corridor-e speaker=unknown confidence=0.59 clock=LOST est_error_s=±90 ts_basis=uptime text="Somebody turn on a light" ingested_at=2026-10-08T03:07:41
2026-10-08T03:03:50 source=ambient-mic zone=corridor-e speaker=unknown confidence=0.77 clock=LOST est_error_s=±90 ts_basis=uptime text="[yelp] Sorry, Waffles." ingested_at=2026-10-08T03:07:41
2026-10-08T03:03:52 source=ambient-mic zone=corridor-e speaker=unknown confidence=0.72 clock=LOST est_error_s=±90 ts_basis=uptime text="Ow, who's, hello? HELLO?" ingested_at=2026-10-08T03:07:41
2026-10-08T03:03:56 source=ambient-mic zone=dso-office speaker=unknown confidence=0.39 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:04:01 source=ambient-mic zone=dso-office speaker=unknown confidence=0.57 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:04:02 source=ambient-mic zone=break-room-2 speaker=unknown confidence=0.52 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:04:10 source=ambient-mic zone=corridor-e speaker=unknown confidence=0.67 clock=LOST est_error_s=±90 ts_basis=uptime text="Okay. Okay okay okay." ingested_at=2026-10-08T03:07:41
2026-10-08T03:04:13 source=ambient-mic zone=dso-office speaker=unknown confidence=0.66 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:04:19 source=ambient-mic zone=dso-office speaker=unknown confidence=0.87 clock=LOST est_error_s=±90 ts_basis=uptime text="[music: Defiant Jazz]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:04:25 source=ambient-mic zone=corridor-e speaker=unknown confidence=0.64 clock=LOST est_error_s=±90 ts_basis=uptime text="Why is there jazz" ingested_at=2026-10-08T03:07:41
2026-10-08T03:05:09 source=ambient-mic zone=elevator-lobby speaker=unknown confidence=0.79 clock=LOST est_error_s=±90 ts_basis=uptime text="[screaming]" ingested_at=2026-10-08T03:07:41
2026-10-08T03:05:53 source=ambient-mic zone=corridor-e speaker=unknown confidence=0.45 clock=LOST est_error_s=±90 ts_basis=uptime text="Is anyone there" ingested_at=2026-10-08T03:07:41
2026-10-08T03:06:13 source=ambient-mic zone=corridor-e speaker=unknown confidence=0.54 clock=LOST est_error_s=±90 ts_basis=uptime text="Where's my phone" ingested_at=2026-10-08T03:07:41
2026-10-08T03:07:30 source=ambient-mic zone=elevator-lobby speaker=unknown confidence=0.91 clock=ok text="[shouting] Nobody move! Stay where you are!"
```


---

# Kipsake Records

Personnel, detention records, Hush Room notes, supervisor feedback, the perks ledger, flagged keystroke drafts, calendar entries, the Cocoa Hour seat list and festive-wear register, and the procedure revision log.

```text
=== PERSONNEL (sleepwalkers; waking-life data restricted to HR) ===
personnel id=agnes name="Agnes Tanaka" dept="Deep Sleep Operations" preferred_name="Peggy" tenure_years=1
personnel id=bertram name="Bertram Mensah" dept="Deep Sleep Operations" preferred_name="" tenure_years=7
personnel id=clement name="Clement Whitlow" dept="Deep Sleep Operations" preferred_name="" tenure_years=3
personnel id=hale name="Mr. Hale" role="Night Supervisor" sleepwalker=false

=== DETENTION RECORDS (current quarter) ===
2026-09-30T03:29:05 detention employee=agnes ordered_by=hale reason="repeat offense" lines_written="30"
2026-09-29T01:25:45 detention employee=agnes ordered_by=hale reason="repeat offense" lines_written="25"
2026-09-30T01:25:05 detention employee=agnes ordered_by=hale reason="disruptive affect" lines_written="12"
2026-10-06T03:51:46 detention employee=agnes ordered_by=hale reason="disruptive affect" lines_written="25"
2026-09-30T03:43:20 detention employee=agnes ordered_by=hale reason="insubordination" lines_written="27"
2026-09-29T00:50:10 detention employee=agnes ordered_by=hale reason="repeat offense" lines_written="22"

=== HUSH ROOM SESSION LOG (automated wellness notes) ===
2026-10-04T23:03:37 hush-room employee=clement note="Reports recurring headaches, worse at the start of shift."
2026-09-30T01:29:45 hush-room employee=bertram note="Reports headaches. Advised hydration."
2026-09-29T02:02:45 hush-room employee=agnes note="Anxious. Asked twice where the elevator goes. Redirected."
2026-10-05T23:05:22 hush-room employee=agnes note="Expressed resentment toward supervision. Advised gratitude."
2026-10-05T23:27:51 hush-room employee=bertram note="No concerns. Bedtime story read."
2026-10-01T02:41:28 hush-room employee=clement note="No concerns."

=== SUPERVISOR FEEDBACK FORM (restricted) ===
2026-09-30T02:20:45 supervisor-feedback submitted_by=bertram to=hale text="Agnes lingers in the elevator lobby."
2026-10-06T03:40:31 supervisor-feedback submitted_by=bertram to=hale text="Agnes lingers in the elevator lobby again. Twice tonight."
2026-10-07T20:47:22 supervisor-feedback submitted_by=bertram to=hale text="Agnes is leaving something in the elevator emergency phone panel. I think she's planning something at the elevator."
2026-10-07T20:52:40 supervisor-feedback reply_by=hale to=bertram text="Thank you, Bertram. My office, 21:15."
2026-09-29T04:05:00 supervisor-feedback reply_by=hale to=bertram text="Reward issued: 1x small kitchen appliance (off-ledger). Discretion appreciated."

=== PERKS LEDGER ===
2026-09-29T04:02:15 perk=pancake-bar recipient=bertram
2026-09-28T04:10:53 perk=cocoa-day recipient=clement
2026-10-01T04:13:56 perk=cocoa-day recipient=bertram
2026-10-06T04:04:09 perk=pancake-bar recipient=clement
2026-10-06T04:11:39 perk=bed-socks recipient=clement
2026-10-08T04:28:08 perk=pancake-bar recipient=clement
2026-10-08T04:28:08 perk=earplugs recipient=bertram
2026-10-06T04:23:58 perk=earplugs recipient=bertram

=== KEYSTROKE DRAFTS (unsent; flagged by sentiment filter) ===
2026-10-02T02:12:09 keystrokes employee=agnes app=notes type=draft text="If Mr. Hale were gone, this floor could breathe." sent=false

=== CALENDAR (night of 2026-10-07) ===
2026-10-07T21:15:00 calendar owner=hale title="1:1 Bertram"
2026-10-08T03:00:00 calendar owner=hale title="Cocoa Hour supervision (DSO holiday party)"

=== COCOA HOUR SEATS (Facilities, Break Room 2; who sits where is on the chart posted in the room) ===
2026-10-07T20:15:00 seating event=cocoa-hour room=break-room-2 seat=1 position="head of the table, by the cocoa urn"
2026-10-07T20:15:00 seating event=cocoa-hour room=break-room-2 seat=2 position="chair by the window"
2026-10-07T20:15:00 seating event=cocoa-hour room=break-room-2 seat=3 position="chair by the door"
2026-10-07T20:15:00 seating event=cocoa-hour room=break-room-2 seat=4 position="chair by the speaker"

=== COCOA HOUR FESTIVE-WEAR REGISTER (Facilities, logged at the Break Room 2 door) ===
2026-10-08T02:58:40 festive-wear employee=agnes item="Christmas sweater" colours="green, red, orange, white, navy" pattern="stars and stripes"
2026-10-08T02:58:52 festive-wear employee=bertram item="Christmas sweater" colours="blue, red, orange, white, green" pattern="reindeer and snowflakes"
2026-10-08T02:59:05 festive-wear employee=clement item="Christmas sweater" colours="navy, blue, red, orange, green, white" pattern="stripes and squares"
2026-10-08T02:59:30 festive-wear employee=hale item="charcoal suit jacket and tie" colours="charcoal" pattern=none

=== PROCEDURE REVISION LOG ===
procedure-revision id=114 title="Sleepwalker night-shift procedure, revision 114" status=approved approved_by=hale approved_in=February
procedure-revision id=114 status=withdrawn withdrawn_in=March reason="following a sleepwalker fatality"
```

# C-15 log

Slice 1 (server).
- Ruling: `tests/c13-schedule.test.ts:190` lists the exact keys of an event; `callLink` (design: new `ScheduleEvent` field, https only) added to the expected list. The point of that assertion (no description or links leak) is kept: description is still absent and `callLink` is https-only, tested in c15 `call link`.
- Ruling: `app/cabinet/ui/schedule.tsx:345` (slice 2 file) touched by one line only: `setStatus` for "not connected" keeps `zoomLink` so `CalendarStatus` (now with `zoomLink`) still type-checks.
- Ruling: no coach-deletion path exists in the store, so `cabinet_calendar_prefs` has no cleanup path added (design: "if none, do not add").
- Ruling: `callLink` and the Zoom link also reject whitespace inside the address (design: "https:// start, up to 500"); a place like "https://x y" is not shown as a link.
- Ruling: cancel/move `scope` other than one/following, a repeat object that is not exactly `{every: 1|2, count: 2-52|null}`, and an unknown `call` are 400 `INVALID_DATA` before any Google request.
- Ruling: a rule check (`CALENDAR_SERIES_UNSUPPORTED`) runs for every "following" request, including the first-meeting case; the first-meeting case keeps the rule (BYDAY replaced when single) and moves start/end of the master.
- Ruling: id of the new series = base32hex of the first 130 bits of sha256(`masterId|originalStartMs`) (design: sha256 of `masterId|originalStart`; the exact string is mine).
- Ruling: on a 409 for the new series, the server PATCHes start/end/recurrence only if they differ; guests and Meet of the earlier try are kept.
- Fake Google: master + occurrences made on read, exceptions stored by occurrence id, `instances`, `conferenceDataVersion`/`createRequest`, flag `failMasterPatch500`; a series POST without `start.timeZone` is 400; a master without a usable RRULE has its first occurrence only. Old pre-expanded fixtures (recurringEventId without a master) are untouched.
- Tests use dates relative to today (not fixed 2026 dates) because "this and following" works for future meetings only.

Slice 2 (windows and dragging).
- Ruling: «Эту и все следующие» is not shown at all for a meeting that has started (only «Только эту» stays); the design says "offered only for meetings not started yet". Cost if wrong: one hidden radio.
- Ruling: the drag window of a series is «Перенести повторяющуюся встречу?» with the same two radios and the buttons «Перенести» / «Не переносить» (design lists three choices; radios keep it the same as the move form). Cost if wrong: one extra click.
- Ruling: the new-meeting window asks `/calendar` itself on opening for the saved Zoom link (no extra prop), and the selects «Повторять» and «Ссылка на звонок» carry `aria-label` (their label text would otherwise include all options). «Сохранить ссылку» in the window also answers Enter in the field.
- Ruling: the last call-link choice is kept in `localStorage` key `cabinet-call-link` (try/catch); the repeat choice is not kept.
- Ruling: «Моя ссылка Zoom» in the calendar settings is a small form with its own «Сохранить»; empty saves "no link".
- Ruling: preview fake: `weekly-marina` is one master `RRULE:FREQ=WEEKLY;COUNT=17` starting two weeks back (weeks -2..14, not -8..14: occurrences are 7*24 h apart, so a summer-time change of this machine must not fall inside the shown weeks) with a Meet link; new one-off «Онлайн-консультация» (Friday 11:00) with a Zoom link in the place. c13 and c14 pass unchanged.
- Ruling: c14-edit.cjs M2 line replaced by: the series meeting's «Перенести» form has «Только эту» chosen, the move sends one PATCH on the occurrence id with no `recurrence`, then the occurrence is moved back to its time (the preview data stays as it was).
- Ruling: c15 tabWalk counts a radio group as one Tab stop (native behaviour: the others by arrow keys).
- Ruling: privacy page: one sentence, the stored Zoom link is kept apart from the calendar access, «Отключить календарь» does not erase it, it can be removed in the settings.

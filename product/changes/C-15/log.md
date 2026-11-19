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

Review fixes (server).
- Ruling: split POST answered 409 and GET says status "cancelled" (a taken-back series): POST again with a fresh random id (26 base32hex); the old series is trimmed only after a live new series exists. Cost if wrong: one extra POST on that rare retry.
- Ruling: fake Google now keeps a deleted master/single event as "cancelled" (hidden from the list, POST of its id is 409, GET returns it); `masters()` in c15 counts live masters only, and `tests/c14-edit.test.ts:202` now checks the stored event is "cancelled" instead of absent (the list-hides-it assertion is unchanged).
- Ruling: "following" (move and cancel) is 400 INVALID_DATA also when originalStartTime <= now, before any write.
- Ruling: isolation test (coach B on her own fake account, move/cancel "following" on A's series key and on the master key) added as the last subtest of c15 (after "call link", which leaves B disconnected).
- Браузерная проверка C-14: помощник fakeEvents не считает отменённые события (поддельный Google теперь, как Google, хранит удалённое событие со status cancelled). Проверка та же: встречи после отмены нет. Цена ошибки: нет.
- Падение c13-schedule.cjs «text cut through» в итоговом прогоне — остаток данных прошлых прогонов в поддельном Google (встреча «Сессия с Марина Календарёва» в среду 19:00 пересеклась с «Вечерний созвон»). На свежем поддельном Google последовательность c15 → c14 → c13 проходит целиком. Узкий блок при пересечении двух встреч с длинным именем обрезает текст — в очередь.
- После повторного ревью: событие или серия, удалённые в Google (status cancelled), не переносятся и не отменяются — CALENDAR_EVENT_GONE, ничего не пишется; иначе «эту и следующие» воскресила бы удалённую серию. Если главное событие серии не читается (как у старых фикстур без главного), проверяется только сама встреча, как в C-14. Цена ошибки: лишний GET на перенос встречи серии.
- Не сделано (ревью, minor): после двух сбоев подряд при разрезе повтор со случайным id может дать вторую новую серию. Очень редко (два сбоя Google подряд), исправляется удалением серии в Google. Цена: дубль встреч.

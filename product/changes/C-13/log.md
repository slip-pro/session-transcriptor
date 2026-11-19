# C-13 build log

## Slice 1 (server)
- Ambiguity at a matching step (email, full name, first name) returns "no client" at once instead of moving on to the next step: a guess is worse than a question.
- Name matching has two steps, full name first, then first word (>=2 letters): "Анна Петрова" is not ambiguous between two Annas, "Анна" is.
- A manual choice pointing at a client that no longer exists falls back to automatic matching (cascade normally removes it first).
- DELETE /calendar returns `{ok:true, revoked}` (design said `{ok:true}`): the UI needs `revoked` for the "revoke it in your Google account" hint.
- Added `forgetCalendarMemory()` export, used only by the test to simulate a restart (access-token cache otherwise masks a changed secret until expiry).
- An access token rejected with 401 is refreshed once and retried; a refresh that gives `invalid_grant` then means "reconnect".
- Selection kept across reconnect (only new connections start with an empty selection = primary calendar).
- `compose.yaml` unchanged: it reads `secrets/access.env` whole, so `GOOGLE_*` only needed a line in `deploy/README.md`.
- Callback with an unconfigured Google answers `failed`; connect with it answers the `unavailable` redirect.

## Slice 2 (schedule tab)
- A fourth tab broke the phone header (page scrolled sideways at 390/320 on every page): added a late rule in room.css so the tabs shrink (13-14 px, tighter padding) and may wrap.
- A client's row has a quiet «Не тот клиент?» (design only named «Чья это встреча?» for unknown ones); it is the way to fix a wrong automatic match, and offers «Определять автоматически» when the choice was manual.
- Page-level data per week: the tab asks for Monday 00:00 to next Monday 00:00 (browser time), refreshes every 2 min; changing week shows «Загружаем встречи…» rather than the old week.
- Calendar dialog opens after return only on `calendar=connected`; the param is removed from the address at once (replaceState), the message stays until the tab is left.
- «Отключить» with a failed Google revoke keeps the design text (revoke it in the Google account) as the notice instead of «Календарь отключён».
- If the events answer says reconnect/not_connected while the status said connected, the tab follows the events (derived, no effect).
- `MeetingRow`, `WhoseMeeting`, `useSchedule` are exported from schedule.tsx for slice 3 (home block, client head).
- Browser test creates/reuses clients «Марина Календарёва» and «Елена Почтова» in the preview account and fails if another active client starts with «Марина» (name matching would be ambiguous); the client made in `assign` is deleted at the end. `connect` disconnects first, so it also covers «Отключить». The denied-by-Google UI path is covered only by the server test (the fake process has no switch).
- Preview start: the web process died once right after `start.cjs` (log only had a cursor reset); starting it again worked. Not diagnosed.

## Slice 3 (home, client head, layout)
- «Ближайшие встречи» takes the state from the events answer alone (one request, no status call); `unavailable` removes the block, `not_connected` shows the quiet button «Подключить календарь» (a button into the tab, not a link), `reconnect` a real link «Переподключить календарь».
- Home rows are the week's `MeetingRow`: unknown meetings keep «Чья это встреча?» (dialog works on the home too), «не клиент» meetings are left out; first 8 rows across both days; meetings already over today stay in the list (the day is shown from 00:00).
- «Всё расписание» is shown whenever the calendar is connected, also on an empty day.
- «Следующая встреча» skips meetings that have ended (all-day: by the end date) and shows nothing when the calendar is not connected or loading.
- Browser test: deterministic cases (empty day, 8-row cap, «не клиент», reconnect/unavailable, long names, ended meeting) use Playwright route mocks of `/calendar/events`; the real fake-Google data is checked against the API answer for the same range, so the test holds on any weekday. Request ranges are asserted: today 00:00 + 2 days (home), + 60 days (client).
- The test found a real defect: the chair shrank to a dot beside a very long client name; fixed with `flex:none` on the first child of `.cc-schedule-main`.
- `cabinet-c8-home.cjs` is hard-wired to port 3104 (preview not running); run once as a temporary copy pointed at 3111 (`my-clients` passed), the test file itself is unchanged. `cabinet-c3-visual.cjs` not run (design asked for it; needs its own preview, not in this slice's brief).

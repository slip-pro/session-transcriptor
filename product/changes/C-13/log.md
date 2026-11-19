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

## Grid correction (2026-11-19)
- The week tab is a time grid; home block, client head and `MeetingRow` are untouched. `layoutDay(events)` in `lib/cabinet/schedule-view.ts` returns top/height in minutes from midnight (minimum 30 minutes, stops at midnight, all-day events skipped) and splits overlapping meetings into columns; the minimum height counts for overlap, so a stretched short meeting never sits under the next one.
- Visible hours are 07:00-23:00 and widen only when a meeting (or the current time) falls outside. The grid scrolls inside itself; heads and the all-day row are sticky inside that scroll box so they line up with the columns.
- One request per week even in «День»: the selected day is a column of the same week answer, so switching days inside a week does not refetch.
- The «весь день» row appears only when the shown period has an all-day event (less empty chrome).
- «Не клиент» has a third button in the meeting window, «Не клиент · изменить» (the design lists two labels); it opens the same «Чья это встреча?» window.
- Meeting window title is «Встреча»; «Чья это встреча?» replaces it (one dialog at a time, the dialog component uses a fixed heading id).
- Phone (<=760 px) is forced to «День» by `matchMedia`; first paint is «Неделя» for a moment on a phone before the effect runs (not fixed, hidden by CSS: week switch and one column only appear after).
- Settings (gear) dialog holds «Календари: … · Изменить» and «Отключить календарь»; the browser test steps `connect` and `assign` use it.
- The period label is capitalised by CSS (`text-transform`), so the test matches it case-insensitively.
- Colours: client = `--cc-client-soft` block with a `--cc-client-chair` bar; unknown = white with a thin `--cc-empty` outline; not-client = muted grey. Today = number in a circle of the cabinet accent (dark, `--cc-accent`), not blue.
- Known small gap: when the grid opens scrolled to the current hour, the first hour label is partly under the sticky header.
- Polish after the first grid screenshots: hour row 68 px; block text is clamped to whole lines that fit the block (name, optional small title, start time under it), a block too short for two lines is one line «18:00 Name»; the client's event title stays in the DOM (hidden when it does not fit) and in the aria-label. The grid opens scrolled to a whole hour with 10 px padding above the body, so the first label is readable. The phone drops the duplicate day header (the strip shows the day); desktop «День» keeps it. The phone initial view is read from `matchMedia` in the state initialiser, so there is no week flash. Browser test checks: no clipped text, no half-hidden hour label, 64-72 px hour, no header on the phone.

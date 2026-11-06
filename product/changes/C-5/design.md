# Design C-5: «Два кресла» — клиенты, страница клиента и чтение встречи

## Map
- Real app: dirty nested checkout `.local/web` (Next 16, React 19); C-2 and C-3 code lives there untracked/uncommitted. Before edits snapshot touched files to `.local/c5-before/` (same practice as C-2/C-3). Never stage or reset nested work wholesale.
- Reference look: `.local/design-v2/b2-system.html` screens 3 (l.234–249) and 4 (l.251–269). Copy look, not markup. Its rose colour = our coach yellow (D07).
- `app/cabinet/ui/workspace.tsx` (read in code):
  - l.178–179: client page (`current`) = back button, `.cc-client-heading` (h1 button → `setModal('edit-client')`, request), `<ClientReminder>`, `<Preparation>`; otherwise page header «Твои клиенты» / «Все встречи» with «Добавить клиента».
  - l.180: `.cc-history-heading` «История встреч N» + «Добавить встречу» (`setModal('add-meeting')`) for client page and sessions view.
  - l.181: list tools: search, «В работе/Архив» segment (clients), «Без клиента» (sessions).
  - l.182: clients grid of `ClientCard` (l.197–198, tone classes `cc-client-tone-N`, `sessionWord` «сессия/сессии/сессий») or `Empty`.
  - l.183: history list of `HistoryRow` — already has `ChairPair` + state (C-3 M1), so client meetings already show pairs.
  - `shortDate` l.201. `CabinetClient` already carries `sessionCount`, `lastSessionDate`, `request`, `archived` (server computed) — no new data needed.
- `app/cabinet/ui/chairs.tsx`: `Chair({role, size, letter, look})` supports a letter and `look="line"|"dash"`; `ChairDefs` rendered once in workspace.
- `app/cabinet/ui/client-reminder.tsx`: `<section className="cc-client-reminder"><h2>Перед встречей</h2>…InlineText…status…drafts</section>` — behaviour must not change, only placement/styling.
- `app/cabinet/ui/session-workspace.tsx` l.161–176: meeting header = `ChairPair`, `.cc-meeting-heading` (date/client, h1 title, duration), then `.cc-save-state` as a separate grid item (that is why «Сохранено» sits far right). Reader top l.196–199: `.cc-conversation-heading` (h2 «Текст разговора»), `wordMetadata`, tabs; `AudioPanel` (`audio.tsx` l.26–27, `.cc-audio-top` «Запись встречи» / `.cc-audio-empty`).
- `app/cabinet/room.css` (minified, stacked layers; later wins). Old values to override: `.cc-reader-top .cc-audio{background:#e9e0d2;border:1px solid #ddcfbc}` (the brown block), `.cc-reader-top .cc-conversation-heading h2{font:… Georgia}`, `.cc-client-heading h1{font:400 54px Georgia}`, `.cc-client-heading h1 button span{color:#9f8879}`, `.cc-client-reminder{background:#e9e0d2;…}` + `h2{color:#705640}`, `.cc-result-reading .cc-save-state{display:none}`. Phone: `@media(max-width:760px){.cc-wordmark span{display:none}}` also hides the `.cc-pair` span inside the wordmark — that is the missing chairs on phone. C-3 tokens: `--cc-client`, `--cc-client-soft`, `--cc-client-ink`, `--cc-client-chair`, `--cc-coach-*`, `--cc-line`, `--cc-paper`.
- Writers: none added. Client name/request via existing ClientForm; reminder via ClientReminder writer; meetings via existing editors. No API, store, type or migration change.
- Tests/build facts (from operations.md C-3 notes): Node 24.22.1 at `C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe` for `npm test`; `npm run typecheck`, `npm run lint` (49 pre-existing .cjs require() errors — judge only new ones), `next build`. Preview: `node --import tsx scripts/cabinet-c2-demo.ts` on 3104, synthetic login coach@example.test / Local-demo-coach-2026, use `http://localhost:3104`; restart after source edits; wait ~70 s between browser scripts (login 429). Browser scripts pattern: `tests/cabinet-c3-home.cjs` (login, `page.request.post('/api/cabinet/sessions')` for synthetic sessions). Clients are created via `POST /api/cabinet/clients` `{name, request}` (same Origin header). Logs/screens to root `.git/vibeproof-logs/c5-*`.
- Ready state after login: heading «Была встреча? Добавь запись». Clients ready: heading «Клиенты · N». Client page ready: h1 with client name.

## Options
1. Leave as is: tokens already recoloured these screens partially; Georgia headings, brown reminder/audio block, tone cards remain. Brief not met.
2. Targeted markup edits in workspace.tsx + one pure helper + a final CSS layer (chosen). Reuses `Chair`, `HistoryRow`, `ClientReminder` unchanged in behaviour. Undo = restore from `.local/c5-before/`.
3. New ClientsPage/ClientPage components extracted from workspace.tsx: cleaner file, but moves state wiring (guard, modal, registerPersistence) — risk to C-2 persistence for no user benefit. Rejected.

## Decision
Option 2.

## Program design
- `app/cabinet/ui/processing.tsx` (existing pure module, already unit-tested) add:
  - `meetingsWord(count: number): "встреча" | "встречи" | "встреч"` (Russian plural).
  - `clientMeta(client: Pick<CabinetClient,"sessionCount"|"lastSessionDate">, today: string /* YYYY-MM-DD */): string` → `"2 встречи · последняя 2 ноября"`, `"5 встреч · сегодня"` (lastSessionDate === today), `"Пока без встреч"` when count 0 or no date. Date formatted like `shortDate` (move `shortDate` into processing.tsx and import it in workspace.tsx).
- workspace.tsx:
  - `ClientCard({client, open})`: `<button class="cc-client-card">` → `.cc-client-who` (`<Chair role="client" letter={client.name} size={30}/>` + `<strong>` name), `<span class="cc-client-request">` (request or «Запрос можно добавить в карточке»), `<span class="cc-client-last">{clientMeta(client, today)}</span>`. Accessible name stays the visible text. Drop `index`/tone classes and `sessionWord`.
  - Free seat: after the cards, only when `!archive && !query`: `<button class="cc-client-card cc-client-free" onClick={() => setModal('client')}><Chair role="client" look="line" size={56}/>Кресло свободно — добавить клиента</button>`. Empty-list `Empty` stays as is (empty states are the next change).
  - Clients page header: h1 «Клиенты · {count of non-archived clients}» (archive view: «Архив · N»), button «+ Новый клиент» (same `setModal('client')`); drop subtitle «У каждого человека своя история.». Search placeholder «Найти по имени или запросу». Sessions view header unchanged.
  - Client page: replace `.cc-client-heading` with `<section class="cc-client-head">`: `<Chair role="client" letter={current.name} size={48}/>`, `<div>` with h1 (same profile button, aria-labels unchanged) and `<p class="cc-labelled-request"><span>Запрос</span>{request || 'Можно добавить в профиле'}</p>`, then `<ClientReminder …/>` as the third grid cell (same props/key). `Preparation` stays below, unchanged.
  - History heading on client page: «Встречи · N» + button «+ Встреча» (same `setModal('add-meeting')`). Sessions view keeps «История встреч N» / «Добавить встречу».
- client-reminder.tsx: no change (status text «Сохранено» already sits beside its heading).
- session-workspace.tsx: move the `.cc-save-state` span inside `.cc-meeting-heading`, directly after the h1 (same element, same role/status texts). In reading mode show it (remove the `display:none`) in the reader top next to the «Текст разговора» heading: render the same status span inside `.cc-conversation-heading` when `reading` (one `role=status` element visible at a time: header copy gets `hidden={reading}`).
- room.css: append `/* C-5 clients, client page, reader */` layer:
  - `.cc-client-directory` grid `repeat(auto-fill,minmax(260px,1fr))`; `.cc-client-card` paper, 1px `--cc-line`, radius 16px, min-height 44px, focus-visible ink outline; `.cc-client-who` flex gap 12; `.cc-client-free` dashed 1.5px `--cc-client-chair` border, `--cc-client-ink` text, centred column; tone classes neutralised.
  - `.cc-client-head` grid `auto 1fr minmax(260px,360px)`, background `--cc-client-soft`, border `--cc-client`, radius 20px, padding 24px; h1 Manrope 700 32px/1.2 ink, button chevron `--cc-client-ink`; request label `--cc-client-ink`. Inside it `.cc-client-reminder` paper card, no brown, h2 13px/700 ink, margin 0. ≤760px: single column, avatar + name row, reminder full width.
  - `.cc-reader-top .cc-audio` paper background, `--cc-line` border, radius 14px; `.cc-audio-top` label ink 13px 600; `.cc-reader-top .cc-conversation-heading h2` Manrope 700 24px.
  - Save state: `.cc-meeting-heading .cc-save-state` 13px muted, margin-top 4px; `.cc-result-reading .cc-conversation-heading .cc-save-state{display:inline}`.
  - `@media(max-width:760px){.cc-app .cc-header .cc-wordmark>.cc-pair{display:inline-flex}}`.
  - No new colours: only C-3 tokens (D07: colour = person, ink = actions).

## Slices
### 1. Clients and client page
Makes true S-chairs-6, S-chairs-7.
- Unit (`tests/cabinet-ux.test.ts`): `meetingsWord` 1/2/5/11/21/22/25; `clientMeta` with today → «сегодня», other date → «последняя 2 ноября», 0 → «Пока без встреч». Rejects: «сессий» wording (fails today: functions don't exist).
- Browser `tests/cabinet-c5-clients.cjs` › list: create 2 synthetic clients via API (one with 2 meetings on 2026-11-02), open «Клиенты»: heading matches /^Клиенты · \d+$/; each card of created clients has `.cc-chair-client` and letter = first letter; card text contains request and «2 встречи · последняя 2 ноября»; last card is «Кресло свободно — добавить клиента» and clicking it opens dialog «Новый клиент»; no `.cc-client-tone-` classes. Archive view shows no free seat.
- › client page: open the client with meetings: `.cc-client-head` contains chair with letter, name heading, request; «Перед встречей» edit → reload → value persisted (existing reminder writer); heading «Встречи · 2», button «+ Встреча» opens «Новая встреча · <name>»; each history row has a `.cc-pair`; profile button still opens «Профиль клиента».
- Files: processing.tsx, workspace.tsx, room.css, tests/cabinet-ux.test.ts, tests/cabinet-c5-clients.cjs.
- Look at: workspace.tsx l.178–183, l.197–201; chairs.tsx `Chair`; tests/cabinet-c3-home.cjs for login/API pattern; client-reminder.tsx for the reminder label «Напоминание перед встречей».
- Done: unit + browser list/client page green; `npm test`, typecheck green.

### 2. Reader, header polish and evidence
Makes true S-chairs-8, S-chairs-5 change.
- Browser `tests/cabinet-c5-clients.cjs` › reading: synthetic ready meeting with audio absent → `?mode=read`: `.cc-reader-top .cc-audio-empty` background computed colour equals paper (#fff), not rgb(233,224,210); «Текст разговора» font-family has no Georgia; status «Сохранено» visible inside `.cc-conversation-heading`; result view: `.cc-save-state` is a descendant of `.cc-meeting-heading`. At 390 px header `.cc-wordmark .cc-pair` visible (fails today).
- `tests/cabinet-c3-visual.cjs`: add screens `clients` and `client` to the measured list (1280/390/320: no horizontal scroll, text ≥13 px, contrast ≥4.5, focus outline); reader already listed.
- Regression: `npm test`, typecheck, lint (no new errors), `next build`; browser c3-home, c3-roles, c3-visual, c2-smoke, c2-journey (update selectors only if a renamed text is asserted: «Твои клиенты», «Добавить клиента», «История встреч» on client page, «Добавить встречу» there; never weaken assertions).
- Files: session-workspace.tsx, room.css, tests/cabinet-c5-clients.cjs, tests/cabinet-c3-visual.cjs, C-2 scripts selectors if needed.
- Done: all green; screenshots clients/client/reader at 1280/390 in `.git/vibeproof-logs/c5-*`; design-critic on screenshots.

## Visible work
Manrope only; client = green chair with letter, coach = yellow; actions ink; violet only for «ждёт тебя». Reused: Chair, ChairPair, HistoryRow, pills, ClientReminder, buttons. States: clients list with N, archive (no free seat), search no results (existing Empty), client without request/meetings («Пока без встреч»), reminder saving/offline/drafts (unchanged). Phone: cards one column, client head stacks, header chairs visible, ≥44px targets. Accessibility: chairs aria-hidden, names in text; focus-visible outlines; free-seat button has visible text.

## Risks
- Renamed texts break C-2/C-3 scripts → update selectors only.
- Moving `.cc-save-state` must keep exactly one visible `role=status` (two hidden/visible copies would double-announce) — header copy `hidden` in reading.
- CSS layer leaks to sessions view/history: intended to be harmless; screenshots of «Все встречи» at 390 in slice 2 catch breakage.
- Rollback: restore from `.local/c5-before/`.

## Decisions to keep
- Client is always shown as a green chair with first letter (list, client page); the free seat is the "add client" entry. Replaces tone-coloured client cards.
- «Встреча/встречи/встреч» wording on client screens replaces «сессия».

## Review
Fresh `vibeproof-reviewer` (read-only, no conversation), 2026-11-06: 0 blockers, 4 majors, 3 minors, 3 questions. Amendments below override earlier sections where they differ.

- M1 accepted. One `.cc-save-state` only: move it inside `.cc-meeting-heading` right after the h1 and show it in reading mode too (meeting h1 stays visible there via `.cc-reader-context`); no second copy in `.cc-conversation-heading`. Override the phone-only `@media(max-width:760px){.cc-result-reading .cc-save-state{display:none}}` (room.css:21) so it is visible. C-2 selectors `.cc-save-state` with «Сохранено» keep matching exactly one element. Reading test: status «Сохранено» is a descendant of `.cc-meeting-heading` in both views.
- M2 accepted. Reading test asserts computed background of `.cc-reader-top .cc-audio` (the container) is paper (rgb(255,255,255)), not rgb(233,224,210), in both states: no audio (`.cc-audio-empty`) and with audio (synthetic tiny WAV upload as in `tests/cabinet-c3-listen.cjs`, `.cc-audio-top` «Запись встречи» ink colour).
- M3 accepted. `tests/cabinet-c3-visual.cjs`: clients/client/reader already listed; change `narrowOnly` so 320 px also runs `reader`, `clients`, `client`. Add keyboard-focus checks (Tab to element, outline width >0 or box-shadow) for: first client card, free seat, client profile button, «+ Встреча», reminder field.
- M4 accepted. Slice 2 regression also runs `cabinet-c2-slice1.cjs` (update `btn('Добавить встречу')` on the client page to «+ Встреча»; keep reminder/draft/search/scroll assertions), `cabinet-c2-forward.cjs`, `cabinet-c2-slice2.cjs`, `cabinet-c2-metadata-red.cjs`, `cabinet-c3-listen.cjs`.
- m1 accepted: counts come from server-computed `CabinetClient.sessionCount/lastSessionDate` (store.ts:86) — same facts as the loaded list, no new fields; this is the meaning of the brief's "Decided for you" line.
- m2 accepted: `today` = local calendar date `new Intl.DateTimeFormat('sv-SE').format(new Date())` (YYYY-MM-DD in the browser's zone), computed in workspace render; `clientMeta` stays pure.
- m3 rejected for this change: brief doesn't require moving the reminder status; behaviour of ClientReminder stays untouched.
- Q2 decided (reference wording): count > 1 → «N встречи · последняя 2 ноября»; count = 1 → «1 встреча · 4 ноября»; today → «сегодня» in place of the date. Unit tests cover both.
- Q3 decided: keep C-3 letter style; design-critic and screenshot inspection at 30/48 px judge legibility; no new colour.

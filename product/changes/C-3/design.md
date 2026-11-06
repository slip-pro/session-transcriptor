# Design C-3: «Два кресла» — основа и путь встречи

## Map
- Real app: dirty nested checkout `.local/web` (Next 16, React 19). C-2 transfer is in it and not yet finished in Vibeproof; C-3 builds on top. Before edits snapshot the touched files to `.local/c3-before/` (same practice as C-2). Never stage nested work wholesale.
- Reference: `.local/design-v2/b2-system.html` (yellow coach). Copy look and rules, not its markup/scripts.
- `app/cabinet/room.css` (74 KB, minified) has several stacked token blocks (`--cc-bg/ink/paper/line/muted/accent`); later blocks win. Georgia is used in 3 rules. Manrope is loaded in `app/layout.tsx` as `--font-geist-sans`.
- `app/cabinet/ui/workspace.tsx`: header/nav (l.163–169), hidden file `picker` accepting audio+`.json` (l.170), home hero `.cc-upload-welcome` with `cabinet-room.svg` (l.173), recent rows with `processingLabel` + «Скачать Word»/«Проверить роли» (l.174–175). `startUpload` opens the picker; `setModal("note")` opens note-only form.
- `app/cabinet/ui/processing.tsx`: `processingLabel(summary)` = roles → «Нужно проверить роли», else stage/«Документ готов»/«Встреча без записи». Used by home and history rows.
- `app/cabinet/ui/forms.tsx` l.57–59: source `<select>` json | last (import-job via localStorage capability) | note.
- `app/cabinet/ui/session-workspace.tsx`: header with ContextField date/title/minutes (l.136–151); `cc-document-outcome` (l.160) where `!rolesReady` downloads `neutral`; role check `cc-role-check` (l.161) — per-speaker examples, per-speaker `<audio #t=>` preview, «Это я» for 2 voices via `assignFirst`, `<select>` for other counts; `wordMetadata` with «Скачать Word без ролей» when ready (l.132); reader top download with neutral when not ready (l.169); reader paragraphs with a role `<select>` per paragraph (l.180).
- Download route `app/api/cabinet/sessions/[id]/download/route.ts` honours `?neutral=1`. Only the UI calls it with neutral.
- Writers: roles are written only through `useSessionEditor` (`speakerRoles`) via `save(["speakerRoles"])`. C-3 adds no new writer, endpoint, field or migration.
- Tests: `npm test` (node:test + tsx, `tests/*.test.ts`), `npm run typecheck`, `npm run lint`. Browser scripts `tests/cabinet-c2-*.cjs` use installed Playwright at `C:/Users/user/.cache/codex-runtimes/.../playwright` + Chrome, preview 3104, synthetic login coach@example.test / Local-demo-coach-2026, use `http://localhost:3104` (127.0.0.1 fails origin check). Preview helper: Node ≥24 `node --import tsx scripts/cabinet-c2-demo.ts` copies app into `.local/cabinet-c2-preview`; restart it after source edits. Logs/screens to root `.git/vibeproof-logs/c3-*`.
- Readiness after login: home heading (will become «Была встреча? Добавь запись»).

## Options
1. Leave as is / token swap only: recolour accent to yellow. Cheap, but cresla, statuses and roles screen don't appear; brief not met.
2. Restyle layer + small components inside existing React composition (chosen): new tokens appended as last layer of room.css, one `chairs.tsx` component file, one pure helper for speaker shares, targeted markup edits in 4 UI files. Keeps all C-2 editor/API behaviour; undo = revert files from snapshot.
3. Rebuild meeting/home from the mockup markup: loses persistence/conflict behaviour, high risk. Rejected.

## Decision
Option 2. Existing structure (result view + «Читать и слушать» reader, accepted in C-2) stays; C-3 changes look, statuses, roles screen and removes neutral export paths.

## Program design
- `lib/cabinet/speakers.ts` (new, pure):
  - `speakerShares(rows: CabinetUtterance[]): Map<number, number>` — share 0..1 of summed `end-start` per speaker; zero-length total → equal shares.
  - `guessCoach(rows): number | null` — for exactly 2 known speakers, the one with the smaller share; else null.
- `app/cabinet/ui/chairs.tsx` (new): `ChairDefs()` (inline `<symbol id="cc-chair">`, `cc-chair-line`, `cc-chair-dash`) rendered once in workspace; `Chair({ role: "coach"|"client"|"unknown", size, letter? })`; `ChairPair({ state: "ready"|"roles"|"working"|"note", size })` with `aria-hidden`; `chairState(summary): state` derived from the same facts as `processingLabel` (processing pending → working; text && !rolesAssigned → roles; text → ready; else note; failed → note-style pair + existing error label).
- `processingLabel`: «Нужно проверить роли» → «Кто где?». Failure label unchanged.
- room.css: append `/* C-3 two chairs */` layer: `.cc-app{--cc-bg:#FBF8F1;--cc-paper:#fff;--cc-ink:#2C2725;--cc-muted:#736965;--cc-line:#EFE4DD;--cc-accent:#2C2725;--cc-coach:#F8E3A3;--cc-coach-soft:#FDF3D3;--cc-coach-ink:#7A5200;--cc-coach-chair:#E0A526;--cc-client:#D6E3D1;--cc-client-soft:#EDF3EA;--cc-client-ink:#3E6B4B;--cc-client-chair:#6E9A78;--cc-wait:#5B5FC7;--cc-wait-soft:#ECEBFB;--cc-wait-ink:#3F43A8}`; replace Georgia with Manrope for cabinet selectors; primary `.cc-button` ink, radius 14px, ≥44px; min text 13px.
- Home (workspace.tsx): wordmark gets `ChairPair ready` small; hero becomes yellow card: h1 «Была встреча? Добавь запись», p «Получишь Word, где реплики разложены: ты и клиент.», drop zone (existing handlers) with «Выбрать аудио» (= `startUpload`, same picker, still accepts transcripts) + «или перетащи файл сюда», links «У меня готовый текст» (= `startUpload`) and «Встреча без записи — только заметка» (= `setModal("note")`); `<ol class="cc-steps">` 3 steps, hidden ≤760px; room SVG removed from home. Recent rows: `ChairPair` + title + date/client + status pill (`processingLabel`) + action: ready → «Скачать Word» (existing link), roles → «Подсказать» (opens session), working → 3px progress bar (indeterminate stripe; static under reduced motion). Pill classes by state.
- forms.tsx: option labels: json → «У меня готовый текст»; remove `last` option and its hint from the select; keep the `last` code path compiled only if referenced elsewhere — remove the UI option only, API `/import-job` untouched. Hint text drops the word JSON («Файл с готовым текстом разговора. До 8 МБ.»). Error messages mentioning JSON reworded without «JSON».
- session-workspace.tsx:
  - Header: `ChairPair` (state from session) before the h1 block; remove «Нажми на значение, чтобы изменить.» (dotted underline + focus ring already signal editability; keep focus-visible outline).
  - `cc-document-outcome` when `rolesReady`: dark card «Документ готов» / «Реплики разложены: ты и {client}.» / «Скачать Word» (non-neutral) / «Читать и слушать».
  - When `!rolesReady && hasText`: no download button. Render `RoleSeats` section `id="cc-who"` titled «Кто в каком кресле?» with lead «Мы различили голоса, но не знаем, где ты. Посмотри на фразы — если перепутали, поменяй местами.»
    - exactly 2 known speakers: local state `coachSpeaker` (initial = saved coach role ?? `guessCoach` ?? first). Seat cards: coach seat yellow «Ты», client seat green with `Chair letter` and name (`item.clientName || item.document.clientName || "Клиент"`); each shows «говорит N% времени», up to 2 example phrases (existing selection: transcript >24 chars, first 2), «Послушать отрывок» button when `item.audio`. Swap button «Поменять местами» (aria-label) toggles `coachSpeaker`. Primary «Всё верно — сделать документ» → `assignFirst` semantics generalised: write `{[coach]:"coach",[other]:"client"}` and `save(["speakerRoles"])`; on success the outcome card shows «Документ готов».
    - other counts (1, 3+, or only unknown −1): one card per voice with examples, share, «Послушать отрывок», and existing role `<select>`; no swap.
    - «Послушать отрывок»: one hidden `<audio preload="none">` per seat with the existing `#t=start,end` src; the button toggles play/pause, pausing other seats; label switches «Пауза». Keyboard reachable, ≥44px.
  - Remove `cc-neutral-word` button (l.132). Reader top (l.169): when `rolesReady` «Скачать Word»; else button «Кто где?» that leaves reader and scrolls to `#cc-who`.
  - Reader paragraphs: prepend a face `Chair` by role of `first.speaker` (unknown → grey outline); style the existing role `<select>` as the speaker name in role ink colour (coach ink / client ink). Keep select (it is the role editor).
  - «Сохранено» status stays once in header.
- Nothing else in the reader, digest, bookmarks, audio player, dialogs changes behaviour.

## Slices
### 1. Foundation and home
Makes true S-chairs-1 (tokens, chair components), S-chairs-2, S-chairs-3, S-simple-3 change.
- Tests: `tests/cabinet-speakers.test.ts` — shares sum to 1, smaller-share speaker guessed as coach, 3 speakers → null, zero durations → equal; rejects: guess with 1 speaker. `tests/cabinet-ux.test.ts` add: `chairState` for each summary kind (pending processing beats roles; failed); `processingLabel` returns «Кто где?» for text without roles (fails today). Source check that forms.tsx has no `>Последний результат транскрибатора<` and no visible «JSON» strings in labels/hints (fails today).
- Files: lib/cabinet/speakers.ts, app/cabinet/ui/chairs.tsx, processing.tsx, workspace.tsx (header + home only), forms.tsx, room.css, tests.
- Look at: workspace.tsx l.159–176, processing.tsx l.7–8, forms.tsx l.36–60, types `CabinetSessionSummary` in lib/cabinet/types.ts.
- Done: unit tests green; home renders on preview with pair states for synthetic sessions.
### 2. Meeting and «Кто в каком кресле?»
Makes true S-simple-4 change, removal of neutral export, S-chairs-4, S-simple-5 change.
- Tests: browser script `tests/cabinet-c3-roles.cjs`: import synthetic 2-speaker transcript via picker → meeting shows «Кто в каком кресле?», no text «без ролей» anywhere on page, no download button; shares shown and sum ≈100%; swap moves phrases between seats; confirm → «Документ готов» and «Скачать Word» returns docx whose XML has coach name on the coach speaker; reload keeps roles (server persistence). Rejects: neutral button present / download before roles. Synthetic 3-speaker import shows per-voice selects and no swap. Reader shows chair faces and «Кто где?» instead of download when roles missing.
- Files: session-workspace.tsx, chairs.tsx (if extended), room.css, test script.
- Look at: session-workspace.tsx l.90–106 (download/assignFirst), l.126–133, l.156–165, l.169, l.180; journey script tests/cabinet-c2-journey.cjs for login/import pattern.
- Done: script passes on preview; existing `npm test` green.
### 3. Evidence and polish
S-chairs-5 and regression.
- `tests/cabinet-c3-visual.cjs`: home, meeting (ready), roles at 1280/390/320 — `scrollWidth<=clientWidth`, no computed font-size <13px on visible text in `.cc-app`, contrast ≥4.5 for text over its nearest opaque background (sampled set: body, muted, pills, links, coach/client ink), every ContextField trigger shows outline on keyboard focus. Screenshots to `.git/vibeproof-logs/c3-*`.
- Re-run C-2 scripts smoke/journey/slice2/audio-source/metadata (update selectors that changed: home heading, «Проверить роли», «Где твой голос?», neutral). `npm test`, `npm run typecheck`, `npm run lint`, `next build` from `.local/web`.
- Independent design-critic on screenshots only.

## Visible work
Design language: Manrope only; colour only for people (coach yellow, client green) plus violet only for «ждёт тебя»; actions ink. Components: chair, pair, avatar letter, pill, seat card, dark document card. States: processing, failed (existing Processing component restyled, label unchanged), roles needed, ready, note-only, empty recent list («Здесь появятся твои записи…» with dashed chair). Phone: hero steps hidden, row actions wrap under text, roles seats stack with swap row between, reader faces 32px. Accessibility: chairs `aria-hidden`, state always also in text; swap/listen buttons labelled; focus-visible ink outline; reduced motion stops pulse/stripe.

## Risks
- Removing neutral export blocks Word for a session whose voices cannot be split (single −1 speaker): mitigated — user can still assign the single voice a role via select, then download. Accepted by owner («Да»).
- Guessing coach by smaller share may be wrong; it is only a preselection the coach confirms; nothing saved until «Всё верно».
- CSS override layer on a minified file can leak to client/clients/login screens (queued for next change): they get new tokens/fonts automatically. Acceptable — they must remain readable; slice 3 screenshots clients/client/login at 390 to catch breakage, no redesign there.
- C-2 scripts depend on old texts; update selectors, never weaken their assertions.
- Rollback: restore files from `.local/c3-before/`.

## Decisions to keep
- Colour denotes a person; actions are ink; violet is reserved for «needs your action». Replaces plum accent.
- Word is downloadable only with roles; `?neutral=1` stays server-side unused (no UI path). Replaces C-2 «neutral export remains».
- Speaker share is computed on the client from timecodes, never stored.

## Review
Fresh `vibeproof-reviewer` (read-only, no conversation), 2026-11-06: 0 blockers, 4 majors, 5 minors. All accepted; design amended below (these amendments override earlier sections where they differ).

- M1 history rows download Word without roles (`history-notes.tsx:28`) and plain download serves empty roles → One rule `rolesComplete(utterances, speakerRoles): boolean` in `lib/cabinet/speakers.ts` (= today's `rolesReady`: every known speaker ≥0 is coach|client; if none known, every speaker). Used by: `store.listSessions` `rolesAssigned` (replaces its current rule, fixes m5 single-voice), `session-workspace` `rolesReady`, download route. Route: if `!rolesComplete` → `CabinetError("ROLES_REQUIRED", 409)`; `?neutral=1` removed. Add Russian message for ROLES_REQUIRED in `api.ts` errorMessages. `HistoryRow`: ready → «Скачать Word», text without roles → «Подсказать» (opens meeting), plus `ChairPair` + pill. Slice 1 includes history-notes.tsx and the store/route change; unit test in `tests/cabinet-speakers.test.ts` for rolesComplete (2 voices, 1 voice, only −1, 3 voices partial) and a store/route test that download without roles is 409 (fails today) and with roles 200.
- M2/M3 one state rule → `meetingState({ utteranceCount, processing, rolesAssigned }): "working"|"failed"|"roles"|"ready"|"note"` in `processing.tsx`: pending processing → working; failed → failed; text && !roles → roles; text → ready; else note. `processingLabel` derives from it: working → stage label, failed → «Обработка остановилась», roles → «Кто где?», ready → «Документ готов», note → «Встреча без записи». `ChairPair` takes the same state (failed draws note-style pair). Meeting header and `Processing` pass `rolesAssigned: rolesReady` computed with `rolesComplete`, never a missing field. Tests cover each state incl. text+pending = working pill AND working chairs.
- M4 C-2 scripts asserting the no-roles Word (`cabinet-c2-slice2.cjs`, `cabinet-c2-metadata-red.cjs`) and «Это я» (`cabinet-c2-journey.cjs`): those assertions are retired with S-simple-4's neutral part (agreed removal) and replaced by absence checks (no «без ролей» text; download before roles → 409) plus the new roles flow. All other assertions in those scripts are kept; only selectors for renamed texts change.
- m6 13px: final layer overrides every `font-size:1[01]px|12px` rule found by grep in room.css (respecting `!important` where the original has it) to 13px; slice 1 does the override, slice 3 measures.
- m7 forms: remove `last` option, its branch (l.43–46) and the `"last"` type member; `/import-job` API untouched. Visible labels/hints/errors contain no «JSON»; `accept` and `JSON.parse` stay.
- m8 Slice 1 gets a browser check `tests/cabinet-c3-home.cjs`: four synthetic sessions (ready / roles / note / working via existing demo seed or API) show the matching pill text and pair class; «Подсказать» opens the meeting; steps hidden at 390; form select has «У меня готовый текст» and no «Последний результат транскрибатора».
- m9 C-2 browser scripts are expected red between slices 1–2; only slice 3 is the full regression gate.
- Q phone notes: keep C-2 reader tabs; «ниже на телефоне» refers to the result view (notes aside under the document card). Q footer «Скачать исходный JSON»: function kept, label «Скачать исходные данные». Q server neutral: removed (M1).

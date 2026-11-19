# Design C-6: Встреча по макету

## Map
- Real app: nested repo `.local/web` (Next 16, React 19), its own git with unrelated dirty work; cabinet code is untracked/uncommitted there. Before edits copy every touched file to `.local/c6-before/` (same practice as C-5). Never stage/reset/clean in `.local/web`.
- Reference look: `.local/design-v2/b2-system.html` screen 6 (l.291–330), screenshot `.local/design-v2/shots/b2-6-1280.png`. Copy look, not markup; its rose = our coach yellow (D07).
- `app/cabinet/ui/session-workspace.tsx` (239 lines, read in code) — the whole meeting page:
  - l.24–25: `reading` state starts `Boolean(sourceAnchor) || initialReading`; `notesOpen` for phone tabs.
  - Effects gated by `reading`: l.63 scroll to `matchedRow || source.utteranceIds[0] || resume.row`; l.64–84 `selectionchange` listener (selection → «В закладки»/выдержки); l.85–92 scroll-position saving to localStorage (`reading-position.ts`).
  - l.131 `toRoles`, l.132 `setReadMode` (writes/deletes `mode` and `source` URL params via `replaceMeetingLocation`), l.133 `openSource` (sets source, forces reading, closes phone notes, seeks audio, writes `source` param).
  - l.151–158 `wordMetadata` row «Коуч в Word / Клиент в Word / Язык Word» (aria-labels «Имя коуча в документе», «Имя клиента в документе», select «Язык документа»), rendered in result view (l.193) and reader (l.200).
  - l.159–176 header: `ChairPair`, `.cc-session-context` (date ContextField, client name span, `.cc-save-state` role=status), h1 title ContextField, `.cc-session-duration` (minutes ContextField «Длительность встречи, мин», «Фрагмент mm:ss»).
  - l.181–195 `.cc-transfer-result` (hidden in reading): Processing, «Загрузить запись заново», dark `.cc-document-ready` card («Скачать Word» + «Читать и слушать») or `#cc-who` «Кто в каком кресле?» (two «Читать и слушать» buttons), or «Встреча без записи» with «Открыть аудио»; `wordMetadata`; button «Клиент: …» → `clientTools` Dialog with `ClientPicker`.
  - l.197–203 `.cc-reader-top` (hidden unless reading): «← К результату встречи», heading «Текст разговора» + Word/«Кто где?», wordMetadata, phone tablist «Разговор | Мои записи» (`#cc-tab-transcript`, `#cc-tab-notes`, arrow keys), `<Audio>`.
  - l.204–216 `.cc-conversation-layout`: transcript (search, source quote, selection bar, paragraphs with role select, inline edit, «Добавить в записи») + `aside.cc-working-notes` («Мои записи», notes InlineText, help line, `Digest`, bookmarks).
  - l.219 footer `.cc-meeting-files` with h3 «Файлы и данные», «Скачать исходные данные», «Удалить встречу».
- `app/cabinet/ui/workspace.tsx` l.90 reads `mode=read` → `initialReading`, `source` → `initialSource`; l.174 passes them. No other caller of `mode`.
- `app/cabinet/room.css`: minified stacked layers, later wins. Reader layout: l.35 `.cc-result-reading .cc-conversation-layout{grid-template-columns:minmax(0,1fr) 344px}`; l.36–40 ≤1000px notes become a fixed overlay toggled by `.cc-reader-show-notes`; l.23 phone hides `.cc-navigation` when reading; l.67 `.cc-transfer-meeting{max-width:900px}`; l.90–100 `.cc-word-metadata`; l.241–251 C-5 reader/save-state layer.
- Word: `lib/document.ts:327` empty coach name → «—». So an empty name must not be shown as «Ты».
- Writers: none added. All edits go through the existing `useSessionEditor` fields (`title`, `sessionDate`, `meetingMinutes`, `document`, `language`, `clientId`, …). No API, store, type or migration change.
- Tests/build facts (operations.md C-3/C-5 notes): Node 24.22.1 on PATH in `/c/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` form; `npm test`, `npm run typecheck`, `npm run lint` (49 pre-existing errors in tests/*.cjs + preview artifacts — no new ones), `next build`. Preview 3104 via `scripts/cabinet-c2-demo.ts`; restart by killing only that helper's process tree; sign in again after restart; 70 s pause between logins. Browser scripts: Playwright from the codex runtime, Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`, pattern in `tests/cabinet-c5-clients.cjs` (login, `post`, `noScroll`, synthetic transcript, `run(name)`). Ready state of a meeting: h1 with the meeting title and `.cc-reading-row` present.
- Tests depending on removed UI: `cabinet-c2-journey.cjs`, `c2-metadata-red.cjs` (l.16), `c2-slice2.cjs` (l.37,45,46,78), `c2-transfer-screenshots.cjs` (l.7), `c2-audio-source.cjs`, `c3-roles.cjs` (l.82), `c3-visual.cjs` (l.60, 98), `c5-clients.cjs` (l.76, 110, 132).

## Options
1. Leave as is / restyle only: keeps the two-step «результат → Читать и слушать». Fails the brief.
2. Keep `reading` state but always true: least diff, but leaves dead branches (`hidden={!reading}`, back button, duplicate wordMetadata) — noise the next change trips on.
3. Remove reading mode from `SessionWorkspace`, one layout; header and document line rebuilt in place; CSS layer for the page (chosen). Same component, same editor, same handlers. Undo = restore from `.local/c6-before/`.

## Decision
Option 3. Option 2 saves ~10 lines but keeps two copies of Word fields and gated effects that are easy to misread.

## Program design
- `app/cabinet/ui/processing.tsx` (pure, unit-tested) add `minutesLabel(n: number): string` → «1 минута», «2 минуты», «5 минут», «21 минута», «52 минуты» (same plural rule as `meetingsWord`).
- `SessionWorkspace` props: keep `initialReading` (now means «open at the conversation»: scroll to resume row) and `initialSource`. Remove `reading`/`setReading`/`setReadMode`.
  - Effects formerly gated by `reading` run always: selection listener, scroll-position saving. Scroll effect: on mount scroll only when `source` or (`initialReading` and `resume.row`); afterwards on `matchedRow`/`source` change. Plain open stays at top.
  - On mount, if URL has `mode`, delete it via `replaceMeetingLocation` (keep `source`). Nothing writes `mode` any more.
  - `openSource`: as today minus `setReadMode`; scrolls to the row. `toRoles`: scroll to `#cc-who`.
- Layout (top → bottom):
  1. Back button (as today).
  2. `.cc-meeting-top` grid: left `header.cc-page-header` card = `ChairPair` 64 + `.cc-meeting-heading` { h1 title ContextField; `.cc-meeting-meta` line: date ContextField · client button · minutes ContextField (display `minutesLabel(n)` or «указать длительность»); `.cc-save-state` (single copy, same texts, role=status) }. Client button: text = linked client name, else `item.clientName`, else «без клиента»; aria-label «Клиент встречи: <name>»; onClick `setClientTools(true)` (same dialog). Remove the «Клиент: …» button and «Фрагмент mm:ss».
     Right: `.cc-document-outcome`/`#cc-who` as today minus every «Читать и слушать». Ready card gets `.cc-document-line` under «Скачать Word»: «В документе: [coach] и [client], [language]». Coach/client are ContextFields with the same aria-labels/parse/flush as today's wordMetadata; display = name or «имя коуча»/«имя клиента». Language: a native `select` aria-label «Язык документа», options «по-русски»/«по-английски», styled as underlined text. While roles are not set the same `.cc-document-line` sits under `.cc-seats-actions` (names can be fixed before confirming). No text → no line (as today). Meeting without record card loses «Открыть аудио» (audio is right below).
     Processing, «Загрузить запись заново», error, EditorFeedback, drafts stay where they are (between top and conversation).
  3. `.cc-conversation-layout`: left `section.cc-conversation`: heading row h2 «Разговор»; phone tablist «Разговор | Мои заметки» (same ids/keys, shown only ≤1000px); `<Audio>`; search; source quote; selection bar; paragraphs (unchanged). Right `aside.cc-working-notes`: h2 «Мои заметки», notes InlineText, Digest, bookmarks. No help line.
  4. Footer `.cc-meeting-files`: no h3; «Скачать исходные данные» and «Удалить встречу» as 13px muted links (delete keeps danger colour on hover/focus only, still opens the confirm dialog).
- Remove: `.cc-reader-top`, «← К результату встречи», «Текст разговора», `wordMetadata` row, `cc-result-reading` class usage.
- room.css: append `/* C-6 meeting page */` layer: `.cc-transfer-meeting{max-width:1100px}`; `.cc-meeting-top` grid `minmax(0,1fr) 340px` gap 20 (≤1000px one column); header card paper, 1px line, radius 20, padding 32; h1 Manrope 700 40/1.15 (≤760: 28); meta 14px muted with dotted underline on editable values; dark card as today; `.cc-document-line` 13px, values underlined, light on dark ≥4.5:1; conversation grid = old reading grid without the `.cc-result-reading` prefix (≤1000px overlay + tabs as today); tabs hidden ≥1001px; footer links 13px muted. No new colours (D07).

## Slices
### 1. One meeting page
Makes true S-chairs-9…14.
- Unit `tests/cabinet-ux.test.ts`: `minutesLabel` 1/2/5/11/21/52 (fails today: missing).
- Browser `tests/cabinet-c6-meeting.cjs` (copy harness from c5-clients), synthetic ready meeting (roles set, client linked, minutes 52, date 2026-11-02, a bookmark/citation) and one without roles:
  - › page: open by `?session=<id>`: h1 title visible, `.cc-meeting-meta` text matches «2 ноября · <client> · 52 минуты», `.cc-reading-row` visible without any click, search input visible, no button «Читать и слушать», «К результату встречи», no text «Текст разговора», «Фрагмент». Rejects today (rows hidden until click).
  - › header: edit title, date, minutes via click → reload → values persisted; click client → dialog «Клиент этой встречи»; no button whose name starts «Клиент:».
  - › document line: ready card contains «В документе:», edit coach and client names and set language «по-английски» → reload → persisted (and API GET shows `document.*`, `language:'en'`); no text «Коуч в Word», «Язык Word». Roles-unset meeting: no «Скачать Word», line present under the seats.
  - › notes: at 1280 `aside.cc-working-notes` right of `.cc-conversation` (x greater) and tablist hidden; no «Заметки можно менять прямо здесь»; «Добавить в записи» → «В закладки» on a paragraph adds a bookmark in notes, persists after reload. At 390: tablist visible, «Мои заметки» tab shows notes, «Разговор» returns; no horizontal scroll.
  - › files: no heading «Файлы и данные»; links «Скачать исходные данные», «Удалить встречу» font-size ≤13px; delete opens «Удалить встречу?» and «Оставить» keeps it.
  - › source link: `?session=<id>&mode=read&source=bookmark:<id>` and `?session=<id>&source=bookmark:<id>` both show `.cc-source-context` with the quote and the header h1; URL loses `mode`.
- Files: session-workspace.tsx, processing.tsx, room.css, tests/cabinet-ux.test.ts, tests/cabinet-c6-meeting.cjs.
- Look at: session-workspace.tsx lines above; context-field.tsx props; chairs.tsx; tests/cabinet-c5-clients.cjs harness and its reading block (bookmark/audio synthetic setup in tests/cabinet-c3-listen.cjs).
- Done: unit + all six c6 blocks green; typecheck green.

### 2. Regression, visual and evidence
Makes true S-chairs-8 change, S-chairs-5 change.
- `tests/cabinet-c5-clients.cjs` › reading: open meeting without `mode`; assert «Запись встречи» block paper/ink as before, heading «Разговор» Manrope, exactly one visible `.cc-save-state` in the header; drop the reminder-text check only if it targets removed markup (keep its meaning).
- `tests/cabinet-c3-visual.cjs`: screen `reader` → `meeting` (`?session=<ready>`); 1280/390/320 no horizontal scroll, ≥13px, contrast ≥4.5 including `.cc-document-line` on dark; focus outline on date, client button, minutes, coach/client/language values, tabs; remove «Читать и слушать» from the focus list.
- Update selectors only (never weaken assertions) in c2-journey, c2-metadata-red, c2-slice2, c2-transfer-screenshots, c2-audio-source, c3-roles: «Читать и слушать» click → nothing (content already there); «Текст разговора» → «Разговор»; «Мои записи» → «Мои заметки»; «Клиент: X» → client button in meta; `mode=read` waits → `.cc-reading-row` visible.
- Regression run: `npm test`, typecheck, lint (no new errors), `next build`; browser c6 all, c5 all, c3-home, c3-roles, c3-listen, c3-visual, c2-smoke, c2-journey, c2-slice1, c2-slice2, c2-forward, c2-metadata-red, c2-audio-source. Logs under `D:/CODING/sessinons transcriptor/.git/vibeproof-logs/c6-*`.
- Screenshots ready meeting 1280/390 and roles-unset 1280 → design-critic against screen 6.
- Done: all green or pre-existing failures named with evidence.

## Visible work
Manrope only; coach yellow chair, client green with letter; actions ink; dark card only for the document. Reused: ChairPair, Chair, ContextField, InlineText, Digest, Audio, Dialog, ClientPicker. States: ready; roles unset («Кто в каком кресле?» + line); processing/failed (Processing above conversation); no text (empty conversation text + Audio attach); offline/conflict/drafts (EditorFeedback, unchanged). Desktop ≥1001: two columns top and bottom; ≤1000: one column, notes via tabs/overlay; 390/320 no horizontal scroll. Keyboard: every editable value is a button with visible focus; tablist arrows kept.

## Risks
- Always-on selection listener and scroll saver on the page: both cheap and already scoped to transcript nodes; resume row no longer jumps the page on plain open.
- Old `mode=read` links: handled, tested.
- Phone navigation was hidden in reading; now always visible — intended.
- Many C-2/C-3 scripts touch removed buttons → selector-only updates, listed above.
- Rollback: restore files from `.local/c6-before/`.

## Decisions to keep
- The meeting is one page: no separate reading mode; `mode=read` is accepted and dropped. Replaces C-2's «результат → Читать и слушать».
- Word names and language are edited in the document card line «В документе: …»; empty name shows a placeholder, never «Ты», because Word prints «—».

## Review
Fresh `vibeproof-reviewer` (read-only, no conversation), 2026-11-06: 1 blocker, 3 majors, 4 minors, 2 questions. Amendments below override earlier sections.

- B1 accepted. Phone tablist sits outside `.cc-conversation` (room.css:70 hides it when notes open). Order above `.cc-conversation-layout`: `.cc-conversation-heading` (h2 «Разговор») → tablist → `<Audio>`; then the layout with transcript and notes.
- M2 accepted. Keep `cc-result-reading` permanently on the meeting `<section>` so its 17 rules (notes border/static/sticky, save-state l.244/251, grid l.35) keep applying. Builder audits each `.cc-result-reading` rule in room.css and overrides only the ones that conflict with the new page: l.23 phone `.cc-navigation{display:none}` → navigation visible; `.cc-reader-context` header sizes don't apply (header no longer has that class); `.cc-reader-top` rules become dead. List each kept/overridden rule in the slice log.
- M3 accepted. Real breakpoints: tablist only ≤760px; 761–1000px notes stacked under the conversation (one column); ≥1001px notes in the right column. The › notes test checks 1280, 800 (notes below conversation, no tablist) and 390.
- M4 accepted. Initial `notesOpen = true` when `initialSource` is an `agreement:` without an anchor (the target is in the notes); › source link adds a 390px case asserting the agreement is visible.
- m5 accepted. › source link asserts the quote highlight (`.cc-highlight-quote` or exact-quote mark) is inside the viewport, not only that `.cc-source-context` exists.
- m6 decided (technical, not an agreed scenario — no C-1/C-2 brief mentions it): a plain open stays at the top so the header and document are seen first; the audio position still resumes; old `mode=read` links still scroll to the saved row. Recorded in Decisions to keep.
- m7 accepted without reopening the agreement: S-simple-5 wording «в режиме чтения» → «в разговоре на странице встречи» is updated in product memory at finish (behaviour unchanged; covered by c3-roles › reader in slice 2).
- m8 accepted. Delete `toRoles` (no caller left).
- Q9 decided: empty coach/client name shows «имя коуча»/«имя клиента» (Word prints «—», so «Ты» would promise what Word doesn't contain). Point it out to the owner at the showing.
- Q10 accepted. While roles are unset `.cc-meeting-top` is one column (seats full width under the header), as today. Slice 2 screenshot: roles-unset meeting with three voices at 1280.
- Wording: «Добавить в записи» → «Добавить в заметки» to match «Мои заметки»; selector updates in c2 scripts.

Decisions to keep (addition): a plain open of a meeting starts at the top; reading-row resume only for old `mode=read` links.

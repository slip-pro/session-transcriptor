# Design C-7: Встреча — чисто и аккуратно

## Map
- Real app: nested `.local/web` (Next 16, React 19), ignored by the root repo (`.gitignore:17 .local/`), own dirty git. Never stage/reset/clean there. Before edits copy every touched file to `.local/c7-before/` (C-5/C-6 practice) — this is the rollback.
- Reference look: `.local/design-v2/b2-system.html` screen 6 (reply = chair, name, time on one line, text below; «← Анна»). Copy look, not markup. Coach yellow / client green (D07).
- `.local/web/app/cabinet/ui/session-workspace.tsx` (234 lines, read in code) — the meeting page after C-6:
  - l.161 `<section className="cc-result-workspace cc-transfer-meeting cc-result-reading">` (keep `cc-result-reading`, C-6 review M2).
  - l.162 back button, text `backLabel` from `workspace.tsx:174` (`clientId ? "К истории клиента" : view === "home" ? "На главную" : "К встречам"`).
  - l.163–178 `.cc-meeting-top`: `header.cc-page-header` (ChairPair 64, h1 ContextField title, `.cc-meeting-meta` date · client button · minutes, `.cc-save-state` role=status with phase texts).
  - l.179 ready card: h2 «Документ готов», `<p>Реплики разложены: ты и {clientLabel}.</p>`, «Скачать Word», `documentLine` (l.152–158).
  - l.193–198 `.cc-meeting-listen`: h2 «Разговор», phone tablist (`#cc-tab-transcript`/`#cc-tab-notes`), `<Audio>`.
  - l.202 search `.cc-context-search` inside the transcript panel; l.205 each paragraph `article.cc-reading-row.cc-paragraph`: `.cc-turn-time` (timecode button «Слушать с mm:ss» if audio), `label.cc-reader-speaker` (Chair 32 + sr-only + `<select aria-label="Роль участника N">` with `RoleOptions` Коуч/Клиент), paragraph text, `details.cc-paragraph-tools` «Добавить в заметки» → «В закладки» + `ExcerptMenu` («В выжимку» → 4 fields).
  - l.208–212 `aside.cc-working-notes`: h2, notes InlineText, `Digest`, bookmarks (`blockquote`, comment InlineText, `<Source>`, «Удалить закладку» → confirm dialog l.218).
  - `setRole(speaker, role)` l.146 changes the role for the whole voice and saves — reused as is.
- `ui/audio.tsx`: empty state = `.cc-audio-empty` plate («Запись встречи», «Запись не прикреплена…», button «Прикрепить запись», hidden `<input aria-label="Прикрепить аудио">`); with audio = speed select + `<audio ref={player}>`.
- `ui/digest.tsx`: `Source` (l.7, button «Фрагмент mm:ss–mm:ss», used by digest citations, agreements, bookmarks); `details.cc-structure-menu` summary «Добавить запись» (l.20).
- `room.css` (318 lines, minified layers, later wins): bookmark quote `max-height:112px;overflow:auto` and Georgia from l.67; C-6 layer l.254–318 (top grid `minmax(0,1fr) 340px`, `align-items:stretch`, header card paper/border/radius 20/padding 32; notes ≥1001px sticky with `border-left`; ≤760 rules).
- Writers: none added. All edits go through `useSessionEditor` fields already used. No API, store, type or migration change.
- Build facts (operations.md C-3/C-5 + C-6 log): Node 24.22.1 on PATH as `/c/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`; `npm test`, `npm run typecheck`, `npm run lint` (pre-existing errors only in tests/*.cjs and preview artifacts — no new ones in app/). Preview 3104 (`scripts/cabinet-c2-demo.ts`), restart = kill only that helper's tree; it serves a copy — refresh the copy after edits as the helper describes. Login rate-limits: ~70 s between browser scripts. Browser harness to copy: `tests/cabinet-c6-meeting.cjs` (playwright from codex runtime, Chrome path, `post`/`get`/`noScroll`/`ready()`/`open()`/`saved()`, `long` 40-reply transcript). Ready state: h1 with the meeting title and `.cc-reading-row` visible. `next build` not run (C-6 reason stands).
- Tests touching changed UI: c6-meeting l.111–112 (`.cc-paragraph-tools summary` «Добавить в заметки» → «В закладки»), c2-slice2 l.46 & c2-metadata-red l.16 (per-reply `getByLabel('Роль участника 1')`), c2-slice2 l.48 `.cc-paragraph-tools`, c2-forward & c2-slice1 l.12 («К истории клиента»), c5-clients › reading (save-state, audio block), c3-visual (meeting screen). `#cc-who` seat selects keep «Роль участника N» (c2-slice2 l.81, c3-roles l.78).

## Options
1. Leave as is. Fails the brief.
2. CSS-only polish (hide plate, restyle). Can't remove the per-reply chevron/disclosure semantics, the redundant line or the always-on «Сохранено» without markup; would leave hidden-but-present controls.
3. Targeted markup + one CSS layer in the same components (chosen). Same editor, handlers, ids; ~6 files. Undo = restore `.local/c7-before/`.

## Decision
Option 3.

## Program design
- **Save state** (session-workspace): `const [flash, setFlash] = useState(false)`; effect on `snapshot.phase`/`dirty`: when it becomes `saved` && !dirty after having been non-saved in this visit → `setFlash(true)`, `setTimeout(3000) → false` (clear on unmount). Element stays one `span.cc-save-state[role=status]`, moved to the end of `.cc-meeting-meta` (after minutes, preceded by `·` aria-hidden inside it). Class `cc-save-quiet` when phase saved && !dirty && !flash → CSS `opacity:0; transition:opacity .4s` (stays in DOM and keeps its text: Playwright treats opacity 0 as visible, so existing `saved()` waits keep working; screen readers get no new announcement). Other phases always opacity 1. Reduced motion: no transition.
- **Top**: header loses the card (no background/border/padding); `.cc-meeting-top{grid-template-columns:minmax(0,1fr) 400px;align-items:start}`. Ready card: delete the «Реплики разложены» `<p>`. `documentLine` markup: wrap `[label] [coach] и [client], [lang]` so wrapping only happens between whole segments (`white-space:nowrap` on «и client,» and on the select pair). Roles-unset single column unchanged.
- **Conversation bar**: `.cc-meeting-listen` becomes `div.cc-conversation-bar` row: h2 «Разговор» · search (moved here from the transcript panel: same input, placeholder, counter, «Дальше»; width ≤280px, grows on phone) · when `!item.audio`: `<Audio compact …/>`. Then tablist, then (only when `item.audio`) the full `<Audio>` player below. Phone ≤760: h2 hidden (C-6 rule), bar wraps, search full width; when `notesOpen` add class `cc-notes-open` on the bar → search hidden on phone.
- **Audio** (`audio.tsx`): new optional prop `compact?: boolean`. When `compact && !value`: render only `button.cc-text-button.cc-attach-link` «Прикрепить запись» («Прикрепляем…» when busy) + same hidden input + error. Upload logic unchanged; after upload `changed(audio)` → parent shows the player block.
- **Reply** (l.205): `article.cc-reading-row` single column. Head `div.cc-reply-head`: Chair 24 (client letter as elsewhere) · `select.cc-reply-who` aria-label `Роль голоса ${speaker+1}` (unknown speaker: «Роль неопределённого голоса»), options value unknown/coach/client with labels `Участник N` / «Ты» / `clientLabel`; CSS `appearance:none`, no chevron, coloured by role, dotted underline on hover/focus · time (same timecode button / `<time>`) · `details.cc-paragraph-tools` pushed right. Remove the sr-only duplicate span. Text paragraph below, full width.
- **Bookmark icon**: `details.cc-paragraph-tools` summary = inline SVG bookmark (aria-hidden) + `span.cc-sr-only` «Добавить в заметки»; `aria-label` not used (summary text is the name). Opened menu = absolute popover (paper, line, radius 10, shadow) listing buttons «В закладки», «Что обсуждали», «Договорённость», «К следующей встрече», «Моя рефлексия» (flattened ExcerptMenu fields → `bookmark(ids, "summary", field)`); closes after a choice and on Escape. Summary 32×32 hit area (44 on touch). Opacity .45 → 1 on `.cc-reading-row:hover`, `:focus-within`, `[open]`; `@media (hover:none)` always 1. Selection bar (with its own ExcerptMenu) unchanged.
- **Notes**: `.cc-working-notes>.cc-inline-text` gets paper background, 1px line, radius 10, padding 10px 12px, min-height 72px. Digest summary text «+ Добавить раздел», no disclosure marker, accent text-button look; content unchanged (3 fields + Договорённость).
- **Source** (`digest.tsx`): visible text `clock(anchor.start)`, `aria-label` `Фрагмент ${clock(start)}–${clock(end)}` (visible text is inside the name; existing tests by name keep working). Unavailable/changed notes unchanged.
- **Bookmark card**: new local component `BookmarkQuote({ text })` in session-workspace: `blockquote` with class `cc-clamp` (`-webkit-line-clamp:3`, Manrope 14/22, no max-height/overflow auto); after mount measures `scrollHeight > clientHeight + 1` → shows `button.cc-text-button` «ещё» / «свернуть». Delete link text «Удалить», aria-label `Удалить закладку ${clock(start)}`, 12px muted; same confirm dialog.
- **Layout ≥1001px**: notes column 320px, `border-left:0`, column gap 40px, sticky as in C-6. 761–1000 and ≤760 unchanged.
- **Back**: `workspace.tsx:174` → when `clientId` and the client is found: visible `← {name}`; else `← Главная` / `← Все встречи`. Session back button renders `<span aria-hidden>←</span> {label}` with `aria-label` `К истории клиента ${name}` for the client case (keeps «К истории клиента» prefix for tests) and plain labels otherwise.
- Remove: `.cc-audio-empty` plate on the meeting page (component branch stays for non-compact callers if any — check callers; if the meeting is the only one, delete it), «Реплики разложены», per-reply sr-only span, `ExcerptMenu` inside paragraph tools.
- room.css: append `/* C-7 tidy meeting */` layer; override, don't edit older layers. No new colours: tokens from l.106 only.

## Slices
### 1. Top and conversation bar — S-chairs-15, 16, 17, 21
- Test `tests/cabinet-c7-tidy.cjs` (copy c6 harness; `run(name)` blocks):
  - › top (1280): `.cc-meeting-top .cc-page-header` computed border-top-width 0 and background transparent; dark card height < header block height + 40 and its bottom ≤ its content bottom + padding (no stretch: card height ≈ content); no text «Реплики разложены»; `.cc-document-line` (names «Анна Лисова»/«Борис Громов») height < 2× its line-height. Fails today (card border, stretch, line present).
  - › save state: open → `.cc-save-state` opacity 0; edit minutes → text «Сохранено» with opacity 1 → after 5 s opacity 0; go offline (`page.context().setOffline(true)`) and edit title → text contains «Не отправлено» or «Не сохранено» and opacity 1 after 5 s; back online. Fails today (always 1).
  - › conversation bar: no-audio meeting: no `.cc-audio-empty`, no text «Запись не прикреплена»; in `.cc-conversation-bar` heading «Разговор», searchbox, button «Прикрепить запись»; `setInputFiles` on «Прикрепить аудио» with a tiny synthetic WAV (generate in the test) → `audio` element appears under the bar; search typed «Реплика 2» shows counter. At 390 bar has no horizontal scroll; notes tab hides the searchbox.
  - › layout (1280, `long`): back button text matches /←\s*Анна/ and accessible name starts «К истории клиента»; scroll to the last reply → `aside.cc-working-notes` boundingBox top within the viewport; aside `border-left-width` 0.
- Files: session-workspace.tsx, audio.tsx, workspace.tsx, room.css, tests/cabinet-c7-tidy.cjs.
- Look at: session-workspace l.161–198, l.152–158; audio.tsx whole; workspace.tsx l.174; room.css l.254–318; c6-meeting harness and its `files`/`notes` blocks.
- Done: four blocks green, typecheck green, c6-meeting all green.

### 2. Replies and notes — S-chairs-18, 19, 20
- Tests in the same file:
  - › reply: in each `.cc-reading-row` the head contains chair svg, a combobox named «Роль голоса 1|2» showing «Ты» / client name, and the time, all with the same top ±4px; no `.cc-reading-row` text «Добавить в заметки» visible (sr-only allowed: check `isVisible()` of the visible text node is false → assert the summary has no visible text other than svg: `innerText.trim()===''` with sr-only excluded by checking boundingBox of `.cc-sr-only` ≤1px); select «Клиент» on voice 1 → every voice-1 combobox shows the client name → reload → persisted. Rejects today (label «Роль участника 1», visible «Добавить в заметки»).
  - › bookmark icon: keyboard: Tab to the first row's summary (focus visible: outline width >0), Enter → menu with 5 buttons → «В закладки» → `.cc-inline-bookmark` appears and persists after reload; second row → «Договорённость» → an agreement with quote in notes. At 390 (hover:none emulated via `isMobile`/`hasTouch` context) summary opacity 1.
  - › notes: summary text «+ Добавить раздел» (no «Добавить запись»), opening lists the 4 options; notes field background ≠ transparent; bookmark on a 3-reply paragraph from `long` → quote `-webkit-line-clamp` 3, no inner scroll (scrollHeight of blockquote container not scrollable: computed overflow-y ≠ auto), «ещё» expands (height grows); time button text /^\d\d:\d\d$/ and click scrolls to the row (row in viewport); «Удалить» opens «Удалить закладку?», «Оставить» keeps it.
- Files: session-workspace.tsx, digest.tsx, room.css, tests/cabinet-c7-tidy.cjs; selector updates in c6-meeting (l.111–112: summary still has text «Добавить в заметки» via sr-only — `hasText` matches; drop the second-level `.cc-paragraph-tools … «В закладки»` only if the locator path changed), c2-slice2 l.46 & c2-metadata-red l.16 (`Роль участника 1` → `Роль голоса 1`, same assertions).
- Done: three blocks green, slice-1 blocks still green, c6-meeting green.

### 3. Regression, visual, evidence — S-chairs-5 change
- `tests/cabinet-c3-visual.cjs` meeting screen: add focus checks for reply role select, bookmark summary, «Прикрепить запись», «+ Добавить раздел», bookmark time; contrast ≥4.5 for reply name per role, `.cc-attach-link`, save state when shown; 1280/390/320 no horizontal scroll, ≥13px (bookmark «Удалить» is 12px today in C-6? — measure; if <13 raise to 13).
- Selector-only updates elsewhere (c2-forward, c2-slice1 «К истории клиента» → name /^К истории клиента/; c5-clients › reading audio-plate checks → bar link). Never weaken assertions; originals in `.local/c7-before/tests/`.
- Runs (logs to `.git/vibeproof-logs/c7-*`): `npm test`, typecheck, lint (no new app errors); browser c7 all, c6 all, c5 all, c3-home, c3-roles, c3-listen, c3-visual, c2-smoke, c2-journey, c2-slice1, c2-slice2, c2-forward, c2-metadata-red, c2-audio-source.
- Screenshots: ready meeting 1280 + 390, no-audio meeting 1280, roles-unset 1280, opened bookmark menu 1280 → design-critic against screen 6 and the brief's «Today» list.
- Done: all green or pre-existing failures named with evidence.

## Visible work
Manrope everywhere (no Georgia on this page). Reused: Chair/ChairPair, ContextField, InlineText, Digest, Audio, Dialog. States: ready; roles unset (seats + line, single column); no audio (bar link); processing/failed (unchanged, above conversation); no text (bar without search — render search only when `hasText`); offline/conflict/drafts (save state visible). ≥1001 two columns, sticky notes without divider; 761–1000 notes below; ≤760 tabs. Keyboard: role select, time, bookmark summary reachable in that order per reply; Escape closes the menu; visible focus everywhere. Reduced motion: no fade transition.

## Risks
- Fade hides a real problem → only `saved` fades; all other phases stay visible; tested offline.
- Popover clipped by sticky/overflow containers → it lives in the transcript column (no overflow there); check at 320.
- Opacity-.45 icon too faint → full opacity on hover/focus/touch; it's a non-text control, AA 3:1 checked at full opacity.
- Many older scripts → selector-only updates listed above.
- Rollback: restore from `.local/c7-before/`.

## Decisions to keep
- «Сохранено» is shown only for ~3 s after a save; saving, offline, conflict and draft states are always visible. Replaces C-6's permanent label.
- The voice's role is changed from its name in any reply (select styled as text), labelled «Роль голоса N»; seat selects keep «Роль участника N». Closes the duplicate-label queue item.
- Reply tools live behind one bookmark icon; transcript text stays free of per-reply links.
- Source links show the start time only; the full range is the accessible name.

## Review
Fresh `vibeproof-reviewer` (read-only, no conversation), 2026-11-06: 0 blockers, 3 majors, 6 minors, 2 questions. Amendments below override earlier sections.

- M1 accepted. Save state stays where C-5 put it — its own line under `.cc-meeting-meta` (c5-clients l.122/129 unchanged); only opacity changes. Player wrapper keeps class `cc-meeting-listen` (below the bar, only when audio). Compact attach keeps a `div.cc-audio` wrapper. Add c2-slice2 l.50, c2-metadata-red l.20, c5-clients l.112–118, c6-meeting l.52 to slice 3's check list; update selectors only where the no-audio plate is asserted.
- M2 accepted. Bookmark «Удалить» 13px muted (and any C-7 text ≥13px).
- M3 accepted. Only the client case changes. New prop `backClient?: string` on SessionWorkspace (workspace.tsx:174 passes the linked client name when `clientId`); then visible `← {backClient}`, aria-label `К истории клиента ${backClient}`. «На главную»/«К встречам» untouched.
- m4 accepted. Offline text check matches real strings: «Не отправлено. Черновик в браузере.» or «Правки ещё не сохранены»; opacity is polled (`expect.poll`-style loop) not read once.
- m5 accepted. No `compact` prop: Audio's empty branch itself becomes the attach link (only caller is the meeting). Parent renders `<Audio>` in the bar when `!item.audio`, below the bar inside `.cc-meeting-listen` when audio exists.
- m6 accepted. Popover: keydown Escape on the details closes it and focuses its summary; document `pointerdown` outside closes open `.cc-paragraph-tools`; z-index above `.cc-selection-bar`.
- m7 accepted. Reply role select: `:focus-visible{outline:2px solid var(--cc-ink);outline-offset:2px}`; c3-visual adds an explicit contrast check for its colour on the page background per role (like C-6 visual.cjs:40–44).
- m8 accepted as intended: `Source` shows the start time everywhere (bookmarks, citations, agreements) for consistency; accessible name keeps the full range.
- m9 accepted. Phone touch case uses a context with `isMobile: true, hasTouch: true`.
- m10 accepted. Measure at build; dark card padding 24px and column 400px; if the test names still wrap, widen to 420px.
- Q11 settled: sticky already works from C-6; the visible defect is the short divider. › layout keeps the sticky assertion as a regression guard; what fails today is the border and the back label. Not counted as new behaviour.
- Q12 settled: accessible name uses the voice number («Роль голоса 1») because the visible name changes with the role; brief's "Decided for you" line updated (technical choice).
- Brief readings (no change to the agreement): the brief's example «В документе: Ты и Анна» is illustrative; the line shows the names Word prints (C-6 decision), e.g. «Анна Лисова и Борис Громов». Brief's «Роль голоса <имя>» is implemented as «Роль голоса N» (Q12).

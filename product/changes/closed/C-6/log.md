# C-6 log

## Slice 1
- Ruling: header date shows «2 ноября» (shortDate) for the current year, with year («2 ноября 2025 г.») for other years — the design example had no year; cost if wrong: one-line change in `dateText`.
- Ruling: kept the sentence «Реплики разложены: ты и <клиент>.» in the dark card (design said «as today»); cost: remove one `<p>`.
- Ruling: `.cc-document-line` is a `div` with native `select` (options «по-русски»/«по-английски»); the c6 test reads the line text with the select replaced by its chosen label because `innerText` lists every option; cost: none for users.
- Ruling: client button reuses `cc-context-value` (dotted underline, same focus ring); aria-label «Клиент встречи: <имя>».
- Ruling: phone hides the chair pair in the header card (as the old header did) to save width; cost: CSS line.
- Ruling: audio player is no longer sticky (it sits outside `.cc-conversation` per B1); selection bar `top` set to 12px accordingly; cost: player scrolls away on long meetings.
- Ruling: the 4 `.cc-result-reading` rule groups audited (M2): kept notes border/sticky/textarea limits and grid base; overridden in the C-6 layer: layout/notes display rules (≤1000 overlay, ≤760 notes hide), phone `.cc-navigation`/header hiding, save-state phone `display:none` (already overridden by C-5 rule), selection-bar top; dead now: all `.cc-reader-top`, `.cc-reader-context`, `.cc-reader-label-*` rules (left in room.css, harmless).
- Ruling: `.cc-meeting-top` is single column when seats are shown or when processing without text (right cell would be empty).
- Wording: «Добавить в записи» → «Добавить в заметки», tab «Мои записи» → «Мои заметки».
- Open: «Скачать Word» card text and the digest menu «Добавить запись» unchanged.

## Slice 2
- Scripts changed by selectors only (originals in `.local/c6-before/tests/`): c5-clients, c3-visual, c3-roles, c2-journey, c2-metadata-red, c2-slice2, c2-transfer-screenshots. c2-audio-source, c2-smoke, c2-slice1, c2-forward, c3-home, c3-listen needed no edit.
- Deviation c5 › reading: «save state on the date line (centre within 12px)» became «directly under the date/meta line (gap <24px, same x)», because the design puts `.cc-save-state` as its own line under `.cc-meeting-meta` inside the header. Meaning kept: one copy, in the header, attached to the meta; cost if wrong: one geometry check.
- c5 › reading now opens meetings without `mode` and also checks that an old `mode=read` link loses `mode` from the URL; audio selectors `.cc-reader-top .cc-audio` → `.cc-meeting-listen .cc-audio`, heading font checked on `.cc-conversation-heading h2` («Разговор»).
- c3-visual: screen `reader` removed (the meeting screen already waits for `.cc-reading-row`); audit also checks the language `select` in `.cc-document-line` (size and contrast, it has no text node); focus list gains client button (aria-label prefix «Клиент встречи:»), coach/client names, language, and phone tabs (Tab + ArrowRight); dark-card focus ring list gains the three document-line values; «Читать и слушать» removed from it.
- c3-roles › reader step: the click on «Читать и слушать» and the «.cc-reader-top / Кто где?» checks are replaced by the same facts on the one page (chair faces in conversation rows, no reading-mode button, `#cc-who` visible, no «Скачать Word» before roles).
- c2-slice2, c2-metadata-red, c2-journey, c2-transfer-screenshots: «Читать и слушать» clicks and `mode=read` URL waits → wait for `.cc-reading-row`; «Текст разговора» → «Разговор»; «Мои записи» → «Мои заметки»; «Клиент: X» → «Клиент встречи: X» («Клиент: не привязан» → «Клиент встречи: без клиента»); slice2 URL assertion `mode === 'read'` → `mode === null`.
- c2-slice2: combobox «Роль участника 1» exists twice on the page now (seats in `#cc-who` and the paragraph role select), so the seat step is scoped to `#cc-who`. Not a product defect; accessible names repeat across two regions.
- Lint: all errors are `require()` in test scripts and preview artifacts; the only addition is the new c6 test (same rule as every .cjs). No warnings or errors in app/ or lib/.
- `next build` not run: operations.md gives no cheap isolated build, and a build in `.local/web` could overwrite output used by the 3100 preview; typecheck is green.
- Screenshots in `.git/vibeproof-logs/`: c6-shot-ready-1280, c6-shot-ready-390 (viewport only), c6-shot-ready-800, c6-shot-roles-1280, c6-shot-roles-800; viewed, no layout breakage found.
- Coordinator: on phones (≤760px) the h2 «Разговор» is hidden because the tab of the same name sits right under it (same pattern as the hidden notes h2); c6, c3-visual, c5 rerun green; cost: one CSS line.

## Implementation review
- Fresh vibeproof-reviewer 2026-11-06: 0 blockers, 0 majors, 4 minors.
- m1 (re-opening the same source doesn't re-scroll; same as before C-6) → queued, not fixed: pre-existing, harmless (audio still seeks), retry by scrolling.
- m2 (no test for row resume via old `mode=read` links) → queued.
- m3 correction: `c2-metadata-red.cjs` returns at l.12, so its l.13+ edits are dead code and unverified; `c2-slice2.cjs:49` `mode===null` is weak — removal of `mode` is covered by c5 › reading and c6 › source link.
- m4: «Сохранено» sits under the meta line, not on it; owner saw it at the showing and accepted («Подходит»).
- Correction to slice 1: the audio player was not sticky before C-6 either (sticky rule targets `.cc-conversation .cc-audio`); nothing lost.

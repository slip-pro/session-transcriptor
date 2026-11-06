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

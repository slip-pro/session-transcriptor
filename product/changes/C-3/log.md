# C-3 log

## Slice 1
- Hero button is «Выбрать аудио» (as in design/mockup); «Добавить запись» lives in the heading. Cost if wrong: one label.
- Note-only pill reads «Встреча без записи» (design's processingLabel), not «Только заметка» from the mockup.
- `tests/cabinet-materials.test.ts`: one setup line now assigns roles before downloading Word (the test is about private-notes exclusion; download without roles is now 409 by agreement). Assertions unchanged.
- Add-meeting dialog link «Импорт JSON или последнего задания» renamed «У меня готовый текст» (it opened the same form); error texts in api.ts reworded without JSON.
- `store.listSessions` now parses utterances_json per row to compute `rolesAssigned` via `rolesComplete` (cost: slightly more work per list).
- Old font-size 11/12px rules overridden to 13px by a generated block at the end of room.css (same media wrappers).
- C-2 browser scripts not touched (expected red on renamed texts).
- Slice 1 done 2026-11-06: foundation, chairs, rolesComplete (store/route 409), meetingState, home, history rows, forms. npm test 82 pass/1 skip, typecheck+lint clean, c3-home browser PASS. Nav active pill still old lilac — polish in slice 3.

## Slice 2
- Roles screen test creates sessions through the API (document names set) and opens them via «Подсказать»; the picker import itself is C-2 behaviour covered by the journey script.
- Word labels speakers «Коуч»/«Клиент» (names sit in the document header), so the docx check asserts that label on the right phrase, plus both names present.
- 1 voice / 3+ voices / only unknown: per-voice cards with the existing role select, no swap, «Читать и слушать» link; seats keep their column on swap, phrases move.
- «Послушать отрывок» is rendered only when the session has audio; not exercised in the browser script (no synthetic audio in the roles sessions). Cost if wrong: untested toggle.
- C-2 scripts: renamed home/roles headings everywhere; no-roles Word assertions in slice2/metadata-red replaced by «no без ролей text» + 409; journey «Это я» → «Всё верно — сделать документ»; slice2 gets a wait until paragraph tools are enabled before the edit click (busy flag stays set briefly after a bookmark save; click was lost).
- Reader name label is now a flex row (chair face + role select), forced with !important because older rules centre it.

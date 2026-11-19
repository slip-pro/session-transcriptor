Не проверено: полная сборка (`next build`) и поиск секретов в собранном коде. Нет способа собрать отдельно, не задев второй просмотр на 3100; проверка типов прошла. Одна проверка ролей один раз не дождалась скачивания Word, затем три раза подряд прошла; причина не найдена, задача в очереди.
Что изменилось: встреча — одна страница по макету: шапка «дата · клиент · длительность», в тёмной карточке «В документе: …», сразу разговор и заметки, тихие ссылки внизу.
Где посмотреть: http://localhost:3104/cabinet (учебный кабинет), любая встреча.
- Встреча открывается сразу с разговором, без «Читать и слушать» — видно шапку, документ, разговор с записью и поиском — проверено tests/cabinet-c6-meeting.cjs › page
- Дата, длительность и название правятся нажатием, клиент выбирается нажатием на имя, после перезагрузки всё на месте — проверено › header
- Имена и язык Word правятся в строке «В документе: …», ряда «Коуч в Word…» нет; до назначения ролей Word не скачивается — проверено › document line, cabinet-c3-roles.cjs
- Заметки справа на компьютере, на телефоне — переключатель «Разговор | Мои заметки»; закладка из разговора сохраняется — проверено › notes
- «Скачать исходные данные» и «Удалить встречу» — тихие ссылки, удаление спрашивает подтверждение — проверено › files
- Ссылка на сохранённую цитату (и старая) открывает страницу с подсвеченной цитатой — проверено › source link
- Всё прежнее на встрече работает, на 1280/390/320 нет прокрутки вбок, текст ≥13 px, контраст и фокус в порядке — проверено: 14 браузерных проверок в одном прогоне, npm test 86/0, проверка типов
changelog: Встреча стала одной страницей по макету: разговор и заметки сразу, имена и язык Word — в строке «В документе».

## Learning signals
- Avoidable rework: brief edit after agreement was refused by the commit check (VP-BRIEF-EDIT) while recording a review fix (S-simple-5 wording); the finish commit was refused too (VP-SCENARIO-EDIT); S-simple-5 wording left as is and queued. Source: product/changes/closed/C-6/design.md › Review m7.
- Review-caught defects: design review — 1 blocker (phone tabs would vanish with notes open), 3 majors (lost `.cc-result-reading` styling, wrong breakpoints, agreement links hidden on phone); all fixed before build. Implementation review — 0 blockers, 0 majors, 4 minors (2 queued, 1 log correction, 1 accepted at showing). Source: closed/C-6/design.md › Review, closed/C-6/log.md › Implementation review.
- Owner rescue: none observed; accepted at the first showing («Подходит»).
- Flaky check: c3-roles download step failed once in the final combined run, passed 3 times after; cause unknown, queued.
- Proposal observations: operations recipe «C-5 notes» applied (Node PATH form, 75 s pause between logins, refreshing the preview copy) — worked; missing: an isolated `next build` recipe (queued).
Learning urgency: normal

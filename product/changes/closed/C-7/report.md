# C-7 report

Не удалось проверить: сборку `next build` и поиск секретов в собранных файлах (нет отдельной сборки, которая не задела бы превью на 3100). Скриншоты для отдельного дизайн-ревью тоже не снимал: страницу смотрел сам на превью, и ты её принял.
Что изменилось: страница встречи стала тише. Шапка без пустой рамки, «Сохранено» появляется ненадолго, над разговором одна строка с поиском, у реплик нет служебных ссылок: роль меняется нажатием на имя, заметки добавляются через значок закладки. Заметки и закладки стали аккуратнее.
Где посмотреть: http://localhost:3104/cabinet?client=d35f3964-5012-48ed-9de4-40285ac99566&session=a57171cb-0bc0-4532-8369-3ba02aeeb2ae (учебный кабинет)
- Шапка: название без рамки, тёмная карточка по высоте содержимого, без «Реплики разложены» — проверено: c7-tidy › top
- «Сохранено» видно ~3 с после правки и гаснет; без связи предупреждение не гаснет — проверено: c7-tidy › save-state
- Строка «Разговор» с поиском; без записи — ссылка «Прикрепить запись», после выбора файла появляется плеер — проверено: c7-tidy › conversation-bar
- Реплика: кресло, «Ты»/имя клиента и время одной строкой; нажатие на имя меняет роль во всех репликах голоса и сохраняется — проверено: c7-tidy › reply
- Значок закладки открывает «В закладки» и разделы заметок; работает с клавиатуры и на телефоне — проверено: c7-tidy › bookmark-icon
- «+ Добавить раздел», поле заметки как место для письма, цитата закладки в 3 строки с «ещё» (и на телефоне), время ведёт в разговор, «Удалить» спрашивает — проверено: c7-tidy › notes
- Заметки видны при прокрутке длинного разговора, ссылка назад «← Анна» — проверено: c7-tidy › layout
- Ширина 1280/390/320, текст ≥13 px, контраст и фокус у новых элементов — проверено: c3-visual (встреча); один шаг про экран клиентов падает из-за параллельной C-8
- Прежние функции встречи на месте — проверено: c6-meeting, c5-clients, c3-roles, c3-listen, c2-slice2, c2-metadata-red, c2-audio-source, c2-forward, c2-smoke; npm test 86/0, typecheck 0
changelog: Страница встречи без лишних плашек и ссылок: роль по имени, заметки через значок закладки, «Сохранено» ненадолго.

## Learning signals
- Brief edited after agreement (two wording clarifications) → commit check refused `design C-7` twice; resolved by restoring the agreed brief and recording the readings in design.md (log/design `## Review`). Avoidable rework: small.
- Review-caught defects: implementation review found a phone-only defect (bookmark «ещё» never shown when notes tab hidden) and three minors; all fixed test-first (log.md "Final checks and review fixes").
- Concurrent change C-8 edited the same `.local/web` checkout during final checks, breaking three older home-screen steps; separated by file timestamps and C-7 diff. Missing context: no lock/notice between parallel sessions on one checkout.
- Browser pane login on 127.0.0.1 always failed while localhost worked (origin check); cost several retries at the start. Operations recipe should say «use localhost:3104».
- Operations recipe C-5/C-7 notes: applicable and used (Node path, preview copy refresh, login pause); worked.
Learning urgency: normal

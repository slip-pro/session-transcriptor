# Capability: простой путь коуча (кабинет, `.local/web`)

Остальные сценарии S-simple (C-2) будут перенесены сюда при закрытии C-2.

- S-simple-3: форма встречи открывается только после выбора файла с готовым текстом: без выбора материала, без пункта «Последний результат транскрибатора» и без слова JSON; текст не уходит на распознавание — test: .local/web/tests/cabinet-c8-home.cjs › text-form; .local/web/tests/cabinet-ux.test.ts › meeting form has no material choice
- S-simple-4: «Кто в каком кресле?» — фразы каждого голоса, доля времени, «Послушать отрывок», «Поменять местами», «Всё верно — сделать документ»; при 1 / 3+ / неизвестных голосах — выбор роли у каждого; выгрузки без ролей нет — test: .local/web/tests/cabinet-c3-roles.cjs; .local/web/tests/cabinet-c3-listen.cjs
- S-simple-5: встреча — пара кресел в заголовке, тёмная карточка «Документ готов» с одной кнопкой «Скачать Word», в режиме чтения у реплик кресло и цвет роли — test: .local/web/tests/cabinet-c3-roles.cjs › reader; .local/web/tests/cabinet-c3-visual.cjs

# C-17 report: Условия работы в карточке клиента

I couldn't check: настоящий Google Календарь (серия проверена на поддельном); предупреждение «уже занят» по встрече из календаря проверено только тестом на сервере, в браузере — конфликт со слотом другого клиента.
What changed: в профиле клиента появился необязательный блок «Условия» — программа с числом сессий или разово и постоянный слот; в шапке клиента видно «Программа: N из M», статус программы и слот; счёт можно поправить руками; после сохранения слота кабинет предлагает поставить серию встреч в календарь.
Try it: http://localhost:3111/cabinet?view=clients → «Анна Пример» (локальное превью с поддельным Google)
- Выбрать «Программа» или «Разово» в профиле — после перезагрузки на месте — checked by tests/c17-terms.test.ts › save terms и tests/c17-terms.cjs › save
- Шапка показывает «Программа: N из M» по записям с даты начала, «Разово» или ничего — checked by c17-terms.test.ts › progress и c17-terms.cjs › header
- «Осталась последняя сессия» и «Программа завершена» — checked by c17-terms.test.ts › program end и c17-terms.cjs › manual
- Постоянный слот виден в шапке («Вторник, 19:00, каждую неделю») — checked by c17-terms.test.ts › slot и c17-terms.cjs › header
- После сохранения слота — «Поставить серию в календарь?»: окно с оставшимися сессиями, одна серия в Google; «Не нужно» ничего не пишет; потерянный ответ Google не даёт поставить вторую серию — checked by c17-terms.test.ts › slot series и c17-terms.cjs › series
- Занятое время — «Вторник 19:00 уже занят: <имя>», сохранить можно — checked by c17-terms.test.ts › slot conflict и c17-terms.cjs › conflict
- Чужой коуч не видит и не меняет условия — checked by c17-terms.test.ts › isolation
- Без горизонтальной прокрутки на 1280/390/320, с клавиатуры, отметки на одной строке с подписями — checked by c17-terms.cjs › layout
- Ручная правка «Сколько сессий уже прошло?», новые записи прибавляются — checked by c17-terms.test.ts › manual count и c17-terms.cjs › manual

Final checks on 9c4bfef: C-17, C-13, C-14, C-15 server tests together 35/35; tsc and eslint on changed files clean; c17-terms.cjs all six parts pass; c15-series.cjs create and c14-edit.cjs create pass. After review (f980a90, 7ab7de2): c17-terms.cjs series and the other five parts pass, tsc clean.
changelog: В карточке клиента — условия работы: программа или разово, счёт сессий «4 из 10» с ручной правкой, постоянный слот и серия встреч в календарь (не выложено).

## Learning signals
- Owner caught nothing; I caught a visible defect myself at showing: radio/checkbox marks detached from their labels and a cut select, which slice 2's browser layout check (no horizontal scroll + focus rings) did not detect. Resolved with a layout assertion first (commit 9c4bfef in .local/web). Source: slice 2 test asserted scroll and focus, not mark/label alignment.
- Implementation review caught a possible duplicate series after a lost Google answer and two reload-only browser assertions that were always true (fixed in f980a90, 7ab7de2).
- Slice 2 builder wrote its log into the `.local/web` copy instead of the root log; merged by hand. Next handoff named the root path explicitly.
- Owner rescue: none observed.
Learning urgency: normal
